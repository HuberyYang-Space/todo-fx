# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

这里只放**约束性内容**：现役禁令、跨文件的隐式契约、踩过的坑及其理由。叙述性内容（选型推演、方案细节、
待讨论议题）外放在 [`.docs/`](.docs/README.md)，按索引取用。

## 每次必读

漏了也不会报错的几件事，不要等索引提醒：

- **每次开工** → 先读本文件，再按 [`.docs/README.md`](.docs/README.md) 的索引连接项目上下文。
- **每次提交** → 走 `/commit` skill，不要手写 `git add` + `git commit` 绕过去。
- **Hubery 每拍板一项决定** → 直接写进对应文档（为什么写 [`.docs/design.md`](.docs/design.md)，用什么写
  [`.docs/tech-stack.md`](.docs/tech-stack.md)，怎么组织写 [`.docs/architecture.md`](.docs/architecture.md)），理由与风险一起写；
  影响待办的同步改 [`.docs/todo.md`](.docs/todo.md)。

## 项目概览

可复用的页面特效库，包名 `@huberyyang/todo-fx`。首个消费方是
[my-blog](https://github.com/HuberyYang-Space/my-blog)，首页标题的液态文字特效从那里抽出来。

**当前状态：阶段 0（基建）已完成，下一步是修阶段 0 的遗留问题（见 [`.docs/todo.md`](.docs/todo.md)），清零后再开阶段 1（运行时 + liquid-text）。** 进度与各阶段任务见
[`.docs/todo.md`](.docs/todo.md)，每个阶段开工前先写详细实现计划到 [`.docs/plans/`](.docs/plans/)。

| 命令 | 作用 |
| :--- | :--- |
| `pnpm build` | 构建 dist；publint / attw 有问题直接失败 |
| `pnpm typecheck` | `vue-tsc --noEmit`，覆盖 `.ts` 与 `.vue` |
| `pnpm lint` / `pnpm lint:fix` | ESLint，含依赖方向守卫 |
| `pnpm test` | unit + browser（三内核 + 三个 touch instance）+ dist（先构建） |
| `pnpm test:unit` / `test:browser` / `test:dist` | 单跑一个 project；只跑一个内核用 `vitest run --project 'browser (chromium)'` |
| `pnpm play` | playground：`?fixture=<id>` 打开单个宿主场景夹具 |

单包多入口，三层：

| 层 | 入口 | 职责 |
| :--- | :--- | :--- |
| 纯计算 | 内部 | 零 DOM、零 WebGL，可单测 |
| 内核 | `.` | canvas / WebGL / DOM，命令式，框架无关。`createX(textEl, layerEl, opts)` 返回 `{ patch, destroy }` 或 `null` |
| 框架壳 | `./vue`（`./react` 暂不做） | 渲染真文本与空挂载点 + 生命周期 + 把 props 变化交给 `patch`（运行时按参数表路由） |

## 触发式索引

| 改什么之前 | 读哪份 | 不读的后果 |
| :--- | :--- | :--- |
| 动包结构、分发方式，或新增依赖 | [`.docs/design.md`](.docs/design.md) 第三、四、十五节 | 重走已否决的路线（源码分发、Mitosis、Stencil、Custom Element、monorepo、`link:` 消费），或把 `ogl` 改成 peer 让装包不能即用 |
| 设计内核 API 或参数表 | [`.docs/design.md`](.docs/design.md) 第六、七节 | 做出增量 diff 的 `update()`，或让颜色走重建、切主题闪一帧 |
| 改 Vue 壳的模板结构，或内核读写 DOM 的方式 | [`.docs/design.md`](.docs/design.md) 第六、八节 | 给文字元素绑 style、往挂载点里渲染子节点，或由壳渲染 canvas —— 重影或 canvas 塌掉，全部不报错 |
| 动颜色的读取或解析 | [`.docs/design.md`](.docs/design.md) 第九节 | 用正则解析计算色，oklch / lab 被解析成错值 |
| 动门控、休眠、上下文丢失，或想加离屏暂停 | [`.docs/design.md`](.docs/design.md) 第十一节 | 采用有体验风险的省资源做法，或为休眠写出状态机、上下文丢失后标题消失 |
| 新增一个特效 | [`.docs/architecture.md`](.docs/architecture.md) 第二、四、五节 | 把门控、尺寸监听、颜色继承再复制一遍，而不是复用内核共享件 |
| 写或改运行时、共享件、钩子契约、参数表、导出面 | [`.docs/architecture.md`](.docs/architecture.md) | 在特效里重写休眠与涂透明的时序；让运行时长出可选钩子；壳绕过公开入口 import 内部模块 |
| 动发版流程、CI，或让消费方接入 | [`.docs/design.md`](.docs/design.md) 第十二、十三节；[`.docs/tech-stack.md`](.docs/tech-stack.md) 第八、九节 | CI 里 WebGL 没开软件渲染导致测试全绿却什么都没测；或新版本被 my-blog 的发布冷却期 / `trustPolicy` 卡住 |
| 新增或升级依赖、改构建 / 测试 / lint / CI 配置 | [`.docs/tech-stack.md`](.docs/tech-stack.md) | 把 TypeScript 升到 7，类型检查与 lint 全挂；或 attw 留在默认的 `warn` 级别，产物类型出错也照常构建成功 |

## 取舍原则

- **一切以用户体验至上。** 任何做法只要可能让用户看见缺陷（卡一帧、画面冻住、睡眠唤醒后不自动恢复、要刷新才好），
  就不采用 —— 哪怕它省资源、省代码。省下的资源用户感知不到，体验缺陷用户第一眼就看到。
  由此定下的：不做离屏暂停（「恢复」这一步可能失手）；WebGL 上下文丢失后必须自动恢复。

## 架构约束

- **内核不得 import 任何框架。** 框架壳只能经由公开内核 API 调用 —— 这是以后加 React 壳或
  Custom Element 门面的前提。内核里长出一个 `Ref` / `watch`，加第二个框架就得重新设计。
- **真文本必须留在 DOM 里，效果只把它涂透明。** 不要挪进 canvas，也不要改成 `sr-only`：撑开布局
  （不产生 CLS）、能被选中和朗读、能进静态产物，全靠这份真文本。
- **内核只碰两处 DOM：`textEl` 的 inline color，`layerEl` 的内部。** 不往任何框架管理的节点里插东西。
  实测过两条：Vue 更新文本走 `el.textContent = …`，会清掉插进文字元素的节点；渲染函数写法的壳每次重渲染
  都重设整个 style 对象，内核写在 canvas 上的尺寸会被打回去。所以壳**不得**给文字元素绑 style、**不得**往
  挂载点里渲染子节点、**不得**自己渲染 canvas —— 违反的后果是重影或 canvas 塌掉，都不报错。
- **库不认识任何宿主 CSS 变量名。** 颜色默认继承父元素的计算 color；要接站点主色，由调用方传
  `accent="var(--c-primary)"`。也不内置亮 / 暗两套色：判断亮暗就得认识宿主的主题机制。
- **颜色要逐帧读，不能只读一次。** 主题切换只改 `<html>` 的 class，而颜色带过渡，切换那一刻读到的是
  上一个主题的值 —— 只读一次就永远停在旧主题。
- **颜色解析交给浏览器（1×1 canvas 填色后 `getImageData` 读回），不要用正则。** 计算值不统一转成 rgb：
  实测 `oklch(0.7 0.15 200)` 被正则解析成 `0,7,0`，`lab(50 40 30)` 被解析成 `50,40,30` —— 后者看起来像对的，最难发现。
- **颜色、强度类参数在参数表里归为 patch 类（改 uniform），不归为重建类。** 重建要重新上传纹理，切主题会闪一帧。
- **只有浏览器不支持才让 create 返回 `null`**（必需 API 清单缺项，或特效在 `setup` 里拿不到渲染上下文）。太旧的浏览器直接回退
  真文本，**不为旧浏览器写逐个 API 的回退分支**。调用方不写降级分支 —— 真文本一直在，什么都不做就是正确降级。
- **此刻不该播放的情况一律休眠，条件解除后自动恢复**：reduced-motion、hover:none、forced-colors、文字宽度为 0、
  文字折行、WebGL 上下文丢失。所有条件汇成**一个判定函数**，任何信号到来都重算一次；**不写状态机**，不为每个条件
  单写进出逻辑（Hubery 定：不要复杂编码）。休眠 = 停 raf + 撤掉涂透明；恢复时**首张纹理建成前绝不涂透明**，否则文字直接隐身。
  - forced-colors 必须休眠：实测浏览器会把内核写的 `color: transparent` 强制改成 `rgb(0,0,0)`，真文本显形、与 canvas 叠成重影。
  - 折行必须休眠，**不支持多行**：`fillText` 只画一行，折行后纹理被裁掉、第二行空白。
- **WebGL 上下文丢失时 `preventDefault()` 允许恢复。** 不调的话浏览器永远不恢复；恢复后重建全部 GL 资源 ——
  ogl 对象持有的旧句柄全部作废，漏重建一个就是空白。
- **不发 CSS 文件**，涂透明与 canvas 定位全用 inline style；**不设硬编码配色默认值**，亮色主题下会看不见。
- **shader 编译失败是静默的**：canvas 一片空白、无报错、构建照常成功。改 shader 后必须在真实浏览器里
  验证，构建和单测都证明不了它。
- **运行时不能长成框架。** 钩子固定为 `build` / `frame` / `dispose` 加 `setup` 入口；不加可选钩子、不加生命周期事件、
  不用类继承。一旦长出插件机制或事件总线，运行时骨架的心智负担就会反超「每个特效自己组装」，选它的理由也就不成立了。
  钩子装不下新特效时，要么所有特效一起改契约，要么承认抽象定早了。
- **依赖方向由 lint 守，不许为了过 lint 放宽规则或加 disable 注释。** 这些规则守的是：内核不碰框架、运行时不碰 ogl
  （否则只用 `particle-text` 的消费方会被连带打包 ogl）、壳只走公开入口、纯计算层不碰 DOM。
- **React 壳在出现第一个 React 消费方之前不写** —— 只被自己测试引用的代码等于零消费方。
- **第二个特效搬进来之前不发版** —— 只有一个用例的抽象是猜的。

## 工程约定

- **CI 里的 Chromium 显式开 `--enable-unsafe-swiftshader`，但真正证明环境可信的是已知结果探针。** Playwright 1.63 已默认追加这个开关，
  显式写是不把可信度押在上游默认值上。探针（[`test/browser/env-probe.browser.test.ts`](test/browser/env-probe.browser.test.ts)）在三个内核里
  清屏成已知颜色再读回；不通过就说明内核测试会全部走进「不支持」分支 —— 全绿，但什么都没测。
- **发版路径从第一版起固定**（沿用 `todo-scripts`：本地 `npm publish`，不带 provenance）。改走带 provenance 的
  发布之后不能再切回本地：my-blog 开着 `trustPolicy: no-downgrade`，信任级别下降的版本会被拒装。
- **提交与 Release notes 用中文。** 提交走 `/commit`（中文）；`changelogithub.config.ts` 的分类标题配成中文，
  与提交一致。不要仿照 `todo-scripts` 改成英文提交 —— 那是它自己的取舍。英文 README 等推广到社区时再加。
- **TypeScript 锁在 6.x，不要升到 7。** 7.0 的 npm 包不再导出编译器 API（实测 `require('typescript').createProgram`
  为 `undefined`），vue-tsc、typescript-eslint、tsdown 生成 d.ts 都依赖它；`taze major` 提示升级时跳过。
  等这三者都声明支持 7 再议。
- **`vitest run -u <文件>` 会把文件路径吞成 `-u` 的值**，结果全量更新快照；要写成 `vitest run <文件> -u`。
- **测试目录不能叫 `dist`。** antfu 默认忽略 `**/dist`，整个目录静默跳过 lint；产物测试放在 `test/artifact/`。
- **变异实验不要走 `pnpm exec` / `pnpm run`，直接调 `node_modules/.bin/<工具>`。** pnpm 12 发现 package.json 与 node_modules 不同步时
  会先自动 install 并改写 lockfile，改坏的依赖声明会被悄悄「修好」，结论就错了。
- **门控读媒体查询要用新建的 `matchMedia(q).matches`，不要读被监听的那个 `MediaQueryList` 的 `.matches`。**
  Chromium 里在 change 事件派发前读它，forced-colors 的 change 事件会被吞掉（实测），退出强制色后永远收不到恢复信号。
- **浏览器测试里新 import 一个第三方依赖时，把它加进 browser project 的 `optimizeDeps.include`。** 没有 Vite 缓存时（CI 每次都是）
  依赖到测试中途才被发现、临时预构建，随即整页重载，一批测试文件报 `Failed to import test file`；本地有缓存时发现不了。
