# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

这里只放**约束性内容**：现役禁令、跨文件的隐式契约、踩过的坑及其理由。叙述性内容（选型推演、方案细节、
待讨论议题）外放在 [`.docs/`](.docs/README.md)，按索引取用。

## 每次必读

漏了也不会报错的几件事，不要等索引提醒：

- **每次开工** → 先读本文件，再按 [`.docs/README.md`](.docs/README.md) 的索引连接项目上下文。
- **每次提交** → 走 `/commit` skill，不要手写 `git add` + `git commit` 绕过去。
- **Hubery 每拍板一项决定** → 先记入 [`.docs/decisions.md`](.docs/decisions.md)，再改方案。设计、架构、技术选型
  全部落定之前**不设计待办清单**；落定后根据这份记录统一制定，届时删除该记录。

## 项目概览

可复用的页面特效库，包名 `@huberyyang/todo-fx`。首个消费方是
[my-blog](https://github.com/HuberyYang-Space/my-blog)，首页标题的液态文字特效从那里抽出来。

**当前状态：设计方案已收尾（v6），下一环节是技术选型与架构设计；工具链未初始化。** 构建工具已定 tsdown，
移交下一环节的议题见 [`.docs/design.md`](.docs/design.md) 第十七节。工具链落地后在这里补上命令。

单包多入口，三层：

| 层 | 入口 | 职责 |
| :--- | :--- | :--- |
| 纯计算 | 内部 | 零 DOM、零 WebGL，可单测 |
| 内核 | `.` | canvas / WebGL / DOM，命令式，框架无关。`createX(textEl, layerEl, opts)` 返回 `{ patch, rebuild, destroy }` 或 `null` |
| 框架壳 | `./vue`（`./react` 暂不做） | 渲染真文本与空挂载点 + 生命周期 + 按参数表把 props 变化分派给 patch 或 rebuild |

## 触发式索引

| 改什么之前 | 读哪份 | 不读的后果 |
| :--- | :--- | :--- |
| 动包结构、分发方式，或新增依赖 | [`.docs/design.md`](.docs/design.md) 第三、四、十五节 | 重走已否决的路线（源码分发、Mitosis、Stencil、Custom Element、monorepo、`link:` 消费），或把 `ogl` 改成 peer 让装包不能即用 |
| 设计内核 API 或参数表 | [`.docs/design.md`](.docs/design.md) 第六、七节 | 做出增量 diff 的 `update()`，或让颜色走重建、切主题闪一帧 |
| 改 Vue 壳的模板结构，或内核读写 DOM 的方式 | [`.docs/design.md`](.docs/design.md) 第六、八节 | 给文字元素绑 style、往挂载点里渲染子节点，或由壳渲染 canvas —— 重影或 canvas 塌掉，全部不报错 |
| 动颜色的读取或解析 | [`.docs/design.md`](.docs/design.md) 第九节 | 用正则解析计算色，oklch / lab 被解析成错值 |
| 动门控、休眠、上下文丢失，或想加离屏暂停 | [`.docs/design.md`](.docs/design.md) 第十一节 | 采用有体验风险的省资源做法，或为休眠写出状态机、上下文丢失后标题消失 |
| 新增一个特效 | [`.docs/design.md`](.docs/design.md) 第十节 | 把门控、尺寸监听、颜色继承再复制一遍，而不是复用内核共享件 |
| 动发版流程、CI，或让消费方接入 | [`.docs/design.md`](.docs/design.md) 第十二、十三节 | CI 里 WebGL 没开软件渲染导致测试全绿却什么都没测；或新版本被 my-blog 的发布冷却期 / `trustPolicy` 卡住 |

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
- **颜色、强度类参数走 `patch`（改 uniform），不走 `rebuild`。** 重建要重新上传纹理，切主题会闪一帧。
- **只有浏览器不支持才让 create 返回 `null`**（必需 API 清单或特效声明的渲染能力缺失）。太旧的浏览器直接回退
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
- **React 壳在出现第一个 React 消费方之前不写** —— 只被自己测试引用的代码等于零消费方。
- **第二个特效搬进来之前不发版** —— 只有一个用例的抽象是猜的。

## 工程约定

- **CI 里的 Chromium 必须开 `--enable-unsafe-swiftshader`。** CI 没有 GPU，Chrome 从 130 起不再自动回退到
  软件渲染；不开的话 WebGL 创建失败，内核测试全部走进「不支持」分支 —— 全绿，但什么都没测。
- **发版路径从第一版起固定**（沿用 `todo-scripts`：本地 `npm publish`，不带 provenance）。改走带 provenance 的
  发布之后不能再切回本地：my-blog 开着 `trustPolicy: no-downgrade`，信任级别下降的版本会被拒装。
- **提交与 Release notes 用中文。** 提交走 `/commit`（中文）；`changelogithub.config.ts` 的分类标题配成中文，
  与提交一致。不要仿照 `todo-scripts` 改成英文提交 —— 那是它自己的取舍。英文 README 等推广到社区时再加。
