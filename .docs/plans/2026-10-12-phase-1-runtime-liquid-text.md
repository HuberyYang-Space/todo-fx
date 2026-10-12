# 阶段 1：运行时 + liquid-text 实现计划

> **给执行者（agent）：** 必须配合 superpowers:executing-plans（本会话内执行）或 superpowers:subagent-driven-development（逐任务派子 agent）使用。
> 步骤用 `- [ ]` 勾选框跟踪。

**目标：** 按 [`todo.md`](../todo.md)「阶段 1」落地纯计算层、运行时骨架与共享件、`liquid-text` 特效和公开入口 `.`，
让 playground 的 8 个宿主场景夹具跑起真特效，并满足 [`design.md`](../design.md) 第十二节的内核判据。

**做法：** 自底向上、每层先写测试再实现：纯计算（unit）→ 文字光栅与画布定位（browser，直接测）→ 运行时 `defineEffect`
（browser，用一个只记录调用的假特效测全部时序）→ `liquid-text`（browser，读回像素）→ 公开入口、产物断言、夹具集成与 playground。
每个守卫写完都按变异清单逐个改坏、确认变红。最后推 dev 让 CI 补上 Firefox，再做真实浏览器验收与文档回写。

**技术栈：** 同阶段 0：pnpm 12.5.1 · TypeScript 6.0.3 · tsdown 0.23.0 · Vitest 5.0.1（浏览器模式 + Playwright 1.63.0）·
ESLint 10 + @antfu/eslint-config 9.5.1 · ogl 1.0.11

**依据：** [`todo.md`](../todo.md)「阶段 1」与「阶段 0 留下的注意事项」· [`architecture.md`](../architecture.md) 全文 ·
[`design.md`](../design.md) 第六、七、九、十一、十二、十三节 · [`tech-stack.md`](../tech-stack.md) 第六节 ·
my-blog 的 [`HeroTitle.vue`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/app/components/HeroTitle.vue)
与 `app/utils/animation.ts`、`test/animation.test.ts`（本地 `~/Desktop/code/my-blog`，HEAD `d8eb619`）。

---

## 执行偏离（2026-10-12，执行后补记）

本计划已执行完毕，以仓库现状为准；正文里对应的旧段落不再逐处改写：

1. **拍板结果**：一采纳（液态版关掉混合）；二选 B（claude-in-chrome 按 DOM 状态与 console 验，手感由 Hubery 肉眼看）；三、四、五同意；执行方式本会话直接执行。
2. **modern-colors 夹具不折行的改动从任务 5 挪到任务 3**：任务 3 的颜色测试就依赖它（长颜色串在测试 iframe 里折行 → 休眠 → 没有帧）。
3. **CI 第一次红在 quality 的类型检查**（run 38195255471；browser 与 min-peer 绿，Firefox 首次跑全过）：playground 按包名导入内核，
   类型解析经包自引用落到 `dist`，CI 先类型检查、还没有 dist 就 TS2307；本地因为有旧 dist 没暴露。删掉 dist 后本地复现，tsconfig 加 `paths` 把包名指向 `src`（提交 554f083）。
4. **任务 7 在真实 Chrome 里发现的缺陷**（提交 03d3829）：休眠只撤涂透明、画布还停在最后一帧 —— 折行夹具里真文本与旧画面叠成重影；
   many-instances 里被挤掉上下文的两块画布画成不透明的白块，盖住真文本和上方说明。把被挤掉的画布藏起来再截图做 A/B，确认是画布本身。
   修法：画布初始 `visibility: hidden`，与涂透明同进同退。先补测试 20 条红，修后全绿；3 条变异（休眠不藏、开播不露、初始不藏）均红；Chrome 里复核正常。
   计划阶段的干跑与自动化测试都没抓到它：测试只断言了涂透明，没断言画布可见性 —— 又一次「断言了规则存在，没断言它作用在谁身上」。
5. **任务 7 的验收方式**：playground 所在标签页在后台（`visibilityState: hidden`），raf 不跑；截图会推一帧，所以用截图推帧、以 DOM 状态与 console 为结论，截图只作辅助。
   已验：clamp-font（画布偏移恰为 padding、dpr 1.8 下像素尺寸正确）、reset-canvas（画布宽 204 vs 文字 108，没被压扁）、modern-colors（4 个都接管、不折行）、
   many-instances（[0,1] 停在真文本且画布隐藏，其余接管）、narrow-wrap 与 hidden-container（休眠 / 恢复日志与操作对应）、theme-transition（切换后接管不断）。
   窗口尺寸变化时日志打出过「重建：resize、dpr」，dpr 信号在真实窗口里触发过。手感一致性（流动、色差、余韵、醒来与静下的速度、边缘粗细）留给 Hubery 对照。
6. **执行脚本**：`task-start` / `task-done` 按英文「Task N」找标题，本计划用「任务 N」，改为手写账本行。
7. **CI**：修复后 dev 上 run 38195756526 三个 job 全绿（browser 36 个文件，含 Firefox 与三个 touch instance）。
8. **终审**（opus，独立上下文）：Critical 2、Important 2、Minor 7。重新定级后把 WebKit 的挤占竞态（标题隐身一帧）由 Minor 上调为 Important。逐条先写测试见红再修：
   - Critical：03d3829 给画布显式写 `visibility: visible`，盖过了宿主祖先的 `visibility: hidden`；`visibility: hidden` 的画布仍算进滚动溢出，
     休眠中（触屏用户一开始就是）从没 build 过的画布带着 ogl 写的 300×150 撑出横向滚动。改用 `display: none`，定位基准从挂载点取（9dbd235）。
     首次 build 定位的变异起初是绿的（被 ResizeObserver 首次回调触发的第二次 build 掩盖），补了「每次 build 定位一致」的断言后才红。
   - Important：祖先 `transform: scale` 时按布局尺寸建画布、指针坐标同步换算（5cbcf1c）；`text-transform` 画进纹理（108eb93，capitalize 分词先在两个内核里实测）；
     首帧交接前查 `isContextLost()`（d2fe8e5）。竞态的夹具测试依赖机器负载（单跑 WebKit 抓不到），另补一条在祖先捕获阶段拦下 lost 事件的确定性测试（两内核变异均红）。
   - Minor 记入 [`todo.md`](../todo.md)「阶段 1 遗留问题」。
   - 修完本地门禁 30 个文件 308 条全过；原有的运行时 38 条、液态版 9 条变异重跑仍全红。
9. **推送后 CI 的 Linux WebKit 红了一次**（run 38211998163）：transform 那条测试数到了多出来的一次 build。根因是终审 Minor 里的「开播后 ResizeObserver 首次回调再建一次」，
   慢机器上它晚于首帧到达，被算进了被测操作。本地把 ResizeObserver 回调推迟 150ms 复现（另一条计数测试同样红），于是不再当 Minor 延后：
   watcher 比对尺寸、没变就不算信号；先写「开播只建一次」的测试见红再修，推迟回调的复现随之全绿；首次 build 定位的变异不再被掩盖，直接红在两条测试上。
   第一版的起始尺寸取 `getBoundingClientRect`，CI 上 transform 那条又红了一次（run 38212512796）：祖先缩放时它与 ResizeObserver 的布局尺寸对不上，照样多出一次信号。
   改为取计算样式（content-box 补上内边距与边框；计算样式里的内边距是声明值、布局按 1/64px 对齐，实测相加差 0.012px，所以留 0.1px 容差），补「transform / 小数宽度 / 两种 box-sizing 下都只建一次」三条测试先见红；
   ResizeObserver 回调推迟 300ms 的压力复现两内核全绿，5 条变异两内核全红。

## 需要 Hubery 拍板的事

### 一、液态版关掉混合（行为变化，建议采纳）

my-blog 的 `Program` 开着 `transparent: true`，即 `blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)`。画布每帧先清成全透明、只画一遍，
混合唯一的作用是把 alpha **再乘一次**：存进缓冲区的是 `alpha²`、颜色被乘上 `alpha`。计划阶段实测（Chromium）：

| 父元素颜色 | 开着混合时读回 | 关掉混合时读回 |
| :--- | :--- | :--- |
| `rgb(0, 0, 0)`（字心） | `0,0,0,255` | `0,0,0,255` |
| `rgba(0, 0, 0, 0.6)` | `0,0,0,92`（0.36） | `0,0,0,153`（0.6） |
| `rgba(255, 0, 0, 0.6)` | `153,0,0,92` | `255,0,0,153` |

- 不关的话 [`design.md`](../design.md) 第九节「颜色自带的 alpha 乘进最终 alpha」做不到（0.6 会变成 0.36）。
- 对 my-blog 现有的不透明文字：字心不变；**抗锯齿边缘从 `alpha²` 变成 `alpha`**，与 DOM 文字的边缘一致，画布那份字会比现在「粗」一点点
  （更接近底下的真文本，真文本与画布交接时不再细一圈）。这是唯一一处肉眼可能看得出的差异，任务 7 的对照验收会专门看它。
- 不采纳的后果：保留混合，删掉「颜色 alpha 乘进最终 alpha」那条测试，在 design 第九节注明半透明色会被平方。

### 二、真实浏览器验收怎么做（完成判据「表现与 my-blog 现状一致」）

自动化测试证明得了「画得出字、颜色对、休眠进出对」，证明不了「手感和 my-blog 一样」。任务 7 二选一：

- **A（建议）**：Hubery 自己开 `pnpm play` 与 my-blog 首页（`pnpm dev`）并排对照，按任务 7 的清单逐项看，把结论告诉我。
- **B**：授权我用 claude-in-chrome 打开 playground，按 DOM 状态与 console 输出验（不以截图为准）。它验得了休眠、接管、debug 日志，
  验不了「手感一致」，这一项仍要 Hubery 看一眼。

### 三、`user-select: none` 落到阶段 2 的壳上

my-blog 的根元素有 `user-select: none`（看得见的字在画布上、能选中的是透明真文本，框选时会浮出一块对不上的选区色块）。
内核只碰 `textEl` 的 inline color 与 `layerEl` 内部，碰不到根元素，所以这条只能由壳在根元素的 inline style 上加。
建议在 [`todo.md`](../todo.md) 阶段 2「通用工厂与组件」一项里补上这条（任务 8 做）；不采纳的话阶段 2 保持现状、my-blog 接入时框选会露出选区色块。

### 四、CLAUDE.md 的改动（按全局规则须同意）

| 改哪里 | 改成什么 | 什么时候改 |
| :--- | :--- | :--- |
| 「当前状态」一行 | 「**当前状态：阶段 1（运行时 + liquid-text）已完成，下一步是阶段 2（Vue 壳 `<LiquidText>`）。**」；若终审留下遗留问题，改成「阶段 1 已完成、遗留问题待清零」 | 任务 8，终审之后 |

### 五、对外操作的授权

批准本计划即授权：任务 6 把 dev 推到 origin，触发 CI（本机 Firefox 起不来，Firefox 的结果只能来自 CI）。**合并到 main 到时再问。**

### 六、执行方式

建议本会话直接执行（superpowers:executing-plans）：计划阶段已在隔离 worktree 里把全部代码干跑过一遍（见下一节），
任务之间共用大量接口（参数表类型、`FrameState`、假特效），逐任务派子 agent 要反复重建上下文，收益小。
最后由一个独立的终审 agent 看整个分支。

---

## 计划阶段的干跑（2026-10-12）

本计划里的**每一段代码都在隔离 worktree 里实跑过**（基于 dev 的 `1bf2e07`，node_modules 软链到主仓库），结论：

- `vue-tsc --noEmit`、`eslint .`、`tsdown`（attw / publint 零报错）全过。
- 本地门禁 30 个测试文件、288 条全过：unit + dist + Chromium + WebKit + 两个 touch instance。**本机 Firefox 仍起不来**
  （`Could not find profile folder`，与阶段 0 相同），Firefox 只能看 CI。
- 变异：运行时 38 条、液态版 9 条、文字光栅 3 条、产物对照 1 条，逐条确认文件真的变了（md5）再跑测试，**全部变红**；
  唯一例外：「文字光栅改回 middle 对齐」只在 Chromium 上红、WebKit 上绿 —— WebKit 的 `middle` 按字体外框的中点算，
  与基线定位等价，在 WebKit 上这不是缺陷。测试里写明。
- 干跑中发现并已写进本计划的坑：
  1. **ogl 要进 browser project 的 `optimizeDeps.include`**，否则首次 import 时 Vite 中途预构建、整页重载（`Vite unexpectedly reloaded a test`）。
  2. **vitest 把 `window.addEventListener` 换成了自己的包装**，`vi.spyOn(EventTarget.prototype, 'addEventListener')` 看不到 window 上的监听（resize、mousemove），
     要单独 spy `window`。不这样做的话「destroy 不停指针」的变异是绿的。
  3. **非法颜色串赋给 `style.color` 会被忽略、留下上一个值**（三内核实测），所以探针每次先清空再赋值，非法串才回落为继承色。
  4. **ogl 的 `renderer.setSize` 会把画布的 inline 宽高改写成取整后的值**（240.5px → 241px），所以液态版不调它，画布尺寸只归 layer 管。
  5. **WebGL 画布要在 raf 里读像素**：画面合成后绘图缓冲区被清空，`setTimeout` 里读到全是 0（三内核实测）。
  6. **超出上下文上限被挤掉的上下文，即使 `preventDefault()` 也不会被恢复**（Chromium、WebKit 实测，18 个里丢 `[0,1]`，2.5 秒内没有 `restored`，
     不会互相挤来挤去），所以被挤掉的实例稳定停在真文本。
  7. **ogl 的 `Texture` 发现 `image` 换了对象就会自动重新上传**，`needsUpdate = true` 是多余的（删掉后测试照样能抓到「纹理没更新」）。
  8. modern-colors 夹具的标题文字就是颜色串本身，在测试 iframe 的窄视口里会折行、进入休眠，夹具里加 `white-space: nowrap` 与 24px 字号。

## 与架构文档的偏离（任务 8 回写进 architecture / design）

| # | 架构文档原文 | 本计划的做法 | 理由 |
| :--- | :--- | :--- | :--- |
| 1 | `FrameState.pointer` 只有 `x, y, vx, vy` | 加 `moved: boolean`：上一帧之后有没有新的 mousemove | 液态版的速度要「事件来时覆盖、每帧衰减 0.92」，不知道有没有新事件就只能每帧覆盖成同一个值，速度永远衰减不下去 |
| 2 | design 第九节：canvas 兼做 `color` 探针，`accent` 另用一个隐藏 span | 每个颜色类参数一个隐藏 span；参数表的颜色行可写 `fallback: 'color'`（accent 没传时取 color 的值） | 一条路径处理所有颜色参数；canvas 的 inline style 只归 layer 管 |
| 3 | `rebuild-watcher` 按帧合并 | watcher 每个信号都回调；运行时只记「待重建」并同步重新判定，真正的重建放在下一次 raf 回调里、紧接着就画 | 重建要改画布尺寸、会清空画布，分在两帧的话中间会合成出一帧空白；放在同一个回调里，合并也自然成立（测试用 `document.timeline.currentTime` 证明同帧） |
| 4 | 钩子异常一律熔断 | create 时 `setup` 抛错：撤掉画布、`console.error` 一次、返回 `null`；其余钩子抛错照原文熔断 | 此时实例还不存在，返回 `null` 让调用方拿到的仍是「真文本」这一种结果 |
| 5 | `debug` 打印日志 | 走 `console.warn`，前缀 `[todo-fx]` | lint（antfu）只放行 `warn` / `error` |
| 6 | 公共参数「可以被特效覆盖默认值」 | 不做覆盖机制：特效参数表里用同名键重写那一行即可（运行时 `{ ...commonParams, ...params }`） | 零额外代码；阶段 3 的 `calmSpeed: { ...commonParams.calmSpeed, default: 2.6 }` 就是这样写 |
| 7 | 液态版 `flowmap.*` 走重建 | 每次重建只在 `flowmap` 三个值变了时才换新 Flowmap | 窗口缩放也会触发重建，每次都换新会把正在流动的笔触清掉；my-blog 只在挂载时建一次 |
| 8 | （未写） | 液态版不开混合，见「拍板一」 | — |
| 9 | （未写） | `maxDpr` 不是正数时按 1 | 0 尺寸画布画不出东西、文字却照样涂透明，标题隐身 |
| 10 | （未写） | 对象类参数（`flowmap`）patch 时没传的子项回到默认值，不保留上一次的值 | 与「`undefined` 恢复默认」同一个语义；Vue 壳传的本来就是整个对象 |

---

## 全局约束

- 回答、注释、提交、文档一律简体中文；注释只写「为什么」。导出的声明上方注释写成 `/** */`（`slop/prefer-jsdoc`）。
- 提交一律走 `/commit` skill（中文、conventional commits、不加 Co-Authored-By），正文每行不超过 100 字符（commitlint）；主题不要以大写英文单词开头（subject-case 会拒）。
- 零消费方的定义一律删除；只被测试用的导出收窄成文件内可见（本计划里 `FrameState` 等类型不导出，测试从钩子签名里取）。
- 依赖方向 lint 规则不许为过 lint 放宽或加 disable 注释；`no-console` 只放行 `warn` / `error`。
- 本计划不新增、不升级任何依赖（ogl 已在 dependencies）。TypeScript 锁 6.x。
- 内核只碰两处 DOM：`textEl` 的 inline color、`layerEl` 内部。不发 CSS 文件，不设硬编码配色默认值。
- 变异实验直接调 `node_modules/.bin/<工具>`，不走 `pnpm exec` / `pnpm run`；每次变异后确认文件真的变了再读结果（下面的脚本用 md5 比对并打印）。
- 浏览器相关命令在沙箱外执行；`vitest run <文件> -u`，不要写成 `vitest run -u <文件>`。
- 改 shader 后必须在真实浏览器里读回像素验证（任务 4 的测试就是这一步），构建和单测证明不了它。

## 执行须知

- **本地门禁**（本机 Firefox 起不来，不带它）：
  ```bash
  node_modules/.bin/vue-tsc --noEmit && node_modules/.bin/eslint . && \
  node_modules/.bin/vitest run --project unit --project dist --project 'browser (chromium)' --project 'browser (webkit)' --project chromium-touch --project webkit-touch
  ```
  project 名写错会被 vitest **静默跳过**（阶段 0 踩过），看一眼汇总里的文件数：任务 5 之后应为 30 个文件。
