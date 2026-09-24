# 技术选型

> 2026-09-23 · **技术选型已落定**。设计方案见 [`design.md`](design.md)，架构见 [`architecture.md`](architecture.md)，待办见 [`todo.md`](todo.md)
> 这里定的是**选什么、什么版本、关键配置**；配置文件在阶段 0 落地（见 [`todo.md`](todo.md)）。
> 版本号均为 2026-09-23 在 npm 上查到的最新稳定版，例外逐条写明理由。
> 2026-09-24 · 阶段 0 落地，第一、三、四、六、七、九、十二节按实测修订（实现计划见 [`plans/2026-09-24-phase-0-infra.md`](plans/2026-09-24-phase-0-infra.md)）。
>
> 写法约定同 [`design.md`](design.md)：每条决定都写风险。

## 一、核实过的前提

选型里几处与直觉或方案原文不一致的地方，都先实测过：

| 事实 | 怎么核实的 | 结论 |
| :--- | :--- | :--- |
| TypeScript `latest` 是 7.0.2，但它**没有编译器 API** | 装 ts7 与 ts6 对照：ts7 的 `require('typescript')` 只导出 `version`、`versionMajorMinor`，`createProgram` 为 `undefined`；ts6.0.3 为 `function` | vue-tsc（Volar）、typescript-eslint（peer `>=4.8.4 <6.1.0`）、tsdown 生成 d.ts 都依赖这套 API → 锁 6 |
| pnpm 12 仍有 1 天的默认发布冷却期 | 同一范围 `@cloudflare/workers-types@^5.20260901.0`：pnpm 11.27.1 与 12.5.1 在默认配置下都跳过 6 小时前发布的 `5.20260923.1`、装了 30 小时前的 `5.20260922.1`；显式写 `minimumReleaseAge: 1440` 结果相同 | 与 11 一致。另外：默认配置下，**精确版本号**即使不足 1 天也会被装上（宽松回退），显式配置后才严格拦截 |
| pnpm 12 对 workspace 里的未知键直接报错 | 锁定 `pnpm@12.5.1` 的项目里写一个拼错的 `minimumReleaseAg`，install 报错退出 | 拼错的配置不会再悄悄失效。**但 `ignoredBuiltDependencies` 被接受却完全不起作用**（写了 esbuild 照样 `ERR_PNPM_IGNORED_BUILDS`；v11 起由 `allowBuilds` 取代），不要照抄 todo-scripts 的这一键。本项目依赖树里没有带构建脚本的包，workspace 不写任何构建相关的键 |
| attw 的 `esm-only` 档会忽略 node10 解析 | attw 源码 `profiles.ts`：`"esm-only": { ignoreResolutions: ["node10", "node16-cjs"] }` | attw 不再检查 node10，改由 README 写明。实测更严重：纯 ESM 下 tsdown 不写 `main` / `types`，node10 连根入口 `.` 都解析不到，不只是 `./vue` |
| tsdown 里 attw 的 `level` 默认是 `warn` | tsdown 0.23.0 的类型声明：`level?: "error" \| "warn"`，`@default 'warn'` | 不改的话，产物类型有问题也照常构建成功 → 显式设 `error`。publint 同理：warning 级问题默认不失败，已加 `failOnWarn: true`。另外 d.ts 注释写 attw 的 `profile` 默认 `strict`，运行时实际是 `esm-only`，配置里显式写 |
| Vitest 的自定义 command 能拿到 Playwright 的 `page`；每个 instance 能单独配 `contextOptions` | Vitest 官方文档 `api/browser/commands.md`「Custom playwright commands」、`config/browser/playwright.md` | 集成层能并入浏览器模式；仿真能传进测试 iframe，阶段 0 已证实（第十二节） |
| TypeScript 6 的 `types` 默认值是 `[]`，`DOM` 已含 iterable | 装了 `@types/node` 仍报 `Cannot find name 'process'`；TS 5.9 对照组报 TS2488 | tsconfig 显式写 `types: ["node"]`，`lib` 只写 `ESNext`、`DOM`（starter-ts 能过是因为 vite 的 d.ts 顺带引用了 node 类型） |
| ESLint 10 加载 `eslint.config.ts` 需要 jiti | 不装时报 `The 'jiti' library is required for loading TypeScript configuration files` | devDeps 显式装 jiti（todo-scripts 能用只是因为它碰巧作为传递依赖被装上了） |
| antfu 9.5.1 的 antislop 没有禁显式 `any`，`type: 'lib'` 只开了 `ts/explicit-function-return-type` | 读 dist 源码 + `calculateConfigForFile`；`v: any` 实测不报错 | 自己开 `ts/no-explicit-any` |
| Playwright 1.63 启动 Chromium 时无条件追加 `--enable-unsafe-swiftshader` | 读 playwright-core 源码 + `DEBUG=pw:browser` 的启动参数；Vitest 无头模式用的 chrome-headless-shell 在本机也一律走 SwiftShader | 配置里仍显式写，环境可信靠三内核的已知结果探针证明 |
| tsdown 的 JS API `build()` 遇到 attw / publint 报错不抛错，只置 `process.exitCode` | 读源码 + 放进 globalSetup 实测：测试汇总照样全绿 | dist project 的 globalSetup 走 CLI |

