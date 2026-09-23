# 特效库方案

> 2026-09-23 · v3 · **形态已采纳**，技术选型与架构细节待讨论
> 结论：`@huberyyang/todo-fx`，单包多入口。框架无关内核 + Vue 壳；React 壳等出现第一个 React 消费方再加。
> 首个消费方：[my-blog](https://github.com/HuberyYang-Space/my-blog)。文中实测数据均取自其提交 [`2d73f4c`](https://github.com/HuberyYang-Space/my-blog/tree/2d73f4c07366096fc899c4355088ba2c41b2c6e6)

## 一、需求约束

| # | 约束 |
| :--- | :--- |
| 1 | 先自用，按将来可能开源的标准设计（边界清晰、不泄漏站点私有约定；暂不投入文档站 / 发版基建） |
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

| 项 | 决定 | 理由 |
| :--- | :--- | :--- |
| 形态 | 单包多入口 | 一个版本号、一次发版；`exports` 钉死边界（`./vue` 只能走公开内核 API），将来拆包是现成切割线 |
| `vue` | optional peerDependency | 只用内核的人不被迫装 Vue |
| `react` | **暂不声明** | 零消费方，加 React 壳时再加 |
| `ogl` | dependencies | 约 10 KB，装包即用，不必手动补 peer |
| CSS | 不发 CSS 文件 | 涂透明、canvas 定位全用 inline style，免去「还要 import 一个 css」 |

## 五、分层

```
纯计算层   零 DOM、零 WebGL、可单测            ← hero-particles.ts / approach 原样搬
内核层     canvas / WebGL / DOM，命令式，框架无关
           门控、纹理、raf、resize / dpr、颜色继承、清理
Vue 壳     渲染真文本 + 生命周期 + props 分派   ← 约 30-50 行
```

## 六、内核 API

```ts
function createLiquidText(
  textEl: HTMLElement,
  options?: LiquidTextOptions
): FxInstance | null

interface FxInstance {
  patch: (o: Partial<LiquidTextOptions>) => void  // uniform 热更新
  rebuild: () => void                              // 重建纹理
  destroy: () => void
}
```

| 决定 | 理由 |
| :--- | :--- |
| 门控不过返回 `null` | 调用方不写降级分支 —— 真文本一直在 DOM 里，什么都不做就是正确降级 |
| 不做增量 diff 的 `update()` | 要么 patch 要么 rebuild，省掉一整套 diff 设计 |
| patch / rebuild 分家 | 颜色走重建要重新上传纹理，切主题闪一帧（已踩过） |

- **patch**：`color` `accent` `strength` `chroma` `idle` `enterRadius` `wakeSpeed` `calmSpeed`
- **rebuild**：`padding` `maxDpr`，以及文本 / 字号 / 字体 / 尺寸变化（内部自动触发）

**每个特效一张参数表**（名称 / 类型 / 默认值 / 走 patch 还是 rebuild）。options 类型、默认值、
壳的 props 声明与分派逻辑全部从表派生 —— 避免每加一个参数就多处手改。

## 七、参数表（liquid-text）

从现有 const 推导，13 个。

| 分组 | 参数 | 默认 |
| :--- | :--- | :--- |
| 颜色 | `color` | 继承父元素计算 color |
| | `accent` | 从 color 推导，**不读任何 CSS 变量** |
| 强度 | `strength` / `chroma` / `idle` | `0.075` / `0.04` / `0.0022` |
| 手感 | `enterRadius` / `wakeSpeed` / `calmSpeed` | `150` / `4.5` / `2.4` |
| 渲染 | `padding` / `maxDpr` | `48` / `2` |
| 高级 | `flowmap: { falloff, alpha, dissipation }` | `0.32` / `0.6` / `0.96` |

`flowmap` 收进一个对象，避免顶层 API 被稀释。

## 八、Vue 壳

```vue
<LiquidText text="Hubery">_</LiquidText>
<LiquidText text="Hubery" as="div" accent="var(--c-primary)" />
```

| 职责 | 做法 |
| :--- | :--- |
| 真文本 | 渲染 `<component :is="as"><span>{{ text }}</span><slot /></component>`，效果启用后只涂透明 |
| 生命周期 | `onMounted` → create；`onUnmounted` → destroy |
| props 变化 | watch → 按参数表分派 patch 或 rebuild |
| 标签语义 | `as?: 'h1' \| 'div'`，默认 `h1`（文章页已有 h1 时传 `div`） |

**不可让渡：真文本留在 `<h1>` 里只涂透明，由库承担。** 不产生 CLS、能被选中朗读、能进静态产物全靠它。

天然获得（v2 要额外补的）：vue-tsc 原生类型检查、组件级 HMR、`onMounted` 只在客户端跑所以 SSR 安全、消费方零配置。

## 九、颜色继承机制

1. 内核在文字元素内挂一个常驻隐藏探针 span
2. 每帧读探针计算 color：`color` 未传则读父元素；`accent` 传了任意 CSS 颜色字符串，设到探针上再读回 rgb
3. `'#84CC16'` / `'red'` / **`'var(--c-primary)'`** 三种写法都能吃，`var()` 按级联解析、跟随主题

| 取舍 | 理由 |
| :--- | :--- |
| 库不认识任何变量名 | `--c-primary` 是调用方传进来的字符串，对宿主零假设 |
| 每帧读而非只读一次 | 主题切换只改 html 的 class，颜色带过渡，读一次会永远停在旧主题 |
| 探针常驻而非每帧创建 | 开销与现有实测同量级（约 1μs / 帧） |

## 十、面向增长（约束 5）

特效增多的主要风险是「每个特效把同样的样板复制一遍」。内核抽出共享件，特效只写渲染逻辑：

| 共享件 | 职责 |
| :--- | :--- |
| `gate` | reduced-motion / hover:none / WebGL 可用性 |
| `colorProbe` | 第九节的颜色继承 |
| `sizeWatcher` | resize + ResizeObserver + dpr 变化，按帧合并成一次重建 |
| `loop` | raf 循环与 dt 夹取 |
| 参数表工具 | 从表派生 options 类型、默认值、patch / rebuild 分派 |

**新增一个特效 = 渲染逻辑 + 一张参数表 + 一行 Vue 壳注册**（壳写成通用工厂）。
文字类特效共用一套 DOM 结构；出现非文字特效（背景类）时再为它定结构。

**拆包触发线**（满足任一才拆，在那之前不拆）：某个重量引擎被 ≥ 2 个特效使用；dependencies 总体积 > 100 KB。
three / gsap 这类 > 50 KB 的引擎走 optional peerDependency。

## 十一、门控与降级

三条任一命中即不启用：reduced-motion / hover:none；WebGL 构造抛错；文字宽度为 0。
不启用时真文本原样显示，调用方无需任何降级分支。

## 十二、测试

| 层 | 工具 | 守什么 |
| :--- | :--- | :--- |
| 纯计算 | vitest | `approach` 帧率无关性、粒子采样、颜色字符串解析、参数表派生 |
| 内核 | **Playwright（必须真浏览器）** | shader 编译失败是静默的，单测验不出。判据：canvas `readPixels` 有非透明像素 |
| Vue 壳 | 待技术选型 | 挂载 / 卸载 / props 分派。happy-dom 没有 WebGL，壳测试如何隔离内核待定 |
| 集成 | Playwright | 门控三条各走一次；destroy 后 raf 与监听器归零、WebGL 上下文释放 |

纪律：每个守卫写完故意破坏一次确认变红；变异后先 `cmp` 确认文件真改了再读结果；布局类判据一律挪到真浏览器。

## 十三、落地路径

| 阶段 | 内容 | 完成判据 |
| :--- | :--- | :--- |
| 0 | 初始化工具链（见第十七节待讨论项） | 两个入口都产出 d.ts |
| 1 | 抽内核 + `liquid-text`，my-blog 用 `link:` 消费 | 线上表现与现在无差；Playwright 判据过 |
| 2 | 加 `./vue` 壳，my-blog 用 `<LiquidText>` 换掉 `HeroTitle` | 首页 + 文章 demo 正常；typecheck + 产物断言全绿（[`verify-build.ts`](https://github.com/HuberyYang-Space/my-blog/blob/2d73f4c07366096fc899c4355088ba2c41b2c6e6/scripts/verify-build.ts) 里 `.hero-title-word` 那条断言随结构同步改，并重新让它红一次） |
| 3 | **搬第二个特效 `particle-text`** | 真正的验证点：内核若在这里被迫改，说明阶段 1 抽早了 |
| 4 | 发版 `0.1.0` | — |

**阶段 3 之前不发版** —— 只有一个用例的抽象是猜的。React 壳在出现第一个 React 消费方时启动。

## 十四、真实代价

| 代价 | 说明 / 缓解 |
| :--- | :--- |
| 跨仓库调参反馈变慢 | my-blog 最近 5 次提交有 3 次在调首页特效，这类迭代最吃反馈速度。库里放一个 playground（Vite + 纯 HTML）专门调参 |
| 内核抽象只有一个用例时是猜的 | 阶段 3 检验；抽错的后果不是报错，而是之后每个特效都在和内核打架 |
| CI 里跑 WebGL | headless 浏览器走软件渲染，环境配置是已知的坑，搭建时要验证 |
| 跟随 Vue 升级 | 本来就要在 my-blog 里做，不算新增 |
| 将来的 React 壳 | Strict Mode 开发期双挂载 → WebGL 上下文必须销毁干净；Next.js 服务端组件下要 `'use client'` |

## 十五、明确不做

| 不做 | 理由 |
| :--- | :--- |
| React 壳（现在） | 零消费方 —— 只被自己测试引用的代码不该存在 |
| Custom Element / CEM（现在） | 见第三节；内核框架无关，将来可作为门面加回 |
| Shadow DOM | 隔断宿主 CSS 变量与主题切换，正是第九节所依赖的 |
| Monorepo | 未触发拆包线之前是纯基建税 |
| 源码分发 / Mitosis / Stencil | 见第三节 |
| 发 CSS 文件 | 全用 inline style |
| 硬编码配色默认值 | 亮色主题下会瞎掉，且丢掉宿主继承优势 |
| 文档站 | 自用阶段不投；README + 类型定义够 |

## 十六、版本演进

- **v1**：框架无关内核 + `./vue` 壳
- **v2**：零框架代码（Light DOM Custom Element + CEM 生成类型）
- **v3（采纳）**：回到 v1 形态。v2 的类型洞、CEM 工具链、attribute 映射、HMR、SSR 注册、消费方配置，
  在只有 Vue 消费方时成本大于收益；React 壳按零消费方原则推迟

## 十七、待讨论（下一步）

| 议题 | 现状 |
| :--- | :--- |
| 包名 | 沿用 `@huberyyang/todo-*` 系列约定，暂定 `@huberyyang/todo-fx` |
| 构建工具 | 初步倾向 unbuild |
| Vue 壳写法 | SFC，还是 `defineComponent` + 渲染函数（后者库构建不需要 SFC 编译插件） |
| canvas 插入位置 | 壳提供定位容器，还是内核自己找 |
| 入口粒度 | `./vue` 单入口，还是按特效拆 subpath |
| Vue 壳的测试 | happy-dom 没有 WebGL，壳测试如何隔离内核 |
| my-blog 如何消费 | `link:` / workspace |
| 工程规范 | @antfu/eslint-config（含 `.vscode` 两份配置）+ commitlint-init |