- **单跑一个浏览器测试文件**：`node_modules/.bin/vitest run test/browser/<文件> --project 'browser (chromium)' --project 'browser (webkit)'`。
- **变异脚本**：任务 1 Step 0 把它存到 scratchpad，之后每个任务的变异清单都用它跑。清单里每一项的 `old` 必须在文件里恰好出现一次，否则打印 `[SKIP]`。
- 测试里的 `expect.poll` 默认等 1 秒；主题过渡那条显式给了 2 秒。

## 重点审查

计划里没有测试兜住、或只能部分兜住的地方，审阅时重点看：

| 输入 / 情形 | 期望 | 现状 |
| :--- | :--- | :--- |
| 窗口在不同 dpr 的显示器之间移动 | 重建一次，纹理不发虚 | 监听写了（`resolution` 媒体查询），**没有自动化守卫**：测试环境里改不了 dpr。任务 7 有条件就手测 |
| `hover: none` 退出（平板接上鼠标） | 恢复播放 | 只测了「一直休眠」那一半：`hover: none` 只能靠 `hasTouch` 的 instance 仿真，进出不了 |
| 宿主文字是斜体（`font-style: italic`） | 纹理与 DOM 字形一致 | 不处理：font 简写只拼 `weight size family`（与 my-blog 一致）。拼 `fontStyle` 时 `oblique 14deg` 这类计算值可能让整条 font 赋值失效、退回 10px，风险更大。README 写明 |
| 裸用内核时文字元素里带换行缩进（`<span>\n  Hubery\n</span>`） | 纹理与 DOM 对齐 | 不处理：纹理画的是 `textContent` 原文。壳渲染的 span 没有多余空白；裸用的要求写进 `create` 的类型注释（任务 3 已写「textEl 是 inline 元素」，任务 8 在 README 里补这条） |
| 根元素没有定位上下文（裸用内核） | 画布对准文字 | 不处理：`create` 的类型注释写明要求；壳会给根元素 inline `position: relative` |

已经补上测试的边界（干跑时从上表挪下来的）：webfont 晚到的 `loadingdone` 信号、`maxDpr` 传 0、首帧之前就 destroy、宿主原有的 inline color、
超出上下文上限被挤掉的实例、`enterRadius` 为 0、patch 里混进原型链上的键名。

## 文件结构

```
src/
├─ index.ts                      改：导出 createLiquidText、liquidTextOptionTypes、类型 LiquidTextOptions、FxInstance
├─ compute/
│  ├─ approach.ts                新：指数逼近（my-blog 原样搬入）
│  ├─ proximity.ts               新：点到矩形的靠近度
│  └─ params.ts                  新：参数表派生、合并、patch 路由、选项类型映射
├─ runtime/
│  ├─ common-params.ts           新：7 个公共参数
│  ├─ loop.ts                    新：raf 与 dt 夹取
│  ├─ gate.ts                    新：必需 API 清单、媒体查询信号、休眠判定函数
│  ├─ layer.ts                   新：建画布、定尺寸与位置
│  ├─ text-raster.ts             新：文字画进离屏画布并与 DOM 对齐
│  ├─ color-probe.ts             新：颜色继承与 canvas 回读
│  ├─ pointer.ts                 新：鼠标坐标、速度、靠近度与 hover
│  ├─ rebuild-watcher.ts         新：resize / ResizeObserver / dpr / 字体 / 文本 信号
│  ├─ gl-lifecycle.ts            新：上下文丢失与恢复、主动交还
│  └─ define-effect.ts           新：运行时本体
└─ effects/liquid-text/
   ├─ params.ts                  新：独有参数表
   ├─ shaders.ts                 新：vertex / fragment
   └─ index.ts                   新：特效本体与 createLiquidText

test/
├─ unit/approach.test.ts         新（my-blog 原样迁入）
├─ unit/proximity.test.ts        新
├─ unit/params.test.ts           新
├─ browser/helpers.ts            新：等帧、挂标题、在 raf 里读像素
├─ browser/fake-effect.ts        新：只记录调用的假特效
├─ browser/text-raster.browser.test.ts         新
├─ browser/runtime.browser.test.ts             新：运行时的全部时序
├─ browser/runtime.touch.test.ts               新：hover: none
├─ browser/liquid-text.browser.test.ts         新：液态版的渲染
├─ browser/liquid-text-fixtures.browser.test.ts 新：8 个宿主夹具跑真特效
├─ artifact/no-ogl.test.ts       改：加真实入口的对照
└─ artifact/__snapshots__/tsnapi/…/index.snapshot.{js,d.ts}  改：tsnapi 快照

playground/main.ts               改：对夹具的每个 targets 调 createLiquidText
playground/fixtures/modern-colors.ts  改：标题不折行
vitest.config.ts                 改：browser project 的 optimizeDeps 加 ogl
```

不迁 my-blog 的 `hero-title.test.ts`（[`todo.md`](../todo.md) 已定）：它守的三件事在这里都换成了行为测试 ——
reset 压画布（任务 3「宿主 reset 的 canvas { max-width: 100% } 压不扁画布」）、颜色停在旧主题（任务 3「主题切换时颜色跟着过渡走到新主题」）、
卸载时交还上下文（任务 3「destroy」）。

---

### 任务 0：开工检查

- [ ] **Step 1：工作区与基线**

```bash
git status --short && git log --oneline -1
```
预期：工作区干净，在 `dev`，HEAD 为 `1bf2e07`（或其后只有本计划的文档提交）。

- [ ] **Step 2：本地门禁基线**

跑「执行须知」里的本地门禁。预期：全绿（阶段 0 的状态）。不绿就先停下来查，不带着红的基线开工。

---

### 任务 1：纯计算层

**Files:**
- Create: `src/compute/approach.ts`、`src/compute/proximity.ts`、`src/compute/params.ts`
- Test: `test/unit/approach.test.ts`、`test/unit/proximity.test.ts`、`test/unit/params.test.ts`

**Interfaces:**
- Produces：`approach(current, target, dt毫秒, speed): number`；`proximity(x, y, box, radius): number`；
  `ParamTable`、`ParamValues<T>`、`Options<T>`、`OptionTypes<T>` 类型；`resolveParams(table, options?)`、`applyPatch(table, values, patch): string[]`、`optionTypesOf(table)`。

- [ ] **Step 0：把变异脚本存到 scratchpad**（之后各任务共用）

`<scratchpad>/mutate.py`：

```python
import subprocess, sys, json, hashlib, re
WT = sys.argv[1]
muts = json.load(open(sys.argv[2]))
testfile = sys.argv[3]
project = sys.argv[4] if len(sys.argv) > 4 else 'browser (chromium)'
for m in muts:
    path = f"{WT}/{m['file']}"
    orig = open(path).read()
    if orig.count(m['old']) != 1:
        print(f"[SKIP] {m['name']}: old 出现 {orig.count(m['old'])} 次"); continue
    open(path, 'w').write(orig.replace(m['old'], m['new']))
    changed = hashlib.md5(open(path,'rb').read()).hexdigest() != hashlib.md5(orig.encode()).hexdigest()
    r = subprocess.run([f"{WT}/node_modules/.bin/vitest", 'run', testfile, '--project', project], cwd=WT, capture_output=True, text=True)
    out = r.stdout + r.stderr
    fails = sorted(set(re.findall(r'FAIL .*?> (.*)', out)))
    summary = re.findall(r'Tests\s+(.*)', out)
    open(path, 'w').write(orig)
    print(f"[{'RED ' if r.returncode else 'GREEN'}] {m['name']} (文件已变:{changed}) {summary[-1] if summary else ''}")
    for f in fails[:6]: print('      ', f.strip())
```

用法：`python3 <scratchpad>/mutate.py <仓库根> <清单.json> <测试文件> [project]`，project 默认 `browser (chromium)`。

- [ ] **Step 1：写测试**

`test/unit/approach.test.ts`（从 my-blog 的 `test/animation.test.ts` 原样迁入，只改了 import 路径与中文破折号）：

```ts
import { describe, expect, it } from 'vitest'
import { approach } from '../../src/compute/approach'

// 从 my-blog 的 test/animation.test.ts 原样迁入
describe('approach', () => {
  it('朝目标推进，不会越过目标', () => {
    expect(approach(0, 1, 1000, 1)).toBeLessThanOrEqual(1)
    expect(approach(1, 0, 1000, 1)).toBeGreaterThanOrEqual(0)
  })

  it('dt 为 0 时原地不动', () => {
    expect(approach(0.4, 1, 0, 1)).toBeCloseTo(0.4)
  })

  it('收敛速度与帧率无关——同样的总时长，拆成多帧走到的位置相同', () => {
    const once = approach(0, 1, 100, 6)
    let stepped = 0
    for (let i = 0; i < 10; i++)
      stepped = approach(stepped, 1, 10, 6)

    expect(stepped).toBeCloseTo(once, 4)
  })

  it('已经在目标上就停住', () => {
    expect(approach(1, 1, 16, 6)).toBeCloseTo(1)
  })

  it('speed 越大收敛越快', () => {
    expect(approach(0, 1, 100, 12)).toBeGreaterThan(approach(0, 1, 100, 3))
  })
})
```

`test/unit/proximity.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { proximity } from '../../src/compute/proximity'

const box = { left: 100, top: 100, right: 200, bottom: 150 }

describe('proximity', () => {
  it('压在框内（含边线）为 1', () => {
    expect(proximity(150, 120, box, 50)).toBe(1)
    expect(proximity(100, 100, box, 50)).toBe(1)
    expect(proximity(200, 150, box, 50)).toBe(1)
  })

  it('四个方向按到边的距离线性衰减', () => {
    expect(proximity(75, 120, box, 50)).toBeCloseTo(0.5)
    expect(proximity(225, 120, box, 50)).toBeCloseTo(0.5)
    expect(proximity(150, 75, box, 50)).toBeCloseTo(0.5)
    expect(proximity(150, 175, box, 50)).toBeCloseTo(0.5)
  })

  it('斜角方向按到角点的直线距离算，不是两轴分别算', () => {
    // 到右下角 (200, 150) 的距离是 30·√2 ≈ 42.4
    expect(proximity(230, 180, box, 50)).toBeCloseTo(1 - Math.hypot(30, 30) / 50)
  })

  it('超出半径为 0，不会变负', () => {
    expect(proximity(0, 0, box, 50)).toBe(0)
  })

  it('半径为 0 时框内为 1、框外为 0，不出 NaN', () => {
    expect(proximity(150, 120, box, 0)).toBe(1)
    expect(proximity(201, 120, box, 0)).toBe(0)
  })
})
```

`test/unit/params.test.ts`：

```ts
import type { ParamTable } from '../../src/compute/params'
import { describe, expect, it } from 'vitest'
import { applyPatch, optionTypesOf, resolveParams } from '../../src/compute/params'

const table = {
  color: { type: 'color', route: 'patch' },
  accent: { type: 'color', route: 'patch', fallback: 'color' },
  strength: { type: 'number', default: 0.5, route: 'patch' },
  padding: { type: 'number', default: 48, route: 'rebuild' },
  debug: { type: 'boolean', default: false, route: 'patch' },
  flowmap: { type: 'object', default: { falloff: 0.3, alpha: 0.6 }, route: 'rebuild' },
} as const satisfies ParamTable

describe('resolveParams', () => {
  it('没传的取默认值，颜色类没传为 undefined（继承）', () => {
    expect(resolveParams(table)).toEqual({
      color: undefined,
      accent: undefined,
      strength: 0.5,
      padding: 48,
      debug: false,
      flowmap: { falloff: 0.3, alpha: 0.6 },
    })
  })

  it('传了的覆盖默认值；对象类按子项与默认值合并', () => {
    const values = resolveParams(table, { strength: 1, accent: 'red', flowmap: { alpha: 0.1 } })
    expect(values.strength).toBe(1)
    expect(values.accent).toBe('red')
    expect(values.flowmap).toEqual({ falloff: 0.3, alpha: 0.1 })
  })

  it('显式传 undefined 等于没传', () => {
    expect(resolveParams(table, { strength: undefined, flowmap: undefined })).toEqual(resolveParams(table))
  })

  it('不共享默认值对象：改一个实例的值不影响参数表', () => {
    const values = resolveParams(table)
    values.flowmap.alpha = 1
    expect(table.flowmap.default.alpha).toBe(0.6)
  })
})

describe('applyPatch', () => {
  it('原地改值，只返回走重建的键', () => {
    const values = resolveParams(table)
    const rebuild = applyPatch(table, values, { strength: 2, padding: 10, color: 'blue' })
    expect(values).toMatchObject({ strength: 2, padding: 10, color: 'blue' })
    expect(rebuild).toEqual(['padding'])
  })

  it('值为 undefined 恢复默认，重建类照样排重建', () => {
    const values = resolveParams(table, { padding: 10, color: 'blue' })
    const rebuild = applyPatch(table, values, { padding: undefined, color: undefined })
    expect(values.padding).toBe(48)
    expect(values.color).toBeUndefined()
    expect(rebuild).toEqual(['padding'])
  })

  it('不比较新旧值：重建类参数传同样的值也排重建', () => {
    const values = resolveParams(table)
    expect(applyPatch(table, values, { padding: 48 })).toEqual(['padding'])
  })

  it('对象类没传的子项回到默认值', () => {
    const values = resolveParams(table, { flowmap: { falloff: 0.9, alpha: 0.9 } })
    applyPatch(table, values, { flowmap: { alpha: 0.2 } })
    expect(values.flowmap).toEqual({ falloff: 0.3, alpha: 0.2 })
  })

  it('表里没有的键忽略，原型链上的名字也不算', () => {
    const values = resolveParams(table)
    const before = { ...values }
    const patch = JSON.parse('{"nope": 1, "toString": 1, "__proto__": {"strength": 9}}')
    expect(applyPatch(table, values, patch)).toEqual([])
    expect(values).toEqual(before)
  })
})

describe('optionTypesOf', () => {
  it('每个键映射到原生类型构造器', () => {
    expect(optionTypesOf(table)).toEqual({
      color: String,
      accent: String,
      strength: Number,
      padding: Number,
      debug: Boolean,
      flowmap: Object,
    })
  })
})
```

- [ ] **Step 2：确认变红**

```bash
node_modules/.bin/vitest run --project unit
```
预期：三个新文件 `Failed to resolve import "../../src/compute/…"`，原有的 eslint-guards 照常通过。

- [ ] **Step 3：实现**

`src/compute/approach.ts`（my-blog 原样搬入，注释改成中文全角标点）：

```ts
/**
 * 把一个值朝目标推进一步，返回新值。
 *
 * 指数逼近而不是每帧加一个固定增量：后者的收敛速度会随帧率变化——
 * 120Hz 屏上到位的时间是 60Hz 的一半，同一份参数在两台机器上是两种手感。
 * 指数逼近也天然不会越过目标，不需要额外夹取。
 *
 * @param current 当前值
 * @param target 目标值
 * @param dt 距上一帧的时长（毫秒）
 * @param speed 收敛速度，越大越快。约 1/speed 秒走完 63% 的距离
 */
export function approach(current: number, target: number, dt: number, speed: number): number {
  return current + (target - current) * (1 - Math.exp((-speed * dt) / 1000))
}
```

`src/compute/proximity.ts`：

```ts
/** 矩形外框，字段与 DOMRect 同名，可以直接传 getBoundingClientRect() 的结果 */
interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * 点到矩形外框的最短距离换算成 0~1 的靠近度：压在框内为 1，距离达到 radius 时降到 0。
 *
 * 用距离而不是 mouseenter / mouseleave：事件是个开关，鼠标一压线整块字突然开始流动，
 * 那一下的突兀正是要避免的东西。
 */
export function proximity(x: number, y: number, box: Box, radius: number): number {
  const outX = Math.max(box.left - x, 0, x - box.right)
  const outY = Math.max(box.top - y, 0, y - box.bottom)
  const distance = Math.hypot(outX, outY)
  // radius 为 0 时下面的除法在框内得到 NaN
  if (radius <= 0)
    return distance === 0 ? 1 : 0
  return Math.max(0, 1 - distance / radius)
}
```

`src/compute/params.ts`：

```ts
/** patch：原地更新、下一帧生效；rebuild：排一次重建（按帧合并） */
type Route = 'patch' | 'rebuild'

/**
 * 参数表的一行。
 * - `color`：值是任意 CSS 颜色串，没传时继承父元素的计算 color；写了 `fallback` 的，没传时取那个参数的值
 * - `object`：值按键与默认值浅合并，没传的子项回到默认值（不保留上一次的值）
 */
type ParamSpec
  = | { readonly type: 'number', readonly default: number, readonly route: Route }
    | { readonly type: 'boolean', readonly default: boolean, readonly route: Route }
    | { readonly type: 'color', readonly route: 'patch', readonly fallback?: string }
    | { readonly type: 'object', readonly default: Readonly<Record<string, number>>, readonly route: Route }

export type ParamTable = Readonly<Record<string, ParamSpec>>

type ValueOf<S> = S extends { type: 'number' } ? number
  : S extends { type: 'boolean' } ? boolean
    : S extends { type: 'color' } ? string | undefined
      : S extends { type: 'object', default: infer D } ? { -readonly [K in keyof D]: number }
        : never

type OptionOf<S> = S extends { type: 'object' } ? Partial<ValueOf<S>> : Exclude<ValueOf<S>, undefined>

type ConstructorOf<S> = S extends { type: 'number' } ? NumberConstructor
  : S extends { type: 'boolean' } ? BooleanConstructor
    : S extends { type: 'color' } ? StringConstructor
      : ObjectConstructor

/** 当前生效的参数值：颜色类没传时是 undefined（继承），其余都已填上默认值 */
export type ParamValues<T> = { -readonly [K in keyof T]: ValueOf<T[K]> }

/** 调用方传的选项：全部可选，显式传 undefined 等于恢复默认 */
export type Options<T> = { [K in keyof T]?: OptionOf<T[K]> | undefined }

/** 选项类型映射：键名 → 原生类型构造器，供框架壳声明 props */
export type OptionTypes<T> = { -readonly [K in keyof T]: ConstructorOf<T[K]> }

function resolve(spec: ParamSpec, value: unknown): unknown {
  if (spec.type === 'object')
    return { ...spec.default, ...(value as object | undefined) }
  if (value !== undefined)
    return value
  return spec.type === 'color' ? undefined : spec.default
}

/** 按参数表把选项补全成参数值 */
export function resolveParams<T extends ParamTable>(table: T, options: Options<T> = {}): ParamValues<T> {
  const input = options as Record<string, unknown>
  const values: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(table))
    values[key] = resolve(spec, input[key])
  return values as ParamValues<T>
}

/**
 * 把 patch 原地写进 values，返回其中走重建的键名。
 * 不比较新旧值，只按键名查表；表里没有的键忽略。
 */
export function applyPatch<T extends ParamTable>(table: T, values: ParamValues<T>, patch: Options<T>): string[] {
  const target = values as Record<string, unknown>
  const rebuild: string[] = []
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(table, key))
      continue
    const spec = table[key]!
    target[key] = resolve(spec, value)
    if (spec.route === 'rebuild')
      rebuild.push(key)
  }
  return rebuild
}

const constructors = { number: Number, boolean: Boolean, color: String, object: Object } as const

/** 由参数表派生选项类型映射 */
export function optionTypesOf<T extends ParamTable>(table: T): OptionTypes<T> {
  const types: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(table))
    types[key] = constructors[spec.type]
  return types as OptionTypes<T>
}
```

