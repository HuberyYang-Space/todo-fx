# 特效库方案

> 2026-09-23 · v6 · **设计方案已收尾**。下一环节是技术选型与架构设计，移交的议题见第十七节
> 拍板记录见 [`decisions.md`](decisions.md)（临时，制定待办清单时删除）
> 结论：`@huberyyang/todo-fx`，单包多入口。框架无关内核 + Vue 壳；React 壳等出现第一个 React 消费方再加。
> 首个消费方：[my-blog](https://github.com/HuberyYang-Space/my-blog)。文中实测数据均取自其提交 [`2d73f4c`](https://github.com/HuberyYang-Space/my-blog/tree/2d73f4c07366096fc899c4355088ba2c41b2c6e6)
>
> 写法约定：每条决定都写**风险**，不只写好处。风险一栏为空的决定，说明还没想清楚，不是没有风险。
> 取舍原则：**用户体验至上** —— 有体验风险的省资源做法不采用。

## 一、需求约束

| # | 约束 |
| :--- | :--- |
| 1 | 按开源项目标准走流程：基建建好再开发，第一版开发完直接发版，消费方从 npm 正式接入（暂不投入文档站） |
| 2 | 装个包、传几个 props 就能用，不碰内部 |
| 3 | 颜色自动继承宿主样式，props 可覆盖 |
| 4 | 专注一个框架（Vue），其他框架按需加壳 |
| 5 | 后期会逐渐增加特效 |

## 二、两条核心判断

**1. 内核框架无关几乎免费。** 实测 my-blog 的两个现成特效：

| 文件 | 总行数 | Vue 专有 API |
| :--- | ---: | :--- |
| [`HeroTitle.vue`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/app/components/HeroTitle.vue) | 474 | 4 处 + 4 个 ref |
| [`HeroParticles.vue`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/app/components/HeroParticles.vue) | 319 | 3 处 |
| [`utils/hero-particles.ts`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/app/utils/hero-particles.ts) | 250 | 0 |

耦合面 < 3%，其余全是 canvas / WebGL / 平台 API。框架只管四件事：挂载时机、卸载清理、props 响应、slot 与标签语义。

**2. 真正的耦合在宿主站点，不在框架。** `HeroTitle` 里读 `--c-primary`、逐帧读父元素 color、
跟 [`reset.css`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/app/assets/css/reset.css) 的 canvas 规则打架、`clamp()` 字号、`as: h1|div` —— 换框架一行不用改，换站点全要改。
库的设计难点是「宿主约定抽成什么接口」，约束 3 即对此的回应。

## 三、选型记录：为什么是这个形态

| 候选 | 结论 | 理由 |
| :--- | :--- | :--- |
| 每框架一份完整实现 | 否 | 同一 shader 维护 N 遍（Vue Bits 就是 React Bits 的独立移植） |
| 源码分发（Vue Bits / jsrepo） | 否 | 它 `private: true` 不发 npm，是被「90+ 组件 × 12 个渲染引擎」的依赖矩阵逼出来的；我们只有 1-2 个引擎，没这个约束，且违背约束 2 |
| Mitosis | 否 | npm 上仅 7 个项目依赖；`.lite.tsx` 受限子集（不能解构 props、不支持 rest 等）对命令式 WebGL 收益为零、约束照吃 |
| Stencil | 否 | 采用方是大型设计系统（Ionic、Esri Calcite、Porsche 等），痛点我们没有；output targets 现主要服务 Ionic；停维即整体重写 |
| Custom Element + CEM（v2） | 暂不 | 零框架代码，但自带一串成本：Vue 模板里默认无类型推断、要靠 CEM 补；attribute 须 kebab-case 映射与字符串解析；`customElements.define` 只能调一次、卡住 HMR；SSR 注册要守卫；每个消费方要配 `isCustomElement`。只有 Vue 消费方时成本大于收益 |
| Monorepo 双包 | 否 | changesets + 多版本号的基建税；`exports` 已提供同等边界 |
| 只发 Vue 包、不暴露内核 | 否 | 没有外部约束的内部 API 会长出 Vue 依赖，加 React 时要重设计 |
| **框架无关内核 + Vue 壳，单包多入口** | **采纳** | 内核几乎免费；Vue 壳原生获得类型检查、HMR、SSR 安全；React 壳按需加 |

**这不是单向门**：内核框架无关，将来框架变多时，Custom Element 仍可作为同一内核上的另一个门面加回来。

从 Vue Bits 学三条：props 给足（它的 `ParticleText` 有 18 个，是合理量级）；参数变化走 patch / rebuild、不设计增量 diff；继承式默认值。
不学两条：真文本用 `sr-only`（不占位，布局靠 canvas 撑 → 有 CLS）；硬编码配色（`#ffffff` / `#84CC16`，亮色主题下瞎掉）。

## 四、包结构

```
@huberyyang/todo-fx
├─ .          框架无关内核（命令式 API）
├─ ./vue      Vue 壳 —— 现在做
└─ ./react    React 壳 —— 出现第一个 React 消费方再做
```

| 项 | 决定 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 形态 | 单包多入口 | 一个版本号、一次发版；`exports` 钉死边界（`./vue` 只能走公开内核 API），将来拆包是现成切割线 | 消费方 TS 若还是 `moduleResolution: node`（node10），解析不到 `./vue` 子路径的类型；由 attw 在构建时暴露 |
| 入口粒度 | `.` 与 `./vue` 两个入口，`sideEffects: false`（v5 默认） | 按特效拆 subpath 会让入口数随特效线性增长；ESM + 无副作用声明已能按特效 tree-shake | tree-shaking 失效时，只用 `particle-text` 的消费方白背 ogl 约 10 KB —— 阶段 0 加一条产物断言：只 import `particle-text` 的打包结果里不得出现 ogl |
| 模块格式 | 仅 ESM（v5 默认） | 消费方都是 Vite / Nuxt；双格式要多维护一份 CJS 产物与类型 | 还在用 CJS 的工具链（老 Jest 配置）`require` 不到 |
| `vue` | optional peerDependency，范围 `^3.5.0`（v5 默认） | 只用内核的人不被迫装 Vue；范围只写 CI 真测过的版本 | Vue 3.4 及以下的项目装包会有 peer 警告 |
| `react` | **暂不声明** | 零消费方，加 React 壳时再加 | — |
| `ogl` | dependencies | 约 10 KB，装包即用，不必手动补 peer | 只用 `particle-text` 的消费方也会**安装** ogl（打包体积见「入口粒度」） |
| CSS | 不发 CSS 文件 | 涂透明、canvas 定位全用 inline style，免去「还要 import 一个 css」 | inline style 优先级压过宿主 class：宿主想改 canvas 定位 / 尺寸只能 `!important` |
| 构建 | **tsdown** | antfu 的 [starter-ts](https://github.com/antfu/starter-ts) 已从 unbuild 换到 tsdown；`todo-utils` / `todo-scripts` 也在用；内置 publint 与 attw | 当前最新版是 0.23.0，仍在 1.0 之前：锁版本，升级时对比产物 |
| 包名 | `@huberyyang/todo-fx`（v6 定） | 沿用 `todo-*` 系列；2026-09-23 查 npm 未被占用，`@huberyyang` scope 下已有 `todo-scripts` 等包 | 发版后改名代价很高（旧包要废弃、消费方要迁移） |

## 五、分层

```
纯计算层   零 DOM、零 WebGL、可单测            ← hero-particles.ts / approach 原样搬
内核层     canvas / WebGL / DOM，命令式，框架无关
           门控、纹理、raf、尺寸与文本监听、颜色继承、上下文恢复、清理
Vue 壳     渲染真文本与空挂载点 + 生命周期 + props 分派   ← 约 30-50 行
```

## 六、内核 API

```ts
function createLiquidText(
  textEl: HTMLElement, // 真文本元素：内核只会给它设 inline `color: transparent`
  layerEl: HTMLElement, // 空挂载点：内核独占其内部，canvas 与颜色探针都建在这里
  options?: LiquidTextOptions
): FxInstance | null

interface FxInstance {
  patch: (o: Partial<LiquidTextOptions>) => void // uniform 热更新
  rebuild: () => void // 重建纹理
  destroy: () => void
}
```

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| 只有「浏览器不支持」才返回 `null`（v6） | 调用方不写降级分支 —— 真文本一直在 DOM 里，什么都不做就是正确降级。其余不该播放的情况一律休眠，见第十一节 | 调用方分不清「不支持」和「出错」，排查「为什么没效果」只能靠 devtools |
| 不做增量 diff 的 `update()` | 要么 patch 要么 rebuild，省掉一整套 diff 设计 | 裸用内核的人要自己查参数表决定调哪个；壳从表派生分派，不受影响 |
| patch / rebuild 分家 | 颜色走重建要重新上传纹理，切主题闪一帧（已踩过） | — |
| **DOM 所有权：内核只碰两处** | 见下方实测 | 契约靠壳自觉，类型系统拦不住：壳给 `textEl` 绑了 style → Vue 重渲染时抹掉透明，真文本与 canvas 叠成重影；壳往 `layerEl` 里渲染了子节点 → Vue 的 children diff 可能清掉 canvas。两种都不报错 |
| **宽度为 0 是休眠，不是门控** | 挂载在隐藏容器（标签页、`v-show`）里的实例原本会永久失效 | 休眠实例与运行实例对调用方不可区分；**首张纹理建成前绝不能涂透明**，否则文字直接隐身 |
| **文本变化由内核自己监听**（MutationObserver） | 调用方改了文字却忘调 `rebuild`，canvas 会继续画旧字、盖在透明的新字上 —— 显示错字且不报错 | 多一个 observer；只在文本节点变化时触发，按帧合并进重建 |
| **字体加载完成后重建一次**（`document.fonts` 的 `loadingdone`） | 纹理用的是 canvas 画字那一刻的字体，webfont 晚到时字形与 DOM 对不上（my-blog 用系统字体，所以没遇到过） | 字体到达前那几帧是回退字形，加载完会跳一下 |
| **`patch({ k: undefined })` = 恢复默认** | 壳里删掉一个 prop 时，应回到继承 / 默认值 | 裸用内核时 `patch({ ...maybe })` 里显式为 `undefined` 的键会被悄悄恢复默认 |

**DOM 所有权的实测依据**（Vue 3.5.40，HeadlessChrome 153）：

| 场景 | 结果 |
| :--- | :--- |
| 往 `<span>{{ text }}</span>` 里塞一个探针节点，再改 `text` | 探针被清掉（Vue 走 `el.textContent = …`）；之后读它的计算 color 得到空串 → 解析成黑色 |
| 壳用渲染函数写 `h('canvas', { style: {...} })`，内核把 width 改成 100px，壳重渲染 | 被重设回 0px —— 每次重渲染 Vue 都会重设整个 style 对象 |
| 同上，但壳用模板写（静态 style 被编译期提升） | 保留 100px —— 能不能活下来取决于壳的写法，不可依赖 |
| 壳渲染一个空 `<span>`，内核往里塞 canvas，壳重渲染 | canvas 保留 |
| 文字 span 不绑 style，内核设 `color: transparent`，壳重渲染 | 保留 |

所以挂载点必须是**空元素**，而不是由壳渲染 canvas 交给内核。

- **patch**：`color` `accent` `strength` `chroma` `idle` `enterRadius` `wakeSpeed` `calmSpeed`
- **rebuild**：`padding` `maxDpr` `flowmap.*`；文本 / 字号 / 字体 / 尺寸变化由内核自己检测并重建

**每个特效一张参数表**（名称 / 类型 / 默认值 / 走 patch 还是 rebuild）。options 类型、默认值、
壳的 props 声明与分派逻辑全部从表派生 —— 避免每加一个参数就多处手改。

## 七、参数表（liquid-text）

从现有 const 推导，13 个。`particle-text` 的参数表在架构设计环节从 [`HeroParticles.vue`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/app/components/HeroParticles.vue) 的 const 以同样方式推导。

| 分组 | 参数 | 默认 | 走向 |
| :--- | :--- | :--- | :--- |
| 颜色 | `color` | 继承父元素计算 color | patch |
| | `accent` | **等于 `color`**（即默认没有高光），**不读任何 CSS 变量** | patch |
| 强度 | `strength` / `chroma` / `idle` | `0.075` / `0.04` / `0.0022` | patch |
| 手感 | `enterRadius` / `wakeSpeed` / `calmSpeed` | `150` / `4.5` / `2.4` | patch |
| 渲染 | `padding` / `maxDpr` | `48` / `2` | rebuild |
| 高级 | `flowmap: { falloff, alpha, dissipation }` | `0.32` / `0.6` / `0.96` | rebuild |

`flowmap` 收进一个对象，避免顶层 API 被稀释。

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| `accent` 默认等于 `color` | shader 里是 `mix(uColor, uAccent, …)`，两者相等就是无高光 —— 对宿主零假设。my-blog 显式传 `accent="var(--c-primary)"` 保持现状 | 开箱效果比 my-blog 首页平淡，不看文档的人发现不了 `accent` |
| `flowmap.*` 走 rebuild | 这三项在 ogl 里其实是 uniform，但只能经 `flowmap.mesh.program.uniforms` 这种未公开字段改，ogl 升级可能悄悄失效 | 重建 Flowmap 会清掉当前残留的笔触；它是高级参数，不会频繁改 |

## 八、Vue 壳

```vue
<LiquidText text="Hubery">_</LiquidText>
<LiquidText text="Hubery" as="div" accent="var(--c-primary)" />
```

壳渲染的结构：

```html
<!-- 根元素就是 as 元素：宿主的 class / attrs 自然落在它身上 -->
<h1 style="position: relative">
  <span>Hubery</span><!-- 插槽内容 --><span data-fx-layer></span>
</h1>
```

span、插槽、挂载点之间不留空白，否则渲染出的空格会把光标推开一格。

| 职责 | 做法 | 风险 |
| :--- | :--- | :--- |
| 写法 | `defineComponent` + 渲染函数，由通用工厂按参数表生成组件（v5 默认） | 渲染函数下 Vue 每次重渲染都重设 style 对象（第六节实测），所以**只有根元素带 style**；换成 SFC 要加 `unplugin-vue`，d.ts 走 vue-tsc |
| 真文本 | `<span>{{ text }}</span>`，**不绑定任何 style**；涂透明由内核做 | 见第六节 DOM 所有权 |
| 挂载点 | 空 `<span data-fx-layer>`，壳**绝不**往里渲染东西；空 inline 元素零尺寸，SSR 产物里不产生 CLS | 同上 |
| 定位 | 根元素 inline `position: relative`，canvas 以它为定位基准 | 覆盖宿主 class 上的定位（`sticky` / `absolute`）；宿主要改只能外面再包一层 |
| 生命周期 | `onMounted` → create；`onUnmounted` → destroy | — |
| props 变化 | watch → 按参数表分派 patch 或 rebuild；`text` 不用 watch，内核自己监听 DOM 文本 | — |
| 标签语义 | `as?: 'h1' \| 'div'`，默认 `h1`（文章页已有 h1 时传 `div`） | — |
| 去掉外层 wrapper | 原 `HeroTitle` 是 `div.hero-title > h1`，class 透传只能落在 wrapper 上，而字号类必须挂在 h1 上 | my-blog 接入时 `.hero-title` / `.hero-title-word` 类名结构会变，[`verify-build.ts`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/scripts/verify-build.ts) 的断言要同步（阶段 5 已列） |

**不可让渡：真文本留在 `<h1>` 里只涂透明，由库承担。** 不产生 CLS、能被选中朗读、能进静态产物全靠它。

天然获得（v2 要额外补的）：vue-tsc 原生类型检查、组件级 HMR、`onMounted` 只在客户端跑所以 SSR 安全、消费方零配置。

## 九、颜色继承机制

1. 探针建在挂载点里（内核独占，框架不碰）。canvas 本身兼做 `color` 探针，`accent` 另用一个隐藏 span。
   挂载点位于根元素内，所以探针继承的正是根元素的 color。
2. 每帧读探针的计算 color：`color` 未传则读继承值；传了任意 CSS 颜色字符串，就设到探针上再读回。
3. **解析交给浏览器**：计算值字符串与上一帧相同就直接复用；变了就在 1×1 的 canvas 2D 上填色，
   再用 `getImageData` 读回 sRGB。不写正则，也不手写解析器。

**为什么不能用正则**（`color.match(/\d+/g)` 取前三个数字，也就是 my-blog 现在的写法）：计算值不会统一转成 rgb。
实测（HeadlessChrome 153；已知值探针 `rgb(255, 0, 0)` 与 `#2b7a6f` 都读回正确值，环境可信）：

| 写法 | 计算值 | 正则解析 | canvas 回读 |
| :--- | :--- | :--- | :--- |
| `oklch(0.7 0.15 200)`（直接写或经 `var()`） | 原样 `oklch(…)` | `0,7,0` ✗ | `0,185,195` ✓（与独立公式换算一致） |
| `color-mix(in srgb, red 50%, blue)` | `color(srgb 0.5 0 0.5)` | `0,5,0` ✗ | `128,0,128` ✓ |
| `lab(50 40 30)` | 原样 `lab(…)` | `50,40,30` ✗ **看起来像对的，最危险** | `187,88,70` ✓ |
| `var(--未定义)` / 非法字符串 | 回落为继承色 | — | 回落为继承色 ✓（不会变黑） |

Tailwind v4 的默认调色板就是 oklch —— 按开源标准，这是第一个外部用户就会踩的坑。回读开销约 3 μs/次，
只在颜色串变化的那几帧（主题过渡约 0.2s）发生。

| 取舍 | 理由 | 风险 |
| :--- | :--- | :--- |
| 库不认识任何变量名 | `--c-primary` 是调用方传进来的字符串，对宿主零假设 | — |
| 每帧读而非只读一次 | 主题切换只改 html 的 class，颜色带过渡，读一次会永远停在旧主题 | 有脏样式时每帧强制一次样式重算，与现状同量级（实测约 1μs / 帧） |
| canvas 回读转 sRGB | 浏览器负责所有色彩空间转换，CSS 以后加新语法也不用跟 | 广色域被裁到 sRGB：实测 `color(display-p3 1 0 0)` 回读成 `255,0,0`，P3 屏上特效文字会比 DOM 文字略灰。**只在 Chromium 实测过**，Firefox / WebKit 在阶段 0 的 CI 里补测 |
| 颜色自带的 alpha 乘进最终 alpha | 宿主常用半透明色做「淡一档」的文字，忽略 alpha 会比 DOM 文字更深 | — |

**考虑过、没采用的替代方案：**

| 方案 | 为什么不用 |
| :--- | :--- |
| 放弃继承，内置亮 / 暗两套默认色，开放 props 让用户配 | 库要知道现在是亮还是暗，就得认识宿主的主题机制（`.dark` class / `data-theme` / `prefers-color-scheme`），这正是约束 3 要避免的；固定色也跟宿主的文字色对不上。继承的不确定性出在「解析」而不是「继承」，解析已经交给浏览器解决 |
| 手写颜色解析器 | CSS Color 4/5 的语法还在增加，手写解析永远追不完 |

## 十、面向增长（约束 5）

特效增多的主要风险是「每个特效把同样的样板复制一遍」。内核抽出共享件，特效只写渲染逻辑：

| 共享件 | 职责 | 风险 |
| :--- | :--- | :--- |
| `gate` | 浏览器支持检测（必需 API 清单，见第十一节）；**所需渲染能力由特效声明**（liquid-text 要 WebGL，particle-text 只要 Canvas 2D）；休眠判定（见第十一节） | 能力要求分散在各特效里，新特效漏了声明，就会在不支持的环境里直接抛错 |
| `colorProbe` | 第九节的颜色继承 | 见第九节 |
| `rebuildWatcher` | resize + ResizeObserver + dpr 变化 + 字体加载 + 文本变化，按帧合并成一次重建 | 触发源越多越难判断「这次重建是谁触发的」；调试时需要能打印触发源 |
| `loop` | raf 循环、dt 夹取 | — |
| `glLifecycle` | WebGL 上下文丢失即退回真文本、恢复时重建（见第十一节）；只有 WebGL 特效用 | 见第十一节 |
| 参数表工具 | 从表派生 options 类型、默认值、patch / rebuild 分派 | — |

**新增一个特效 = 渲染逻辑 + 一张参数表 + 一行 Vue 壳注册**（壳写成通用工厂）。
文字类特效共用 `textEl + layerEl` 这套 DOM 结构；出现非文字特效（背景类）时再为它定结构。

**拆包触发线**（满足任一才拆，在那之前不拆）：某个重量引擎被 ≥ 2 个特效使用；dependencies 总体积 > 100 KB。
three / gsap 这类 > 50 KB 的引擎走 optional peerDependency。

## 十一、门控与降级

v6 把「不播放」分成两类：**浏览器不支持**（永久，返回 `null`）与**此刻不该播放**（暂时，休眠后自动恢复）。
两类的结果都一样：真文本原样显示，调用方不写任何降级分支。

### 1. 浏览器支持：太旧直接回退真文本

不为旧浏览器写逐个 API 的回退分支。create 时检测一份**必需 API 清单**，缺任何一项就返回 `null`：

| 必需 API | 用途 | 最低版本（MDN 兼容数据） |
| :--- | :--- | :--- |
| 特效声明的渲染能力（WebGL 或 Canvas 2D） | 渲染 | — |
| `CanvasRenderingContext2D.letterSpacing` | 纹理里的字距与 DOM 一致 | Chrome 99 / Firefox 115 / **Safari 18.4** |
| `TextMetrics.fontBoundingBoxAscent` | 纹理里的基线与 DOM 一致 | Chrome 87 / **Firefox 116** / Safari 11.1 |
| `ResizeObserver` | 尺寸变化重建 | Chrome 64 / Firefox 69 / Safari 13.1 |
| `document.fonts` 的 `loadingdone` | 字体到达后重建 | Chrome 35 / Firefox 41 / Safari 10 |

由此得出的实际边界是 **Chrome 99 / Firefox 116 / Safari 18.4**，更旧的浏览器看到的就是普通文字。
my-blog 现有的回退分支（拿不到 `fontBoundingBoxAscent` 时退回中线对齐）搬进库时删掉。

| 风险 | 说明 |
| :--- | :--- |
| Safari 18.4 以下的用户看不到特效 | Safari 18.4 于 2025 年 3 月发布；卡住边界的是 `letterSpacing` |
| CI 只测三个内核的最新版 | 边界版本本身不进 CI，靠「检测不到就回退」这条安全边界兜底 |

### 2. 休眠：此刻不该播放，条件解除后自动恢复

| 休眠条件 | 为什么不该播放 |
| :--- | :--- |
| `prefers-reduced-motion: reduce` | 用户明确要求减少动效（无障碍） |
| `hover: none` | 没有指针，交互无从触发 |
| `forced-colors: active`（v6 新增） | Windows 高对比度等强制颜色模式下，浏览器会**覆盖**内核写的 `color: transparent`：实测从 `rgba(0,0,0,0)` 被改成 `rgb(0,0,0)`，真文本重新显形，与 canvas 叠成重影 |
| 文字宽度为 0 | 挂在隐藏容器里，显示后再启动 |
| 文字折行（v6 定：不支持多行） | `fillText` 永远只画一行。实测窄容器里文字折成 2 行时，外框宽度从 197px 缩到 108px，纹理画出的单行被裁掉、第二行空白 |
| WebGL 上下文丢失 | 见下表 |

**实现要求：不要复杂编码。** 所有休眠条件汇成**一个判定函数**，任何信号（媒体查询 `change`、尺寸变化、上下文事件）
到来时都重算一次：判定为「该播」就恢复，判定为「不该播」就休眠。不写状态机，不为每个条件单独写进出逻辑。
休眠 = 停 raf + 撤掉涂透明；恢复 = 重新走「首张纹理建成才涂透明」。

| 风险 | 说明 |
| :--- | :--- |
| 休眠中的实例仍占着资源 | 渲染能力要在 create 时就检测，所以减弱动效 / 触屏用户也会持有一个空闲的 WebGL 上下文（纹理未建，占用很小），计入页面上下文上限 |
| 折行即退回真文本 | 长标题在窄的桌面窗口里会失去特效。另一条路是支持多行（逐行量出每行文字再分别画），实现复杂度高一个量级 |

### 3. WebGL 上下文丢失

| 做法 | 理由 | 风险 |
| :--- | :--- | :--- |
| 进入休眠（撤掉涂透明、停 raf）；在 `webglcontextlost` 里 `preventDefault()` 允许浏览器恢复；`webglcontextrestored` 时重建全部 GL 资源，再按休眠判定自动恢复 | 不处理的话那块会变成「透明文字 + 空白 canvas」，标题消失；GPU 重置（睡眠唤醒、驱动更新）后特效要自己回来，不能要求用户刷新 | 不调 `preventDefault()` 浏览器就永远不恢复；ogl 对象持有的旧句柄全部作废，必须整套重建；页面 WebGL 上下文超出上限（Chrome 约 16 个）被挤掉的那个，浏览器不一定恢复，会停在真文本 |

### 4. 不做离屏暂停（v6）

特效滚出视口后照常渲染，不暂停。**理由：用户体验至上。** 暂停必然带来「恢复」这一步，而恢复有失手的可能：
滚动极快时看到恢复瞬间的那一帧、离开时的笔触被冻住，甚至恢复信号漏掉后特效停在原地不动 —— 任何一种都是用户看得见的缺陷。
标签页切到后台、系统睡眠时，浏览器本来就会停掉 raf，回来后自动继续，这部分不需要任何代码。

| 风险 | 说明 |
| :--- | :--- |
| 屏幕外的实例持续占用 CPU / GPU | 耗电、与可见内容争帧预算。单页一两个实例时影响很小；特效多了、出现实测卡顿再议 |

## 十二、测试

| 层 | 工具 | 守什么 |
| :--- | :--- | :--- |
| 纯计算 | vitest | `approach` 帧率无关性、粒子采样、参数表派生 |
| 内核 + Vue 壳 | **Vitest 浏览器模式**（Playwright 驱动真浏览器，v5 默认） | shader 编译失败是静默的，单测验不出。判据：canvas `readPixels` 有非透明像素。颜色回读在 **Chromium / Firefox / WebKit** 各跑一遍第九节那张表。壳：挂载 / 卸载 / props 分派；**重渲染后 canvas 尺寸与涂透明仍在**（第六节实测表的前两行作为回归用例，先让它红一次） |
| 集成 | Playwright 跑 playground 的宿主场景夹具 | 必需 API 缺失 → 返回 `null`；每个休眠条件**进出各一次**（`emulateMedia` 切 reduced-motion / forced-colors，窄容器折行，隐藏容器显示）并确认真文本可见、恢复后重新接管；文本变化后纹理跟上；用 `WEBGL_lose_context` 模拟上下文丢失与恢复；destroy 后 raf 与监听器归零、WebGL 上下文释放；SSR 渲染冒烟（`renderToString` 不碰 `window`） |
| 产物 | tsdown 内置 publint + attw；自写体积断言 | `exports` 与类型解析正确；只 import `particle-text` 的打包结果里不含 ogl |

| 决定 | 理由 | 风险 |
| :--- | :--- | :--- |
| 壳测试也进真浏览器，不用 happy-dom | happy-dom 没有 WebGL；第六节那类「重渲染抹掉内核写的东西」只有真 DOM 才验得准 | 测试慢于 happy-dom；CI 要装三个浏览器 |
| CI 里 Chromium 显式开 `--enable-unsafe-swiftshader` | CI 机器没有 GPU。Chrome 从 130 起废弃「自动回退到 SwiftShader 软件渲染」，不开这个开关 WebGL 上下文会创建失败，内核测试会全部走进门控分支 —— **全绿但什么都没测** | 软件渲染与真 GPU 的像素不完全一致，像素判据只能用「有没有非透明像素」这类宽判据；阶段 0 先用已知结果的 WebGL 探针证明 CI 环境可信 |

纪律：每个守卫写完故意破坏一次确认变红；变异后先 `cmp` 确认文件真改了再读结果；布局类判据一律挪到真浏览器。

## 十三、落地路径

v5 起按开源流程走：**基建先行，第一版发布之前，my-blog 与其他消费方不接触这个库。**

| 阶段 | 内容 | 完成判据 |
| :--- | :--- | :--- |
| 0 | 基建（构成见下） | CI 在骨架上全绿；CI 里三个浏览器的 WebGL / Canvas 2D 已知结果探针通过；两个入口产出 d.ts，publint 与 attw 零报错；`npm publish --dry-run` 的文件清单只有 `dist` 与必要元数据 |
| 1 | 抽内核 + `liquid-text` | playground 的宿主场景夹具里表现与 my-blog 现状一致；第十二节内核判据过 |
| 2 | 加 `./vue` 壳 `<LiquidText>` | 壳测试与夹具里的 Vue 页面通过 |
| 3 | 搬 `particle-text` + `<ParticleText>` | 同上。真正的验证点：内核若在这里被迫改，说明阶段 1 抽早了 |
| 4 | 发版 `0.1.0` | 本地 `pnpm release` 走完；`release.yml` 生成 GitHub Release；在一个全新空项目里从 npm 装包跑通两个入口与类型 |
| 5 | my-blog 正式接入 | `<LiquidText>` 换掉 `HeroTitle`；typecheck + [`verify-build.ts`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/scripts/verify-build.ts) 全绿（`.hero-title-word` 那条断言随结构同步改，并重新让它红一次）；my-blog 的 `minimumReleaseAgeExclude` 加上本包；[issue #1](https://github.com/HuberyYang-Space/my-blog/issues/1) 以「迁入库、删除本地副本」关闭 |
| 6 | 验证项目接入 `<ParticleText>` | 至少一个 my-blog 之外的 Vue 项目上线 |

阶段 5、6 发现的问题一律以 `0.1.x` 补丁版修复，每次都走完整发版流程。

**第一版（`0.1.0`）= 完善的基建（含发版流程与 CI，参考 `todo-scripts` 的实现）+ 两个特效**（v6 定）。
**第二个特效搬进来之前不发版** —— 只有一个用例的抽象是猜的。React 壳在出现第一个 React 消费方时启动。

**基建构成**（对齐 `todo-scripts` 的现行做法与 antfu 的 starter-ts；具体版本与配置在技术选型环节落定，待办清单届时统一制定）：

| 项 | 做法 | 风险 |
| :--- | :--- | :--- |
| 包管理 | pnpm 11，`packageManager` 字段锁版本 | pnpm 11 默认有 1 天的发布冷却期，刚发布的依赖装不上，需要时逐条豁免 |
| 构建 | tsdown，`publint: true`、`attw: true` | 见第四节 |
| 类型检查 | `vue-tsc --noEmit` | — |
| lint | @antfu/eslint-config，`.vscode` 两份配置照抄其 README | — |
| 提交规范 | `todo-scripts commitlint-init`：commitlint + husky；pre-commit 只跑 `eslint --fix` | 类型错误与测试失败要到 CI 才暴露（`todo-scripts` HB-38 的已知取舍） |
| 测试 | 见第十二节 | 见第十二节 |
| playground | Vite + 纯 HTML，内含宿主场景夹具（见下） | — |
| CI | `ci.yml`：push 到 main / dev 与 PR 时跑 typecheck、lint、test、浏览器测试 | PR 期间 push 与 pull_request 各跑一次（`todo-scripts` 已知） |
| 发版 | 本地 `pnpm release` = 全量门禁 → `bumpp --no-verify` → `npm publish`；`release.yml` 由 tag 触发，校验 tag 与版本号、重跑门禁、`changelogithub@15` 生成 Release | `npm publish` 在本地跑，包**不带 provenance**（沿用 `todo-scripts` HB-30 的取舍）。发版路径从第一版起固定：以后若改走 CI 带 provenance 发布，就不能再切回本地，否则 my-blog 的 `trustPolicy: no-downgrade` 会拒装 |
| Release notes 语言（v6） | 提交用中文（`/commit` 规定）；`changelogithub.config.ts` 把分类标题配成中文（`🚀 新功能` / `🐞 问题修复` 等）。已实测 `changelogithub@15.0.5` dry-run：中文提交与中文标题正常生成 Release 正文 | 两句写死在源码里的英文改不了：结尾的 `View changes on GitHub`，以及没有可收录提交时的 `No significant changes`；作者署名前的 `by` 也是英文 |
| 分支 | dev 开发 → PR → main，merge commit | — |
| 仓库文件 | LICENSE（MIT）、中文 README、Release notes 即 changelog。英文 README 等推广到社区时再加（v6） | 推广前外部读者只有中文文档 |

**宿主场景夹具**：my-blog 的正式测试放在发版之后，那里暴露的问题每个都要走一次发版才能修。所以把 my-blog 已知的宿主陷阱在库里复刻成夹具，让问题在发版前就暴露：

| 夹具 | 对应的真实陷阱 |
| :--- | :--- |
| reset 里有 `canvas { max-width: 100% }` | 画布被横向压扁，字又小又偏左 |
| body 的 color 带 0.2s 过渡，切主题只改 html 的 class | 颜色停在上一个主题 |
| `clamp()` 响应式字号 + 负 `letter-spacing` | 纹理与 DOM 文字对不齐，光标压字 |
| `overflow: hidden` 的容器（对应 my-blog 的 `::demo`） | 画布四周的流动溢出被裁掉 |
| oklch / lab / color-mix 颜色 | 第九节的解析坑 |
| 挂载在隐藏容器里，之后再显示 | 实例永久失效 |
| 同页多个实例 | WebGL 上下文上限 |
| 窄容器里文字折行 | 纹理只画一行，被裁掉（应进入休眠） |

## 十四、真实代价

| 代价 | 说明 / 缓解 |
| :--- | :--- |
| 真实站点的验证晚于发版 | my-blog 在阶段 5 才接入，那里的问题只能走补丁版修；用第十三节的宿主场景夹具前移 |
| 调参反馈变慢 | my-blog 最近 5 次提交有 3 次在调首页特效，这类迭代最吃反馈速度。调参一律在库的 playground 里做，调完再发版 |
| 内核抽象只有一个用例时是猜的 | 阶段 3 检验；抽错的后果不是报错，而是之后每个特效都在和内核打架 |
| CI 里跑 WebGL | 要显式开软件渲染开关，且软件渲染与真 GPU 像素不完全一致，见第十二节 |
| 跟随 Vue 升级 | 本来就要在 my-blog 里做，不算新增 |
| 将来的 React 壳 | Strict Mode 开发期双挂载 → WebGL 上下文必须销毁干净；Next.js 服务端组件下要 `'use client'` |
| DOM 所有权契约靠自觉 | 类型系统拦不住壳给文字绑 style 或往挂载点里渲染子节点；靠第十二节的回归用例兜 |
| 旧浏览器看不到特效 | Safari 18.4 / Firefox 116 / Chrome 99 以下直接显示普通文字，见第十一节 |
| 屏幕外的实例持续渲染 | 不做离屏暂停的代价：耗电、与可见内容争帧预算，见第十一节 |
| 新版本进 my-blog 受 CI 规则约束 | my-blog 的 CI 用 pnpm 11，默认发布冷却期 1 天 —— 不豁免的话补丁版要等一天才能装；豁免写在 my-blog 的 `minimumReleaseAgeExclude`。provenance 见第十三节「发版」 |

## 十五、明确不做

| 不做 | 理由 |
| :--- | :--- |
| React 壳（现在） | 零消费方 —— 只被自己测试引用的代码不该存在 |
| Custom Element / CEM（现在） | 见第三节；内核框架无关，将来可作为门面加回 |
| Shadow DOM | 隔断宿主 CSS 变量与主题切换，正是第九节所依赖的 |
| Monorepo | 未触发拆包线之前是纯基建税 |
| 源码分发 / Mitosis / Stencil | 见第三节 |
| 发 CSS 文件 | 全用 inline style |
| 硬编码配色默认值 / 内置亮暗两套色 | 亮色主题下会瞎掉；要判断亮暗就得认识宿主的主题机制，见第九节 |
| 手写颜色解析器 | 见第九节 |
| 本地链接（`link:`）消费 | v5 改为发版后从 npm 正式接入；链接期间消费方无法通过 CI 部署，还可能加载两份 Vue |
| 离屏暂停 | 恢复这一步有让用户看见缺陷的可能，见第十一节 |
| 为旧浏览器写逐个 API 的回退分支 | 太旧直接回退真文本，见第十一节 |
| 多行文字的特效（v6 定） | 折行即休眠、显示真文本；逐行排版的实现复杂度高一个量级 |
| 跨实例共享 WebGL 上下文 | 要改渲染架构；单页超过上下文上限前不做，超限的实例停在真文本 |
| 文档站 | README + 类型定义够 |

## 十六、版本演进

- **v1**：框架无关内核 + `./vue` 壳
- **v2**：零框架代码（Light DOM Custom Element + CEM 生成类型）
- **v3（采纳）**：回到 v1 形态。v2 的类型洞、CEM 工具链、attribute 映射、HMR、SSR 注册、消费方配置，
  在只有 Vue 消费方时成本大于收益；React 壳按零消费方原则推迟
- **v4（形态不变）**：内核签名加 `layerEl`，DOM 所有权收窄到两处；颜色解析改为 canvas 回读；
  宽度为 0 改休眠；文本变化与字体加载由内核监听；构建定 tsdown；第二个特效定为 `particle-text`
- **v5（形态不变）**：流程改为基建先行、发版后消费方从 npm 正式接入，删除 `link:` 路线；
  上下文丢失从「不恢复」改为「退回真文本并在恢复后重新接管」；离屏暂停改为提前恢复；
  补齐阶段 0 基建清单与宿主场景夹具；入口粒度、模块格式、peer 范围、壳写法、壳测试方案给出默认
- **v6（形态不变）**：「不播放」分为浏览器不支持（返回 `null`）与休眠（自动恢复）；休眠条件汇成一个判定，
  reduced-motion / hover:none 改为实时响应，新增 forced-colors 与文字折行；浏览器支持定为「必需 API 清单，缺一项就回退真文本」；
  不做离屏暂停；不支持多行文字；第一版 = 完善基建 + 两个特效；中文提交与中文 Release 标题；包名定为 `@huberyyang/todo-fx`。设计方案收尾

## 十七、待讨论（下一步）

设计方案层面已无待确认项。以下议题属于下一环节，不在设计方案里定。

**移交技术选型与架构设计环节：**

| 议题 | 现状 |
| :--- | :--- |
| 入口粒度、模块格式、`vue` peer 范围、Vue 壳写法、壳测试方案 | 已有 v5 默认（第四、八、十二节），在技术选型环节确认 |
| 基建的具体版本与配置 | 第十三节「基建构成」只定了做法，版本与配置在技术选型环节落定 |
| `particle-text` 的 API 与参数表 | 按 `liquid-text` 的同一套规则推导（第六、七节），在架构设计环节落定 |
| 内核的模块划分 | 第十节共享件的边界与文件组织，在架构设计环节落定 |

**发版后再议：**

| 议题 | 现状 |
| :--- | :--- |
| 验证项目 | `particle-text` 由哪几个 Vue 项目接入 |
