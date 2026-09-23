# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

这里只放**约束性内容**：现役禁令、跨文件的隐式契约、踩过的坑及其理由。叙述性内容（选型推演、方案细节、
待讨论议题）外放在 [`.docs/`](.docs/README.md)，按索引取用。

## 每次必读

没有触发条件可挂的两件事，不要等索引提醒：

- **每次开工** → 先读本文件，再按 [`.docs/README.md`](.docs/README.md) 的索引连接项目上下文。
- **每次提交** → 走 `/commit` skill，不要手写 `git add` + `git commit` 绕过去。

## 项目概览

可复用的页面特效库，包名暂定 `@huberyyang/todo-fx`。首个消费方是
[my-blog](https://github.com/HuberyYang-Space/my-blog)，首页标题的液态文字特效从那里抽出来。

**当前状态：形态已定，工具链未初始化。** 还没有 `package.json`，也就没有构建 / lint / 测试命令 ——
构建工具、测试方案等待技术选型，议题列在 [`.docs/design.md`](.docs/design.md) 第十七节。
工具链落地后在这里补上命令。

单包多入口，三层：

| 层 | 入口 | 职责 |
| :--- | :--- | :--- |
| 纯计算 | 内部 | 零 DOM、零 WebGL，可单测 |
| 内核 | `.` | canvas / WebGL / DOM，命令式，框架无关。`createX(el, opts)` 返回 `{ patch, rebuild, destroy }` 或 `null` |
| 框架壳 | `./vue`（`./react` 暂不做） | 渲染真文本 + 生命周期 + 按参数表把 props 变化分派给 patch 或 rebuild |

## 触发式索引

| 改什么之前 | 读哪份 | 不读的后果 |
| :--- | :--- | :--- |
| 动包结构、分发方式，或新增依赖 | [`.docs/design.md`](.docs/design.md) 第三、四节 | 重走已否决的路线（源码分发、Mitosis、Stencil、Custom Element、monorepo），或把 `ogl` 改成 peer 让装包不能即用 |
| 设计内核 API 或参数表 | [`.docs/design.md`](.docs/design.md) 第六、七节 | 做出增量 diff 的 `update()`，或让颜色走重建、切主题闪一帧 |
| 新增一个特效 | [`.docs/design.md`](.docs/design.md) 第十节 | 把门控、尺寸监听、颜色继承再复制一遍，而不是复用内核共享件 |

## 架构约束

- **内核不得 import 任何框架。** 框架壳只能经由公开内核 API 调用 —— 这是以后加 React 壳或
  Custom Element 门面的前提。内核里长出一个 `Ref` / `watch`，加第二个框架就得重新设计。
- **真文本必须留在 DOM 里，效果只把它涂透明。** 不要挪进 canvas，也不要改成 `sr-only`：撑开布局
  （不产生 CLS）、能被选中和朗读、能进静态产物，全靠这份真文本。
- **库不认识任何宿主 CSS 变量名。** 颜色默认继承父元素的计算 color；要接站点主色，由调用方传
  `accent="var(--c-primary)"`。
- **颜色要逐帧读，不能只读一次。** 主题切换只改 `<html>` 的 class，而颜色带过渡，切换那一刻读到的是
  上一个主题的值 —— 只读一次就永远停在旧主题。
- **颜色、强度类参数走 `patch`（改 uniform），不走 `rebuild`。** 重建要重新上传纹理，切主题会闪一帧。
- **门控不过时 create 返回 `null`**（reduced-motion / hover:none / WebGL 不可用 / 文字宽度为 0）。
  调用方不写降级分支 —— 真文本一直在，什么都不做就是正确降级。
- **不发 CSS 文件**，涂透明与 canvas 定位全用 inline style；**不设硬编码配色默认值**，亮色主题下会看不见。
- **shader 编译失败是静默的**：canvas 一片空白、无报错、构建照常成功。改 shader 后必须在真实浏览器里
  验证，构建和单测都证明不了它。
- **React 壳在出现第一个 React 消费方之前不写** —— 只被自己测试引用的代码等于零消费方。
- **第二个特效搬进来之前不发版** —— 只有一个用例的抽象是猜的。