## 二、随包发出的依赖

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 渲染（liquid-text） | `ogl ^1.0.11`，放 dependencies | 见 [`design.md`](design.md) 第四节；自带类型声明（`types/index.d.ts`），不用另装 `@types` | 最后一次发版在 2025-01，至今 20 个月没更新。体量约 10 KB，真停维了可以搬进仓库自己维护 |
| 渲染（particle-text） | Canvas 2D，不加依赖 | — | — |
| `vue` | peer `^3.5.0`，`peerDependenciesMeta` 标 `optional`；开发依赖装 `3.5.43` | 见 [`design.md`](design.md) 第四节 | 范围下限由第九节「最低 peer 版本」job 兜底 |

## 三、工具链基座

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| Node | 开发与 CI 用 24 LTS（CI 写 `lts/*`）；**包不声明 `engines`** | 产物是给打包器用的浏览器 ESM，`engines` 对消费方没有意义；消费方开了 `engineStrict` 时反而装不上 | 对 Node 下限最严的是 lint-staged 17.5.1（`>=22.22.1`），其次 tsdown、bumpp（`^22.18`）、Vitest 5（`^22.12`）；用 Node 22 的贡献者至少要 22.22.1 |
| 包管理 | pnpm `12.5.1`，写进 `packageManager` | 最新稳定版，antfu 的 [starter-ts](https://github.com/antfu/starter-ts) 同版本；未知的 workspace 键直接报错（第一节） | 默认 1 天冷却期（第一节），刚发布的依赖要逐条写进 `minimumReleaseAgeExclude`；todo-scripts 仍在 11，照抄配置时以 12 的行为为准 |
| workspace 配置 | 三个键，按这个顺序、不留空行：`minimumReleaseAgeExcludePrune: true`、`trustPolicy: no-downgrade`、`shellEmulator: true` | 后两个与 todo-scripts、starter-ts 一致；antfu 9.5.1 检测到 workspace 文件就开 pnpm 规则，强制这三个键和键序，不改 lint 报 3 个错。第一个键让 pnpm 自动清掉 `minimumReleaseAgeExclude` 里用不到的条目 | `no-downgrade` 会误判部分传递依赖（my-blog 已豁免过 3 条）。遇到时先核对维护者与 integrity，再逐条写进 `trustPolicyExclude` 并注明理由。pre-commit 跑 `eslint --fix` 时可能顺手改写这个文件的键序，提交时留意 diff |
| TypeScript | `^6.0.3` | **「新增依赖用最新稳定版」的例外**：7.0.2 没有编译器 API（第一节）。starter-ts 同样锁在 `^6.0.3`，并在 `update.ignoreDeps` 里排除了 `typescript@7` | 等生态跟上 TS 7 后要迁一次；`taze major` 会提示升到 7，要手动跳过 |
| tsconfig | 对齐 starter-ts：`target` / `module` 为 `ESNext`、`moduleResolution: Bundler`、`strict`、`verbatimModuleSyntax`、`noEmit`、`skipLibCheck`；`lib: ["ESNext", "DOM"]`；`types: ["node"]`；`allowImportingTsExtensions`；`include` 用目录形式 `["src", "test", "playground", "*.config.ts"]` | 业界基线。starter-ts 里的 `esModuleInterop` / `strictNullChecks` / `resolveJsonModule` 在 TS 6 下是默认值或冗余项，不抄（第一节）。`allowImportingTsExtensions`：`vitest.config.ts` 要带 `.ts` 扩展名 import commands，否则 Vite 8.3 报 configLoader 警告 | 不开 `isolatedDeclarations`：Vue 工厂生成的组件类型靠推导，开了就要手写大量类型注解；代价是 d.ts 走 tsc，比 oxc 慢。`include` 若写成 `**/*.ts` 会把 `.vue` 夹具静默漏掉，目录形式才会被 vue-tsc 纳入（已用变异确认）。`types: ["node"]` 让 node 全局类型对 `src` 的浏览器代码也可见，单个 tsconfig 下无法避免 |
| `@types/node` | `^24.13.6` | 跟运行时主版本走；用 26 的类型会放行 24 没有的 API | 升 Node 主版本时要同步 |

## 四、构建与产物

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 构建 | tsdown **精确锁定 `0.23.0`**（不加 `^`） | 见 [`design.md`](design.md) 第四节 | 还在 1.0 之前：升级时对比产物 |
| 入口与导出 | `entry: { index, vue }`、`dts: true`、`exports: true` | package.json 的 `exports` 由 tsdown 按产物生成，不手写，两者不会对不上 | 构建会改写 package.json：改了入口之后要检查 diff 再提交 |
| 产物语法 | `target: 'es2020'`、`platform: 'neutral'` | 比门控基线（Chrome 99 / Firefox 116 / Safari 18.4）再低一档，保证旧浏览器至少能解析到门控那一步、回退成真文本 —— 语法报错会连带宿主整个 bundle 挂掉，比没有特效严重得多。`neutral`：同一份产物既要能在 SSR 的 Node 端被 import，也要在浏览器里运行 | 影响面小：Vite 这类打包器会按自己的 target 再降级一次，这条只对不转译依赖的消费方起作用 |
| 产物校验 | `publint: true`；`attw: { profile: 'esm-only', level: 'error' }`；`failOnWarn: true`；`deps: { onlyBundle: [] }`；devDeps 显式装 `publint 0.3.24`、`@arethetypeswrong/core 0.18.5` | 两者是 tsdown 的可选 peer，pnpm 严格模式下不会自动装。`level` 必须显式设 `error`（第一节）。`failOnWarn`：publint 的 warning 级问题与 `import` 了没装的包默认都只报警告、照常产出坏产物。`deps.onlyBundle: []`：依赖被误打进 dist（如 ogl 挪进了 devDependencies）时，默认只有一条 info 级提示，`failOnWarn` 也拦不住 | ① `esm-only` 不检查 node10：消费方 TS 若还是 `moduleResolution: node`，**两个入口**的类型都解析不到（不只是 `./vue`），这条由 README 写明（要求 `bundler` 或 `node16`）；② 已证实：publint 的 error 级问题默认就会失败，warning 级靠 `failOnWarn` 变红（阶段 0 的 8 种变异逐个验证过）；③ `failOnWarn` 会让以后任何 tsdown / rolldown 的警告都变成构建失败，确属误报的用 `suppressWarnings` 精确压掉，不要关它 |
| 发布元数据 | `sideEffects: false`、`files: ["dist"]`、`publishConfig.access: "public"` | scoped 包默认私有，不写 `access` 的话首次 `npm publish` 会失败 | — |

## 五、Vue 壳

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 写法 | `defineComponent` + 渲染函数（见 [`design.md`](design.md) 第八节） | `src` 里没有 `.vue`，不需要 `unplugin-vue`，d.ts 直接走 tsc | — |
| 类型检查 | `vue-tsc 3.3.11`，`typecheck` 脚本跑 `vue-tsc --noEmit` | 测试与夹具里有 `.vue`；另设一个**消费方视角的模板类型夹具**：模板里给 `strength` 传字符串必须报错 —— 工厂生成的 props 类型最容易悄悄退化成 `any` | 这是守卫型检查，写完要故意改坏一次，确认它会变红 |
| SFC 支持 | `@vitejs/plugin-vue 6.0.9`（开发依赖，只给测试和 playground 用） | 夹具用模板写，与消费方（my-blog）的真实写法一致 | — |

## 六、测试

[`design.md`](design.md) 第十二节定「每层守什么」，这里定「用什么」。

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 框架 | `vitest 5.0.1`，分三个 project：`unit`、`browser`、`dist` | 一份配置覆盖第十二节的全部层次 | — |
| `unit` | Node 环境：纯计算、参数表派生、SSR 冒烟（用 `vue/server-renderer`，不加依赖） | — | — |
| `browser` | `@vitest/browser-playwright 5.0.1` + `playwright 1.63.0`，Chromium / Firefox / WebKit 三个 instance，另加三个 `contextOptions: { hasTouch: true }` 的 touch instance（只收 `*.touch.test.ts`）；Chromium 的启动参数加 `--enable-unsafe-swiftshader`；Firefox 在 CI 里以 headed 模式运行；`optimizeDeps.include: ['vue']` | 理由见 [`CLAUDE.md`](../CLAUDE.md)「工程约定」；`hover: none` 只能靠 `hasTouch` 仿真（`isMobile` 无效，Firefox 还会静默忽略它），而 `contextOptions` 只能按 instance 配 | 环境可信由三内核的已知结果探针证明（`test/browser/env-probe.browser.test.ts`）。外部报告（Mozilla bug 1375585）说 Linux 上 headless Firefox 建不出 WebGL，所以 CI 里默认 Firefox instance 改 headed、整条测试命令包在 `xvfb-run` 里；但 CI 实测（run 35950071354）headless 的 firefox-touch 在 xvfb 下同样建得出 WebGL（llvmpipe），**headed 是否必需未证实**，要简化时先在 CI 上去掉 headed 看探针。touch instance 也跑已知结果探针，任何一个 instance 拿不到 WebGL 都会响亮地红。冷启动（没有 Vite 缓存，CI 每次都是）时浏览器测试里首次 import 的依赖会被临时预构建、触发整页重载，一批测试文件导入失败 → 新增这类依赖要列进 `optimizeDeps.include` |
| 挂载 Vue | `vitest-browser-vue 3.1.0`（vitest-community 维护） | 与浏览器模式的 locator、`expect.element` 自动重试配套，适合等 canvas 异步出图 | — |
| 集成（宿主场景夹具） | **并入 `browser` project**，不另起 `@playwright/test`。媒体仿真（reduced-motion / forced-colors）写成自定义 command，调 Playwright 的 `page.emulateMedia()`；`hover: none` 用一个单独配 `contextOptions` 的 instance | 只有一个测试框架、一份配置、一个 CI 步骤；夹具写成模块，测试与 playground 共用 | ① 已证实：仿真作用在整个 page 上，测试 iframe 同样生效；但它会跨用例、跨测试文件残留，而且不仿真时的基线取决于宿主系统（CI 的 Linux WebKit 默认就是 `prefers-reduced-motion: reduce`，`emulateMedia({ reducedMotion: null })` 只会回到这个默认值）。所以 `setup.ts` 在每个测试文件开始前（`beforeAll`，比测试文件自己的 `beforeAll` 先执行）和每条用例开始前（`beforeEach`）都显式设成 `no-preference` / `none`，以后新增任何修改 page 状态的 command 都要一起纳入这个基线；② 已证实：三内核都能仿真出 `hover: none`；③ **已证伪**：原先以为同一页面里各测试文件的 iframe 共享 WebGL 上下文上限、要串行跑。实测同时在跑的测试文件各有独立的 BrowserContext + page，同一个 page 则会依次跑多个文件（所以仿真会跨文件残留，见①），而每个文件都是新的 iframe 文档；上限（Chromium、WebKit 为 16，Firefox 到 40 个也不丢）只在单个文档内生效，所以不强制串行；④ forced-colors 仿真只有 Chromium 会把 `color: transparent` 改写成黑色，重影现场只能在 Chromium 复现 |
| `dist` | 目录叫 `test/artifact/`（antfu 默认忽略 `**/dist`，叫 `test/dist` 会整个目录静默跳过 lint）。`globalSetup` 走 tsdown CLI 先 build，再跑：① 自写断言：用 Vite 8 的 build API 以消费方身份打包一个只 import 某个导出的入口，看**不压缩的最终产物**里有没有 `//#region …node_modules/ogl/` 注释，并配一条「import 带 ogl 的导出必须看得见 ogl」的对照测试；阶段 0 还没有特效，先跑在探针包 `test/artifact/fixtures/ogl-probe/` 上；② `tsnapi 1.5.0` 给公开 API 拍快照（快照进仓库） | `globalSetup` 先 build 是 todo-scripts 验证过的做法，保证不会测到旧产物；走 CLI 是因为 JS API 遇到 attw / publint 报错不抛错（第一节）；watch 模式重跑时靠 `onTestsRerun` 重建。不用 `chunk.moduleIds`：它是死代码消除之前的清单，会把被摇掉的 ogl 也列进来；不在压缩产物里搜 `'ogl'`：压缩后搜不到。ogl 被 tsdown 打进 dist 时「没有 ogl」那条会假绿，只有对照会红，所以对照不能删。tsnapi（antfu）对运行时导出与 d.ts 一起拍快照：任何导出的增减都要在 diff 里过目，服务「零消费方的定义一律删除」与「壳只能走公开内核 API」 | `-u` 会把**新增**导出直接写进快照（tsnapi 只拦删除与收窄，那两种要 `TSNAPI_ALLOW_BREAKING=1`），新增只能靠审快照 diff 来守；`vitest run -u <文件>` 会把文件参数吞成 `-u` 的值，要写成 `vitest run <文件> -u`；本地缺快照时会静默写出并通过，只有 `CI=true` 才红；tsnapi 的 breaking 守卫依赖 vitest 的内部字段，升级 vitest 后要重跑一次「删导出 + `-u` 必须红」；rolldown 若改了 region 注释格式，对照测试会红 |

## 七、代码规范

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| lint | `@antfu/eslint-config 9.5.1` + `eslint 10.11.0` + `jiti 2.7.0`；`type: 'lib'`、`vue: true`；另开 `ts/no-explicit-any`；按目录的依赖方向规则共九条（[`architecture.md`](architecture.md) 第八节）；`.docs/**` 不 lint；html 用 antfu 导出的 `parserPlain` 解析 | Hubery 的标准；`lib` 档要求导出函数写显式返回类型，适合库。jiti 是 ESLint 加载 TS 配置的前提（第一节）。`.docs` 里 md 代码块的伪代码会被当成文件去解析。antislop 挂在包括 html 在内的全部源文件上，antfu 却没给 html 配解析器 | 依赖方向规则由 `test/unit/eslint-guards.test.ts` 逐条守住拦住与放行两面；规则按目录深度写，特效子目录再深一层会被误报（响亮地红），届时改规则、不要放宽。拦不住动态 `import()`、`globalThis.document` 与类型位置的 DOM 类型 |
| `antislop: true` | 引入 `eslint-plugin-slop 0.1.3` + `eslint-plugin-sonarjs 4.2.1`（antfu 的可选 peer，pnpm 下必须显式装，否则 CI 里直接报找不到模块） | 仓库代码主要由 Claude 写，[`CLAUDE.md`](../CLAUDE.md) 对冗余代码、多余注释都有明文约束，这项把约束交给机器检查（`any` 实际没管，见第一节） | 还是 0.1.x，规则会变、可能误报；sonarjs 让 lint 变慢。`slop/no-em-dash` 见到 U+2014 就报错，中文破折号也算；Hubery 定为全仓库关掉这一条（它针对的是英文 AI 腔）。配置项必须写 `files: ['**/*']`：antfu 会给没写 `files` 的用户配置项自动注入 `ignores: ['**/*.md']`，md 就放不开了。导出的声明上方注释要写成 `/** */`（`slop/prefer-jsdoc`） |
| 编辑器 | `.vscode/settings.json` 与 `extensions.json` 照抄 [antfu/eslint-config README](https://github.com/antfu/eslint-config) 的 VS Code support 原文 | Hubery 的全局规则 | — |

## 八、提交与发版

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 提交钩子 | `todo-scripts commitlint-init` 生成（用 `pnpm dlx --package=@huberyyang/todo-scripts@1.4.2 hubery commitlint-init --linter eslint`，不把 todo-scripts 留在依赖里）：`husky 9.1.7` + `lint-staged 17.5.1`（`"*": "eslint --fix --no-error-on-unmatched-pattern"`，不带 `.`）+ `@commitlint/cli`、`@commitlint/config-conventional 21.2.3`；pre-commit 只跑 `eslint --fix` | Hubery 的标准 | 类型错误与测试失败要到 CI 才暴露（`todo-scripts` HB-38 的已知取舍）。config-conventional 限制正文每行 100 字符，中文正文要折行 |
| 发版 | 本地 `pnpm release` = 全量门禁 → `bumpp 12.3.0 --no-verify` → `npm publish`；脚本里的 `nr` 由 `@antfu/ni 30.6.0` 提供 | 沿用 todo-scripts | `npm publish` 在本地跑，包**不带 provenance**（沿用 `todo-scripts` HB-30 的取舍）。发版路径从第一版起固定：以后若改走 CI 带 provenance 发布，就不能再切回本地，否则 my-blog 的 `trustPolicy: no-downgrade` 会拒装 |
| Release | `release.yml` 由 tag 触发：校验 tag 与版本号、重跑门禁、`pnpm dlx changelogithub@15` 生成 GitHub Release（锁大版本） | 沿用 todo-scripts | — |
| Release notes 语言 | 提交用中文（`/commit` 规定）；`changelogithub.config.ts` 把分类标题配成中文（`🚀 新功能` / `🐞 问题修复` 等）。已实测 `changelogithub@15.0.5` dry-run：中文提交与中文标题正常生成 Release 正文 | 与提交语言一致 | 两句写死在源码里的英文改不了：结尾的 `View changes on GitHub`，以及没有可收录提交时的 `No significant changes`；作者署名前的 `by` 也是英文 |
| 依赖升级 | `npx taze major` 手动跑，不装进 devDeps | 沿用 todo-scripts | 会提示升级到 TS 7，要跳过（第三节） |
| 分支 | dev 开发 → PR → main，merge commit | — | — |
| 仓库文件 | LICENSE（MIT）、中文 README、Release notes 即 changelog。英文 README 等推广到社区时再加 | — | 推广前外部读者只有中文文档 |

## 九、CI（GitHub Actions）

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 工作流 | `ci.yml`：push 到 main / dev 与 PR 时跑三个 job：`quality`（typecheck、lint、unit + dist 测试、build 后 `git diff --exit-code`）、`browser`、`min-peer`；`release.yml` 见第八节。`runs-on` 钉死 `ubuntu-24.04`；actions 版本与 todo-scripts 一致：`actions/checkout@v7`、`pnpm/action-setup@v6`、`actions/setup-node@v7` | 沿用 todo-scripts。build 后的 `git diff`：tsdown 的 `exports: true` 每次构建都改写 package.json，有 diff 说明改了入口却没提交改写结果。钉 24.04：GitHub 会在 2026-10-19 ～ 11-19 分批把 `ubuntu-latest` 切到 26.04，会连带换掉软件渲染栈，钉住之后换镜像是一次显式提交 | PR 期间 push 与 pull_request 各跑一次（todo-scripts 已知）；以后换镜像要重跑 WebGL 探针 |
| 浏览器 | 每次 `pnpm exec playwright install --with-deps --only-shell chromium firefox webkit`，**不缓存**；测试命令包在 `xvfb-run -a` 里 | Playwright 官方不推荐缓存浏览器：恢复与下载耗时相当，系统依赖本来就缓存不了；缓存键还得带 OS 版本（Firefox / WebKit 按 Ubuntu 版本分构建）。`--only-shell` 只影响 Chromium，无头模式只用得到 headless shell。xvfb：默认 Firefox instance 在 CI 里以 headed 模式运行，headed 是否必需待证（第六节） | 系统依赖每次都要 apt 安装，CI 会慢几分钟；vueuse 因 flaky 关掉过 Firefox（vitest-dev/vitest#7377），Firefox 可能是不稳定的来源 |
| 最低 peer 版本 | 单独一个 job：先按锁文件装，再用 node 把 `vue`、`@vue/compiler-dom`、`@vue/server-renderer` 三个 devDependencies 改写成 `3.5.0` 后 `pnpm install --no-frozen-lockfile`（只在 job 内生效，不提交），断言三者确实是 `3.5.0`、`@vue/runtime-dom` 只有一个版本，然后只在 Chromium 上跑 `browser` project | [`design.md`](design.md) 第四节「范围只写 CI 真测过的版本」要落到实处，需要这个 job。不能用 `pnpm add -D vue@3.5.0`：它只把 specifier 改成 `^3.5.0`，锁定的 3.5.43 纹丝不动，job 会假绿。只降 vue 时 `@vue/test-utils` 会带进另一套 3.5.43 的运行时 | 多一个 job 的 CI 时间；`pnpm why` 的输出格式若变了，单一运行时断言会响亮地红 |

## 十、playground

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 形态 | `vite 8.3.0`；每个宿主场景夹具一个纯 HTML 页，另加一个 Vue 夹具页（`@vitejs/plugin-vue`）；放在仓库内的 `playground/` 目录，**不做 workspace 子包** | 调参反馈要快（[`design.md`](design.md) 第十四节）；不做子包是为了不滑向 monorepo | — |
| 引用库 | alias 直接指向 `src`，有 HMR | 调参时不必先 build | playground 看到的是源码行为，产物问题靠 `dist` project 兜 |
| 夹具复用 | 夹具（宿主 CSS + DOM 结构）写成模块，playground 与 `browser` project 共用 | 手调与自动化面对的是同一份宿主陷阱 | — |

## 十一、考虑过、不采用

| 不采用 | 理由 |
| :--- | :--- |
| TypeScript 7 | 没有编译器 API，见第一节 |
| pnpm catalogs（starter-ts 在用） | 单包用不上，只会让版本号挪到 yaml 里、多一层间接 |
| simple-git-hooks + nano-staged（starter-ts 在用） | Hubery 的标准是经由 todo-scripts 接入 husky + lint-staged |
| `tsdown-stale-guard 0.1.3`（starter-ts 在用） | `globalSetup` 先 build 已在 todo-scripts 验证过，不再引入一个 0.1.x 依赖 |
| `@playwright/test` 作为第二个测试框架 | 集成层并入 Vitest 浏览器模式，见第六节；第十二节的假设证实不了时再启用 |
| size-limit | 要断言的是「产物里有没有 ogl」，不是量体积 |
| `unplugin-vue` | `src` 里没有 SFC |
| happy-dom / jsdom | 没有 WebGL，也验不准 DOM 所有权，见 [`design.md`](design.md) 第十二节 |
| 覆盖率 | 本阶段不做 |
| changesets | 单包单版本号 |
| tsx、skills-npm（starter-ts 在用） | 没有使用场景 |

## 十二、阶段 0 必须先证实的假设

以下选型建立在尚未验证的假设上。阶段 0 先用探针证实，证实不了就回来改选型 —— 不带着没验证过的假设进阶段 1。

| 假设 | 探针 | 证实不了怎么办 | 结论（2026-09-24） |
| :--- | :--- | :--- | :--- |
| CI 里三个内核都能创建 WebGL / Canvas 2D | 已知结果探针：清屏成已知颜色后读回像素 | 查浏览器启动参数；不能带着「全部走进门控分支」的全绿进阶段 1 | **证实**（CI run 35947725585 与 35948298490，ubuntu-24.04；后者三个 job 全绿）：webgl2 / webgl / 2d 在三个内核都读回精确值 `51,102,153,255`。渲染器：Chromium 为 SwiftShader（Subzero），Firefox 为 `llvmpipe`（xvfb 下 headed 的默认 instance 与 headless 的 firefox-touch 都建得出），WebKit 报 `Apple GPU`（WebKit 出于隐私统一报这个名字，Linux 上同样如此） |
| `page.emulateMedia()` 能作用到测试 iframe | 仿真 reduced-motion 前后，在 iframe 里读 `matchMedia` | 集成层退回 `@playwright/test` | **证实**：三内核 iframe 内 `matchMedia` 翻转、change 事件触发；command 改成空操作即红。附条件：仿真跨用例、跨文件残留，基线取决于宿主（第六节），setup 在每个文件与每条用例开始前设基线；Chromium 要读新建的 `matchMedia()` |
| 三个内核都能仿真出 `hover: none` | 在配了 `contextOptions` 的 instance 里读 `matchMedia('(hover: none)')` | 仿真不出的内核不测这一条，在测试里明说 | **证实**：每个内核加一个 `hasTouch: true` 的 instance；`isMobile` 无效 |
| attw 与 publint 的问题能让构建失败 | 故意写错一次 `exports`，构建必须失败 | 加 `failOnWarn`，直到它变红 | attw（`level: 'error'`）**证实**；publint 只有 error 级会失败，warning 级已用 `failOnWarn` 兜住（glob 无匹配的变异及其去掉 `failOnWarn` 的对照） |
| tsnapi 能拦住导出变化 | 故意多导出一个符号，快照测试必须变红 | 改用自写的导出断言 | **证实**：runtime 与 dts 两条红。限制：`-u` 直接接受新增导出（第六节） |
| 模板类型夹具能拦住错误的 prop 类型 | 故意把 props 类型改宽，`vue-tsc` 必须报错 | 调整夹具写法 | 在隔离目录**证实**（TS 6.0.3 + vue-tsc 3.3.11 + vue 3.5.43）：9 种退化都报 TS2578。阶段 0 还没有 Vue 组件可挂夹具，正式夹具与写法约束见 [`todo.md`](todo.md) 阶段 2 |
| 产物断言能发现 ogl 被打进来 | 故意让 `particle-text` import 一次 ogl，断言必须变红 | 改为按模块 id 判断，不按字符串 | **证实**，但判据改为不压缩产物里的 region 注释 + 对照测试（兜底方案「按模块 id」本身会误报，见第六节）；阶段 0 跑在探针包上 |

每次变异后先 `cmp` 确认文件真的改了，再读测试结果。
