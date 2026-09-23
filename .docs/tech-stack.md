# 技术选型

> 2026-09-23 · **技术选型已落定**。拍板记录见 [`decisions.md`](decisions.md)；设计方案见 [`design.md`](design.md)
> 这里定的是**选什么、什么版本、关键配置**；配置文件在阶段 0 落地，待办清单等架构设计落定后统一制定。
> 版本号均为 2026-09-23 在 npm 上查到的最新稳定版，例外逐条写明理由。
>
> 写法约定同 [`design.md`](design.md)：每条决定都写风险。

## 一、核实过的前提

选型里几处与直觉或方案原文不一致的地方，都先实测过：

| 事实 | 怎么核实的 | 结论 |
| :--- | :--- | :--- |
| TypeScript `latest` 是 7.0.2，但它**没有编译器 API** | 装 ts7 与 ts6 对照：ts7 的 `require('typescript')` 只导出 `version`、`versionMajorMinor`，`createProgram` 为 `undefined`；ts6.0.3 为 `function` | vue-tsc（Volar）、typescript-eslint（peer `>=4.8.4 <6.1.0`）、tsdown 生成 d.ts 都依赖这套 API → 锁 6 |
| pnpm 12 仍有 1 天的默认发布冷却期 | 同一范围 `@cloudflare/workers-types@^5.20260901.0`：pnpm 11.27.1 与 12.5.1 在默认配置下都跳过 6 小时前发布的 `5.20260923.1`、装了 30 小时前的 `5.20260922.1`；显式写 `minimumReleaseAge: 1440` 结果相同 | 与 11 一致。另外：默认配置下，**精确版本号**即使不足 1 天也会被装上（宽松回退），显式配置后才严格拦截 |
| pnpm 12 对 workspace 里的未知键直接报错 | 锁定 `pnpm@12.5.1` 的项目里写一个拼错的 `minimumReleaseAg`，install 报错退出；`ignoredBuiltDependencies` 与 `allowBuilds` 都照常接受 | 拼错的配置不会再悄悄失效；从 todo-scripts 照抄的 workspace 配置可以直接用 |
| attw 的 `esm-only` 档会忽略 node10 解析 | attw 源码 `profiles.ts`：`"esm-only": { ignoreResolutions: ["node10", "node16-cjs"] }` | [`design.md`](design.md) 第四节「node10 解析不到 `./vue` 类型」这条风险，attw 不再检查，改由 README 写明 |
| tsdown 里 attw 的 `level` 默认是 `warn` | tsdown 0.23.0 的类型声明：`level?: "error" \| "warn"`，`@default 'warn'` | 不改的话，产物类型有问题也照常构建成功 → 显式设 `error` |
| Vitest 的自定义 command 能拿到 Playwright 的 `page`；每个 instance 能单独配 `contextOptions` | Vitest 官方文档 `api/browser/commands.md`「Custom playwright commands」、`config/browser/playwright.md` | 集成层能并入浏览器模式。但 `page` 是外层编排页，仿真能否传进测试 iframe **未验证**，见第十二节 |

## 二、随包发出的依赖

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 渲染（liquid-text） | `ogl ^1.0.11`，放 dependencies | 见 [`design.md`](design.md) 第四节；自带类型声明（`types/index.d.ts`），不用另装 `@types` | 最后一次发版在 2025-01，至今 20 个月没更新。体量约 10 KB，真停维了可以搬进仓库自己维护 |
| 渲染（particle-text） | Canvas 2D，不加依赖 | — | — |
| `vue` | peer `^3.5.0`，`peerDependenciesMeta` 标 `optional`；开发依赖装 `3.5.43` | 见 [`design.md`](design.md) 第四节 | 范围下限由第九节「最低 peer 版本」job 兜底 |

