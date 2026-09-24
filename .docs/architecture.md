# 架构设计

> 2026-09-23 · **架构设计已落定**。设计方案见 [`design.md`](design.md)，技术选型见 [`tech-stack.md`](tech-stack.md)
> 2026-09-24 · 阶段 0 落地：第五节 `gate` 补媒体查询的读法，第八节补齐依赖方向规则
> 这里定的是**代码怎么组织、运行时怎么调度特效、对外暴露什么**。文中的类型签名是契约，不是最终代码。
>
> 写法约定同 [`design.md`](design.md)：每条决定都写风险。

## 一、总览

```
src/
├─ index.ts                 公开入口 `.`
├─ vue/                     框架壳：只能 import 公开入口
│  ├─ index.ts              公开入口 `./vue`
│  └─ define-component.ts   通用工厂：从选项类型映射派生 props，props 变化交给 patch
├─ effects/                 特效：渲染逻辑 + 参数表，用 defineEffect 定义
│  ├─ liquid-text/          index.ts · params.ts · shaders.ts —— 全仓库唯一 import ogl 的地方
│  └─ particle-text/        index.ts · params.ts
├─ runtime/                 运行时骨架与共享件：碰 DOM / canvas，不碰任何框架，不碰 ogl
└─ compute/                 纯计算层：零 DOM，不 import 其他层
```

依赖方向只有一条路：`vue/` → `index.ts` → `effects/` → `runtime/` → `compute/`（`effects/` 也可以直接用 `compute/`）。
这些方向由 lint 守，见第八节。

## 二、运行时骨架：`defineEffect`

特效只声明参数表，并提供一组钩子；其余全部由运行时负责：支持检测、休眠判定和它监听的全部信号、raf 与 dt 夹取、
重建信号的按帧合并、涂透明的时机、上下文丢失与恢复、异常熔断、destroy 时的清理。

```ts
export const particleText = defineEffect({
  params: particleParams, // 本特效独有的参数，外加对公共参数默认值的覆盖
  setup(ctx) { // 拿不到渲染上下文就返回 null
    return { build, frame, dispose }
  },
})
export const createParticleText = particleText.create // (textEl, layerEl, options?) => FxInstance | null
```

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| 采用运行时骨架，不采用「共享件各自导出、每个特效自己组装」的工具箱 | 第十一节规定的时序约束（所有休眠条件汇成一个判定函数、首张纹理建成前不涂透明、休眠即停 raf 并撤掉涂透明）写错时表现为文字隐身且不报错，只该写一次、测一次；上下文恢复走「重新 setup」，不可能漏掉某个 GL 资源；新增休眠条件只改一处 | 抽象只有两个用例，钩子的形状可能不适合第三种特效（比如背景类），阶段 3 是检验点；调试要多穿过一层运行时 |
| **运行时不能长成框架**：钩子固定为 `build` / `frame` / `dispose`，加上 `setup` 入口；不加可选钩子，不加生命周期事件 | 一旦长出插件机制、事件总线、可选钩子，运行时的心智负担就会反超工具箱，也违背「不要复杂编码」 | 真遇到钩子装不下的特效时，要么改契约（所有特效一起改），要么判定抽象定早了 |
| 运行时是普通函数，不用类继承 | 类继承会把「覆写哪些方法」变成隐式契约 | — |
| 重建时可以打印触发源（由 `debug` 参数控制，见第六节） | 触发源有六种，不打印就无法判断「这次重建是谁触发的」 | — |

## 三、时序

