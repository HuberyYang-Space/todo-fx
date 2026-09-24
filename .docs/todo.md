# 待办清单

> 2026-09-23 · 设计方案、技术选型、架构设计全部落定后，由拍板记录统一制定（该记录已删除，所有决定都已落进下面三份文档）
> 依据：[`design.md`](design.md)（为什么）· [`tech-stack.md`](tech-stack.md)（用什么）· [`architecture.md`](architecture.md)（怎么组织）
>
> 用法：
> - 按阶段顺序推进，**上一阶段的完成判据全部满足后才开下一阶段**（判据原文见 [`design.md`](design.md) 第十三节）。
> - 每个阶段开工时，先按 writing-plans 写一份详细实现计划到 `.docs/plans/`（精确到文件、测试代码、命令），审阅通过再动手；
>   本清单只列任务与判据，不写代码。
> - 完成一项勾一项，随提交一起更新。发现清单与三份文档冲突时，以文档为准并回头修清单。
> - **每个阶段收尾时，终审与执行中遗留的问题（包括 Minor）记在该阶段的「遗留问题」里，全部清零才开下一阶段**（Hubery 2026-09-24 定：
>   保证每个阶段完全没问题再推进）。遗留问题在新会话里修，修法同样先写计划或先复现，再动手。

## 阶段 0：基建

目标：骨架上 CI 全绿，而且全绿是可信的。

- [x] **包骨架**：`package.json`（`name: @huberyyang/todo-fx`、`type: module`、`packageManager: pnpm@12.5.1`、`sideEffects: false`、`files: ["dist"]`、
  `publishConfig.access: public`、`ogl ^1.0.11` 进 dependencies、`vue ^3.5.0` 为 optional peer）；`pnpm-workspace.yaml`
  （`trustPolicy: no-downgrade`、`shellEmulator: true`）；LICENSE（MIT）；中文 README 骨架 —— [`tech-stack.md`](tech-stack.md) 第二、三、四、八节
- [x] **TypeScript**：`typescript ^6.0.3`、`@types/node ^24.13.6`；tsconfig 对齐 starter-ts 并加 DOM lib —— [`tech-stack.md`](tech-stack.md) 第三节
- [x] **构建**：`tsdown` 精确锁 `0.23.0`；两个入口、`dts`、`exports: true`、`target: 'es2020'`、`platform: 'neutral'`、
  `publint`、`attw: { profile: 'esm-only', level: 'error' }` —— [`tech-stack.md`](tech-stack.md) 第四节
- [x] **lint**：`@antfu/eslint-config`（`type: 'lib'`、`vue: true`、`antislop: true`）；`.vscode` 两份配置照抄 README；
  按目录的依赖方向规则 —— [`tech-stack.md`](tech-stack.md) 第七节、[`architecture.md`](architecture.md) 第八节
- [x] **提交钩子**：跑 `todo-scripts commitlint-init`（husky + lint-staged + commitlint）—— [`tech-stack.md`](tech-stack.md) 第八节
- [x] **测试框架**：Vitest 三个 project（`unit` / `browser` / `dist`）；Playwright 三个内核，Chromium 开 `--enable-unsafe-swiftshader`；
  `vitest-browser-vue`、`@vitejs/plugin-vue`；`typecheck` 走 `vue-tsc --noEmit`；`dist` 用 `globalSetup` 先 build，接 tsnapi —— [`tech-stack.md`](tech-stack.md) 第五、六节
- [x] **playground**：Vite 多页纯 HTML + Vue 夹具页，alias 指向 `src`；[`design.md`](design.md) 第十三节的 8 个宿主场景夹具写成模块，
  playground 与 `browser` project 共用 —— [`tech-stack.md`](tech-stack.md) 第十节
- [x] **CI 与发版流程**：`ci.yml`（含浏览器安装（不缓存，见 tech-stack 第九节）、`vue@3.5.0` 最低 peer 版本 job）、`release.yml`、`changelogithub.config.ts`（中文标题）、
  `pnpm release` 门禁（`bumpp --no-verify` → `npm publish`）—— [`tech-stack.md`](tech-stack.md) 第八、九节