- [ ] **Step 4：确认变绿，并过类型检查与 lint**

```bash
node_modules/.bin/vitest run --project unit && node_modules/.bin/vue-tsc --noEmit && node_modules/.bin/eslint src test
```
预期：unit 全过（含原有的 eslint-guards），类型检查与 lint 零报错。

- [ ] **Step 5：提交**

走 `/commit`，建议信息：`feat(compute): 加纯计算层：指数逼近、靠近度与参数表派生`。

---

### 任务 2：文字光栅与画布定位

**Files:**
- Create: `src/runtime/layer.ts`、`src/runtime/text-raster.ts`、`test/browser/helpers.ts`
- Test: `test/browser/text-raster.browser.test.ts`

**Interfaces:**
- Produces：`createCanvas(layerEl): HTMLCanvasElement`；`placeCanvas(canvas, textRect, padding, dpr): PixelSize`；
  `rasterizeText(textEl, size, padding, dpr): TextRaster`，`TextRaster = { image, width, height, dpr }`；
  测试辅助 `nextFrames(n)`、`mountHeading(text?, style?)`、`readPixels(canvas)`。

- [ ] **Step 1：写测试辅助与测试**

`test/browser/helpers.ts`：

```ts
import type { FxTarget } from '../../playground/fixtures/types'
import { createHeading } from '../../playground/fixtures/dom'

/** 等 n 帧 raf */
export function nextFrames(n = 1): Promise<void> {
  return new Promise((resolve) => {
    let left = n
    const step = (): void => {
      left -= 1
      if (left <= 0)
        resolve()
      else
        requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

export interface MountedHeading extends FxTarget {
  heading: HTMLElement
  cleanup: () => void
}

/** 按壳的结构建一个标题挂进 body；style 写在 h1 上 */
export function mountHeading(text = 'Hubery', style = ''): MountedHeading {
  const { heading, target } = createHeading(text)
  heading.style.cssText += style
  document.body.append(heading)
  return { ...target, heading, cleanup: () => heading.remove() }
}

/** 在下一帧 raf 里读回 WebGL 画布的像素：画面合成之后绘图缓冲区会被清空，raf 之外读到的全是 0 */
export function readPixels(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  if (!gl)
    throw new Error('画布上没有 WebGL 上下文')
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      resolve(pixels)
    })
  })
}
```

`test/browser/text-raster.browser.test.ts`：

```ts
import type { MountedHeading } from './helpers'
import { afterEach, describe, expect, it } from 'vitest'
import { placeCanvas } from '../../src/runtime/layer'
import { rasterizeText } from '../../src/runtime/text-raster'
import { mountHeading } from './helpers'

let target: MountedHeading

afterEach(() => {
  target?.cleanup()
})

const PADDING = 20
// 不取 devicePixelRatio：无头浏览器里它是 1，乘不乘 dpr 都一样，测不出来
const DPR = 2

function raster(): ReturnType<typeof rasterizeText> {
  const dpr = DPR
  const canvas = document.createElement('canvas')
  target.layerEl.append(canvas)
  canvas.style.position = 'absolute'
  const size = placeCanvas(canvas, target.textEl.getBoundingClientRect(), PADDING, dpr)
  return rasterizeText(target.textEl, size, PADDING, dpr)
}

/** 墨迹的外框（alpha 过半的像素），物理像素 */
function inkBox({ image, width, height }: ReturnType<typeof rasterizeText>): { left: number, right: number, bottom: number } {
  const data = image.getContext('2d')!.getImageData(0, 0, width, height).data
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 127) {
        left = Math.min(left, x)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    }
  }
  return { left, right, bottom }
}

// 纹理必须与底下那份 DOM 文字对齐：错开时真文本与画布的交接会跳一下，紧跟其后的插槽内容会压字
describe('text-raster 与 DOM 文字对齐', () => {
  it('基线与 DOM 的基线重合', () => {
    target = mountHeading('H', 'font: 700 80px sans-serif; margin: 0;')
    // inline-block 的空元素底边落在基线上，用它量出 DOM 文字的基线
    const probe = document.createElement('span')
    probe.style.cssText = 'display: inline-block; width: 0; height: 0;'
    target.heading.append(probe)
    const baseline = probe.getBoundingClientRect().bottom - target.textEl.getBoundingClientRect().top
    const result = raster()
    // H 没有下伸部，墨迹底边就是基线
    expect(inkBox(result).bottom + 1).toBeCloseTo((PADDING + baseline) * result.dpr, -0.5)
  })

  it('letter-spacing 同步进纹理：负字距让墨迹按字符间隔数收窄', () => {
    target = mountHeading('Hubery', 'font: 700 80px sans-serif; margin: 0;')
    const loose = inkBox(raster())
    target.textEl.style.letterSpacing = '-4px'
    const result = raster()
    const tight = inkBox(result)
    // 6 个字符之间有 5 个间隔，每个收紧 4px
    expect((loose.right - loose.left) - (tight.right - tight.left)).toBeCloseTo(5 * 4 * result.dpr, -0.5)
  })
})
```

- [ ] **Step 2：确认变红**

```bash
node_modules/.bin/vitest run test/browser/text-raster.browser.test.ts --project 'browser (chromium)' --project 'browser (webkit)'
```
预期：`Failed to resolve import "../../src/runtime/layer"`。

- [ ] **Step 3：实现**

`src/runtime/layer.ts`：

```ts
/** 物理像素尺寸 */
export interface PixelSize {
  width: number
  height: number
}

/** 在挂载点里建画布。挂载点归内核独占，框架不往里渲染任何东西 */
export function createCanvas(layerEl: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  // max-width: none：宿主 reset 常把 canvas 和 img 一起纳入 max-width: 100%，而这块画布刻意比容器宽
  // （四周留 padding 给流动溢出），被压回容器宽度、高度却不变，纹理就横向压扁，字又小又偏左。
  // 全用 inline style：库不发 CSS 文件，inline 也压得过宿主 class
  canvas.style.cssText = 'position: absolute; pointer-events: none; max-width: none;'
  layerEl.append(canvas)
  return canvas
}

/**
 * 按文字外框加四周 padding 定画布的尺寸与位置。
 * 定位基准是画布的 offsetParent（壳的根元素带 inline position: relative）；
 * 文字未必在根元素左上角（后面还可能跟着插槽内容），所以按实测偏移算，不写死成负的 padding
 */
export function placeCanvas(canvas: HTMLCanvasElement, textRect: DOMRect, padding: number, dpr: number): PixelSize {
  const cssWidth = textRect.width + padding * 2
  const cssHeight = textRect.height + padding * 2
  const width = Math.round(cssWidth * dpr)
  const height = Math.round(cssHeight * dpr)
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  const base = canvas.offsetParent ?? document.documentElement
  const baseRect = base.getBoundingClientRect()
  // 绝对定位相对的是 padding box，getBoundingClientRect 量的是 border box，差一圈边框
  canvas.style.left = `${textRect.left - baseRect.left - base.clientLeft - padding}px`
  canvas.style.top = `${textRect.top - baseRect.top - base.clientTop - padding}px`
  return { width, height }
}
```

`src/runtime/text-raster.ts`（以 `HeroTitle` 修好的写法为准；删掉了拿不到 `fontBoundingBoxAscent` 时的中线回退，design 第十一节定的）：

```ts
import type { PixelSize } from './layer'

export interface TextRaster {
  /** 白字透明底，已按 dpr 放大，四周含 padding；颜色留给特效现填，切主题不必重画 */
  image: HTMLCanvasElement
  /** 物理像素 */
  width: number
  height: number
  dpr: number
}

/** 把 textEl 的文字画进离屏画布，与 DOM 那份文字精确对齐。只画一行：折行由 gate 负责休眠 */
export function rasterizeText(textEl: HTMLElement, size: PixelSize, padding: number, dpr: number): TextRaster {
  const image = document.createElement('canvas')
  image.width = size.width
  image.height = size.height
  const ctx = image.getContext('2d')
  if (!ctx)
    throw new Error('离屏 2D 上下文创建失败')

  const style = getComputedStyle(textEl)
  ctx.font = `${style.fontWeight} ${Number.parseFloat(style.fontSize) * dpr}px ${style.fontFamily}`
  // letter-spacing 不在 font 简写里，要单独设：不同步的话画出的字比 DOM 那份宽出几个像素，
  // 紧跟在后面的插槽内容（光标）会压到最后一个字母上。乘 dpr：纹理里的字号也放大了同样倍数
  const spacing = Number.parseFloat(style.letterSpacing)
  if (Number.isFinite(spacing))
    ctx.letterSpacing = `${spacing * dpr}px`
  ctx.fillStyle = '#fff'

  // 用基线定位，不用 textBaseline: 'middle'：middle 对齐 em 方块的中点，而字体的 ascent 与 descent
  // 并不对称，摆在外框垂直中心会整体上移几个像素、和 DOM 文字错开。
  // fontBoundingBoxAscent 正是浏览器算 inline 外框顶部用的量，「外框顶部往下 ascent」就是 DOM 文字的基线
  const text = textEl.textContent ?? ''
  ctx.textBaseline = 'alphabetic'
  const ascent = ctx.measureText(text).fontBoundingBoxAscent
  ctx.fillText(text, padding * dpr, padding * dpr + ascent)

  return { image, width: size.width, height: size.height, dpr }
}
```

- [ ] **Step 4：确认变绿**

同 Step 2 的命令，预期 4 条全过（2 条 × 2 个内核）。

- [ ] **Step 5：变异**

`<scratchpad>/muts-raster.json`：

```json
[
 {
  "name": "不同步 letter-spacing",
  "file": "src/runtime/text-raster.ts",
  "old": "  if (Number.isFinite(spacing))\n    ctx.letterSpacing = `${spacing * dpr}px`\n",
  "new": ""
 },
 {
  "name": "letter-spacing 不乘 dpr",
  "file": "src/runtime/text-raster.ts",
  "old": "ctx.letterSpacing = `${spacing * dpr}px`",
  "new": "ctx.letterSpacing = `${spacing}px`"
 },
 {
  "name": "改回 middle 对齐",
  "file": "src/runtime/text-raster.ts",
  "old": "  ctx.textBaseline = 'alphabetic'\n  const ascent = ctx.measureText(text).fontBoundingBoxAscent\n  ctx.fillText(text, padding * dpr, padding * dpr + ascent)",
  "new": "  ctx.textBaseline = 'middle'\n  ctx.fillText(text, padding * dpr, size.height / 2)"
 }
]
```

```bash
python3 <scratchpad>/mutate.py . <scratchpad>/muts-raster.json test/browser/text-raster.browser.test.ts
python3 <scratchpad>/mutate.py . <scratchpad>/muts-raster.json test/browser/text-raster.browser.test.ts 'browser (webkit)'
```
预期：Chromium 上 3 条全 `[RED ]`；WebKit 上前 2 条红、「改回 middle 对齐」绿（干跑结论：WebKit 的 middle 与基线定位等价，不是缺陷）。
每行都要显示 `文件已变:True`。

- [ ] **Step 6：提交**

走 `/commit`，建议信息：`feat(runtime): 文字光栅与画布定位，纹理按基线与字距对齐 DOM`。

---

### 任务 3：运行时骨架与其余共享件

**Files:**
- Create: `src/runtime/common-params.ts`、`loop.ts`、`gate.ts`、`color-probe.ts`、`pointer.ts`、`rebuild-watcher.ts`、`gl-lifecycle.ts`、`define-effect.ts`
- Create: `test/browser/fake-effect.ts`
- Test: `test/browser/runtime.browser.test.ts`、`test/browser/runtime.touch.test.ts`

**Interfaces:**
- Consumes：任务 1 的 `approach`、`proximity`、参数表类型与函数；任务 2 的 `createCanvas`、`placeCanvas`、`rasterizeText`、`TextRaster`。
- Produces：`defineEffect({ params, setup })` 返回 `{ create(textEl, layerEl, options?): FxInstance | null, optionTypes }`；
  `FxInstance<O> = { patch(options: O), destroy() }`；`EffectTable<T>`；`commonParams`。
  `setup(ctx)` 拿到 `{ canvas, params }`，返回 `{ build(raster), frame(state), dispose() }` 或 `null`；
  `FrameState = { dt, time, hover, pointer: { x, y, vx, vy, moved }, colors: Record<string, [r, g, b, a]> }`（不导出，测试从钩子签名里取）。

- [ ] **Step 1：写假特效与测试**

`test/browser/fake-effect.ts`：

```ts
import type { TextRaster } from '../../src/runtime/text-raster'
import { defineEffect } from '../../src/runtime/define-effect'

// FrameState 不从运行时导出（除测试外没有消费方），从钩子签名里取
type Hooks = NonNullable<ReturnType<Parameters<typeof defineEffect>[0]['setup']>>
type FrameState = Parameters<Hooks['frame']>[0]

/** 假特效的可控行为：测试中途改它就能让某个钩子抛错 */
export interface FakeControl {
  setupReturnsNull: boolean
  throwIn: 'setup' | 'build' | 'frame' | null
  /** 下一帧在 frame 里忙等这么多毫秒，制造一次长帧 */
  stallMs: number
}

export interface FakeLog {
  /** 钩子的调用顺序 */
  calls: string[]
  rasters: TextRaster[]
  frames: Array<FrameState & { level: number }>
  /** 每次调 build / frame 时 textEl 的 inline color：证明首帧画完之前没有涂透明 */
  colorAtHook: string[]
  /** 与 calls 一一对应的 document.timeline.currentTime：同一帧里调用的值相同 */
  frameTimes: unknown[]
}

/**
 * 一个只记录调用的特效：独有参数 level（patch 类）与 tint（颜色类，没传时取 color）；
 * 在画布上拿 WebGL2 上下文，好测上下文丢失与释放
 */
export function createFakeEffect(textEl: HTMLElement): { create: typeof fake.create, log: FakeLog, control: FakeControl } {
  const log: FakeLog = { calls: [], rasters: [], frames: [], colorAtHook: [], frameTimes: [] }
  const control: FakeControl = { setupReturnsNull: false, throwIn: null, stallMs: 0 }
  const record = (call: string): void => {
    log.calls.push(call)
    log.frameTimes.push(document.timeline.currentTime)
  }
  const fake = defineEffect({
    params: {
      level: { type: 'number', default: 1, route: 'patch' },
      tint: { type: 'color', route: 'patch', fallback: 'color' },
    },
    setup({ canvas, params }) {
      record('setup')
      if (control.throwIn === 'setup')
        throw new Error('setup 故意抛错')
      const gl = canvas.getContext('webgl2')
      if (control.setupReturnsNull || !gl)
        return null
      return {
        build(raster) {
          record('build')
          log.colorAtHook.push(textEl.style.color)
          log.rasters.push(raster)
          if (control.throwIn === 'build')
            throw new Error('build 故意抛错')
        },
        frame(state) {
          record('frame')
          log.colorAtHook.push(textEl.style.color)
          log.frames.push({ ...state, level: params.level })
          if (control.throwIn === 'frame')
            throw new Error('frame 故意抛错')
          const until = performance.now() + control.stallMs
          control.stallMs = 0
          while (performance.now() < until)
            continue
          gl.clearColor(1, 0, 0, 1)
          gl.clear(gl.COLOR_BUFFER_BIT)
        },
        dispose() {
          record('dispose')
        },
      }
    },
  })
  return { create: fake.create, log, control }
}
```

`test/browser/runtime.browser.test.ts`：

