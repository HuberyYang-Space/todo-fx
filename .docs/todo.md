# 待办清单

> 2026-09-23 · 设计方案、技术选型、架构设计全部落定后，由拍板记录统一制定（该记录已删除，所有决定都已落进下面三份文档）
> 依据：[`design.md`](design.md)（为什么）· [`tech-stack.md`](tech-stack.md)（用什么）· [`architecture.md`](architecture.md)（怎么组织）
>
> 用法：
> - 按阶段顺序推进，**上一阶段的完成判据全部满足后才开下一阶段**（判据原文见 [`design.md`](design.md) 第十三节）。
> - 每个阶段开工时，先按 writing-plans 写一份详细实现计划到 `.docs/plans/`（精确到文件、测试代码、命令），审阅通过再动手；
>   本清单只列任务与判据，不写代码。
> - 完成一项勾一项，随提交一起更新。发现清单与三份文档冲突时，以文档为准并回头修清单。

## 阶段 0：基建

目标：骨架上 CI 全绿，而且全绿是可信的。

- [ ] **包骨架**：`package.json`（`name: @huberyyang/todo-fx`、`type: module`、`packageManager: pnpm@12.5.1`、`sideEffects: false`、`files: ["dist"]`、
  `publishConfig.access: public`、`ogl ^1.0.11` 进 dependencies、`vue ^3.5.0` 为 optional peer）；`pnpm-workspace.yaml`
  （`trustPolicy: no-downgrade`、`shellEmulator: true`）；LICENSE（MIT）；中文 README 骨架 —— [`tech-stack.md`](tech-stack.md) 第二、三、四、八节
- [ ] **TypeScript**：`typescript ^6.0.3`、`@types/node ^24.13.6`；tsconfig 对齐 starter-ts 并加 DOM lib —— [`tech-stack.md`](tech-stack.md) 第三节
- [ ] **构建**：`tsdown` 精确锁 `0.23.0`；两个入口、`dts`、`exports: true`、`target: 'es2020'`、`platform: 'neutral'`、
  `publint`、`attw: { profile: 'esm-only', level: 'error' }` —— [`tech-stack.md`](tech-stack.md) 第四节
- [ ] **lint**：`@antfu/eslint-config`（`type: 'lib'`、`vue: true`、`antislop: true`）；`.vscode` 两份配置照抄 README；
  按目录的依赖方向规则 —— [`tech-stack.md`](tech-stack.md) 第七节、[`architecture.md`](architecture.md) 第八节
- [ ] **提交钩子**：跑 `todo-scripts commitlint-init`（husky + lint-staged + commitlint）—— [`tech-stack.md`](tech-stack.md) 第八节
- [ ] **测试框架**：Vitest 三个 project（`unit` / `browser` / `dist`）；Playwright 三个内核，Chromium 开 `--enable-unsafe-swiftshader`；
  `vitest-browser-vue`、`@vitejs/plugin-vue`；`typecheck` 走 `vue-tsc --noEmit`；`dist` 用 `globalSetup` 先 build，接 tsnapi —— [`tech-stack.md`](tech-stack.md) 第五、六节
- [ ] **playground**：Vite 多页纯 HTML + Vue 夹具页，alias 指向 `src`；[`design.md`](design.md) 第十三节的 8 个宿主场景夹具写成模块，
  playground 与 `browser` project 共用 —— [`tech-stack.md`](tech-stack.md) 第十节
- [ ] **CI 与发版流程**：`ci.yml`（含浏览器安装与缓存、`vue@3.5.0` 最低 peer 版本 job）、`release.yml`、`changelogithub.config.ts`（中文标题）、
  `pnpm release` 门禁（`bumpp --no-verify` → `npm publish`）—— [`tech-stack.md`](tech-stack.md) 第八、九节
- [ ] **证实 7 条假设**：[`tech-stack.md`](tech-stack.md) 第十二节逐条跑探针；`emulateMedia` 传不进 iframe 就把集成层退回 `@playwright/test`，并回头改 tech-stack
- [ ] **守卫自证**：lint 的每条依赖方向规则、attw / publint、tsnapi、产物里没有 ogl 的断言，逐个故意违反一次，确认变红（变异后先 `cmp` 确认文件真改了）

完成判据：CI 在骨架上全绿；三个内核的 WebGL / Canvas 2D 已知结果探针通过；两个入口产出 d.ts，publint 与 attw 零报错；
`npm publish --dry-run` 的文件清单只有 `dist` 与必要元数据；第十二节的假设全部证实（或已按兜底方案改选型）。

## 阶段 1：运行时 + `liquid-text`

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

完成判据：playground 的宿主场景夹具里表现与 my-blog 现状一致；[`design.md`](design.md) 第十二节的内核判据通过。

## 阶段 2：Vue 壳 `<LiquidText>`

- [ ] **通用工厂与组件**：props = `text` + `as` + 选项类型映射；`onMounted` 时 create、`onUnmounted` 时 destroy；props 变化交给 `patch`；
  根元素 inline `position: relative`，span、插槽、挂载点之间不留空白 —— [`design.md`](design.md) 第八节
- [ ] **回归用例先红一次**：重渲染后 canvas 尺寸与涂透明仍在（[`design.md`](design.md) 第六节实测表的前两行）
- [ ] **模板类型夹具**：在 `.vue` 模板里给 `strength` 传字符串，`vue-tsc` 必须报错 —— [`tech-stack.md`](tech-stack.md) 第五节
- [ ] **SSR 冒烟**：`renderToString` 不碰 `window`
- [ ] **公开入口 `./vue`**：只导出 `LiquidText`（阶段 3 再加 `ParticleText`）

完成判据：壳测试与夹具里的 Vue 页面通过。

## 阶段 3：`particle-text` + `<ParticleText>`

- [ ] **纯计算**：`particles` 由 my-blog 的 `hero-particles.ts` 原样搬入，连同 `hero-particles.test.ts`
- [ ] **特效**：参数表（7 个独有参数 + 公共参数，`calmSpeed` 覆盖为 `2.6`，阻尼按固定阻尼比推出）；粒子版自身逻辑不改 —— [`architecture.md`](architecture.md) 第六节
- [ ] **壳与导出**：`<ParticleText>`、`createParticleText`、`particleTextOptionTypes`；更新 tsnapi 快照
- [ ] **产物断言转实**：只 import `particle-text` 的打包结果里没有 ogl
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