```
create(textEl, layerEl, options?)
 ├─ 必需 API 清单缺项 ───────────────→ return null（一个 DOM 节点都不碰）
 ├─ layer 在挂载点里建 canvas
 ├─ setup(ctx) 返回 null ────────────→ 移除 canvas，return null
 ├─ 订阅全部信号：媒体查询、尺寸、dpr、字体、文本、指针、上下文
 └─ evaluate()                        ← 任何信号到来，都只调这一个函数

evaluate()：shouldRun = 所有休眠条件都不成立
 ├─ 该播且没在播 → 有待重建就先 raster + build → 启动 raf → 首帧 frame 成功之后才涂透明
 └─ 不该播且正在播 → 停 raf → 撤掉涂透明

重建信号（按帧合并）→ 重新测量文字 → evaluate()（宽度和折行可能变了）
 ├─ 正在播 → 立即 raster + build
 └─ 休眠中 → 只标记「待重建」，恢复时再做
```

整个运行时只有一个布尔值 `running`，外加一个幂等的 `evaluate()`：这就是 [`design.md`](design.md) 第十一节要求的
「一个判定函数、不写状态机」。

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| **渲染能力由 `setup` 实际去拿上下文来检测**，拿不到就返回 `null`；特效不再声明所需的渲染能力 | 同一个 canvas 上，`getContext` 永远返回第一次创建的上下文，后续调用传的参数会被忽略。运行时替特效「探测」的话，要么得和 ogl 传完全相同的参数，要么得另开一个临时画布、多建一个上下文。直接拿特效要用的那个上下文最准确，也就不存在「漏了声明」这种风险 | 每个特效都必须在拿不到上下文时返回 `null`。ogl 的 `Renderer` 拿不到上下文时是先 `console.error`、再抛 TypeError，所以 liquid-text 要先自己取一次上下文，而不是依赖 try/catch。忘了的话 create 会抛错 —— 是响亮的失败，不是静默的 |
| **钩子异常熔断**：捕获任何钩子抛出的异常，停止渲染、撤掉涂透明、`console.error` 一次，此后 `patch` 为空操作 | 用户体验至上：`frame` 抛错会让 raf 链断掉，画面停在「文字透明 + 画布冻住」，也就是标题隐身；熔断之后至少能看到真文本。同时回应了第六节「分不清不支持和出错」的风险：不支持时静默返回 `null`，出错时控制台有且只有一条报错 | 只报一次，同一个错误重复发生时从日志里看不出来 |
| **休眠中不重建**：只标记「待重建」，恢复时再 build | 挂在隐藏容器里时宽度为 0，本来就建不了纹理；reduced-motion 用户永远不会恢复，不该为他们反复重画纹理 | 恢复的那一帧多做一次 build；好在首帧画完才涂透明，用户看到的仍是真文本，不会空白 |
| **上下文恢复时依次调用 `dispose` → `setup` → `build`；destroy 时由运行时对 canvas 调 `WEBGL_lose_context` 的 `loseContext()`** | 重新 setup 能保证全部 GL 资源重建，恢复后 ogl 再调 `getContext` 拿到的就是那个已恢复的上下文。destroy 时主动释放，不用等垃圾回收，不再占着同页约 16 个的上下文名额；2D 画布在这一步什么都拿不到，天然跳过 | 恢复时 `setup` 若返回 `null`，实例会一直停在真文本（与 [`design.md`](design.md) 第十一节的既定风险一致） |
| **涂透明的时机**：首次 `frame` 成功返回之后，在同一帧内完成 | 真文本与画布在同一帧交接，没有两边都看不见的空隙，也没有重影 | 比「首张纹理建成前绝不涂透明」更严，没有额外风险 |

## 四、钩子契约

| 钩子 | 什么时候调 | 该做什么 | 不能做什么 |
| :--- | :--- | :--- | :--- |
| `setup(ctx)` | create 时一次；上下文恢复后再一次 | 在 `ctx.canvas` 上拿渲染上下文，建不依赖文字的资源（shader、program）。拿不到上下文就返回 `null` | 读文字尺寸：此刻宽度可能为 0 |
| `build(raster)` | 首次开播前；之后每次合并后的重建（休眠中推迟到恢复时） | 用光栅结果建纹理，或采样粒子 | 碰 `textEl` |
| `frame(f)` | 播放期间每帧 | 从 `ctx.params` 读当前参数值，推进模拟并绘制（液态版在这里给 uniform 赋值） | 读 DOM：颜色已由运行时解析好；把参数值缓存到 `setup` 的闭包里 |
| `dispose()` | destroy、熔断、上下文恢复前 | 释放本特效建的资源 | — |

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| 不设 `patch` 钩子，patch 类参数由运行时原地更新 `ctx.params`，特效每帧读 | 粒子版本来就每帧读参数；液态版每帧给 3 个 uniform 赋值，开销可以忽略 —— `patch` 钩子没有消费方 | 特效若在 `setup` 里把参数值缓存成常量，之后的 patch 会静默失效；各特效的「patch 后画面随之变化」测试兜底（第九节） |