- [x] **证实 7 条假设**：[`tech-stack.md`](tech-stack.md) 第十二节逐条跑探针；`emulateMedia` 传不进 iframe 就把集成层退回 `@playwright/test`，并回头改 tech-stack
- [x] **守卫自证**：lint 的每条依赖方向规则、attw / publint、tsnapi、产物里没有 ogl 的断言，逐个故意违反一次，确认变红（变异后先 `cmp` 确认文件真改了）

阶段 0 的任务与完成判据已于 2026-09-24 全部满足（实现计划与执行偏离见 [`plans/2026-09-24-phase-0-infra.md`](plans/2026-09-24-phase-0-infra.md)；
CI 全绿：dev 上 run 35950631877、main 上 run 35951134904）。**下面的遗留问题清零之后，阶段 0 才算关闭、才开阶段 1。**

完成判据：CI 在骨架上全绿；三个内核的 WebGL / Canvas 2D 已知结果探针通过；两个入口产出 d.ts，publint 与 attw 零报错；
`npm publish --dry-run` 的文件清单只有 `dist` 与必要元数据；第十二节的假设全部证实（或已按兜底方案改选型）。

### 阶段 0 遗留问题（开阶段 1 之前必须清零）

来源：阶段 0 的独立终审（Minor 级）与执行中留下的待证项。每一项修完都要有证据（守卫类先见一次红），修完勾掉。

- [ ] **`many-instances` 夹具的自检是同义反复**：[`test/browser/host-fixtures.browser.test.ts`](../test/browser/host-fixtures.browser.test.ts) 里那条只断言
  夹具自己的常量 `18 > 16`，从没见过「上下文被挤掉」的现场。改成真的建上下文、数被挤掉的个数，按内核给预期：终审在 macOS 上实测
  Chromium、WebKit 建 18 个会丢最早的 2 个，**Firefox 一个不丢**（在 Firefox 上这个夹具不构成陷阱，测试里要明说）；Linux（CI）上的个数要在 CI 里实测后再定断言
- [ ] **design 第九节「display-p3 回读三内核一致」没有测试支撑**：[`design.md`](design.md) 第九节那句只有 macOS 干跑证据。在 modern-colors 自检里加一行
  `color(display-p3 1 0 0)`（预期回读 `255,0,0`），让 CI 的 Linux 也跑一遍；或者把措辞改成「macOS 实测」
- [ ] **`release.yml` 的 checkout 把可写 token 留给了所有步骤**：[`.github/workflows/release.yml`](../.github/workflows/release.yml) 的 `actions/checkout`
  默认把 `contents: write` 的 token 写进 `.git/config`，之后的 `pnpm install` 与跑第三方代码的测试都读得到。加 `persist-credentials: false`
  （changelogithub 走环境变量里的 token 调 API，不需要 git 凭据）
- [ ] **两个零消费方的脚本**：[`package.json`](../package.json) 的 `dev`（`tsdown --watch`，playground 的 alias 指向 `src`，没有东西读 watch 产物）与
  `commitlint`（钩子直接 `pnpm exec commitlint`，不经过它）。按「零消费方一律删除」删掉，README 命令表与 CLAUDE.md 若提到要同步
- [ ] **lint 守卫放行了一条构建不通的路**：[`test/unit/eslint-guards.test.ts`](../test/unit/eslint-guards.test.ts) 放行 `src/vue/` 里
  `import '@huberyyang/todo-fx'`，但终审实测 tsdown 构建这种写法报 `UNRESOLVED_IMPORT`。把 vue 项的包名自引用改为拦截（提示指向 `'../index'`），
  放行用例改成拦截用例，并照例变异验证
- [ ] **CI 里 Firefox 用 headed 是否必需**：CI 实测 headless 的 firefox-touch 在 xvfb 下也建得出 WebGL（run 35950071354），默认 Firefox instance 的
  `headless: !process.env.CI` 可能不必要。在 CI 上去掉它（Firefox 全部 headless、仍在 `xvfb-run` 下）看探针；再试一次不套 `xvfb-run`，
  确定到底是 headed 还是 display 在起作用，据此简化配置并改正 [`tech-stack.md`](tech-stack.md) 第六、九节与 [`vitest.config.ts`](../vitest.config.ts) 的注释