```ts
import type { MountedHeading } from './helpers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { hiddenContainer } from '../../playground/fixtures/hidden-container'
import { modernColors } from '../../playground/fixtures/modern-colors'
import { narrowWrap } from '../../playground/fixtures/narrow-wrap'
import { themeTransition } from '../../playground/fixtures/theme-transition'
import { createFakeEffect } from './fake-effect'
import { mountHeading, nextFrames } from './helpers'

// 运行时的全部时序只在这里测一次（architecture.md 第九节）：特效换成只记录调用的假特效
let target: MountedHeading
const cleanups: Array<() => void> = []

beforeEach(() => {
  target = mountHeading()
  cleanups.push(target.cleanup)
})

afterEach(() => {
  while (cleanups.length)
    cleanups.pop()!()
  vi.restoreAllMocks()
})

function start(options = {}) {
  const fake = createFakeEffect(target.textEl)
  const instance = fake.create(target.textEl, target.layerEl, options)
  if (instance)
    cleanups.push(() => instance.destroy())
  return { ...fake, instance: instance! }
}

const painted = (): string => target.textEl.style.color

async function expectFrozen(frames: unknown[]): Promise<void> {
  const count = frames.length
  await nextFrames(3)
  expect(frames).toHaveLength(count)
}

describe('不支持：一个 DOM 节点都不碰，返回 null', () => {
  const prototypeApis = [
    ['CanvasRenderingContext2D.letterSpacing', () => CanvasRenderingContext2D.prototype, 'letterSpacing'],
    ['TextMetrics.fontBoundingBoxAscent', () => TextMetrics.prototype, 'fontBoundingBoxAscent'],
    ['document.fonts 的 loadingdone 事件', () => FontFaceSet.prototype, 'onloadingdone'],
  ] as const

  it.for(prototypeApis)('缺 %s', ([name, proto, key]) => {
    const descriptor = Object.getOwnPropertyDescriptor(proto(), key)!
    Reflect.deleteProperty(proto(), key)
    cleanups.push(() => Object.defineProperty(proto(), key, descriptor))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { instance, log } = start({ debug: true })
    expect(instance).toBeNull()
    expect(log.calls).toEqual([])
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(`[todo-fx] create 返回 null：浏览器缺少 ${name}`)
  })

  it('缺 ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    cleanups.push(() => vi.unstubAllGlobals())
    const { instance, log } = start()
    expect(instance).toBeNull()
    expect(log.calls).toEqual([])
    expect(target.layerEl.childNodes).toHaveLength(0)
  })

  it('setup 返回 null：撤掉画布，不涂透明', () => {
    const fake = createFakeEffect(target.textEl)
    fake.control.setupReturnsNull = true
    expect(fake.create(target.textEl, target.layerEl)).toBeNull()
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(painted()).toBe('')
  })

  it('setup 抛错：返回 null，控制台报一次错', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = createFakeEffect(target.textEl)
    fake.control.throwIn = 'setup'
    expect(fake.create(target.textEl, target.layerEl)).toBeNull()
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(error).toHaveBeenCalledTimes(1)
  })
})

describe('开播', () => {
  it('build → frame，首帧画完之后才涂透明', async () => {
    const { log } = start()
    await expect.poll(painted).toBe('transparent')
    expect(log.calls.slice(0, 3)).toEqual(['setup', 'build', 'frame'])
    // build 与首帧时文字都还没涂透明
    expect(log.colorAtHook.slice(0, 2)).toEqual(['', ''])
  })

  it('dt 夹取在 [0, 1/30] 秒，time 是 dt 的累计', async () => {
    const { log, control } = start()
    await nextFrames(3)
    // 一次 100ms 的长帧：不夹取的话下一帧的 dt 约 0.1 秒
    control.stallMs = 100
    await nextFrames(3)
    expect(log.frames.length).toBeGreaterThan(2)
    let time = 0
    for (const frame of log.frames) {
      expect(frame.dt).toBeGreaterThanOrEqual(0)
      expect(frame.dt).toBeLessThanOrEqual(1 / 30)
      time += frame.dt
      expect(frame.time).toBeCloseTo(time, 6)
    }
  })

  it('画布按文字外框加四周 padding 定尺寸与位置，解除 max-width、不挡指针、对读屏隐藏', async () => {
    target.heading.style.border = '5px solid'
    const { log } = start({ padding: 20 })
    await expect.poll(painted).toBe('transparent')
    const canvas = target.layerEl.querySelector('canvas')!
    const text = target.textEl.getBoundingClientRect()
    const rect = canvas.getBoundingClientRect()
    // 布局会把画布对齐到像素，留 1px 余量
    expect(Math.abs(rect.left - (text.left - 20))).toBeLessThanOrEqual(1)
    expect(Math.abs(rect.top - (text.top - 20))).toBeLessThanOrEqual(1)
    expect(Math.abs(rect.width - (text.width + 40))).toBeLessThanOrEqual(1)
    expect(Math.abs(rect.height - (text.height + 40))).toBeLessThanOrEqual(1)
    const raster = log.rasters.at(-1)!
    expect(canvas.width).toBe(raster.width)
    expect(raster.width).toBe(Math.round((text.width + 40) * raster.dpr))
    expect(canvas.style.maxWidth).toBe('none')
    expect(canvas.style.pointerEvents).toBe('none')
    expect(canvas.getAttribute('aria-hidden')).toBe('true')
  })

  it('宿主 reset 的 canvas { max-width: 100% } 压不扁画布', async () => {
    const style = document.createElement('style')
    style.textContent = 'canvas { max-width: 100%; }'
    document.head.append(style)
    cleanups.push(() => style.remove())
    start()
    await expect.poll(painted).toBe('transparent')
    const canvas = target.layerEl.querySelector('canvas')!
    expect(Math.abs(canvas.getBoundingClientRect().width - (target.textEl.getBoundingClientRect().width + 96))).toBeLessThanOrEqual(1)
  })
})

describe('休眠条件逐个进出', () => {
  it.for([
    ['prefers-reduced-motion', { reducedMotion: 'reduce' }, { reducedMotion: 'no-preference' }],
    ['forced-colors', { forcedColors: 'active' }, { forcedColors: 'none' }],
  ] as const)('%s', async ([, enter, exit]) => {
    const { log } = start()
    await expect.poll(painted).toBe('transparent')

    await commands.emulateMedia(enter)
    await expect.poll(painted).toBe('')
    await expectFrozen(log.frames)

    await commands.emulateMedia(exit)
    await expect.poll(painted).toBe('transparent')
    const count = log.frames.length
    await nextFrames(2)
    expect(log.frames.length).toBeGreaterThan(count)
  })

  it('开局就在休眠：不 build、不涂透明，条件解除后才开播', async () => {
    await commands.emulateMedia({ reducedMotion: 'reduce' })
    const { log } = start()
    await nextFrames(3)
    expect(log.calls).toEqual(['setup'])
    expect(painted()).toBe('')

    await commands.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(painted).toBe('transparent')
    expect(log.calls.slice(0, 3)).toEqual(['setup', 'build', 'frame'])
  })

  it('文字宽度为 0（挂在隐藏容器里）：显示后开播，再隐藏又休眠', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    cleanups.push(() => root.remove())
    const { targets: [{ textEl, layerEl }], actions, cleanup } = hiddenContainer.mount(root)
    cleanups.push(cleanup)
    const fake = createFakeEffect(textEl)
    const instance = fake.create(textEl, layerEl)!
    cleanups.push(() => instance.destroy())
    await nextFrames(3)
    expect(fake.log.calls).toEqual(['setup'])

    actions.显示()
    await expect.poll(() => textEl.style.color).toBe('transparent')
    expect(fake.log.rasters.at(-1)!.width).toBeGreaterThan(0)

    actions.隐藏()
    await expect.poll(() => textEl.style.color).toBe('')
    await expectFrozen(fake.log.frames)
  })

  it('文字折行：加宽后开播，收窄后休眠', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    cleanups.push(() => root.remove())
    const { targets: [{ textEl, layerEl }], actions, cleanup } = narrowWrap.mount(root)
    cleanups.push(cleanup)
    const fake = createFakeEffect(textEl)
    const instance = fake.create(textEl, layerEl)!
    cleanups.push(() => instance.destroy())
    await nextFrames(3)
    expect(fake.log.calls).toEqual(['setup'])

    actions.加宽()
    await expect.poll(() => textEl.style.color).toBe('transparent')

    actions.收窄()
    await expect.poll(() => textEl.style.color).toBe('')
    await expectFrozen(fake.log.frames)
  })

  it('webGL 上下文丢失：休眠；恢复后依次 dispose → setup → build → frame 再涂透明', async () => {
    const { log } = start()
    await expect.poll(painted).toBe('transparent')
    const canvas = target.layerEl.querySelector('canvas')!
    const lose = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!

    lose.loseContext()
    await expect.poll(painted).toBe('')
    await expectFrozen(log.frames)
    const before = log.calls.length

    lose.restoreContext()
    await expect.poll(painted).toBe('transparent')
    expect(log.calls.slice(before, before + 4)).toEqual(['dispose', 'setup', 'build', 'frame'])
  })
})

describe('重建', () => {
  it('休眠中不重建：只记着，恢复时建一次，用的是最新的文字', async () => {
    const { instance, log } = start()
    await expect.poll(painted).toBe('transparent')
    await commands.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(painted).toBe('')
    const builds = log.calls.filter(c => c === 'build').length

    target.textEl.textContent = 'Hubery Yang'
    instance.patch({ padding: 10 })
    await nextFrames(3)
    expect(log.calls.filter(c => c === 'build')).toHaveLength(builds)

    await commands.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(painted).toBe('transparent')
    expect(log.calls.filter(c => c === 'build')).toHaveLength(builds + 1)
    const width = target.textEl.getBoundingClientRect().width
    const raster = log.rasters.at(-1)!
    expect(raster.width).toBe(Math.round((width + 20) * raster.dpr))
  })

  it('同一帧里来自不同信号源的重建合并成一次，并且在帧里紧接着画', async () => {
    const { instance, log } = start()
    await expect.poll(painted).toBe('transparent')
    const builds = log.calls.filter(c => c === 'build').length

    target.textEl.textContent = 'Hubery Yang'
    instance.patch({ padding: 40 })
    window.dispatchEvent(new Event('resize'))
    await nextFrames(3)
    expect(log.calls.filter(c => c === 'build')).toHaveLength(builds + 1)
    // build 与下一次 frame 在同一个 raf 回调里：画布改尺寸会清空，分在两帧的话中间会合成出一帧空白
    const index = log.calls.lastIndexOf('build')
    expect(log.calls[index + 1]).toBe('frame')
    expect(log.frameTimes[index + 1]).toBe(log.frameTimes[index])
  })

  it.for(['resize', 'fonts'] as const)('%s 信号触发重建', async (source) => {
    const { log } = start({ debug: true })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect.poll(painted).toBe('transparent')
    const builds = log.calls.filter(c => c === 'build').length
    if (source === 'resize')
      window.dispatchEvent(new Event('resize'))
    else
      document.fonts.dispatchEvent(new Event('loadingdone'))
    await expect.poll(() => log.calls.filter(c => c === 'build').length).toBe(builds + 1)
    expect(warn).toHaveBeenCalledWith(`[todo-fx] 重建：${source}`)
  })

  it('maxDpr 不是正数时按 1 处理，不会建出 0 尺寸的画布（那样文字透明、画布空白，标题隐身）', async () => {
    const { log } = start({ maxDpr: 0 })
    await expect.poll(painted).toBe('transparent')
    expect(log.rasters.at(-1)!.dpr).toBe(1)
    expect(log.rasters.at(-1)!.width).toBeGreaterThan(0)
  })

  it('patch 按参数表路由：patch 类下一帧生效且不重建，重建类排一次重建，undefined 恢复默认', async () => {
    const { instance, log } = start()
    await expect.poll(painted).toBe('transparent')
    const builds = (): number => log.calls.filter(c => c === 'build').length
    const before = builds()

    instance.patch({ level: 7, enterRadius: 10 })
    await expect.poll(() => log.frames.at(-1)!.level).toBe(7)
    expect(builds()).toBe(before)

    instance.patch({ padding: 10 })
    await expect.poll(builds).toBe(before + 1)
    expect(log.rasters.at(-1)!.width).toBe(Math.round((target.textEl.getBoundingClientRect().width + 20) * log.rasters.at(-1)!.dpr))

    instance.patch({ padding: undefined, level: undefined })
    await expect.poll(builds).toBe(before + 2)
    expect(log.rasters.at(-1)!.width).toBe(Math.round((target.textEl.getBoundingClientRect().width + 96) * log.rasters.at(-1)!.dpr))
    await expect.poll(() => log.frames.at(-1)!.level).toBe(1)
  })
})

describe('熔断', () => {
  it.for(['frame', 'build'] as const)('%s 抛错：报一次错、撤掉涂透明、停止渲染，之后 patch 是空操作', async (hook) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { instance, log, control } = start()
    await expect.poll(painted).toBe('transparent')

    control.throwIn = hook
    if (hook === 'build')
      target.textEl.textContent = 'Hubery Yang'
    await expect.poll(painted).toBe('')
    await expectFrozen(log.frames)
    expect(error).toHaveBeenCalledTimes(1)
    expect(log.calls.at(-1)).toBe('dispose')

    control.throwIn = null
    instance.patch({ padding: 10 })
    target.textEl.textContent = 'Hubery'
    await nextFrames(3)
    expect(painted()).toBe('')
    expect(error).toHaveBeenCalledTimes(1)

    instance.destroy()
    expect(log.calls.filter(c => c === 'dispose')).toHaveLength(1)
    expect(target.layerEl.childNodes).toHaveLength(0)
  })
})

describe('destroy', () => {
  it('raf、监听器、observer 归零，画布与探针撤掉，上下文交还', async () => {
    // window 上的 addEventListener 被 vitest 换成了自己的包装，绕过 EventTarget.prototype，要单独盯
    const adds = [vi.spyOn(EventTarget.prototype, 'addEventListener'), vi.spyOn(window, 'addEventListener')]
    const removes = [vi.spyOn(EventTarget.prototype, 'removeEventListener'), vi.spyOn(window, 'removeEventListener')]
    const observers = [ResizeObserver, MutationObserver].map(Observer => ({
      observe: vi.spyOn(Observer.prototype, 'observe'),
      disconnect: vi.spyOn(Observer.prototype, 'disconnect'),
    }))

    const { instance, log } = start()
    const added = adds.flatMap(spy => spy.mock.calls.map((args, i) => [spy.mock.contexts[i], args[0], args[1]] as const))
    expect(added.map(([, type]) => type).sort()).toEqual(['change', 'change', 'change', 'change', 'loadingdone', 'mousemove', 'resize', 'webglcontextlost', 'webglcontextrestored'])
    await expect.poll(painted).toBe('transparent')
    const canvas = target.layerEl.querySelector('canvas')!
    const gl = canvas.getContext('webgl2')!

    instance.destroy()
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(raf).not.toHaveBeenCalled()
    const removed = removes.flatMap(spy => spy.mock.calls.map((args, i) => [spy.mock.contexts[i], args[0], args[1]] as const))
    for (const [context, type, listener] of added)
      expect(removed.some(([c, t, l]) => c === context && t === type && l === listener), `${type} 没有退订`).toBe(true)
    for (const { observe, disconnect } of observers) {
      expect(observe).toHaveBeenCalledTimes(1)
      expect(disconnect).toHaveBeenCalledTimes(1)
    }
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(painted()).toBe('')
    expect(gl.isContextLost()).toBe(true)
    expect(log.calls.filter(c => c === 'dispose')).toHaveLength(1)

    instance.destroy()
    expect(log.calls.filter(c => c === 'dispose')).toHaveLength(1)
  })

  it('首帧之前就 destroy：不涂透明、不报错，上下文照样交还', async () => {
    const error = vi.spyOn(console, 'error')
    const { instance, log } = start()
    const gl = target.layerEl.querySelector('canvas')!.getContext('webgl2')!
    instance.destroy()
    await nextFrames(3)
    expect(log.calls).toEqual(['setup', 'build', 'dispose'])
    expect(painted()).toBe('')
    expect(gl.isContextLost()).toBe(true)
    expect(error).not.toHaveBeenCalled()
  })

  it('撤掉涂透明时还原宿主原有的 inline color', async () => {
    target.textEl.style.color = 'rgb(1, 2, 3)'
    const { instance } = start()
    await expect.poll(painted).toBe('transparent')
    instance.destroy()
    expect(painted()).toBe('rgb(1, 2, 3)')
  })
})

describe('颜色', () => {
  it('默认继承父元素的计算 color；写了 fallback 的颜色参数没传时等于它', async () => {
    target.heading.style.color = 'rgb(51, 102, 153)'
    const { instance, log } = start()
    await expect.poll(() => log.frames.length).toBeGreaterThan(0)
    expect(log.frames.at(-1)!.colors).toEqual({ color: [0.2, 0.4, 0.6, 1], tint: [0.2, 0.4, 0.6, 1] })

    instance.patch({ color: 'rgb(255, 0, 0)' })
    await expect.poll(() => log.frames.at(-1)!.colors.tint).toEqual([1, 0, 0, 1])
    instance.patch({ tint: 'rgb(0, 0, 255)' })
    await expect.poll(() => log.frames.at(-1)!.colors).toEqual({ color: [1, 0, 0, 1], tint: [0, 0, 1, 1] })
  })

  it('主题切换时颜色跟着过渡走到新主题，不停在旧主题', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    cleanups.push(() => root.remove())
    const { targets: [{ textEl, layerEl }], actions, cleanup } = themeTransition.mount(root)
    cleanups.push(cleanup)
    const fake = createFakeEffect(textEl)
    const instance = fake.create(textEl, layerEl)!
    cleanups.push(() => instance.destroy())
    const rgb = (): number[] => fake.log.frames.at(-1)!.colors.color.slice(0, 3).map(c => Math.round(c * 255))
    await expect.poll(rgb).toEqual([20, 20, 20])

    actions.切换主题()
    await expect.poll(rgb, { timeout: 2000 }).toEqual([235, 235, 235])
  })

  it('oklch / lab / color-mix / display-p3 都解析成浏览器回读的 sRGB', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    cleanups.push(() => root.remove())
    const { targets, cleanup } = modernColors.mount(root)
    cleanups.push(cleanup)
    const expected = [[0, 185, 195, 255], [187, 88, 70, 255], [128, 0, 128, 255], [255, 0, 0, 255]]
    const fakes = targets.map(({ textEl, layerEl }) => {
      const fake = createFakeEffect(textEl)
      const instance = fake.create(textEl, layerEl)!
      cleanups.push(() => instance.destroy())
      return fake
    })
    for (const [i, fake] of fakes.entries())
      await expect.poll(() => fake.log.frames.at(-1)?.colors.color.map(c => Math.round(c * 255))).toEqual(expected[i])
  })

  it('patch 任意 CSS 颜色串由浏览器解析；非法串回落为继承色', async () => {
    target.heading.style.color = 'rgb(51, 102, 153)'
    const { instance, log } = start()
    await expect.poll(() => log.frames.length).toBeGreaterThan(0)

    instance.patch({ color: 'color-mix(in srgb, red 50%, blue)' })
    await expect.poll(() => log.frames.at(-1)!.colors.color.map(c => Math.round(c * 255))).toEqual([128, 0, 128, 255])

    instance.patch({ color: '不是颜色' })
    await expect.poll(() => log.frames.at(-1)!.colors.color).toEqual([0.2, 0.4, 0.6, 1])
  })

  it('颜色带 alpha 时如实给出', async () => {
    target.heading.style.color = 'rgba(0, 0, 0, 0.6)'
    const { log } = start()
    await expect.poll(() => log.frames.length).toBeGreaterThan(0)
    expect(log.frames.at(-1)!.colors.color[3]).toBeCloseTo(0.6, 2)
  })
})

describe('指针', () => {
  it('压在画布上时 hover 逼近 1，坐标是画布内的 CSS 像素；只有事件之后那一帧 moved 为 true', async () => {
    const { log } = start()
    await expect.poll(painted).toBe('transparent')
    const rect = target.layerEl.querySelector('canvas')!.getBoundingClientRect()
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + 30, clientY: rect.top + 20 }))
    await expect.poll(() => log.frames.at(-1)!.hover).toBeGreaterThan(0.9)
    const movedFrames = log.frames.filter(f => f.pointer.moved)
    expect(movedFrames).toHaveLength(1)
    expect(movedFrames[0]!.pointer.x).toBeCloseTo(30, 0)
    expect(movedFrames[0]!.pointer.y).toBeCloseTo(20, 0)
  })

  it('离开 enterRadius 之外 hover 回落到 0', async () => {
    const { log } = start({ enterRadius: 10, calmSpeed: 50, wakeSpeed: 50 })
    await expect.poll(painted).toBe('transparent')
    const rect = target.layerEl.querySelector('canvas')!.getBoundingClientRect()
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + 5, clientY: rect.top + 5 }))
    await expect.poll(() => log.frames.at(-1)!.hover).toBeGreaterThan(0.9)
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.right + 50, clientY: rect.top + 5 }))
    await expect.poll(() => log.frames.at(-1)!.hover).toBeLessThan(0.05)
  })
})

describe('debug', () => {
  it('打印休眠与恢复的条件、重建的触发源', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({ debug: true })
    await expect.poll(painted).toBe('transparent')
    expect(warn).toHaveBeenCalledWith('[todo-fx] 重建：首次构建')

    await commands.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(painted).toBe('')
    expect(warn).toHaveBeenCalledWith('[todo-fx] 休眠：prefers-reduced-motion')

    target.textEl.textContent = 'Hubery Yang'
    await commands.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(painted).toBe('transparent')
    expect(warn).toHaveBeenCalledWith('[todo-fx] 恢复：prefers-reduced-motion 已解除')
    expect(warn.mock.calls.some(([message]) => /^\[todo-fx\] 重建：.*text/.test(message))).toBe(true)
  })

  it('默认不打印', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start()
    await expect.poll(painted).toBe('transparent')
    expect(warn).not.toHaveBeenCalled()
  })
})
```