公共参数（第六节）由运行时自己消费。钩子拿到的数据：

```ts
interface SetupContext<P> {
  canvas: HTMLCanvasElement // layer 建好的画布
  params: Readonly<P> // 当前生效的参数值；patch 后原地更新，每次读都是最新值
}

interface TextRaster {
  image: HTMLCanvasElement // 白字透明底，已按 dpr 放大，四周含 padding
  width: number // 物理像素
  height: number
  dpr: number
}

interface FrameState {
  dt: number // 秒，已夹取
  time: number // 累计秒数
  hover: number // 0~1：靠近度经快慢不对称的逼近后的值
  pointer: { x: number, y: number, vx: number, vy: number } // 画布内的 CSS 像素；速度为 CSS 像素 / 秒
  colors: Record<string, [number, number, number, number]> // 每个颜色类参数本帧的解析值，0~1，含 alpha
}
```

`pointer` 如实保留原实现的语义：速度按原写法逐事件计算，dt 下限 14ms。粒子版只用坐标，液态版用速度
（原实现按 uv 计算，换算成 CSS 像素后等价）。手感差异由阶段 1、3 的判据验出。

## 五、共享件

| 共享件 | 层 | 职责 | 风险 |
| :--- | :--- | :--- | :--- |
| `define-effect` | 运行时 | 运行时本体：装配下面各件，独占第三节的全部时序 | 见第二节 |
| `gate` | 运行时 | 必需 API 清单检测（[`design.md`](design.md) 第十一节）；休眠判定函数及其信号：`prefers-reduced-motion`、`hover: none`、`forced-colors` 三个媒体查询，文字宽度为 0，文字折行，上下文丢失 | 折行判定用 `textEl.getClientRects()` 多于一个矩形，只在 `textEl` 是 inline 元素时成立 —— 壳渲染的正是 inline span；裸用内核的人要在类型注释里看到这条要求。媒体查询的当前状态要读新建的 `matchMedia(q).matches`，被监听的 `MediaQueryList` 只当信号源：Chromium 里在 change 事件派发前读它的 `.matches`，forced-colors 的 change 事件会被吞掉（阶段 0 实测），退出强制色后收不到恢复信号 |
| `layer` | 运行时 | 在挂载点里建 canvas；负责尺寸（文字外框加四周 `padding`）、dpr、按实测偏移定位（相对 canvas 的 offsetParent）；inline 写 `max-width: none`、`pointer-events: none`、`aria-hidden` | 定位基准要求壳的根元素有定位上下文（壳设 inline `position: relative`，见 [`design.md`](design.md) 第八节）；裸用内核的人要自己提供 |
| `text-raster` | 运行时 | 把 DOM 文字画进离屏 canvas 并与 DOM 精确对齐：字体、`letterSpacing`、按 `fontBoundingBoxAscent` 定基线、dpr、padding。以 `HeroTitle` 修好的写法为准 | 只画一行（折行由 `gate` 负责休眠） |
| `color-probe` | 运行时 | [`design.md`](design.md) 第九节的颜色继承与 canvas 回读。参数表里类型为颜色的参数，每帧解析一次，放进 `FrameState.colors` | 见第九节 |
| `pointer` | 运行时 | 监听 window 的 `mousemove`，给出画布内坐标、速度、靠近度；按 `enterRadius` 和 `wakeSpeed` / `calmSpeed` 把靠近度平滑成 `hover` | — |
| `rebuild-watcher` | 运行时 | resize、ResizeObserver、dpr、字体 `loadingdone`、文本变化（MutationObserver），按帧合并成一次重建；`debug` 开启时打印触发源 | ResizeObserver 必须挂在 `textEl` 的父元素上：规范跳过 inline 的非替换元素，挂在 span 上等于没挂（`HeroTitle` 的注释记录过） |
| `loop` | 运行时 | raf 与 dt 夹取（上限 1/30 秒） | — |
| `gl-lifecycle` | 运行时 | 直接监听 canvas 上的 `webglcontextlost` / `webglcontextrestored`，丢失时 `preventDefault()`；不持有 GL 句柄，不 import ogl | 2D 画布永远收不到这两个事件，天然不生效 |
| `approach` | 纯计算 | 指数逼近，帧率无关 | — |
| `proximity` | 纯计算 | 点到矩形的最短距离，换算成 0~1 的靠近度 | — |
| `params` | 纯计算 | 参数表派生：选项类型、默认值（含公共参数的覆盖）、合并、`undefined` 恢复默认、按键名路由到 patch 或重建、选项类型映射 | — |
| `particles` | 纯计算 | 采样、轨迹衰减、斥力、归位目标，由 my-blog 的 `hero-particles.ts` 原样搬入 | — |