- [ ] **tech-stack 第一节「tsdown 生成 d.ts 依赖 TS 编译器 API」待核实**：调研时读 rolldown-plugin-dts 0.28.6 源码发现它在 TS 7 下会改用 tsgo，
  tsdown 0.23.0 的 typescript peer 也包含 `^7.0.0`，这条锁 TS 6 的理由对 tsdown 可能不成立（vue-tsc 与 typescript-eslint 两条理由不受影响）。
  只读过源码、没实跑，核实后改正那一行
- [ ] **CLAUDE.md 候选（需 Hubery 同意）**：触发式索引补一行「写浏览器测试或新增自定义 command 之前 → [`tech-stack.md`](tech-stack.md) 第六节 →
  否则依赖宿主系统默认的媒体状态，只在 CI 的 WebKit 上红」

## 阶段 1：运行时 + `liquid-text`

> 开工前先确认上面的「阶段 0 遗留问题」已全部勾掉。

- [ ] **纯计算层**：`approach`（连同 my-blog 的 `animation.test.ts` 一起迁）、`proximity`、`params`（派生、公共参数覆盖、
  `undefined` 恢复默认、按键名路由、选项类型映射）—— [`architecture.md`](architecture.md) 第五、六节
- [ ] **共享件**：`loop`、`layer`、`text-raster`（以 `HeroTitle` 修好的对齐写法为准）、`color-probe`、`pointer`、`rebuild-watcher`、
  `gate`、`gl-lifecycle` —— [`architecture.md`](architecture.md) 第五节
- [ ] **运行时 `defineEffect`**：用一个假特效测全部时序（休眠条件逐个进出、首帧前不涂透明、休眠中不重建、上下文丢失与恢复的调用顺序、
  钩子抛错后熔断、destroy 后 raf 与监听器归零）；`debug` 的三类日志 —— [`architecture.md`](architecture.md) 第三、四、九节
- [ ] **`liquid-text`**：参数表、shader、`setup` 先自己取上下文，取不到返回 `null`；每帧从 `ctx.params` 读值写 uniform；
  改 shader 后必须在真实浏览器里验证 —— [`design.md`](design.md) 第七节、[`architecture.md`](architecture.md) 第四节
- [ ] **公开入口 `.`**：`createLiquidText`、`liquidTextOptionTypes`、类型；tsnapi 快照 —— [`architecture.md`](architecture.md) 第七节
- [ ] **不迁 `hero-title.test.ts`**：它读源码与样式表文本，断言了规则存在，却没断言规则作用在谁身上；由宿主场景夹具里的行为测试取代
  （reset 压画布、颜色过渡停在旧主题）

阶段 0 留下的注意事项：
- **门控**：媒体查询的当前状态读新建的 `matchMedia(q).matches`（见 [`architecture.md`](architecture.md) 第五节 `gate`）。
- **测试基线**：`test/browser/setup.ts` 在每个测试文件与每条用例开始前把媒体仿真设回 `no-preference` / `none`；测休眠条件时显式仿真，不要依赖宿主默认值（CI 的 Linux WebKit 默认就是 reduced-motion）。
- **产物断言**：`test/artifact/no-ogl.test.ts` 加真实入口的对照：`import createLiquidText` 的打包结果里必须有 ogl（ogl 被误打进 dist 时，唯一会红的就是它）。
- **playground**：`playground/main.ts` 对夹具的每个 `targets` 调 `createLiquidText`；alias 已指向 `src`。

完成判据：playground 的宿主场景夹具里表现与 my-blog 现状一致；[`design.md`](design.md) 第十二节的内核判据通过。

## 阶段 2：Vue 壳 `<LiquidText>`

- [ ] **通用工厂与组件**：props = `text` + `as` + 选项类型映射；`onMounted` 时 create、`onUnmounted` 时 destroy；props 变化交给 `patch`；
  根元素 inline `position: relative`，span、插槽、挂载点之间不留空白 —— [`design.md`](design.md) 第八节