`test/browser/runtime.touch.test.ts`：

```ts
import { expect, it, vi } from 'vitest'
import { createFakeEffect } from './fake-effect'
import { mountHeading, nextFrames } from './helpers'

// hover: none 只能靠 hasTouch 的 instance 仿真，进不了也出不去：这里只验「一直休眠」这一半
it('hover: none 时一直休眠：不 build、不涂透明', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const target = mountHeading()
  const fake = createFakeEffect(target.textEl)
  const instance = fake.create(target.textEl, target.layerEl, { debug: true })!
  await nextFrames(5)
  expect(fake.log.calls).toEqual(['setup'])
  expect(target.textEl.style.color).toBe('')
  expect(warn).toHaveBeenCalledWith('[todo-fx] 休眠：hover: none')
  instance.destroy()
  target.cleanup()
  warn.mockRestore()
})
```

- [ ] **Step 2：确认变红**

```bash
node_modules/.bin/vitest run test/browser/runtime.browser.test.ts --project 'browser (chromium)' --project 'browser (webkit)'
node_modules/.bin/vitest run test/browser/runtime.touch.test.ts --project chromium-touch --project webkit-touch
```
预期：`Failed to resolve import "../../src/runtime/define-effect"`。

- [ ] **Step 3：实现共享件**

`src/runtime/common-params.ts`：

```ts
import type { ParamTable } from '../compute/params'

/**
 * 公共参数：由运行时的共享件消费，每个特效都有（architecture.md 第六节）。
 * 特效要改某个公共参数的默认值，就在自己的参数表里用同名键重写那一行
 */
export const commonParams = {
  color: { type: 'color', route: 'patch' },
  enterRadius: { type: 'number', default: 150, route: 'patch' },
  wakeSpeed: { type: 'number', default: 4.5, route: 'patch' },
  calmSpeed: { type: 'number', default: 2.4, route: 'patch' },
  padding: { type: 'number', default: 48, route: 'rebuild' },
  maxDpr: { type: 'number', default: 2, route: 'rebuild' },
  debug: { type: 'boolean', default: false, route: 'patch' },
} as const satisfies ParamTable
```

`src/runtime/loop.ts`：

```ts
/** dt 上限：标签页切回来、断点停住之后，第一帧不会一步跳过一大段模拟 */
const MAX_DT = 1 / 30

interface Loop {
  start: () => void
  stop: () => void
}

/** raf 循环，回调拿到夹取到 [0, 1/30] 的 dt（秒） */
export function createLoop(onFrame: (dt: number) => void): Loop {
  let raf = 0
  let last = 0

  function tick(now: number): void {
    // raf 的时间戳是帧开始的时刻，可能早于 start() 里取的 performance.now()
    const dt = Math.min(Math.max((now - last) / 1000, 0), MAX_DT)
    last = now
    // 先排下一帧：onFrame 里调了 stop() 时能把它撤掉；反过来排在后面会在 stop 之后又续上一帧
    raf = requestAnimationFrame(tick)
    onFrame(dt)
  }

  return {
    start() {
      if (raf)
        return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    },
    stop() {
      cancelAnimationFrame(raf)
      raf = 0
    },
  }
}
```

`src/runtime/gate.ts`：

```ts
const mediaConditions = {
  'prefers-reduced-motion': '(prefers-reduced-motion: reduce)',
  'hover: none': '(hover: none)',
  'forced-colors': '(forced-colors: active)',
} as const

export type SleepReason = keyof typeof mediaConditions | 'WebGL 上下文丢失' | '文字宽度为 0' | '文字折行'

/**
 * 必需 API 清单（design.md 第十一节），返回缺的第一项；都在返回 null。
 * 太旧的浏览器直接回退真文本，不为它们写逐个 API 的回退分支
 */
export function missingApi(): string | null {
  if (typeof window === 'undefined')
    return 'window（非浏览器环境）'
  if (!('letterSpacing' in CanvasRenderingContext2D.prototype))
    return 'CanvasRenderingContext2D.letterSpacing'
  if (!('fontBoundingBoxAscent' in TextMetrics.prototype))
    return 'TextMetrics.fontBoundingBoxAscent'
  if (typeof ResizeObserver !== 'function')
    return 'ResizeObserver'
  if (!('onloadingdone' in document.fonts))
    return 'document.fonts 的 loadingdone 事件'
  return null
}

/** 订阅三个媒体查询的变化，返回退订函数。这些 MediaQueryList 只当信号源，当前状态由 sleepReason 读 */
export function watchMedia(onChange: () => void): () => void {
  const lists = Object.values(mediaConditions).map(query => window.matchMedia(query))
  for (const list of lists)
    list.addEventListener('change', onChange)
  return () => {
    for (const list of lists)
      list.removeEventListener('change', onChange)
  }
}

/**
 * 休眠判定：返回第一个成立的休眠条件，都不成立返回 null。
 * 折行判定靠 getClientRects() 多于一个矩形，只在 textEl 是 inline 元素时成立
 */
export function sleepReason(textEl: HTMLElement, contextLost: boolean): SleepReason | null {
  for (const [reason, query] of Object.entries(mediaConditions)) {
    // 必须新建查询：Chromium 里在 change 事件派发前读被监听那个 MediaQueryList 的 .matches，
    // forced-colors 的 change 会被吞掉，退出强制色后再也收不到恢复信号（阶段 0 实测）
    if (window.matchMedia(query).matches)
      return reason as SleepReason
  }
  if (contextLost)
    return 'WebGL 上下文丢失'
  if (textEl.getBoundingClientRect().width === 0)
    return '文字宽度为 0'
  if (textEl.getClientRects().length > 1)
    return '文字折行'
  return null
}
```

`src/runtime/color-probe.ts`：

```ts
import type { ParamTable } from '../compute/params'

/** 0~1，含 alpha */
export type Rgba = [number, number, number, number]

interface Probe {
  key: string
  fallback: string | undefined
  span: HTMLElement
  input: string | undefined
  computed: string
  rgba: Rgba
}

interface ColorProbe {
  /** 解析参数表里每个颜色类参数本帧的值。每帧调用：主题切换时颜色带过渡，只读一次会停在旧主题 */
  read: (values: Readonly<Record<string, unknown>>) => Record<string, Rgba>
  /** 撤掉探针 */
  remove: () => void
}

/**
 * design.md 第九节的颜色继承：每个颜色类参数一个隐藏的探针 span，建在挂载点里（内核独占），
 * 继承的正是根元素的 color。解析交给浏览器：1×1 画布填色后 getImageData 读回 sRGB——
 * 计算值不会统一转成 rgb，正则会把 oklch(0.7 0.15 200) 解析成 0,7,0
 */
export function createColorProbe(layerEl: HTMLElement, table: ParamTable): ColorProbe {
  const scratch = document.createElement('canvas')
  scratch.width = 1
  scratch.height = 1
  const ctx = scratch.getContext('2d', { willReadFrequently: true })
  if (!ctx)
    throw new Error('颜色回读用的 2D 上下文创建失败')

  const probes: Probe[] = []
  for (const [key, spec] of Object.entries(table)) {
    if (spec.type !== 'color')
      continue
    const span = document.createElement('span')
    span.hidden = true
    layerEl.append(span)
    probes.push({ key, fallback: spec.fallback, span, input: undefined, computed: '', rgba: [0, 0, 0, 1] })
  }

  const toRgba = (color: string): Rgba => {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data
    return [r / 255, g / 255, b / 255, a / 255]
  }

  return {
    read(values) {
      const colors: Record<string, Rgba> = {}
      for (const probe of probes) {
        const input = (values[probe.key] ?? (probe.fallback === undefined ? undefined : values[probe.fallback])) as string | undefined
        if (input !== probe.input) {
          // 先清空：非法颜色串的赋值会被忽略、留下上一个值，清空后它回落为继承色
          probe.span.style.color = ''
          if (input !== undefined)
            probe.span.style.color = input
          probe.input = input
        }
        const computed = getComputedStyle(probe.span).color
        if (computed !== probe.computed) {
          probe.computed = computed
          probe.rgba = toRgba(computed)
        }
        colors[probe.key] = probe.rgba
      }
      return colors
    },
    remove() {
      for (const probe of probes)
        probe.span.remove()
    },
  }
}
```

`src/runtime/pointer.ts`（语义与 my-blog 一致：速度逐事件算、两次事件最短间隔 14ms、靠近度按画布外框算）：

```ts
import { approach } from '../compute/approach'
import { proximity } from '../compute/proximity'

export interface PointerState {
  /** 画布内的 CSS 像素 */
  x: number
  y: number
  /** CSS 像素 / 秒，按原写法逐事件计算 */
  vx: number
  vy: number
  /** 上一帧之后有没有新的 mousemove：特效据此决定要不要采用这一帧的坐标与速度 */
  moved: boolean
}

interface PointerSample {
  /** 0~1：靠近度经快慢不对称的逼近后的值 */
  hover: number
  pointer: PointerState
}

interface Pointer {
  /** 每帧调一次：推进 hover，并取走「有新事件」这个标记 */
  sample: (dt: number, wakeSpeed: number, calmSpeed: number) => PointerSample
  stop: () => void
}

/** 两次事件的最短间隔（毫秒）：事件挤在一起时，避免除以一个极小的时间差算出离谱的速度 */
const MIN_EVENT_GAP = 14

export function createPointer(canvas: HTMLCanvasElement, enterRadius: () => number): Pointer {
  let x = 0
  let y = 0
  let vx = 0
  let vy = 0
  let moved = false
  let lastTime = 0
  let target = 0
  let hover = 0

  function onMouseMove(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect()
    const nextX = event.clientX - rect.left
    const nextY = event.clientY - rect.top
    const now = performance.now()
    if (lastTime) {
      const gap = Math.max(now - lastTime, MIN_EVENT_GAP)
      vx = ((nextX - x) / gap) * 1000
      vy = ((nextY - y) / gap) * 1000
    }
    x = nextX
    y = nextY
    lastTime = now
    moved = true
    target = proximity(event.clientX, event.clientY, rect, enterRadius())
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })

  return {
    sample(dt, wakeSpeed, calmSpeed) {
      // 醒得快、静得慢：反过来会显得黏
      hover = approach(hover, target, dt * 1000, target > hover ? wakeSpeed : calmSpeed)
      const pointer = { x, y, vx, vy, moved }
      moved = false
      return { hover, pointer }
    },
    stop() {
      window.removeEventListener('mousemove', onMouseMove)
    },
  }
}
```

`src/runtime/rebuild-watcher.ts`：

```ts
/** 需要重建纹理的信号源；debug 开启时打印 */
type RebuildSource = 'resize' | 'ResizeObserver' | 'dpr' | 'fonts' | 'text'

/**
 * 监听会让纹理过期的变化，每来一个信号就回调一次；合并到每帧最多一次重建由运行时负责。
 * 返回退订函数
 */
export function watchRebuild(textEl: HTMLElement, onSignal: (source: RebuildSource) => void): () => void {
  const onResize = (): void => onSignal('resize')
  window.addEventListener('resize', onResize, { passive: true })

  // 挂在父元素上：ResizeObserver 规范跳过 display: inline 的非替换元素，挂在 span 上等于没挂
  const resizeObserver = new ResizeObserver(() => onSignal('ResizeObserver'))
  resizeObserver.observe(textEl.parentElement ?? textEl)

  // devicePixelRatio 没有变化事件：给当前值建一个媒体查询，它失配的那一刻就是 dpr 变了；
  // 查询钉死在具体数值上，变了之后要按新值重建一个
  let dprQuery: MediaQueryList | undefined
  function watchDpr(): void {
    dprQuery?.removeEventListener('change', onDprChange)
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    dprQuery.addEventListener('change', onDprChange)
  }
  function onDprChange(): void {
    watchDpr()
    onSignal('dpr')
  }
  watchDpr()

  // 纹理用的是画字那一刻的字体，webfont 晚到时字形与 DOM 对不上
  const onFonts = (): void => onSignal('fonts')
  document.fonts.addEventListener('loadingdone', onFonts)

  // 调用方改了文字却没有别的信号时，画布会继续画旧字、盖在透明的新字上
  const mutationObserver = new MutationObserver(() => onSignal('text'))
  mutationObserver.observe(textEl, { characterData: true, childList: true, subtree: true })

  return () => {
    window.removeEventListener('resize', onResize)
    resizeObserver.disconnect()
    dprQuery?.removeEventListener('change', onDprChange)
    document.fonts.removeEventListener('loadingdone', onFonts)
    mutationObserver.disconnect()
  }
}
```

`src/runtime/gl-lifecycle.ts`：

```ts
/**
 * 监听画布上的上下文丢失与恢复，返回退订函数。2D 画布永远收不到这两个事件，天然不生效。
 * 不持有任何 GL 句柄：恢复后由运行时重新 setup，ogl 对象里的旧句柄全部作废
 */
export function watchContext(canvas: HTMLCanvasElement, onLost: () => void, onRestored: () => void): () => void {
  function lost(event: Event): void {
    // 不调的话浏览器永远不恢复：GPU 重置（睡眠唤醒、驱动更新）后标题就一直停在真文本
    event.preventDefault()
    onLost()
  }
  canvas.addEventListener('webglcontextlost', lost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  return () => {
    canvas.removeEventListener('webglcontextlost', lost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
  }
}

/**
 * 主动交还 WebGL 上下文：不等垃圾回收，不再占着同页约 16 个的上下文名额。
 * 同一画布上 getContext 只返回已有的那个上下文；2D 画布在这里拿到 null，天然跳过
 */
export function releaseContext(canvas: HTMLCanvasElement): void {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
}
```

- [ ] **Step 4：实现运行时本体**

`src/runtime/define-effect.ts`：