## 六、参数

### 公共参数

由运行时定义一次，两个特效都有；特效的参数表只写独有参数，但可以覆盖公共参数的默认值。

| 参数 | 默认 | 走向 | 消费方 |
| :--- | :--- | :--- | :--- |
| `color` | 继承父元素计算 color | patch | `color-probe` |
| `enterRadius` | `150` | patch | `pointer` |
| `wakeSpeed` / `calmSpeed` | `4.5` / `2.4`（particle-text 覆盖为 `2.6`） | patch | `pointer` |
| `padding` / `maxDpr` | `48` / `2` | 重建 | `layer`、`text-raster` |
| `debug` | `false` | patch | 运行时：打印 create 返回 `null` 的原因、每次休眠与恢复及触发它的条件、每次重建的触发源 |

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| 公共参数由运行时定义一次 | 这些参数全部由共享件消费，写在各特效里就是重复 | 强制统一命名：粒子版的「发散 / 合拢速度」改叫 `wakeSpeed` / `calmSpeed`，语义稍绕 |
| 特效可以覆盖公共参数的默认值 | 搬过来的行为原样保持，代价只是参数表里多一个覆盖字段 | 同名参数在两个特效里默认值不同，读文档的人可能意外 |
| `debug` 做成参数 | 第二节「打印触发源」需要一个开关；同时回应第六节「排查为什么没效果只能靠 devtools」的风险 | 每个特效多一个参数；消费方忘了关会在线上打印日志（默认是关的） |

### 特效参数表

- **liquid-text**：见 [`design.md`](design.md) 第七节。`color` 与 `padding`、`maxDpr` 等归入公共参数，其余不变。
- **particle-text**：推导规则与液态版相同 —— 手感旋钮做参数，正确性或工程常量（alpha 阈值 128、dt 上限、散开时的化淡量 60、点的尺寸）留在内部。

| 分组 | 参数 | 默认 | 走向 | 来源（my-blog 的 `HeroParticles.vue`） |
| :--- | :--- | :--- | :--- | :--- |
| 密度 | `step` | `2` | 重建 | `STEP_CSS`：采样步长，CSS 像素 |
| 斥力 | `strength` / `repelRadius` | `8200` / `130` | patch | `FORCE_STRENGTH` / `FORCE_RADIUS_CSS` |
| 轨迹 | `trailHalfLife` | `110` | patch | `TRAIL_HALF_LIFE`，毫秒 |
| 归位 | `spring` | `70` | patch | `SPRING`；阻尼按固定阻尼比推出，见下表 |
| 形态 | `idle` / `scatter` | `1.8` / `22` | patch | `IDLE_AMPLITUDE_CSS` / `SCATTER_DISTANCE_CSS` |