- [ ] **回归用例先红一次**：重渲染后 canvas 尺寸与涂透明仍在（[`design.md`](design.md) 第六节实测表的前两行）
- [ ] **模板类型夹具**：在 `.vue` 模板里给 `strength` 传字符串，`vue-tsc` 必须报错 —— [`tech-stack.md`](tech-stack.md) 第五节
- [ ] **SSR 冒烟**：`renderToString` 不碰 `window`
- [ ] **公开入口 `./vue`**：只导出 `LiquidText`（阶段 3 再加 `ParticleText`）

阶段 0 在隔离目录实测得出的写法约束：
- **工厂写法**：公开签名 `<T extends OptionTypes>(name, optionTypes: T): FxComponent<T>`，实现签名不带泛型、返回类型写 `Component`
  （泛型直接流进 `defineComponent` 会让 setup 里的 `props.as` 取不到；实现签名写成带 props 的 `DefineComponent` 会把 setup 里的 props 推成 any）。
  工厂函数加 `/* @__NO_SIDE_EFFECTS__ */`，否则只用 `ParticleText` 的消费方也会带上 ogl（实测 26.8 KB）。
- **模板类型夹具**：用 `<!-- @vue-expect-error 说明 -->`；每行错误用法只比正确用法多改一个属性（否则 expect-error 被别的错误用掉，守卫变瞎）；
  另配一条 SSR 测试断言选项确实注册成了 props（类型夹具管不到运行时）。
- **Vue 夹具页**：`playground/vue/App.vue` 目前按壳的结构手写，换成 `<LiquidText>` 后 `test/browser/vue-fixture.browser.test.ts` 跟着改。

完成判据：壳测试与夹具里的 Vue 页面通过。

## 阶段 3：`particle-text` + `<ParticleText>`

- [ ] **纯计算**：`particles` 由 my-blog 的 `hero-particles.ts` 原样搬入，连同 `hero-particles.test.ts`
- [ ] **特效**：参数表（7 个独有参数 + 公共参数，`calmSpeed` 覆盖为 `2.6`，阻尼按固定阻尼比推出）；粒子版自身逻辑不改 —— [`architecture.md`](architecture.md) 第六节
- [ ] **壳与导出**：`<ParticleText>`、`createParticleText`、`particleTextOptionTypes`；更新 tsnapi 快照
- [ ] **产物断言转实**：加主断言 —— 只 import `createParticleText` / `ParticleText` 的打包结果里没有 ogl；然后删掉探针包
  `test/artifact/fixtures/ogl-probe/` 及其两条用例（真实入口已覆盖同样的判据）
- [ ] **内核被迫改动的记录**：这里若要改运行时，说明阶段 1 抽早了；改动与原因记进 [`architecture.md`](architecture.md)

完成判据：壳测试与夹具通过；与 `HeroParticles` 现状相比只有 4 处已知差异（[`architecture.md`](architecture.md) 第六节）。

## 阶段 4：发版 `0.1.0`

- [ ] **README**：安装与用法；消费方需 `moduleResolution: bundler` 或 `node16`；`strength` 在两个特效里的量级差异；`debug` 的用法；
  `accent` 需显式传才有高光
- [ ] **发版**：本地 `pnpm release` 走完；`release.yml` 生成 GitHub Release（中文分类标题）
- [ ] **从 npm 验收**：在一个全新的空项目里从 npm 装包，跑通两个入口与类型

## 阶段 5：my-blog 正式接入（在 my-blog 仓库里做）

- [ ] `<LiquidText>` 换掉 `HeroTitle`，传 `accent="var(--c-primary)"` 保持现状
- [ ] typecheck 与 `verify-build.ts` 全绿；`.hero-title-word` 那条断言随结构同步改，并重新让它红一次
- [ ] `minimumReleaseAgeExclude` 加上本包
- [ ] 以「迁入库、删除本地副本」关闭 [issue #1](https://github.com/HuberyYang-Space/my-blog/issues/1)

阶段 5、6 发现的问题一律以 `0.1.x` 补丁版修复，每次都走完整发版流程。

## 阶段 6：验证项目接入 `<ParticleText>`

- [ ] 选定验证项目（发版后再议，见 [`design.md`](design.md) 第十七节）
- [ ] 至少一个 my-blog 之外的 Vue 项目上线