```ts
import type { Options, OptionTypes, ParamTable, ParamValues } from '../compute/params'
import type { Rgba } from './color-probe'
import type { SleepReason } from './gate'
import type { PointerState } from './pointer'
import type { TextRaster } from './text-raster'
import { applyPatch, optionTypesOf, resolveParams } from '../compute/params'
import { createColorProbe } from './color-probe'
import { commonParams } from './common-params'
import { missingApi, sleepReason, watchMedia } from './gate'
import { releaseContext, watchContext } from './gl-lifecycle'
import { createCanvas, placeCanvas } from './layer'
import { createLoop } from './loop'
import { createPointer } from './pointer'
import { watchRebuild } from './rebuild-watcher'
import { rasterizeText } from './text-raster'

/** 特效的完整参数表：公共参数加上特效自己的；同名键以特效的为准（用来改公共参数的默认值） */
export type EffectTable<T> = Omit<typeof commonParams, keyof T> & T

interface SetupContext<P> {
  /** layer 建好的画布 */
  canvas: HTMLCanvasElement
  /** 当前生效的参数值；patch 后原地更新，每次读都是最新值。不要在 setup 里把值缓存成常量 */
  params: Readonly<P>
}

interface FrameState {
  /** 秒，已夹取到 [0, 1/30] */
  dt: number
  /** 累计秒数 */
  time: number
  /** 0~1：靠近度经快慢不对称的逼近后的值 */
  hover: number
  pointer: PointerState
  /** 每个颜色类参数本帧的解析值 */
  colors: Record<string, Rgba>
}

interface EffectHooks {
  /** 首次开播前，以及之后每次合并后的重建（休眠中推迟到恢复时）。不要碰 textEl */
  build: (raster: TextRaster) => void
  /** 播放期间每帧。从 ctx.params 读参数，不要读 DOM */
  frame: (state: FrameState) => void
  /** destroy、熔断、上下文恢复前 */
  dispose: () => void
}

interface EffectDefinition<T extends ParamTable> {
  /** 本特效独有的参数，外加对公共参数默认值的重写 */
  params: T
  /** create 时一次、上下文恢复后再一次。在 ctx.canvas 上拿渲染上下文，拿不到返回 null */
  setup: (ctx: SetupContext<ParamValues<EffectTable<T>>>) => EffectHooks | null
}

export interface FxInstance<O> {
  /**
   * 改任意选项，按参数表路由：patch 类下一帧生效，重建类自动排一次重建（按帧合并，
   * 但每帧都 patch 一个重建类参数就会每帧重建，很重）。值为 undefined 恢复默认
   */
  patch: (options: O) => void
  /** 停止渲染、撤掉涂透明、移除画布与全部监听，并交还 WebGL 上下文 */
  destroy: () => void
}

interface Effect<T> {
  /**
   * @param textEl 真文本元素，必须是 inline 元素（折行判定依赖它）；内核只会给它设 inline color
   * @param layerEl 空挂载点，内核独占其内部；它所在的根元素要有定位上下文（如 position: relative）
   * @returns 浏览器不支持时返回 null，真文本原样显示，调用方不必写降级分支
   */
  create: (textEl: HTMLElement, layerEl: HTMLElement, options?: Options<T>) => FxInstance<Options<T>> | null
  /** 选项类型映射，供框架壳声明 props */
  optionTypes: OptionTypes<T>
}

const TAG = '[todo-fx]'

/**
 * 运行时骨架：特效只给参数表和钩子，支持检测、休眠判定与它的全部信号、raf、重建合并、涂透明的时机、
 * 上下文丢失与恢复、异常熔断、destroy 清理都在这里，只写一次（architecture.md 第二、三节）
 */
export function defineEffect<T extends ParamTable>(definition: EffectDefinition<T>): Effect<EffectTable<T>> {
  const table: ParamTable = { ...commonParams, ...definition.params }

  function create(textEl: HTMLElement, layerEl: HTMLElement, options?: Options<EffectTable<T>>): FxInstance<Options<EffectTable<T>>> | null {
    const values = resolveParams(table, options as Options<ParamTable>)
    const params = values as ParamValues<EffectTable<T>>
    const common = values as ParamValues<typeof commonParams>
    const log = (message: string): void => {
      if (common.debug)
        console.warn(`${TAG} ${message}`)
    }

    const missing = missingApi()
    if (missing) {
      log(`create 返回 null：浏览器缺少 ${missing}`)
      return null
    }

    const canvas = createCanvas(layerEl)
    const ctx: SetupContext<ParamValues<EffectTable<T>>> = { canvas, params }
    let hooks: EffectHooks | null
    try {
      hooks = definition.setup(ctx)
    }
    catch (error) {
      canvas.remove()
      console.error(`${TAG} setup 抛错，回退为真文本`, error)
      return null
    }
    if (!hooks) {
      canvas.remove()
      log('create 返回 null：setup 拿不到渲染上下文')
      return null
    }

    let running = false
    let painted = false
    let fused = false
    let destroyed = false
    let contextLost = false
    let pendingBuild = true
    let rebuildSources = new Set<string>(['首次构建'])
    let lastReason: SleepReason | 'setup 返回 null' | null = null
    let time = 0
    let colorBeforePaint = ''

    const probe = createColorProbe(layerEl, table)
    const pointer = createPointer(canvas, () => common.enterRadius)
    const loop = createLoop(tick)

    function paint(): void {
      if (painted)
        return
      colorBeforePaint = textEl.style.color
      textEl.style.color = 'transparent'
      painted = true
    }

    function unpaint(): void {
      if (!painted)
        return
      textEl.style.color = colorBeforePaint
      painted = false
    }

    // 钩子抛错时熔断：raf 链断掉会让画面停在「文字透明 + 画布冻住」，标题隐身；熔断后至少看得到真文本
    function fuse(error: unknown): void {
      fused = true
      running = false
      loop.stop()
      unpaint()
      console.error(`${TAG} 特效出错，已停止并回退为真文本`, error)
      try {
        hooks?.dispose()
      }
      catch {}
    }

    function build(): boolean {
      // maxDpr 传成 0 或负数时按 1：0 尺寸的画布画不出东西，文字却照样涂透明，标题就隐身了
      const dpr = Math.min(window.devicePixelRatio || 1, common.maxDpr > 0 ? common.maxDpr : 1)
      const size = placeCanvas(canvas, textEl.getBoundingClientRect(), common.padding, dpr)
      log(`重建：${[...rebuildSources].join('、')}`)
      rebuildSources = new Set()
      try {
        hooks!.build(rasterizeText(textEl, size, common.padding, dpr))
      }
      catch (error) {
        fuse(error)
        return false
      }
      pendingBuild = false
      return true
    }

    function tick(dt: number): void {
      if (pendingBuild && !build())
        return
      time += dt
      const { hover, pointer: pointerState } = pointer.sample(dt, common.wakeSpeed, common.calmSpeed)
      try {
        hooks!.frame({ dt, time, hover, pointer: pointerState, colors: probe.read(values) })
      }
      catch (error) {
        fuse(error)
        return
      }
      // 首帧画完才涂透明，同一帧内交接：没有两边都看不见的空隙，也没有重影
      paint()
    }

    /** 唯一的判定入口：任何信号到来都只调它，幂等 */
    function evaluate(): void {
      if (fused || destroyed)
        return
      const reason = hooks ? sleepReason(textEl, contextLost) : 'setup 返回 null'
      if (reason !== lastReason) {
        log(reason ? `休眠：${reason}` : `恢复：${lastReason} 已解除`)
        lastReason = reason
      }
      if (!reason && !running) {
        // 休眠中不重建，只记着；恢复时先建好纹理再开播
        if (pendingBuild && !build())
          return
        running = true
        loop.start()
      }
      else if (reason && running) {
        running = false
        loop.stop()
        unpaint()
      }
    }

    function invalidate(source: string): void {
      pendingBuild = true
      rebuildSources.add(source)
      evaluate()
    }

    function onContextLost(): void {
      contextLost = true
      evaluate()
    }

    // 依次 dispose → setup → build：重新 setup 保证全部 GL 资源重建，漏不掉哪一个
    function onContextRestored(): void {
      if (fused || destroyed)
        return
      contextLost = false
      try {
        hooks?.dispose()
        hooks = definition.setup(ctx)
      }
      catch (error) {
        fuse(error)
        return
      }
      invalidate('上下文恢复')
    }

    const unwatchMedia = watchMedia(evaluate)
    const unwatchRebuild = watchRebuild(textEl, invalidate)
    const unwatchContext = watchContext(canvas, onContextLost, onContextRestored)
    evaluate()

    return {
      patch(patch) {
        const rebuildKeys = applyPatch(table, values, patch as Options<ParamTable>)
        if (rebuildKeys.length)
          invalidate(`patch ${rebuildKeys.join('、')}`)
      },
      destroy() {
        if (destroyed)
          return
        destroyed = true
        running = false
        loop.stop()
        unpaint()
        unwatchMedia()
        unwatchRebuild()
        unwatchContext()
        pointer.stop()
        if (!fused) {
          try {
            hooks?.dispose()
          }
          catch {}
        }
        releaseContext(canvas)
        canvas.remove()
        probe.remove()
      },
    }
  }

  return { create, optionTypes: optionTypesOf(table) as OptionTypes<EffectTable<T>> }
}
```

要点（审阅时对照 architecture 第三节）：整个运行时只有 `running` 一个播放状态和幂等的 `evaluate()`；任何信号都只调它（重建信号先记「待重建」）；
休眠中不重建；开播先 build 再启动 raf；涂透明在首帧 `frame` 成功返回之后；重建在 raf 回调里、紧接着 `frame`。

- [ ] **Step 5：确认变绿，并过类型检查与 lint**

同 Step 2 的两条命令，预期 runtime 36 条 × 2 个内核、touch 1 条 × 2 个 instance 全过；再跑 `vue-tsc --noEmit` 与 `eslint .`，零报错。

- [ ] **Step 6：变异**

`<scratchpad>/muts-runtime.json`：

```json
[
 {
  "name": "涂透明提前到 frame 之前",
  "file": "src/runtime/define-effect.ts",
  "old": "      try {\n        hooks!.frame(",
  "new": "      paint()\n      try {\n        hooks!.frame("
 },
 {
  "name": "休眠中也立即重建",
  "file": "src/runtime/define-effect.ts",
  "old": "      rebuildSources.add(source)\n      evaluate()",
  "new": "      rebuildSources.add(source)\n      build()\n      evaluate()"
 },
 {
  "name": "播放中立即重建（不按帧合并）",
  "file": "src/runtime/define-effect.ts",
  "old": "      rebuildSources.add(source)\n      evaluate()",
  "new": "      rebuildSources.add(source)\n      if (running) build()\n      evaluate()"
 },
 {
  "name": "gate 漏掉 reduced-motion",
  "file": "src/runtime/gate.ts",
  "old": "  'prefers-reduced-motion': '(prefers-reduced-motion: reduce)',\n",
  "new": ""
 },
 {
  "name": "gate 漏掉 forced-colors",
  "file": "src/runtime/gate.ts",
  "old": "  'forced-colors': '(forced-colors: active)',\n",
  "new": ""
 },
 {
  "name": "gate 不判宽度为 0",
  "file": "src/runtime/gate.ts",
  "old": "  if (textEl.getBoundingClientRect().width === 0)\n    return '文字宽度为 0'\n",
  "new": ""
 },
 {
  "name": "gate 不判折行",
  "file": "src/runtime/gate.ts",
  "old": "  if (textEl.getClientRects().length > 1)\n    return '文字折行'\n",
  "new": ""
 },
 {
  "name": "gate 不判上下文丢失",
  "file": "src/runtime/gate.ts",
  "old": "  if (contextLost)\n    return 'WebGL 上下文丢失'\n",
  "new": ""
 },
 {
  "name": "上下文丢失不 preventDefault",
  "file": "src/runtime/gl-lifecycle.ts",
  "old": "    event.preventDefault()\n",
  "new": ""
 },
 {
  "name": "恢复时不 dispose",
  "file": "src/runtime/define-effect.ts",
  "old": "        hooks?.dispose()\n        hooks = definition.setup(ctx)",
  "new": "        hooks = definition.setup(ctx)"
 },
 {
  "name": "熔断不撤涂透明",
  "file": "src/runtime/define-effect.ts",
  "old": "      loop.stop()\n      unpaint()\n      console.error",
  "new": "      loop.stop()\n      console.error"
 },
 {
  "name": "destroy 不退订媒体查询",
  "file": "src/runtime/define-effect.ts",
  "old": "        unwatchMedia()\n        unwatchRebuild()",
  "new": "        unwatchRebuild()"
 },
 {
  "name": "destroy 不退订重建信号",
  "file": "src/runtime/define-effect.ts",
  "old": "        unwatchMedia()\n        unwatchRebuild()",
  "new": "        unwatchMedia()"
 },
 {
  "name": "destroy 不退订上下文事件",
  "file": "src/runtime/define-effect.ts",
  "old": "        unwatchContext()\n        pointer.stop()",
  "new": "        pointer.stop()"
 },
 {
  "name": "destroy 不停指针",
  "file": "src/runtime/define-effect.ts",
  "old": "        unwatchContext()\n        pointer.stop()",
  "new": "        unwatchContext()"
 },
 {
  "name": "destroy 不停 raf",
  "file": "src/runtime/define-effect.ts",
  "old": "        destroyed = true\n        running = false\n        loop.stop()",
  "new": "        destroyed = true\n        running = false"
 },
 {
  "name": "destroy 不交还上下文",
  "file": "src/runtime/define-effect.ts",
  "old": "        releaseContext(canvas)\n",
  "new": ""
 },
 {
  "name": "destroy 不撤探针",
  "file": "src/runtime/define-effect.ts",
  "old": "        probe.remove()\n",
  "new": ""
 },
 {
  "name": "rebuild-watcher 不断开 ResizeObserver",
  "file": "src/runtime/rebuild-watcher.ts",
  "old": "    resizeObserver.disconnect()\n",
  "new": ""
 },
 {
  "name": "rebuild-watcher 不断开 MutationObserver",
  "file": "src/runtime/rebuild-watcher.ts",
  "old": "    mutationObserver.disconnect()\n",
  "new": ""
 },
 {
  "name": "不监听文本变化",
  "file": "src/runtime/rebuild-watcher.ts",
  "old": "  mutationObserver.observe(textEl, { characterData: true, childList: true, subtree: true })",
  "new": ""
 },
 {
  "name": "撤涂透明不还原原有 inline color",
  "file": "src/runtime/define-effect.ts",
  "old": "      textEl.style.color = colorBeforePaint",
  "new": "      textEl.style.color = ''"
 },
 {
  "name": "画布不解除 max-width",
  "file": "src/runtime/layer.ts",
  "old": " max-width: none;'",
  "new": "'"
 },
 {
  "name": "定位不扣边框",
  "file": "src/runtime/layer.ts",
  "old": " - base.clientLeft - padding",
  "new": " - padding"
 },
 {
  "name": "颜色只读一次",
  "file": "src/runtime/color-probe.ts",
  "old": "        if (computed !== probe.computed) {",
  "new": "        if (probe.computed === '') {"
 },
 {
  "name": "非法颜色前不先清空",
  "file": "src/runtime/color-probe.ts",
  "old": "          probe.span.style.color = ''\n          if (input",
  "new": "          if (input"
 },
 {
  "name": "fallback 不生效",
  "file": "src/runtime/color-probe.ts",
  "old": "values[probe.key] ?? (probe.fallback === undefined ? undefined : values[probe.fallback])",
  "new": "values[probe.key]"
 },
 {
  "name": "颜色用正则解析",
  "file": "src/runtime/color-probe.ts",
  "old": "          probe.rgba = toRgba(computed)",
  "new": "          probe.rgba = [...(computed.match(/[\\d.]+/g) ?? []).slice(0, 3).map(Number).map(n => n / 255), 1] as Rgba"
 },
 {
  "name": "moved 不复位",
  "file": "src/runtime/pointer.ts",
  "old": "      moved = false\n      return",
  "new": "      return"
 },
 {
  "name": "dt 不夹取上限",
  "file": "src/runtime/loop.ts",
  "old": "Math.min(Math.max((now - last) / 1000, 0), MAX_DT)",
  "new": "Math.max((now - last) / 1000, 0)"
 },
 {
  "name": "patch 类也排重建",
  "file": "src/compute/params.ts",
  "old": "    if (spec.route === 'rebuild')\n      rebuild.push(key)",
  "new": "    rebuild.push(key)"
 },
 {
  "name": "debug 不打印休眠",
  "file": "src/runtime/define-effect.ts",
  "old": "        log(reason ? `休眠：${reason}` : `恢复：${lastReason} 已解除`)",
  "new": ""
 },
 {
  "name": "缺 API 也不返回 null",
  "file": "src/runtime/define-effect.ts",
  "old": "    if (missing) {",
  "new": "    if (missing && false) {"
 },
 {
  "name": "setup 返回 null 不撤画布",
  "file": "src/runtime/define-effect.ts",
  "old": "    if (!hooks) {\n      canvas.remove()",
  "new": "    if (!hooks) {"
 },
 {
  "name": "rebuild-watcher 不退订 resize",
  "file": "src/runtime/rebuild-watcher.ts",
  "old": "    window.removeEventListener('resize', onResize)\n",
  "new": ""
 },
 {
  "name": "不监听 resize",
  "file": "src/runtime/rebuild-watcher.ts",
  "old": "  window.addEventListener('resize', onResize, { passive: true })\n",
  "new": ""
 },
 {
  "name": "不监听字体",
  "file": "src/runtime/rebuild-watcher.ts",
  "old": "  document.fonts.addEventListener('loadingdone', onFonts)\n",
  "new": ""
 },
 {
  "name": "maxDpr 不设下限",
  "file": "src/runtime/define-effect.ts",
  "old": "common.maxDpr > 0 ? common.maxDpr : 1",
  "new": "common.maxDpr"
 }
]
```

```bash
python3 <scratchpad>/mutate.py . <scratchpad>/muts-runtime.json test/browser/runtime.browser.test.ts
```
预期：38 条全部 `[RED ]`、全部 `文件已变:True`。有一条绿就停下：要么测试写瞎了，要么那段代码多余（干跑里「熔断后 patch 的守卫」就是因为这个删掉的 ——
`evaluate()` 已经在熔断后直接返回）。

- [ ] **Step 7：提交**

走 `/commit`，建议信息：`feat(runtime): 加运行时骨架 defineEffect 与休眠、颜色、指针、重建、上下文等共享件`。

---

### 任务 4：liquid-text

**Files:**
- Create: `src/effects/liquid-text/params.ts`、`shaders.ts`、`index.ts`
- Modify: `vitest.config.ts`（optimizeDeps 加 ogl）
- Test: `test/browser/liquid-text.browser.test.ts`

**Interfaces:**
- Consumes：`defineEffect`、`EffectTable`、`FxInstance`、参数表类型。
- Produces：`createLiquidText(textEl, layerEl, options?): FxInstance<LiquidTextOptions> | null`；`liquidTextOptionTypes: OptionTypes<LiquidTextTable>`；`LiquidTextOptions`。

- [ ] **Step 1：写测试，并把 ogl 加进预构建**

`vitest.config.ts` 的 browser project：

```diff
-        // 首次运行（CI 每次都是）时 vue 要到测试中途才被发现、临时预构建，随即整页重载，正在导入的测试文件全部失败
-        optimizeDeps: { include: ['vue'] },
+        // 首次运行（CI 每次都是）时依赖要到测试中途才被发现、临时预构建，随即整页重载，正在导入的测试文件全部失败
+        optimizeDeps: { include: ['vue', 'ogl'] },
```

`test/browser/liquid-text.browser.test.ts`（此时从 `../../src/index` 导入会解析失败，任务 5 才改公开入口 —— 本任务先从特效目录导入，任务 5 Step 1 改回公开入口）：