加上 7 个公共参数，两个特效各有 14 个参数（liquid-text 的 `flowmap` 按三个子项计）。

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| 只公开 `spring`，阻尼按固定阻尼比 `15 / (2√70)`（约 0.9）推出 | 原代码注释写明约 0.9 是刻意选的「既不抖也不僵」的档位；同时公开两者，调用方随手改一个就会破坏比例（过冲或太僵）。默认行为与原代码完全一致 | 想要「弹一下」效果的调用方做不到；真有需求时再加 `bounce` |
| 同一概念同名：`strength`（鼠标作用强度）、`idle`（静止微动幅度）沿用液态版；斥力半径叫 `repelRadius` | 两个特效的 API 读起来是一套词汇；`repelRadius` 避免与 `enterRadius` 混淆 | `strength` 在两个特效里量级差五个数量级（`8200` 对 `0.075`），只能靠类型注释与 README 说明 |
| 粒子版自身逻辑不改，行为修正只来自共享件 | 换用共享件后自动获得四处修正：基线与字距对齐 DOM（原来用中线对齐、没同步字距）；修掉暗色主题下读到透明色、粒子变黑的 bug；颜色支持 oklch 等写法；获得全部休眠条件与 dpr 监听 | 这四处是行为变化，阶段 3 的判据只能写「与现状相比只有这四处差异」；`HeroParticles` 从未上线，默认值只是作者当时的调参，真正的检验在阶段 6 |

## 七、公开导出面

`FxInstance` 收窄为 `{ patch, destroy }`：

```ts
interface FxInstance {
  patch: (o: Partial<Options>) => void // 任意选项；运行时按参数表路由
  destroy: () => void
}
```

| 入口 | 导出 |
| :--- | :--- |
| `.` | `createLiquidText`、`createParticleText`；`liquidTextOptionTypes`、`particleTextOptionTypes`；类型 `FxInstance`、`LiquidTextOptions`、`ParticleTextOptions` |
| `./vue` | `LiquidText`、`ParticleText` |

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| **`patch` 接受任意选项，由运行时按参数表路由**：patch 类参数原地更新 `ctx.params`、下一帧生效，重建类参数自动排一次重建。删除公开的 `rebuild()`（修订 [`design.md`](design.md) 第六、八节） | 原方案里改 `padding` 之后还要手动调 `rebuild()`，忘了就要等下一次偶然的重建才生效，期间不报错。参数表本来就在运行时手里。这不是被否决的「增量 diff 的 `update()`」：不比较新旧值，只按键名查表；颜色类参数仍然永远不触发重建。尺寸、文本、字体、dpr 的变化内核都会自己检测，壳也不再调 `rebuild()`，它成了零消费方 | `patch` 这个名字不再完全准确（也可能引发重建）；每帧 patch 一个重建类参数就会每帧重建（按帧合并，最多每帧一次，仍然很重），要在类型注释里写明 |
| 导出选项类型映射：键名 → 原生类型构造器（`String` / `Number` / `Boolean` / `Object`），由参数表派生 | Vue 必须在运行时知道哪些是 props，否则 `strength` 这类选项会被当成 attribute 透传到根元素；布尔型参数还需要运行时类型做转换。按「壳只能走公开内核 API」，这份信息只能从公开入口拿；它只用原生构造器，不含 Vue 专有的东西，将来的 React 壳同样用得上 | 映射成为公开 API，改名、删参数都受 semver 约束 |
| 不导出 `defineEffect`、共享件、纯计算层、参数默认值；`./vue` 不导出通用工厂与类型 | 都没有外部消费方；导出面由 tsnapi 快照钉住（[`tech-stack.md`](tech-stack.md) 第六节） | 第三方不能自己写特效；这不是现阶段的目标 |