## 三、工具链基座

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| Node | 开发与 CI 用 24 LTS（CI 写 `lts/*`）；**包不声明 `engines`** | 产物是给打包器用的浏览器 ESM，`engines` 对消费方没有意义；消费方开了 `engineStrict` 时反而装不上 | Vitest 5 要求 Node `^22.12 \|\| ^24 \|\| >=26`，用更老 Node 的贡献者跑不了测试 |
| 包管理 | pnpm `12.5.1`，写进 `packageManager` | 最新稳定版，antfu 的 [starter-ts](https://github.com/antfu/starter-ts) 同版本；未知的 workspace 键直接报错（第一节） | 默认 1 天冷却期（第一节），刚发布的依赖要逐条写进 `minimumReleaseAgeExclude`；todo-scripts 仍在 11，照抄配置时以 12 的行为为准 |
| workspace 配置 | `trustPolicy: no-downgrade`、`shellEmulator: true` | 与 todo-scripts、starter-ts 一致 | `no-downgrade` 会误判部分传递依赖（my-blog 已豁免过 3 条）。遇到时先核对维护者与 integrity，再逐条写进 `trustPolicyExclude` 并注明理由 |
| TypeScript | `^6.0.3` | **「新增依赖用最新稳定版」的例外**：7.0.2 没有编译器 API（第一节）。starter-ts 同样锁在 `^6.0.3`，并在 `update.ignoreDeps` 里排除了 `typescript@7` | 等生态跟上 TS 7 后要迁一次；`taze major` 会提示升到 7，要手动跳过 |
| tsconfig | 对齐 starter-ts：`target` / `module` 为 `ESNext`、`moduleResolution: Bundler`、`strict`、`verbatimModuleSyntax`、`noEmit`、`skipLibCheck`；`lib` 另加 `DOM`、`DOM.Iterable` | 业界基线 | 不开 `isolatedDeclarations`：Vue 工厂生成的组件类型靠推导，开了就要手写大量类型注解；代价是 d.ts 走 tsc，比 oxc 慢 |
| `@types/node` | `^24.13.6` | 跟运行时主版本走；用 26 的类型会放行 24 没有的 API | 升 Node 主版本时要同步 |

## 四、构建与产物

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 构建 | tsdown **精确锁定 `0.23.0`**（不加 `^`） | 见 [`design.md`](design.md) 第四节 | 还在 1.0 之前：升级时对比产物 |
| 入口与导出 | `entry: { index, vue }`、`dts: true`、`exports: true` | package.json 的 `exports` 由 tsdown 按产物生成，不手写，两者不会对不上 | 构建会改写 package.json：改了入口之后要检查 diff 再提交 |
| 产物语法 | `target: 'es2020'`、`platform: 'neutral'` | 比门控基线（Chrome 99 / Firefox 116 / Safari 18.4）再低一档，保证旧浏览器至少能解析到门控那一步、回退成真文本 —— 语法报错会连带宿主整个 bundle 挂掉，比没有特效严重得多。`neutral`：同一份产物既要能在 SSR 的 Node 端被 import，也要在浏览器里运行 | 影响面小：Vite 这类打包器会按自己的 target 再降级一次，这条只对不转译依赖的消费方起作用 |
| 产物校验 | `publint: true`；`attw: { profile: 'esm-only', level: 'error' }`；devDeps 显式装 `publint 0.3.24`、`@arethetypeswrong/core 0.18.5` | 两者是 tsdown 的可选 peer，pnpm 严格模式下不会自动装。`level` 必须显式设 `error`（第一节） | ① `esm-only` 不检查 node10：消费方 TS 若还是 `moduleResolution: node`，解析不到 `./vue` 子路径的类型，这条由 README 写明（要求 `bundler` 或 `node16`）；② publint 的问题会不会让构建失败**未验证**，阶段 0 故意写错一次 `exports`，构建不失败就加 `failOnWarn` |
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
| `browser` | `@vitest/browser-playwright 5.0.1` + `playwright 1.63.0`，Chromium / Firefox / WebKit 三个 instance；Chromium 的启动参数加 `--enable-unsafe-swiftshader` | 理由见 [`CLAUDE.md`](../CLAUDE.md)「工程约定」 | CI 环境是否可信，阶段 0 先用探针证实（第十二节） |
| 挂载 Vue | `vitest-browser-vue 3.1.0`（vitest-community 维护） | 与浏览器模式的 locator、`expect.element` 自动重试配套，适合等 canvas 异步出图 | — |
| 集成（宿主场景夹具） | **并入 `browser` project**，不另起 `@playwright/test`。媒体仿真（reduced-motion / forced-colors）写成自定义 command，调 Playwright 的 `page.emulateMedia()`；`hover: none` 用一个单独配 `contextOptions` 的 instance | 只有一个测试框架、一份配置、一个 CI 步骤；夹具写成模块，测试与 playground 共用 | ① 测试跑在 iframe 里，而 command 拿到的 `page` 是外层编排页，仿真能否作用到 iframe 未验证；② `hover: none` 能否在三个内核上仿真出来未验证，仿真不出的内核就不测这一条并明说；③ 同一页面里各测试文件的 iframe 共享 WebGL 上下文上限（Chrome 约 16 个），并发会互相挤掉上下文 → `browser` project 串行跑测试文件。①② 证实不了就退回 `@playwright/test` |
| `dist` | `globalSetup` 先 build，再跑：① 自写断言：用 Vite 8 的 build API 打包一个只 import `particle-text` 的入口，断言产物里没有 ogl；② `tsnapi 1.5.0` 给公开 API 拍快照 | `globalSetup` 先 build 是 todo-scripts 验证过的做法，保证不会测到旧产物；Vite 本来就是 playground 的依赖，不为断言另装工具。tsnapi（antfu）对运行时导出与 d.ts 一起拍快照：任何导出的增减都要在 diff 里过目，服务「零消费方的定义一律删除」与「壳只能走公开内核 API」 | 快照可能被顺手 `-u` 更新掉，那就等于没守；tsnapi 是较新的 1.x |

## 七、代码规范

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| lint | `@antfu/eslint-config 9.5.1` + `eslint 10.11.0`；`type: 'lib'`、`vue: true` | Hubery 的标准；`lib` 档要求导出函数写显式返回类型，适合库 | — |
| `antislop: true` | 引入 `eslint-plugin-slop 0.1.3` + `eslint-plugin-sonarjs 4.2.1` | 仓库代码主要由 Claude 写，[`CLAUDE.md`](../CLAUDE.md) 对冗余代码、多余注释、`any` 都有明文约束，这项把约束交给机器检查 | 还是 0.1.x，规则会变、可能误报；sonarjs 让 lint 变慢 |
| 编辑器 | `.vscode/settings.json` 与 `extensions.json` 照抄 [antfu/eslint-config README](https://github.com/antfu/eslint-config) 的 VS Code support 原文 | Hubery 的全局规则 | — |

## 八、提交与发版

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 提交钩子 | `todo-scripts commitlint-init` 生成：`husky 9.1.7` + `lint-staged 17.5.1`（`"*": "eslint --fix"`，不带 `.`）+ `@commitlint/cli`、`@commitlint/config-conventional 21.2.3`；pre-commit 只跑 `eslint --fix` | Hubery 的标准 | 类型错误与测试失败要到 CI 才暴露（`todo-scripts` HB-38 的已知取舍） |
| 发版 | 本地 `pnpm release` = 全量门禁 → `bumpp 12.3.0 --no-verify` → `npm publish`；脚本里的 `nr` 由 `@antfu/ni 30.6.0` 提供 | 沿用 todo-scripts | `npm publish` 在本地跑，包**不带 provenance**（沿用 `todo-scripts` HB-30 的取舍）。发版路径从第一版起固定：以后若改走 CI 带 provenance 发布，就不能再切回本地，否则 my-blog 的 `trustPolicy: no-downgrade` 会拒装 |
| Release | `release.yml` 由 tag 触发：校验 tag 与版本号、重跑门禁、`pnpm dlx changelogithub@15` 生成 GitHub Release（锁大版本） | 沿用 todo-scripts | — |
| Release notes 语言 | 提交用中文（`/commit` 规定）；`changelogithub.config.ts` 把分类标题配成中文（`🚀 新功能` / `🐞 问题修复` 等）。已实测 `changelogithub@15.0.5` dry-run：中文提交与中文标题正常生成 Release 正文 | 与提交语言一致 | 两句写死在源码里的英文改不了：结尾的 `View changes on GitHub`，以及没有可收录提交时的 `No significant changes`；作者署名前的 `by` 也是英文 |
| 依赖升级 | `npx taze major` 手动跑，不装进 devDeps | 沿用 todo-scripts | 会提示升级到 TS 7，要跳过（第三节） |
| 分支 | dev 开发 → PR → main，merge commit | — | — |
| 仓库文件 | LICENSE（MIT）、中文 README、Release notes 即 changelog。英文 README 等推广到社区时再加 | — | 推广前外部读者只有中文文档 |

## 九、CI（GitHub Actions）

| 项 | 选型 | 理由 | 风险 |
| :--- | :--- | :--- | :--- |
| 工作流 | `ci.yml`：push 到 main / dev 与 PR 时跑 typecheck、lint、test（三个 project）；`release.yml` 见第八节。actions 版本与 todo-scripts 一致：`actions/checkout@v7`、`pnpm/action-setup@v6`、`actions/setup-node@v7` | 沿用 todo-scripts | PR 期间 push 与 pull_request 各跑一次（todo-scripts 已知） |
| 浏览器 | `pnpm exec playwright install --with-deps chromium firefox webkit`，按 playwright 版本缓存 `~/.cache/ms-playwright` | — | 系统依赖缓存不了，每次都要重新 apt 安装，CI 会慢几分钟 |
| 最低 peer 版本 | 单独一个 job：在 job 内临时把 `vue` 装成 `3.5.0`（不回写 lockfile），只在 Chromium 上跑 `browser` project | [`design.md`](design.md) 第四节「范围只写 CI 真测过的版本」要落到实处，需要这个 job | 多一个 job 的 CI 时间 |

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

| 假设 | 探针 | 证实不了怎么办 |
| :--- | :--- | :--- |
| CI 里三个内核都能创建 WebGL / Canvas 2D | 已知结果探针：清屏成已知颜色后读回像素 | 查浏览器启动参数；不能带着「全部走进门控分支」的全绿进阶段 1 |
| `page.emulateMedia()` 能作用到测试 iframe | 仿真 reduced-motion 前后，在 iframe 里读 `matchMedia` | 集成层退回 `@playwright/test` |
| 三个内核都能仿真出 `hover: none` | 在配了 `contextOptions` 的 instance 里读 `matchMedia('(hover: none)')` | 仿真不出的内核不测这一条，在测试里明说 |
| attw 与 publint 的问题能让构建失败 | 故意写错一次 `exports`，构建必须失败 | 加 `failOnWarn`，直到它变红 |
| tsnapi 能拦住导出变化 | 故意多导出一个符号，快照测试必须变红 | 改用自写的导出断言 |
| 模板类型夹具能拦住错误的 prop 类型 | 故意把 props 类型改宽，`vue-tsc` 必须报错 | 调整夹具写法 |
| 产物断言能发现 ogl 被打进来 | 故意让 `particle-text` import 一次 ogl，断言必须变红 | 改为按模块 id 判断，不按字符串 |

每次变异后先 `cmp` 确认文件真的改了，再读测试结果。