```ts
import type { LiquidTextOptions } from '../../src/index'
import type { MountedHeading } from './helpers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLiquidText } from '../../src/index'
import { mountHeading, nextFrames, readPixels } from './helpers'

// 液态版只测自己的渲染（architecture.md 第九节）；时序由 runtime 的测试管。
// shader 编译失败是静默的：画布一片空白、无报错，只有读回像素才发现得了
let target: MountedHeading
const cleanups: Array<() => void> = []

beforeEach(() => {
  target = mountHeading('Hubery', 'font: 700 64px sans-serif; margin: 0; color: rgb(0, 0, 0);')
  cleanups.push(target.cleanup)
})

afterEach(() => {
  while (cleanups.length)
    cleanups.pop()!()
  vi.restoreAllMocks()
})

function start(options?: LiquidTextOptions) {
  const instance = createLiquidText(target.textEl, target.layerEl, options)!
  expect(instance).not.toBeNull()
  cleanups.push(() => instance.destroy())
  return instance
}

const canvas = (): HTMLCanvasElement => target.layerEl.querySelector('canvas')!

/** 完全不透明的像素里，各通道的平均值；字心处三通道采样一致，没有色差，颜色就是 uColor */
async function solidColor(): Promise<{ count: number, rgb: number[] }> {
  const pixels = await readPixels(canvas())
  let count = 0
  const sum = [0, 0, 0]
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 255) {
      count++
      sum[0]! += pixels[i]!
      sum[1]! += pixels[i + 1]!
      sum[2]! += pixels[i + 2]!
    }
  }
  return { count, rgb: sum.map(v => Math.round(v / Math.max(count, 1))) }
}

/** 鼠标从左到右横扫画布中线 */
function sweep(): void {
  const rect = canvas().getBoundingClientRect()
  for (let x = 0; x <= 10; x++)
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + rect.width * (0.2 + x * 0.06), clientY: rect.top + rect.height / 2 }))
}

/** idle 为 0 时画面静止；横扫一遍鼠标之后，读回的像素必须与扫之前不同 */
async function expectStirred(): Promise<void> {
  const still = await readPixels(canvas())
  sweep()
  await expect.poll(async () => {
    const moved = await readPixels(canvas())
    return moved.some((v, i) => v !== still[i])
  }).toBe(true)
}

async function maxAlpha(): Promise<number> {
  const pixels = await readPixels(canvas())
  let max = 0
  for (let i = 3; i < pixels.length; i += 4)
    max = Math.max(max, pixels[i]!)
  return max
}

describe('liquid-text', () => {
  it('画得出字：读回不透明像素，颜色继承自父元素', async () => {
    target.heading.style.color = 'rgb(255, 0, 0)'
    start()
    await expect.poll(() => target.textEl.style.color).toBe('transparent')
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    expect((await solidColor()).rgb).toEqual([255, 0, 0])
  })

  it('patch 颜色之后画面跟着变（颜色每帧写进 uniform，不是只写一次）', async () => {
    const instance = start()
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    await new Promise(resolve => setTimeout(resolve, 300))
    instance.patch({ color: 'rgb(0, 0, 255)' })
    await expect.poll(async () => (await solidColor()).rgb).toEqual([0, 0, 255])
  })

  it('颜色自带的 alpha 乘进最终 alpha', async () => {
    target.heading.style.color = 'rgba(0, 0, 0, 0.6)'
    start()
    await expect.poll(() => target.textEl.style.color).toBe('transparent')
    // 0.6 × 255 ≈ 153；软件渲染与 GPU 取整可能差 1。开着混合时 alpha 会再乘一次，落到 92
    await expect.poll(async () => Math.abs(await maxAlpha() - 153)).toBeLessThanOrEqual(1)
  })

  it('重建类参数（flowmap）改了之后照样画得出字、照样跟着鼠标流动', async () => {
    const instance = start({ idle: 0 })
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    instance.patch({ flowmap: { dissipation: 0.5 }, padding: 10 })
    await expect.poll(() => Number.parseFloat(canvas().style.width)).toBeCloseTo(target.textEl.getBoundingClientRect().width + 20, 3)
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    await expectStirred()
  })

  it('flowmap 的新值确实生效：alpha 改成 0 之后鼠标划过不再搅动画面', async () => {
    const instance = start({ idle: 0 })
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    instance.patch({ flowmap: { alpha: 0 } })
    await nextFrames(3)
    const still = await readPixels(canvas())
    sweep()
    await nextFrames(10)
    expect((await readPixels(canvas())).every((v, i) => v === still[i])).toBe(true)
  })

  it('上下文丢失后恢复：全部 GL 资源重建，照样画得出字', async () => {
    start()
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    const lose = canvas().getContext('webgl2')!.getExtension('WEBGL_lose_context')!
    lose.loseContext()
    await expect.poll(() => target.textEl.style.color).toBe('')
    lose.restoreContext()
    await expect.poll(() => target.textEl.style.color).toBe('transparent')
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
  })

  it('鼠标划过时画面随之变化', async () => {
    start({ idle: 0 })
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    await expectStirred()
  })

  it('拿不到 WebGL 上下文时返回 null，不报错', () => {
    const getContext = HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type.startsWith('webgl') ? null : getContext.call(this, type, ...rest as [])
    } as typeof getContext)
    const error = vi.spyOn(console, 'error')
    expect(createLiquidText(target.textEl, target.layerEl)).toBeNull()
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(error).not.toHaveBeenCalled()
  })
})
```

本任务内把文件头两行 import 临时写成 `from '../../src/effects/liquid-text'`（`LiquidTextOptions` 与 `createLiquidText` 都从那里导出）。

- [ ] **Step 2：确认变红**

```bash
node_modules/.bin/vitest run test/browser/liquid-text.browser.test.ts --project 'browser (chromium)' --project 'browser (webkit)'
```
预期：`Failed to resolve import "../../src/effects/liquid-text"`。

- [ ] **Step 3：实现**

`src/effects/liquid-text/params.ts`（数值与注释取自 `HeroTitle.vue` 的常量）：

```ts
import type { ParamTable } from '../../compute/params'

/** design.md 第七节；color、enterRadius、wakeSpeed / calmSpeed、padding、maxDpr、debug 是公共参数，由运行时补上 */
export const liquidTextParams = {
  /** 高光色：划得快的地方往它偏。默认等于 color，即没有高光；不读任何宿主 CSS 变量，要接站点主色就传 `var(--c-primary)` */
  accent: { type: 'color', route: 'patch', fallback: 'color' },
  /** 位移强度（uv 单位）。再大就不像流动而像撕裂了 */
  strength: { type: 'number', default: 0.075, route: 'patch' },
  /** 色差强度，乘在 flowmap 的速度长度上 */
  chroma: { type: 'number', default: 0.04, route: 'patch' },
  /**
   * 静止时表面微流的振幅（uv 单位），调节「不碰它的时候有多活」的唯一旋钮。
   * 标题在 280 × 162 的画布上时，0.0022 折合横向约 1.6px 的峰值位移；0.0032 起就明显在晃，0.006 以上读作「抖」
   */
  idle: { type: 'number', default: 0.0022, route: 'patch' },
  /**
   * 鼠标轨迹速度图的参数。在 ogl 里它们其实是 uniform，但只能经未公开字段改，ogl 升级可能悄悄失效，所以走重建；
   * 重建会清掉当前残留的笔触。dissipation 越接近 1 消散越慢：0.96 让划过之后水面还在晃，短了会显得一碰就弹回去
   */
  flowmap: { type: 'object', default: { falloff: 0.32, alpha: 0.6, dissipation: 0.96 }, route: 'rebuild' },
} as const satisfies ParamTable
```

`src/effects/liquid-text/shaders.ts`（与 my-blog 的差别只有一处：`uColor` / `uAccent` 改成 `vec4`，颜色的 alpha 乘进最终 alpha）：

```ts
export const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

/**
 * 纹理只用 alpha 通道：离屏画布上是白字，颜色在这里用 uColor 现填，主题切换只改 uniform、不重画纹理。
 * flowmap 的 R/G 存 xy 方向的速度、B 存速度长度：位移吃 R/G，色差吃 B——慢慢移只有形变，快速划才炸开
 */
export const fragment = /* glsl */ `
  precision highp float;

  uniform sampler2D tMap;
  uniform sampler2D tFlow;
  uniform vec4 uColor;
  uniform vec4 uAccent;
  uniform float uStrength;
  uniform float uChroma;
  uniform float uIdle;
  uniform float uTime;
  uniform float uHover;

  varying vec2 vUv;

  void main() {
    vec3 flow = texture2D(tFlow, vUv).rgb;

    // 静止时的表面微流：几组不同频率的波叠加，周期互质所以看不出重复。没有这一层，鼠标一停画面就冻住。
    // 前两组空间频率低于整个单词的尺度，单独放大只会整块字一起平移（读作「字在抖」）；
    // 后一组把空间频率提到 13~21，同一个字母的不同部位错开起伏，才有剪切感。权重 0.55 让高频只做质感
    vec2 idle = (
      vec2(
        sin(uTime * 0.61 + vUv.y * 9.0) + sin(uTime * 0.43 + vUv.x * 5.0),
        cos(uTime * 0.53 + vUv.x * 7.0) + cos(uTime * 0.37 + vUv.y * 4.0)
      )
      + 0.55 * vec2(
        sin(uTime * 1.13 + vUv.x * 21.0 + vUv.y * 13.0),
        cos(uTime * 0.97 + vUv.y * 19.0 - vUv.x * 15.0)
      )
    ) * uIdle;

    // 鼠标不在附近时也保留一半的响应力度，免得靠近的瞬间强度突然翻倍
    vec2 offset = flow.xy * uStrength * (0.5 + uHover * 0.5) + idle;
    float chroma = flow.b * uChroma;

    // 三个通道各偏一点，速度越快分得越开
    float r = texture2D(tMap, vUv - offset - vec2(chroma, 0.0)).a;
    float g = texture2D(tMap, vUv - offset * 1.12).a;
    float b = texture2D(tMap, vUv - offset * 1.24 + vec2(chroma, 0.0)).a;

    float alpha = (r + g + b) / 3.0;
    if (alpha < 0.003) discard;

    // 高光往 accent 偏而不是「提亮」：亮色主题下文字是深色压在浅底上，提亮等于变淡，看起来是字糊了
    float speed = clamp(flow.b * 1.2, 0.0, 1.0);
    vec4 base = mix(uColor, uAccent, speed * uHover * 0.75);

    // 三通道相对平均值的偏差就是彩色边缘；颜色自带的 alpha 乘进最终 alpha（宿主常用半透明色做「淡一档」的文字）
    vec3 fringe = vec3(r, g, b) - vec3(alpha);
    gl_FragColor = vec4(base.rgb + fringe * 1.6, alpha * base.a);
  }
`
```

`src/effects/liquid-text/index.ts`：

```ts
import type { Options, OptionTypes, ParamValues } from '../../compute/params'
import type { EffectTable, FxInstance } from '../../runtime/define-effect'
import { Flowmap, Mesh, Program, Renderer, Texture, Triangle, Vec2 } from 'ogl'
import { defineEffect } from '../../runtime/define-effect'
import { liquidTextParams } from './params'
import { fragment, vertex } from './shaders'

type LiquidTextTable = EffectTable<typeof liquidTextParams>
type FlowmapOptions = ParamValues<LiquidTextTable>['flowmap']

export type LiquidTextOptions = Options<LiquidTextTable>

// 与 ogl Renderer 在 alpha: true 时传给 getContext 的属性一致：同一画布上第一次 getContext 定下的属性才算数
const contextAttributes: WebGLContextAttributes = {
  alpha: true,
  depth: true,
  stencil: false,
  antialias: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
}

/** 鼠标停下后速度每帧的衰减：不衰减的话 flowmap 会一直按最后那一下的速度盖章，水面永远停不下来 */
const VELOCITY_DECAY = 0.92
/** 盖章速度向目标插值的系数：比 0.15 再低一档，笔触之间过渡得更连 */
const VELOCITY_EASE = 0.12

function sameFlowmap(a: FlowmapOptions, b: FlowmapOptions): boolean {
  return a.falloff === b.falloff && a.alpha === b.alpha && a.dissipation === b.dissipation
}

const liquidText = defineEffect({
  params: liquidTextParams,
  setup({ canvas, params }) {
    // ogl 的 Renderer 拿不到上下文时先 console.error、再抛 TypeError，所以先自己取一次
    const context = canvas.getContext('webgl2', contextAttributes) ?? canvas.getContext('webgl', contextAttributes)
    if (!context)
      return null

    const renderer = new Renderer({ canvas, alpha: true })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)

    const texture = new Texture(gl)
    const mouse = new Vec2(-1, -1)
    const velocity = new Vec2()
    let flowmapOptions: FlowmapOptions = { ...params.flowmap }
    let flowmap = new Flowmap(gl, flowmapOptions)
    let aspect = 1
    let cssWidth = 1
    let cssHeight = 1

    const uniforms = {
      tMap: { value: texture },
      tFlow: flowmap.uniform,
      uColor: { value: [0, 0, 0, 1] },
      uAccent: { value: [0, 0, 0, 1] },
      uStrength: { value: params.strength },
      uChroma: { value: params.chroma },
      uIdle: { value: params.idle },
      uTime: { value: 0 },
      uHover: { value: 0 },
    }
    const geometry = new Triangle(gl)
    // 不开混合：画布每帧清成全透明后只画这一遍，混合只会把 alpha 再乘一次——
    // 字的抗锯齿边缘变成 alpha² 比 DOM 文字细一圈，半透明色（0.6）落到 0.36。shader 输出的就是最终颜色
    const program = new Program(gl, { vertex, fragment, uniforms })
    const mesh = new Mesh(gl, { geometry, program })

    function disposeFlowmap(): void {
      for (const target of [flowmap.mask.read, flowmap.mask.write]) {
        gl.deleteFramebuffer(target.buffer)
        gl.deleteTexture(target.texture.texture)
      }
      flowmap.mesh.program.remove()
      flowmap.mesh.geometry.remove()
    }

    return {
      build(raster) {
        cssWidth = raster.width / raster.dpr
        cssHeight = raster.height / raster.dpr
        aspect = raster.width / raster.height
        // 不调 renderer.setSize：画布的尺寸归 layer 管（它已按 raster 设好），setSize 会把 style 改写成取整后的值。
        // render 按 width × dpr 定视口，这三个字段对上 raster 就行
        renderer.dpr = raster.dpr
        renderer.width = cssWidth
        renderer.height = cssHeight
        if (!sameFlowmap(params.flowmap, flowmapOptions)) {
          disposeFlowmap()
          flowmapOptions = { ...params.flowmap }
          flowmap = new Flowmap(gl, flowmapOptions)
          uniforms.tFlow = flowmap.uniform
        }
        // ogl 发现 image 换了对象就会重新上传，raster 每次都是新画布
        texture.image = raster.image
      },
      frame({ time, hover, pointer, colors }) {
        if (pointer.moved) {
          // uv 的原点在左下，画布坐标的 y 向下增长，所以 y 要翻过来
          mouse.set(pointer.x / cssWidth, 1 - pointer.y / cssHeight)
          velocity.set(pointer.vx / cssWidth, -pointer.vy / cssHeight)
        }
        velocity.multiply(VELOCITY_DECAY)
        flowmap.aspect = aspect
        flowmap.mouse.copy(mouse)
        flowmap.velocity.x += (velocity.x - flowmap.velocity.x) * VELOCITY_EASE
        flowmap.velocity.y += (velocity.y - flowmap.velocity.y) * VELOCITY_EASE
        flowmap.update()

        uniforms.uTime.value = time
        uniforms.uHover.value = hover
        uniforms.uStrength.value = params.strength
        uniforms.uChroma.value = params.chroma
        uniforms.uIdle.value = params.idle
        uniforms.uColor.value = colors.color!
        uniforms.uAccent.value = colors.accent!
        renderer.render({ scene: mesh })
      },
      dispose() {
        disposeFlowmap()
        program.remove()
        geometry.remove()
        gl.deleteTexture(texture.texture)
      },
    }
  },
})

/**
 * 给一行标题加液态交互效果：真文本留在 DOM 里只涂透明，画布盖在上面。
 * 浏览器不支持时返回 null，真文本原样显示
 */
export const createLiquidText: (textEl: HTMLElement, layerEl: HTMLElement, options?: LiquidTextOptions) => FxInstance<LiquidTextOptions> | null = liquidText.create

/** 选项类型映射：键名 → 原生类型构造器，供框架壳声明 props */
export const liquidTextOptionTypes: OptionTypes<LiquidTextTable> = liquidText.optionTypes
```

- [ ] **Step 4：确认变绿**

同 Step 2 的命令，预期 8 条 × 2 个内核全过，且输出里**没有** `Vite unexpectedly reloaded a test`。

- [ ] **Step 5：变异**

`<scratchpad>/muts-liquid.json`：

```json
[
 {
  "name": "shader 语法错误",
  "file": "src/effects/liquid-text/shaders.ts",
  "old": "    float alpha = (r + g + b) / 3.0;",
  "new": "    float alpha = (r + g + b) / 3.0"
 },
 {
  "name": "开着混合",
  "file": "src/effects/liquid-text/index.ts",
  "old": "new Program(gl, { vertex, fragment, uniforms })",
  "new": "new Program(gl, { vertex, fragment, uniforms, transparent: true })"
 },
 {
  "name": "颜色 alpha 不乘进去",
  "file": "src/effects/liquid-text/shaders.ts",
  "old": "alpha * base.a);",
  "new": "alpha);"
 },
 {
  "name": "不先自己取上下文",
  "file": "src/effects/liquid-text/index.ts",
  "old": "    if (!context)\n      return null\n",
  "new": ""
 },
 {
  "name": "忽略指针",
  "file": "src/effects/liquid-text/index.ts",
  "old": "        if (pointer.moved) {",
  "new": "        if (pointer.moved && false) {"
 },
 {
  "name": "flowmap 换新后不接回 uniform",
  "file": "src/effects/liquid-text/index.ts",
  "old": "          uniforms.tFlow = flowmap.uniform\n",
  "new": ""
 },
 {
  "name": "颜色只在头几帧设",
  "file": "src/effects/liquid-text/index.ts",
  "old": "        uniforms.uColor.value = colors.color!\n",
  "new": "        if (time < 0.05) uniforms.uColor.value = colors.color!\n"
 },
 {
  "name": "flowmap 换新后不接回 uniform",
  "file": "src/effects/liquid-text/index.ts",
  "old": "          uniforms.tFlow = flowmap.uniform\n",
  "new": ""
 },
 {
  "name": "flowmap 参数改了不换新",
  "file": "src/effects/liquid-text/index.ts",
  "old": "        if (!sameFlowmap(params.flowmap, flowmapOptions)) {",
  "new": "        if (false) {"
 }
]
```

```bash
python3 <scratchpad>/mutate.py . <scratchpad>/muts-liquid.json test/browser/liquid-text.browser.test.ts
```
预期：9 条全部 `[RED ]`。其中「shader 语法错误」证明像素读回能抓住静默的编译失败；「开着混合」对应拍板一。

- [ ] **Step 6：提交**

走 `/commit`，建议信息：`feat(liquid-text): 搬入液态文字特效，颜色每帧读、alpha 乘进最终 alpha`。

---

### 任务 5：公开入口、产物断言、夹具集成与 playground