Vue 壳的 props = `text` + `as` + 选项类型映射；props 变化时直接调 `instance.patch(changed)`，不再做分派。

## 八、依赖方向的 lint 守卫

用 ESLint 自带的 `no-restricted-imports` / `no-restricted-globals` 按目录钉死，不靠自觉：

| 目录 | 禁止 | 守的是什么 |
| :--- | :--- | :--- |
| `compute/` | import 其他层；使用 `window`、`document`、`requestAnimationFrame` 等 DOM 全局 | 纯计算层可单测 |
| `runtime/`、`effects/` | import `vue`（及将来的 `react`） | 内核不得 import 任何框架 |
| `runtime/` | import `ogl` | 只用 `particle-text` 的消费方不被运行时连带打包 ogl；与 `dist` 测试的产物断言互为双保险 |
| `effects/*` | 特效之间互相 import | 特效之间只通过运行时共享 |
| `vue/` | import 公开入口以外的任何内部路径 | 壳只能走公开内核 API |
| `runtime/` | import `effects/`、`vue/`、`index.ts` | runtime 借 `../effects/liquid-text` 就能把 ogl 间接拉进来，「runtime 不碰 ogl」会被绕开 |
| `effects/*` | import `vue/`、`index.ts` | 依赖方向只有一条路（第一节） |
| `index.ts` | import 框架；引用 `./vue` | 公开入口 `.` 不能把壳带进来 |
| `compute/`、`runtime/`、`effects/*`、`index.ts` | 经由包名 `@huberyyang/todo-fx` 自引用 | 自引用绕过分层，把整个公开入口拉进来 |

后四条是阶段 0 落地时补上的：它们就是第一节「依赖方向只有一条路」的字面落地。九条规则写在 [`eslint.config.ts`](../eslint.config.ts)，
由 [`test/unit/eslint-guards.test.ts`](../test/unit/eslint-guards.test.ts) 对每条同时守住「拦住」与「放行」两面。

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| 用 lint 守依赖方向，不拆出不含 DOM 类型的 tsconfig | 拆 tsconfig 要多跑一个类型检查工程，收益只是多拦住类型引用 | `no-restricted-globals` 只拦标识符，拦不住 `HTMLCanvasElement` 这类类型引用；动态 `import()` 与 `globalThis.document` 也拦不住。这些规则都是守卫型，写错也照样全绿，阶段 0 已逐条故意违反、确认变红 |
| 每个目录只写一个配置项，把该目录的全部禁令拼进同一条 `no-restricted-imports` | 同一文件命中多个配置项时，后一项的规则选项整体覆盖前一项、不合并：实测把 runtime 的 ogl 禁令拆成单独一项，另外 11 条守卫静默失效 | 新增禁令时必须加进该目录已有的那一项；路径按目录深度写，特效子目录再深一层会被误报（响亮地红），届时改规则、不要放宽 |

## 九、测试落点

[`design.md`](design.md) 第十二节定每层守什么，[`tech-stack.md`](tech-stack.md) 第六节定工具。按本架构，各层的测试落点是：

| 对象 | project | 怎么测 |
| :--- | :--- | :--- |
| `compute/` | `unit` | 纯函数单测 |
| 运行时 | `browser` | 用一个**假特效**（钩子只记录调用顺序）测第三节的全部时序：休眠条件逐个进出、首帧前不涂透明、休眠中不重建、上下文丢失与恢复的调用顺序、钩子抛错后熔断、destroy 后 raf 与监听器归零。这些约束只测这一次 |
| 各特效 | `browser` | 只测自己的渲染：`readPixels` 或像素读回有非透明像素、patch 后画面随之变化 |
| Vue 壳 | `browser` | 挂载与卸载、props 变化调到 `patch`、重渲染后 canvas 尺寸与涂透明仍在（[`design.md`](design.md) 第六节实测表的前两行） |
| 导出面 | `dist` | tsnapi 快照；只 import `particle-text` 的打包结果里没有 ogl |