**Files:**
- Modify: `src/index.ts`、`test/artifact/no-ogl.test.ts`、`playground/main.ts`、`playground/fixtures/modern-colors.ts`、`test/browser/liquid-text.browser.test.ts`（import 改回公开入口）
- Modify（生成）: `test/artifact/__snapshots__/tsnapi/@huberyyang/todo-fx/index.snapshot.js`、`index.snapshot.d.ts`
- Test: `test/browser/liquid-text-fixtures.browser.test.ts`

- [ ] **Step 1：写测试**

`test/browser/liquid-text.browser.test.ts` 的两行 import 改回 `from '../../src/index'`。

`test/browser/liquid-text-fixtures.browser.test.ts`：

```ts
import type { FxInstance, LiquidTextOptions } from '../../src/index'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from 'vitest/browser'
import { hiddenContainer } from '../../playground/fixtures/hidden-container'
import { hostFixtures } from '../../playground/fixtures/index'
import { manyInstances } from '../../playground/fixtures/many-instances'
import { narrowWrap } from '../../playground/fixtures/narrow-wrap'
import { createLiquidText } from '../../src/index'
import { nextFrames } from './helpers'

// 8 个宿主场景夹具（design.md 第十三节）原样跑一遍 createLiquidText：playground 手调看到的就是这里测的
const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length)
    cleanups.pop()!()
})

function mount(fixture: typeof hostFixtures[number]) {
  const root = document.createElement('div')
  document.body.append(root)
  const mounted = fixture.mount(root)
  const instances = mounted.targets.map(({ textEl, layerEl }) => createLiquidText(textEl, layerEl))
  cleanups.push(() => root.remove(), mounted.cleanup, () => instances.forEach(i => i?.destroy()))
  const colors = (): string[] => mounted.targets.map(t => t.textEl.style.color)
  return { ...mounted, instances: instances as Array<FxInstance<LiquidTextOptions>>, colors }
}

describe('宿主场景夹具', () => {
  // 这几个夹具里每个实例都该开播
  it.for(hostFixtures.filter(f => ![hiddenContainer, manyInstances, narrowWrap].includes(f)).map(f => [f.id, f] as const))('%s：开播并接管', async ([, fixture]) => {
    const { instances, colors } = mount(fixture)
    expect(instances.every(Boolean)).toBe(true)
    await expect.poll(colors).toEqual(colors().map(() => 'transparent'))
  })

  it('hidden-container：隐藏时显示真文本，显示后接管', async () => {
    const { actions, colors } = mount(hiddenContainer)
    await nextFrames(3)
    expect(colors()).toEqual([''])
    actions.显示()
    await expect.poll(colors).toEqual(['transparent'])
  })

  it('narrow-wrap：折行时显示真文本，加宽后接管', async () => {
    const { actions, colors } = mount(narrowWrap)
    await nextFrames(3)
    expect(colors()).toEqual([''])
    actions.加宽()
    await expect.poll(colors).toEqual(['transparent'])
  })

  // 被挤掉上下文的实例停在真文本，不会变成「透明文字 + 空白画布」；Firefox 的上限高得多，一个都不丢
  const evicted: Record<string, number[]> = { chromium: [0, 1], firefox: [], webkit: [0, 1] }

  it('many-instances：超出上下文上限被挤掉的实例显示真文本，其余接管', async () => {
    const { colors } = mount(manyInstances)
    const expected = colors().map((_, i) => evicted[server.browser]!.includes(i) ? '' : 'transparent')
    await expect.poll(colors).toEqual(expected)
    await nextFrames(10)
    expect(colors()).toEqual(expected)
  })
})
```

`test/artifact/no-ogl.test.ts` 在探针包那组之前加：

```ts
describe('真实入口', () => {
  // 对照：ogl 被误打进 dist 时 dist 里只剩一份内联副本、没有 node_modules/ogl 的 region，阶段 3 那条「没有 ogl」会假绿，
  // 唯一会红的就是这一条。阶段 3 加主断言（只 import particle-text 时没有 ogl）
  it('对照：import createLiquidText 的打包结果里有 ogl', async () => {
    const root = fileURLToPath(new URL('../..', import.meta.url))
    const entry = fileURLToPath(new URL('../../dist/index.js', import.meta.url))
    expect(await bundle(root, entry, 'createLiquidText')).toMatch(OGL_REGION)
  })
})
```

- [ ] **Step 2：确认变红**

```bash
node_modules/.bin/vitest run test/browser/liquid-text-fixtures.browser.test.ts test/browser/liquid-text.browser.test.ts --project 'browser (chromium)'
node_modules/.bin/vitest run --project dist
```
预期：浏览器两个文件报 `does not provide an export named 'createLiquidText'`；dist 的真实入口对照红（`dist/index.js` 里没有这个导出），
tsnapi 两条照旧通过（快照还是 `no exports`）。

- [ ] **Step 3：公开入口、夹具与 playground**

`src/index.ts` 整个文件：

```ts
export { createLiquidText, liquidTextOptionTypes } from './effects/liquid-text'
export type { LiquidTextOptions } from './effects/liquid-text'
export type { FxInstance } from './runtime/define-effect'
```

`playground/fixtures/modern-colors.ts`：

```diff
-import { createHeading, createHost } from './dom'
+import { createHeading, createHost, injectStyle } from './dom'
@@ mount(root) {
+    // 标题文字就是颜色串本身，较长；不折行，免得窄视口里进入折行休眠、看不到效果
+    const removeStyle = injectStyle('.fx-host-modern-colors h1 { font-size: 24px; white-space: nowrap; }')
     const host = createHost(root, 'fx-host-modern-colors')
@@ cleanup() {
         host.remove()
+        removeStyle()
```

`playground/main.ts`：

```diff
+import { createLiquidText } from '@huberyyang/todo-fx'
 import { hostFixtures } from './fixtures/index'
@@
-  const { actions } = fixture.mount(stage)
+  const { targets, actions } = fixture.mount(stage)
+  // debug：在控制台看休眠、恢复与重建的原因；accent 用 my-blog 亮色主题的 --c-primary，与首页现状对照
+  for (const { textEl, layerEl } of targets)
+    createLiquidText(textEl, layerEl, { accent: '#2b7a6f', debug: true })
```

- [ ] **Step 4：更新 tsnapi 快照并审 diff**

```bash
node_modules/.bin/vitest run test/artifact/api.test.ts -u
git diff test/artifact/__snapshots__
```
预期快照（逐字核对，**多出任何一个导出都要停下来查**）：

`index.snapshot.js`：

```js
/**
 * Generated by tsnapi — public API snapshot of `@huberyyang/todo-fx`
 */
// #region Variables
export var createLiquidText /* const */
export var liquidTextOptionTypes /* const */
// #endregion
```

`index.snapshot.d.ts`：

```ts
/**
 * Generated by tsnapi — public API snapshot of `@huberyyang/todo-fx`
 */
// #region Interfaces
export interface FxInstance<O> {
  patch: (_: O) => void;
  destroy: () => void;
}
// #endregion

// #region Types
export type LiquidTextOptions = Options<LiquidTextTable>;
// #endregion

// #region Variables
export declare const createLiquidText: (textEl: HTMLElement, layerEl: HTMLElement, options?: LiquidTextOptions) => FxInstance<LiquidTextOptions> | null;
export declare const liquidTextOptionTypes: OptionTypes<LiquidTextTable>;
// #endregion

// #region Referenced (internal)
type LiquidTextTable = EffectTable<typeof liquidTextParams>;
type Options<T> = { [K in keyof T]?: OptionOf<T[K]> | undefined; };
type OptionTypes<T> = { -readonly [K in keyof T]: ConstructorOf<T[K]>; };
// #endregion
```

`vue.snapshot.*` 不变（`./vue` 仍是空入口）。

- [ ] **Step 5：确认变绿**

```bash
node_modules/.bin/vitest run test/browser/liquid-text-fixtures.browser.test.ts test/browser/liquid-text.browser.test.ts test/browser/host-fixtures.browser.test.ts --project 'browser (chromium)' --project 'browser (webkit)'
node_modules/.bin/vitest run --project dist
```
预期全过；host-fixtures 的「cleanup 撤掉夹具加进文档的一切」证明 modern-colors 新加的样式也被撤掉了。

- [ ] **Step 6：变异：ogl 被打进 dist 时对照必须红**

```bash
cp tsdown.config.ts <scratchpad>/tsdown.bak
sed -i '' "s/    onlyBundle: \[\],/    onlyBundle: ['ogl'],\n    alwaysBundle: ['ogl'],/" tsdown.config.ts
cmp -s tsdown.config.ts <scratchpad>/tsdown.bak || echo 已变更
node_modules/.bin/vitest run test/artifact/no-ogl.test.ts
head -1 dist/index.js
cp <scratchpad>/tsdown.bak tsdown.config.ts && node_modules/.bin/tsdown
```
预期：打印「已变更」；「对照：import createLiquidText 的打包结果里有 ogl」红；`dist/index.js` 首行是 `//#region …ogl…` 而不是 `import … from "ogl"`。
最后恢复配置并重新构建，`git diff tsdown.config.ts package.json` 为空。

- [ ] **Step 7：本地门禁 + playground 能起**

跑「执行须知」里的本地门禁，预期 30 个测试文件全过（干跑为 288 条）。再：

```bash
node_modules/.bin/vite build playground --outDir <scratchpad>/pg-out --emptyOutDir
```
预期构建成功（证明 alias 与 import 接上了；真正的观感在任务 7 看）。

- [ ] **Step 8：提交**

走 `/commit`，建议信息：`feat: 公开入口导出 createLiquidText，playground 夹具接上真特效`。

---

### 任务 6：推 dev，用 CI 补上 Firefox

- [ ] **Step 1：推送**

```bash
git push origin dev
gh run list --branch dev --limit 1
```

- [ ] **Step 2：等 CI**

```bash
gh run watch <run-id> --exit-status
```
预期三个 job（quality、browser、min-peer）全绿。重点看 browser job 里 Firefox 的这几处（本地从没跑过）：

| 用例 | Firefox 上可能的不同 | 红了怎么办 |
| :--- | :--- | :--- |
| `runtime` 的 forced-colors 进出 | 阶段 0 证实过三内核都能仿真，但没在内核上跑过 | 先看 `matchMedia` 是否翻转，再看是不是渲染时序 |
| `text-raster` 的基线与字距 | 字体度量与 Chromium 不同 | 断言是相对 DOM 的，不该依赖内核；红了先在 CI 里 annotate 实测值再判断 |
| `liquid-text` 的 alpha（153 ± 1） | llvmpipe 取整 | 只放宽到 ±2，不放更宽 |
| `liquid-text-fixtures` 的 many-instances | 预期 Firefox 一个都不丢（阶段 0 CI 实测） | — |

- [ ] **Step 3：CI 红了的修法**

先在 CI 日志里拿到实测值（必要时临时加 `annotate`），本地 Chromium / WebKit 复现不了的按 Firefox 专属处理，并在测试里写明原因；
修完再推一次，直到全绿。**不为过 CI 放宽与内核无关的断言。**

---

### 任务 7：真实浏览器验收（按拍板二的方式）

完成判据：「playground 的宿主场景夹具里表现与 my-blog 现状一致」。

- [ ] **Step 1：起两边**

```bash
pnpm play                      # todo-fx playground
cd ~/Desktop/code/my-blog && pnpm dev   # 对照：首页标题
```

- [ ] **Step 2：逐项对照**

| # | 看什么 | 在哪看 | 预期 |
| :--- | :--- | :--- | :--- |
| 1 | 鼠标划过时的流动、色差、余韵 | `?fixture=clamp-font` 对 my-blog 首页 | 手感一致（参数默认值与 my-blog 常量相同） |
| 2 | 靠近时逐渐醒来、离开后慢慢静下 | 同上 | 一致（wakeSpeed 4.5 / calmSpeed 2.4、enterRadius 150） |
| 3 | 不碰时的表面微流 | 同上 | 一致（idle 0.0022） |
| 4 | 高光往主色偏 | 同上，快速划过 | playground 传了 `accent: '#2b7a6f'`，与 my-blog 亮色主题一致 |
| 5 | 抗锯齿边缘 | 刷新瞬间（真文本）→ 接管后（画布）有没有「变细一圈」 | **拍板一的差异点**：本库接管前后字重不变；my-blog 接管后边缘略细 |
| 6 | 字距与基线：接管那一下文字不跳 | `?fixture=clamp-font`，刷新时盯着看 | 不跳、不偏 |
| 7 | 画布没被压扁 | `?fixture=reset-canvas` | 字号与位置与真文本一致 |
| 8 | 主题切换颜色跟上 | `?fixture=theme-transition` 点「切换主题」 | 过渡结束时画布颜色与真文本一致，不停在旧主题 |
| 9 | 隐藏后显示、折行休眠 | `?fixture=hidden-container`、`?fixture=narrow-wrap` | 控制台 `[todo-fx] 休眠：…` / `恢复：…` 与操作对应 |
| 10 | 系统「减少动态效果」开关 | 任一夹具，切 macOS 设置 | 立即回到真文本，关掉后自动恢复 |

- [ ] **Step 3：记录结论**

把逐项结论（与差异）写进本计划末尾的「执行偏离」。手感有差异的，先查参数与 my-blog 常量是否一致，再查 `pointer` 的速度换算；
修了要回到任务 3 / 4 补测试。

---

### 任务 8：终审、文档回写、收尾

- [ ] **Step 1：独立终审**

用 superpowers:requesting-code-review 派一个独立上下文的终审 agent 审 `1bf2e07..HEAD`，对照本计划与 architecture。
Critical / Important 当场修；Minor 也修（[`todo.md`](../todo.md) 规定每阶段遗留问题清零才开下一阶段），修不了的记进 todo 的「阶段 1 遗留问题」。

- [ ] **Step 2：文档回写**

| 文档 | 改什么 |
| :--- | :--- |
| [`architecture.md`](../architecture.md) | 头部加一行 2026-10-12 阶段 1 落地；第三节时序图按「重建在 raf 回调里、紧接着画」改；第四节 `FrameState.pointer` 加 `moved`；第五节 `color-probe`（每个颜色参数一个 span、`fallback`）、`rebuild-watcher`（合并由运行时负责）、`gl-lifecycle`（被挤掉的上下文不会恢复）；第六节「公共参数覆盖」改成同名键重写；把「与架构文档的偏离」表里的 10 条逐条落进对应位置，理由与风险一起写 |
| [`design.md`](../design.md) | 第九节：探针改为隐藏 span；第七节：液态版不开混合（若拍板一采纳）、`flowmap` 子项回默认值；第十一节：`maxDpr` 不是正数按 1；版本演进加 v10 |
| [`tech-stack.md`](../tech-stack.md) | 第六节「集成」一行：ogl 进 `optimizeDeps.include`；vitest 包装了 `window.addEventListener`，spy 监听要单独盯 window；WebGL 像素要在 raf 里读 |
| [`todo.md`](../todo.md) | 勾掉阶段 1 的 6 项与「阶段 0 留下的注意事项」；写上完成日期、CI run 号；阶段 2 补 `user-select: none`（若拍板三采纳）；有遗留问题就列「阶段 1 遗留问题」 |
| [`.docs/README.md`](../README.md) | 计划索引加本计划 |
| 本计划 | 末尾补「执行偏离」 |
| [`CLAUDE.md`](../../CLAUDE.md) | 只改「当前状态」一行（拍板四） |

- [ ] **Step 3：门禁与提交**

跑本地门禁；走 `/commit` 提交文档（建议信息：`docs: 阶段 1 落地，按实现回写架构与设计文档`）；推 dev，看 CI 全绿。

- [ ] **Step 4：问 Hubery 要不要同步 main**

按记忆里的做法：本地快进 main 到 dev 再推送，先问一句。

---

## 自查记录

### 覆盖对照（[`todo.md`](../todo.md) 阶段 1）

| todo 项 | 落在哪 |
| :--- | :--- |
| 纯计算层：`approach`（连同 `animation.test.ts` 迁入）、`proximity`、`params`（派生、公共参数覆盖、`undefined` 恢复默认、按键名路由、选项类型映射） | 任务 1；公共参数覆盖见偏离表第 6 条，由任务 3 的 `{ ...commonParams, ...params }` 实现 |
| 共享件：`loop`、`layer`、`text-raster`、`color-probe`、`pointer`、`rebuild-watcher`、`gate`、`gl-lifecycle` | 任务 2（layer、text-raster）、任务 3（其余） |
| 运行时：休眠条件逐个进出、首帧前不涂透明、休眠中不重建、上下文丢失与恢复的调用顺序、钩子抛错后熔断、destroy 后 raf 与监听器归零；`debug` 三类日志 | 任务 3 的 `runtime.browser.test.ts` 各 describe；hover: none 见 `runtime.touch.test.ts` |
| `liquid-text`：参数表、shader、`setup` 先自己取上下文、每帧从 `ctx.params` 读值；真实浏览器验证 | 任务 4（像素读回）+ 任务 7（肉眼对照） |
| 公开入口 `.`、tsnapi 快照 | 任务 5 |
| 不迁 `hero-title.test.ts` | 文件结构一节末尾的对照 |
| 注意事项：门控读新建的 `matchMedia` | `gate.ts` 的 `sleepReason` |
| 注意事项：测试显式仿真、不依赖宿主默认 | 沿用 `setup.ts` 的基线；休眠测试都显式 `emulateMedia` |
| 注意事项：产物断言加真实入口对照 | 任务 5 Step 1、Step 6 |
| 注意事项：playground 对夹具的每个 targets 调 `createLiquidText` | 任务 5 Step 3 |
| 完成判据：夹具里表现与 my-blog 一致；design 第十二节内核判据 | 任务 5 的夹具集成测试 + 任务 7；第十二节逐条：必需 API 缺失返回 `null`、每个休眠条件进出、文本变化后纹理跟上、上下文丢失与恢复、destroy 后归零与上下文释放（SSR 冒烟属阶段 2） |

### 类型与命名一致性

`TextRaster` / `PixelSize`（任务 2）→ `define-effect.ts`（任务 3）→ 液态版 `build(raster)`（任务 4）一致；
`FxInstance<O>`、`LiquidTextOptions`、`liquidTextOptionTypes` 在任务 4、5 与快照里一致；假特效的 `FakeLog` 字段（`calls`、`rasters`、`frames`、`colorAtHook`、`frameTimes`）只在任务 3 的测试里用。

### 只能在 CI 上证实的

Firefox 上的全部浏览器测试（任务 6）。

