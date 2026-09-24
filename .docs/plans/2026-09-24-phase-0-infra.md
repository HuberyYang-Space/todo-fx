# 阶段 0：基建 实现计划

> **给执行者（agent）：** 必须配合 superpowers:executing-plans（本会话内执行）或 superpowers:subagent-driven-development（逐任务派子 agent）使用。
> 步骤用 `- [ ]` 勾选框跟踪。

**目标：** 在空仓库上搭好包骨架、构建、lint、提交钩子、三个测试 project、playground 与宿主场景夹具、CI 与发版流程，
并让「CI 全绿」这件事本身可信：每条守卫都见过一次红，每个环境假设都有已知结果的探针。

**做法：** 按依赖顺序推进：骨架与依赖 → lint（附依赖方向守卫的单测）→ 提交钩子 → 构建 → 浏览器测试环境 → 产物测试 →
夹具与 playground → CI → 推送验证 → 文档回写。每个任务结束时仓库都是绿的，并单独提交一次。

**技术栈：** pnpm 12.5.1 · TypeScript 6.0.3 · tsdown 0.23.0 · Vitest 5.0.1（浏览器模式 + Playwright 1.63.0）· vue-tsc 3.3.11 ·
@antfu/eslint-config 9.5.1 · Vite 8.3.0 · husky + lint-staged + commitlint（经 todo-scripts 1.4.2 接入）

**依据：** [`todo.md`](../todo.md) 阶段 0 · [`tech-stack.md`](../tech-stack.md) · [`architecture.md`](../architecture.md) 第八、九节 ·
[`design.md`](../design.md) 第十二、十三节。计划里的每份配置都已在隔离目录实测跑通（2026-09-23 ～ 24，三内核在 macOS 上实测，Linux 由 CI 验证），
与文档不一致的地方集中列在下面「偏离与补充」，由 Hubery 审阅本计划时一并拍板。

---

## 需要 Hubery 拍板的事

> **2026-09-24 Hubery 已拍板**：一、由 Claude 查清安装方式后执行升级（已完成，见任务 0）；二、全仓库放开破折号；三、全部采纳；四、同意；
> 执行方式：本会话直接执行（superpowers:executing-plans）。

### 一、开工前必须由 Hubery 执行：修好全局 pnpm

本机 PATH 上的 pnpm 是 npm 全局装的 10.28.2。项目写 `packageManager: pnpm@12.5.1` 之后，pnpm 10 自动切换到 12.5.1 会失败
（`ERROR Failed to switch pnpm to v12.5.1 … ENOEXEC`：pnpm 12 的 bin 是一个等安装脚本替换成原生二进制的占位文件，pnpm 10 的切换流程没执行那一步）。
后果：仓库里任何 `pnpm` 命令、每次 `git commit` 的 pre-commit 钩子、tsdown 内部调用的 `pnpm pack`（attw 检查要用）全部失败。
实测 pnpm 11.15.1 与 npm 全局装的 12.5.1 都能正常工作，只有 10.x 切不过去。

见任务 0。这一步动全局环境，由 Hubery 执行。

### 二、`slop/no-em-dash` 在代码里留不留

`antislop` 带进来的 `slop/no-em-dash` 见到 U+2014 就报错，中文破折号「——」也算。现有文档有 93 处。

- **计划的默认做法**：`.docs/**` 整个不 lint（md 代码块里的伪代码会被当成文件去解析，解析报错）；其余 `*.md` 关掉这条；
  **ts / vue 里保留**，代码注释与字符串里不写「——」。
- 另一种做法：全仓库关掉。理由是这条规则针对的是英文 AI 腔，中文破折号是正常标点。

不回复就按默认做法执行。

### 三、偏离与补充（默认全部采纳，逐条附实测依据）

| # | 内容 | 与文档的差异 | 依据 |
| :--- | :--- | :--- | :--- |
| 1 | tsdown 加 `failOnWarn: true` | tech-stack 第十二节的兜底方案，现在落地 | publint 的 warning 级问题（glob 导出无匹配等）默认退出码 0；加上后变红。它还能拦住 import 了没装的包：默认只报 `UNRESOLVED_IMPORT` 警告，照常产出 `import "not-installed-pkg"` 的坏产物 |
| 2 | tsdown 加 `deps: { onlyBundle: [] }` | 新增守卫 | ogl 被误挪进 devDependencies 时，tsdown 会把它打进 dist，默认只给一条 info 级提示，`failOnWarn` 也拦不住；加上这项后构建报错退出 |
| 3 | devDependencies 加 `jiti ^2.7.0` | tech-stack 没列 | ESLint 10.11 加载 `eslint.config.ts` 必须有它，否则报 `The 'jiti' library is required`。todo-scripts 能用只是因为它碰巧作为传递依赖被装上了 |
| 4 | `pnpm-workspace.yaml` 写三个键：`minimumReleaseAgeExcludePrune: true`、`trustPolicy`、`shellEmulator`，按这个顺序、不留空行 | tech-stack 只写了后两个 | antfu 9.5.1 检测到 workspace 文件就开 pnpm 规则，强制这三个键和键顺序，不改 lint 报 3 个错。另外照抄 todo-scripts 的 `ignoredBuiltDependencies` 在 pnpm 12 里被接受但**完全不起作用**（v11 起由 `allowBuilds` 取代）；本项目依赖树里没有带构建脚本的包，不需要任何构建相关的键 |
| 5 | 依赖方向规则在第八节五条之外，再加四条：runtime 只能向下依赖 compute；effects 只能向下依赖 runtime / compute；`src/index.ts` 不碰框架、不引用 `./vue`；内核各层不得经由包名自引用 | architecture 第八节只列了五条 | 这四条就是第一节「依赖方向只有一条路」的字面落地。少了第一条，runtime 可以借 `../effects/liquid-text` 把 ogl 间接拉进来，「runtime 不碰 ogl」被绕开 |
| 6 | 显式开 `ts/no-explicit-any: 'error'` | tech-stack 第七节以为 antislop 会拦 `any` | antfu README 说 antislop 禁显式 `any`，9.5.1 的代码里这条仍是 `off`，实测 `v: any` 不报错 |
| 7 | 浏览器测试**不再强制串行**（不写 `fileParallelism: false`） | tech-stack 第六节风险③、design 第十二节定为串行 | 串行的理由「同一页面里各测试文件的 iframe 共享 WebGL 上下文上限，并发会互相挤掉」不成立：并行时每个测试文件分到独立的 BrowserContext + page，三内核各 3 个文件 × 每个 12 个上下文同时存活也不丢。上限 16 只在单个文档内生效（Chromium、WebKit 在第 17 个挤掉最旧的；Firefox 到 40 个也不丢） |
| 8 | `hover: none` 靠每个内核各加一个 `contextOptions: { hasTouch: true }` 的 instance 仿真 | tech-stack 第十二节待证实 | 三内核实测 `(hover: none)`、`(pointer: coarse)` 都为 true；只开 `isMobile` 仿真不出（Firefox 还会静默忽略它） |
| 9 | 产物测试目录叫 `test/artifact/`，不叫 `test/dist/` | 新定 | antfu 的默认忽略里有 `**/dist`，放在 `test/dist/` 下的测试文件会被**静默**跳过 lint |
| 10 | ogl 产物断言的判据：不压缩的最终产物里有没有 `//#region …node_modules/ogl/` 注释，**外加一条「import 带 ogl 的导出必须看得见 ogl」的对照测试** | tech-stack 第十二节的兜底写的是「按模块 id 判断」 | 按模块 id 判断会误报：`chunk.moduleIds` 是死代码消除之前的清单，`./vue` 入口上被摇掉的 ogl 也列在里面。按压缩产物搜 `'ogl'` 会漏报。ogl 被 tsdown 打进 dist 时「没有 ogl」那条会假绿，只有对照会红，所以对照不能省 |
| 11 | 阶段 0 的 ogl 断言跑在一个**探针包**上（`test/artifact/fixtures/ogl-probe/`：一个导出依赖 ogl、一个不依赖） | 新定 | 阶段 0 还没有特效，没有真实入口可断言。探针包证明「判据本身可信」，并长期守住 rolldown 注释格式变化这类上游风险；阶段 1 加对照、阶段 3 加主断言时换成真实入口 |
| 12 | tsconfig 显式写 `types: ["node"]`，`lib` 只写 `["ESNext", "DOM"]`，去掉 starter-ts 在 TS 6 下的冗余项，加 `allowImportingTsExtensions` | tech-stack 第三节写的是「对齐 starter-ts 并加 DOM、DOM.Iterable」 | TS 6 的 `types` 默认值变成 `[]`，只装 `@types/node` 不够（starter-ts 能过是因为 vite 的 d.ts 顺带引用了 node 类型）；TS 6 的 `DOM` 已包含 iterable；`esModuleInterop` / `strictNullChecks` / `resolveJsonModule` 在 TS 6 下是默认值或冗余项。`allowImportingTsExtensions` 是因为 `vitest.config.ts` 要带 `.ts` 扩展名 import commands（不带的话 Vite 8.3 报 configLoader 警告） |
| 13 | 最低 peer 版本 job 用 node 改写 package.json 再 `pnpm install --no-frozen-lockfile`，**连带钉住 `@vue/compiler-dom`、`@vue/server-renderer`**，断言三者版本都是 3.5.0，并断言 `@vue/runtime-dom` 只有一个版本 | tech-stack 第九节只写了「临时把 vue 装成 3.5.0」 | `pnpm add -D vue@3.5.0` 只会把 specifier 改成 `^3.5.0`，实际装的仍是 3.5.43 —— job 会假绿（变异对照已证实）。只降 vue 时，`@vue/test-utils`（vitest-browser-vue 的依赖）仍会静态加载 3.5.43 的这两个包，浏览器里同时存在两套 Vue 运行时（干跑实测 `pnpm why` 报 `Found 2 versions`，三个一起钉住后是 1 个） |
| 14 | 渲染器信息用 Vitest 的 `annotate` 记录，不用 `console.log` | 新定 | antfu 对测试文件也开着 `no-console`（只放行 warn / error）。`annotate` 在浏览器模式可用，GitHub Actions 报告器把它输出成 `::notice`，CI 页面上直接看得到三个内核各自的渲染器 |
| 15 | **CI 里 Firefox 以 headed 模式运行，整个测试命令包在 `xvfb-run -a` 里**；本地仍是 headless | tech-stack 第九节没有这一条 | Linux 上 headless Firefox 建不出 WebGL（[Mozilla bug 1375585](https://bugzilla.mozilla.org/show_bug.cgi?id=1375585) 至今是 NEW；改 prefs、设 `LIBGL_ALWAYS_SOFTWARE`、装 Mesa 都无效，有 2026-09 在 GitHub runner 上的复现）。Kitware/vtk.js 用 Vitest 5 浏览器模式在 ubuntu-24.04 上就是 headed + xvfb 跑绿的。runner 预装 xvfb。本地 macOS 的 headless Firefox 实测能建 WebGL，所以只在 CI 切 headed，免得本地每次弹窗 |
| 16 | CI 的 `runs-on` 钉死 `ubuntu-24.04`，不用 `ubuntu-latest` | todo-scripts 用 `ubuntu-latest` | GitHub 会在 2026-10-19 ～ 11-19 分批把 `ubuntu-latest` 切到 26.04（[Changelog 2026-09-17](https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration/)），切换会连带换掉软件渲染栈。钉住之后，换镜像是一次显式提交，换完重跑 WebGL 探针 |
| 17 | **不缓存** Playwright 浏览器，每次 `playwright install --with-deps` | tech-stack 第九节定为「按 playwright 版本缓存 `~/.cache/ms-playwright`」 | [Playwright 官方文档](https://playwright.dev/docs/ci#caching-browsers)不推荐：恢复缓存与下载耗时相当，系统依赖本来就缓存不了。同镜像实测下载 Chromium 约 10 秒、Firefox 约 5 秒。缓存还得在键里带 OS 版本（Firefox / WebKit 按 Ubuntu 版本分构建，`runner.os` 区分不了），多出一步脚本却省不了几秒 |

### 四、要改 CLAUDE.md 的地方（按全局规则须 Hubery 同意）

任务 10 会做下面这些改动，审阅本计划即视为逐条确认；不同意的条目请在审阅时划掉：

1. **修正「工程约定」第一条**：原文说「不开 `--enable-unsafe-swiftshader` 的话 WebGL 创建失败」。实测 Playwright 1.63 启动 Chromium 时已经无条件追加这个开关，
   Vitest 无头模式用的 chrome-headless-shell 在本机也一律走 SwiftShader。改为：显式写上仍保留（不把可信度押在上游默认值上），
   真正证明环境可信的是三内核的已知结果探针（`test/browser/env-probe.browser.test.ts`）。
2. **把「当前状态」一行改成阶段 0 已完成**，并按原文「工具链落地后在这里补上命令」补一张命令表。
3. **新增五条踩过的坑**（都是「漏了不报错」或「只在 CI 报错」的类型）：
   - `vitest run -u <文件>` 会把文件路径吞成 `-u` 的值，结果全量更新快照；要写成 `vitest run <文件> -u`。
   - 测试目录不能叫 `dist`（antfu 默认忽略 `**/dist`，整个目录静默跳过 lint）。
   - 变异实验不要走 `pnpm exec` / `pnpm run`：pnpm 12 发现 package.json 与 node_modules 不同步时会先自动 install 并改写 lockfile，
     改坏的依赖声明会被悄悄「修好」，结论就错了；直接调 `node_modules/.bin/<工具>`。
   - 门控读媒体查询要用新建的 `matchMedia(q).matches`，不要读被监听的那个 `MediaQueryList` 的 `.matches`：
     Chromium 里在 change 事件派发前读它，forced-colors 的 change 事件会被吞掉（实测），退出强制色后永远收不到恢复信号。
   - 浏览器测试里新 import 一个第三方依赖时，把它加进 browser project 的 `optimizeDeps.include`：没有 Vite 缓存时（CI 每次都是）
     依赖到测试中途才被发现、临时预构建，随即整页重载，一批测试文件报 `Failed to import test file`；本地有缓存时发现不了。

### 五、推送与分支（任务 9 时再问）

验证「CI 全绿」必须推送到 GitHub。任务 9 推送前会再问一次；CI 全绿后，dev 合进 main 是开 PR 还是继续像文档阶段那样快进，也在那时问
（tech-stack 第八节定的是「dev 开发 → PR → main，merge commit」，文档阶段一直是快进）。

---

## 全局约束

每个任务的要求都隐含包括这一节。

- 版本（新增依赖取 2026-09-23 的最新稳定版，例外已在 tech-stack 写明理由）：pnpm `12.5.1`；TypeScript `^6.0.3`（**不得升到 7**）；`@types/node ^24.13.6`；
  tsdown **精确** `0.23.0`；publint `^0.3.24`；`@arethetypeswrong/core ^0.18.5`；vue-tsc `^3.3.11`；`@vitejs/plugin-vue ^6.0.9`；vitest 与 `@vitest/browser-playwright` `^5.0.1`；
  playwright `^1.63.0`；vitest-browser-vue `^3.1.0`；tsnapi `^1.5.0`；`@antfu/eslint-config ^9.5.1`；eslint `^10.11.0`；eslint-plugin-slop `^0.1.3`；
  eslint-plugin-sonarjs `^4.2.1`；jiti `^2.7.0`；husky `^9.1.7`；lint-staged `^17.5.1`；`@commitlint/cli`、`@commitlint/config-conventional` `^21.2.3`；
  bumpp `^12.3.0`；`@antfu/ni ^30.6.0`；vite `^8.3.0`；vue 开发依赖 `^3.5.43`、peer `^3.5.0`（optional）；ogl `^1.0.11`（dependencies）。
- 包：`name: @huberyyang/todo-fx`、`type: module`、`sideEffects: false`、`files: ["dist"]`、`publishConfig.access: public`；**不写 `engines`**；
  `exports` 由 tsdown 生成，不手写，也不要手写 `main` / `module` / `types`（`types` 一旦写进去，tsdown 不会再清掉它）。
- 提交一律走 `/commit` skill（中文、不加 Co-Authored-By）；每个任务结束提交一次，同一次提交里勾掉 [`todo.md`](../todo.md) 对应的项。
- 代码注释用简体中文，只写代码表达不出的「为什么」；不为过 lint 加 disable 注释。
- 守卫写完必须逐个故意改坏、确认变红；**每次改坏后先 `cmp` 确认文件真的变了**，再读测试结果；还原后再 `cmp` 一次。
- 依赖方向规则不许为了过 lint 放宽。

## 执行须知（写给执行者）

- **变异的标准动作**（下文「变异」步骤都按这个做）：
  ```bash
  cp <文件> "$TMPDIR/fx-bak" && <改坏 <文件>> && ! cmp -s <文件> "$TMPDIR/fx-bak" && echo 已改坏   # 没打印「已改坏」就说明变异没落地，结果作废
  <跑检查>; echo exit=$?
  cp "$TMPDIR/fx-bak" <文件> && cmp <文件> "$TMPDIR/fx-bak" && echo 已还原
  ```
  改坏 package.json 或 tsdown 配置时，tsdown 的 `exports: true` 会顺手改写 package.json，所以**两个文件都要备份和还原**，最后 `git status --short` 必须干净。
- 变异时直接调 `node_modules/.bin/<工具>`，不要走 `pnpm exec` / `pnpm run`（原因见上面第四节第 3 条）。
- 在 Claude Code 沙箱里跑 Firefox 会因为不能创建 `~/Library/Application Support/Firefox` 而起不来（报 `Could not find profile folder`）。
  由 Claude 执行浏览器测试时先设：
  ```bash
  export MOZ_APP_DATA="$TMPDIR/todo-fx-moz" MOZ_LOCAL_APP_DATA="$TMPDIR/todo-fx-moz-local"
  ```
  Hubery 本人的终端与 CI 不需要。
- 有 `CLAUDECODE` / `AI_AGENT` 环境变量时，Vitest 默认用 `minimal` 报告器，通过的用例不显示任何输出；要看证据加 `--reporter=verbose`。
- Playwright 1.63 的浏览器约 1.2 GB，本机下载 Chromium 一项就用了约 25 分钟，任务 5 要预留时间。

## 重点审查

没有任务的测试天然覆盖、但最可能让「全绿」变成假象的五种情况。每条都在负责它的任务里补了专门的检查：

1. **tsdown 在 CI 里改写了 package.json，但改动没提交**：本地构建后没跑 lint 排序，或改了入口没提交新的 `exports`，CI 每次都在一份和仓库不一致的 package.json 上测。
   → 任务 8：CI 里构建之后 `git diff --exit-code package.json`。
2. **最低 peer 版本 job 假绿**：job 绿着，测的却是 3.5.43。→ 任务 8：装完断言三个包的版本都是 `3.5.0`，并有变异对照。
3. **tsnapi 快照没进仓库**：本地首次运行会静默写出快照并通过，快照被 `.gitignore` 吞掉的话 CI（`CI=true`）永远红；反过来快照若被随手 `-u` 更新，就等于没守。
   → 任务 6：`git ls-files` 必须列出 4 个快照文件；`CI=true` 下删掉快照必须红。
4. **媒体仿真跨用例残留**：仿真挂在 page 上，同一 page 的下一个用例 / 测试文件原样继承，后面的测试在错误的仿真状态下跑，表现为莫名其妙的红或绿。
   → 任务 5：`setup.ts` 每条用例后复位，并用一对相邻用例守住复位本身。
5. **提交钩子没在跑**：钩子装了但 hooksPath 没设、或全局 pnpm 坏了，提交照样成功，lint-staged 与 commitlint 从未生效。
   → 任务 3：不合规的提交信息必须被拦下。

---

## 文件结构

```
.github/workflows/ci.yml            CI：quality / browser / min-peer 三个 job            （任务 8）
.github/workflows/release.yml       tag 触发：校验版本号 → 门禁 → changelogithub         （任务 8）
.husky/pre-commit, commit-msg       commitlint-init 生成                                  （任务 3）
.vscode/settings.json               照抄 @antfu/eslint-config 9.5.1 README                （任务 2）
.vscode/extensions.json                                                                   （任务 2）
.gitignore                          重写：不忽略 __snapshots__（tsnapi 快照要进仓库）     （任务 1）
LICENSE                             MIT                                                   （任务 1）
README.md                           中文骨架                                              （任务 1）
changelogithub.config.ts            中文分类标题                                          （任务 8）
commitlint.config.ts                commitlint-init 生成                                  （任务 3）
eslint.config.ts                    antfu + 依赖方向守卫                                  （任务 2）
lint-staged.config.mjs              commitlint-init 生成                                  （任务 3）
package.json                                                                              （任务 1 起逐步加脚本）
pnpm-workspace.yaml                                                                       （任务 1）
tsconfig.json                                                                             （任务 1）
tsdown.config.ts                                                                          （任务 4）
vitest.config.ts                    unit / browser / dist 三个 project                    （任务 2 建，5、6 扩展）
src/index.ts                        公开入口 `.`：骨架期为空模块                          （任务 1）
src/vue/index.ts                    公开入口 `./vue`：骨架期为空模块                      （任务 1）
test/unit/eslint-guards.test.ts     依赖方向与类型纪律的 lint 守卫                        （任务 2）
test/browser/commands.ts            自定义 command：媒体仿真                              （任务 5）
test/browser/vitest-browser.d.ts    command 的类型扩充                                    （任务 5）
test/browser/setup.ts               每条用例后复位仿真                                    （任务 5）
test/browser/env-probe.browser.test.ts    WebGL2 / WebGL / 2D 已知结果探针                （任务 5）
test/browser/emulation.browser.test.ts    媒体仿真作用到测试 iframe                       （任务 5）
test/browser/hover.browser.test.ts        对照：默认 instance 是 hover: hover             （任务 5）
test/browser/hover.touch.test.ts          touch instance 是 hover: none                   （任务 5）
test/browser/host-fixtures.browser.test.ts 8 个宿主场景夹具的结构与陷阱自检              （任务 7）
test/browser/vue-fixture.browser.test.ts  Vue 夹具页的结构                                （任务 7）
test/artifact/global-setup.ts       先用 tsdown CLI 构建                                  （任务 6）
test/artifact/api.test.ts           tsnapi 公开 API 快照                                  （任务 6）
test/artifact/__snapshots__/…       tsnapi 快照，进仓库                                   （任务 6）
test/artifact/no-ogl.test.ts        ogl 产物断言的判据                                    （任务 6）
test/artifact/fixtures/ogl-probe/   探针包：一个导出依赖 ogl、一个不依赖                  （任务 6）
playground/vite.config.ts           多页 + Vue 插件 + alias 指向 src                      （任务 7）
playground/index.html, main.ts      夹具列表与单个夹具页（?fixture=<id>）                 （任务 7）
playground/vue.html, vue/main.ts, vue/App.vue    Vue 夹具页                               （任务 7）
playground/fixtures/*.ts            8 个宿主场景夹具 + 类型 + DOM 工具 + 清单             （任务 7）
```

职责划分的考虑：夹具放在 `playground/fixtures/`，playground 与 `browser` project 共用同一份模块（tech-stack 第十节）；
测试一律放 `test/` 下按 project 分目录（与 starter-ts 一致），`vitest.config.ts` 按目录划 project，新测试放对目录就自动归到对的 project。

---

### 任务 0：修好全局 pnpm（已完成，2026-09-24）

**文件：** 无（改全局环境）

本机有两套全局 pnpm：
- `/usr/local/bin/pnpm` → npm 全局安装（`/usr/local/lib/node_modules/pnpm`，root 所有，Node 由 `n` 管理），10.28.2，**实际生效的是它**；
- `~/Library/pnpm/pnpm` → `pnpm setup` 装的自管理版本，11.15.1。`.zshrc` 里 `pnpm setup` 写的那段只在 PATH 里还没有 PNPM_HOME 时才把它插到最前，
  而继承来的 PATH 里已经有它（排在 `/usr/local/bin` 之后），于是那段跳过，这一套被遮住。

GUI 里的 git 客户端跑 husky 钩子时用的是系统默认 PATH（含 `/usr/local/bin`、不含 PNPM_HOME），所以升级实际生效的那一套：

- [x] **步骤 1：原地升级 npm 全局安装**：`sudo npm install -g pnpm@12.5.1`（npm 未关闭安装脚本，pnpm 12 的原生二进制靠 `install.js` 放置）
- [x] **步骤 2：确认**：`pnpm -v` → `12.5.1`；`file` 显示 `Mach-O 64-bit executable arm64`
- [x] **步骤 3：确认其他项目仍能切回自己的版本**：todo-scripts（11.23.0）、design-library（10.28.2）、health-admin-nuxt3（9.14.2）的 `pnpm -v` 分别输出各自版本，三个仓库 `git status` 无改动

`~/Library/pnpm` 那一套原样保留（被遮住、不影响）；`~/Library/pnpm/.tools/pnpm/12.5.1` 里上次失败切换留下的坏安装也不再被用到（全局已是 12.5.1，不会再为本项目切换）。

---

### 任务 1：包骨架、TypeScript 与依赖安装

**文件：**
- 新建：`package.json`、`pnpm-workspace.yaml`、`tsconfig.json`、`LICENSE`、`README.md`、`src/index.ts`、`src/vue/index.ts`
- 修改：`.gitignore`（整体重写）

**接口：**
- 产出：`pnpm typecheck`（`vue-tsc --noEmit`）；两个入口文件 `src/index.ts`、`src/vue/index.ts`（空模块，阶段 1、2 往里加导出）

- [ ] **步骤 1：写 `package.json`**

devDependencies 一次写全（后续任务不再装包；husky / lint-staged / commitlint 四个包除外，由任务 3 的 commitlint-init 安装）。
脚本随任务逐步加，这里只有 `typecheck`。

```json
{
  "name": "@huberyyang/todo-fx",
  "type": "module",
  "version": "0.0.0",
  "packageManager": "pnpm@12.5.1",
  "description": "可复用的页面特效库：框架无关内核 + Vue 壳",
  "author": "Hubery Yang",
  "license": "MIT",
  "homepage": "https://github.com/HuberyYang-Space/todo-fx#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/HuberyYang-Space/todo-fx.git"
  },
  "bugs": {
    "url": "https://github.com/HuberyYang-Space/todo-fx/issues"
  },
  "keywords": [
    "effects",
    "webgl",
    "canvas",
    "text",
    "vue"
  ],
  "sideEffects": false,
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "typecheck": "vue-tsc --noEmit"
  },
  "peerDependencies": {
    "vue": "^3.5.0"
  },
  "peerDependenciesMeta": {
    "vue": {
      "optional": true
    }
  },
  "dependencies": {
    "ogl": "^1.0.11"
  },
  "devDependencies": {
    "@antfu/eslint-config": "^9.5.1",
    "@antfu/ni": "^30.6.0",
    "@arethetypeswrong/core": "^0.18.5",
    "@types/node": "^24.13.6",
    "@vitejs/plugin-vue": "^6.0.9",
    "@vitest/browser-playwright": "^5.0.1",
    "bumpp": "^12.3.0",
    "eslint": "^10.11.0",
    "eslint-plugin-slop": "^0.1.3",
    "eslint-plugin-sonarjs": "^4.2.1",
    "jiti": "^2.7.0",
    "playwright": "^1.63.0",
    "publint": "^0.3.24",
    "tsdown": "0.23.0",
    "tsnapi": "^1.5.0",
    "typescript": "^6.0.3",
    "vite": "^8.3.0",
    "vitest": "^5.0.1",
    "vitest-browser-vue": "^3.1.0",
    "vue": "^3.5.43",
    "vue-tsc": "^3.3.11"
  }
}
```

- [ ] **步骤 2：写 `pnpm-workspace.yaml`**

键的顺序与「不留空行」是 antfu 的 pnpm 规则强制的（见「偏离与补充」第 4 条）。

```yaml
minimumReleaseAgeExcludePrune: true
trustPolicy: no-downgrade
shellEmulator: true
```

- [ ] **步骤 3：写 `tsconfig.json`**

`include` 用目录形式：vue-tsc 会按目录把 `.vue` 一起纳入（显式写成 `**/*.ts` 会把 `.vue` 夹具静默漏掉，已实测）；任务 7 会用变异确认 playground 的 `.vue` 确实被检查。
快照里的 `.d.ts` 参数名全是 `_`，探针包是手写 JS，都排除掉。

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"],
    "allowImportingTsExtensions": true,
    "strict": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src", "test", "playground", "*.config.ts"],
  "exclude": ["test/artifact/__snapshots__", "test/artifact/fixtures"]
}
```

- [ ] **步骤 4：写两个入口（空模块）**

`src/index.ts` 与 `src/vue/index.ts` 内容相同：

```ts
export {}
```

- [ ] **步骤 5：重写 `.gitignore`**

不照抄 todo-scripts 的模板：那份忽略了 `__snapshots__/`（tsnapi 快照必须进仓库，否则 CI 永远红）和 `CLAUDE.md`（本仓库的 CLAUDE.md 要提交）。
`.vitest` 是 Vitest 5 浏览器模式放失败截图的地方（`.vitest/attachments/`，干跑实测）。

```gitignore
.DS_Store
.eslintcache
.vitest
*.log
*.tgz
coverage
dist
node_modules
```

- [ ] **步骤 6：写 `LICENSE`**

```text
MIT License

Copyright (c) 2026 Hubery Yang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **步骤 7：写 `README.md` 骨架**

安装与用法留到阶段 4（第一版发布前）写，现在只放定位、状态与开发命令。开发命令表在后续任务里随脚本增加逐步补全，这里先写出最终形态，
各任务完成后命令即可用。

````md
# @huberyyang/todo-fx

可复用的页面特效库：框架无关的内核 + Vue 壳。真文本始终留在 DOM 里，特效只把它涂透明，
所以布局不抖、能被选中和朗读，浏览器不支持时什么都不用做就是正确的降级。

> 开发中，尚未发布到 npm。安装与用法在第一版（`0.1.0`）发布时补齐。

## 开发

需要 Node 24（或 22.22.1 以上）与 pnpm 12.5.1。

```bash
pnpm install
pnpm exec playwright install chromium firefox webkit
```

| 命令 | 作用 |
| :--- | :--- |
| `pnpm play` | 启动 playground：宿主场景夹具与 Vue 夹具页 |
| `pnpm build` | 构建 `dist`，同时跑 publint 与 attw |
| `pnpm typecheck` | `vue-tsc --noEmit`，覆盖 `.ts` 与 `.vue` |
| `pnpm lint` | ESLint，含依赖方向守卫 |
| `pnpm test` | 全部测试：`unit`、`browser`（三内核）、`dist`（先构建） |

## License

[MIT](./LICENSE)
````

- [ ] **步骤 8：安装依赖**

Run: `pnpm install`
Expected: 以 `Done in …s using pnpm v12.5.1` 结束；输出里没有 `WARN`、`trust`、`minimumReleaseAge`、`ERR_PNPM_IGNORED_BUILDS` 字样（实测 560 个包全部干净）。

Run: `pnpm peers check`
Expected: `No peer dependency issues found`

- [ ] **步骤 9：类型检查通过**

Run: `pnpm typecheck; echo exit=$?`
Expected: `exit=0`

- [ ] **步骤 10：提交**

走 `/commit`，建议信息：`chore: 初始化包骨架与 TypeScript 配置`。
同一提交勾掉 [`todo.md`](../todo.md) 阶段 0 的「包骨架」「TypeScript」两项。

---

### 任务 2：ESLint、依赖方向守卫与 unit project

**文件：**
- 新建：`eslint.config.ts`、`.vscode/settings.json`、`.vscode/extensions.json`、`vitest.config.ts`、`test/unit/eslint-guards.test.ts`
- 修改：`package.json`（加脚本 `lint`、`lint:fix`、`test`、`test:unit`）

**接口：**
- 消费：任务 1 的 `package.json`、`tsconfig.json`
- 产出：`pnpm lint` / `pnpm lint:fix`；`vitest.config.ts` 里名为 `unit` 的 project（node 环境，收 `test/unit/**/*.test.ts`），任务 5、6 往同一文件里追加 project

- [ ] **步骤 1：先写守卫的测试（此时还没有配置，应当红）**

`test/unit/eslint-guards.test.ts`。规则是否生效只取决于 `filePath` 能否命中配置里的 `files` glob，所以 `lintText` 用的是不存在于磁盘的虚拟路径（已实测可行）。
每条禁令都同时写「拦住」与「放行」两面：只测拦住的话，规则放宽过头（把合法的 import 也拦了）照样全绿。

```ts
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const eslint = new ESLint({ cwd: fileURLToPath(new URL('../..', import.meta.url)) })

const GUARDED_RULES = new Set(['no-restricted-imports', 'no-restricted-globals', 'ts/no-explicit-any'])

async function guardMessages(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return result!.messages
    .filter(m => m.ruleId !== null && GUARDED_RULES.has(m.ruleId))
    .map(m => `${m.ruleId}: ${m.message}`)
}

// 首次 lintText 要加载全部插件，单独给足时间，免得第一条用例超时
beforeAll(async () => {
  await eslint.calculateConfigForFile('src/index.ts')
}, 60_000)

type Violation = [filePath: string, code: string, rule: string, reason: string]
type Allowed = [filePath: string, code: string]

async function expectBlocked(...[filePath, code, rule, reason]: Violation): Promise<void> {
  const messages = await guardMessages(filePath, code)
  expect(messages).toHaveLength(1)
  expect(messages[0]).toContain(`${rule}: `)
  expect(messages[0]).toContain(reason)
}

async function expectAllowed(...[filePath, code]: Allowed): Promise<void> {
  expect(await guardMessages(filePath, code)).toEqual([])
}

const LAYER = '纯计算层不得 import 其他层'
const FRAMEWORK = '内核不得 import 任何框架'
const SELF = '内核内部不得经由包名引用自己'
const DOM = '纯计算层零 DOM'
const OGL = 'runtime/ 不碰 ogl'
const RUNTIME_DOWN = 'runtime/ 只能向下依赖 compute/'
const SIBLING = '特效之间不得互相 import'
const EFFECT_DOWN = '特效只能向下依赖 runtime/ 与 compute/'
const SHELL = '壳只能经由公开入口'
const INDEX_NO_SHELL = '公开入口 . 不得引用 Vue 壳'

describe('compute/：不 import 其他层，不碰 DOM 全局', () => {
  const file = 'src/compute/approach.ts'
  it.each<Violation>([
    [file, `import '../runtime/loop'`, 'no-restricted-imports', LAYER],
    [file, `import '../effects/liquid-text'`, 'no-restricted-imports', LAYER],
    [file, `import '../vue'`, 'no-restricted-imports', LAYER],
    [file, `import '../index'`, 'no-restricted-imports', LAYER],
    [file, `import '..'`, 'no-restricted-imports', LAYER],
    [file, `export { x } from '../runtime/loop'`, 'no-restricted-imports', LAYER],
    [file, `import 'vue'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import '@huberyyang/todo-fx'`, 'no-restricted-imports', SELF],
    [file, `export const w = window.innerWidth`, 'no-restricted-globals', DOM],
    [file, `export const b = document.body`, 'no-restricted-globals', DOM],
    [file, `requestAnimationFrame(() => {})`, 'no-restricted-globals', DOM],
    [file, `cancelAnimationFrame(1)`, 'no-restricted-globals', DOM],
    [file, `export const ua = navigator.userAgent`, 'no-restricted-globals', DOM],
    [file, `export const s = getComputedStyle(globalThis as never)`, 'no-restricted-globals', DOM],
    [file, `export const m = matchMedia('(hover: none)')`, 'no-restricted-globals', DOM],
    [file, `export const o = new ResizeObserver(() => {})`, 'no-restricted-globals', DOM],
    [file, `export const g = self`, 'no-restricted-globals', 'Use `globalThis` instead.'],
  ])('%s 拦住 %s', expectBlocked)

  it.each<Allowed>([
    [file, `import { proximity } from './proximity'\nexport const p = proximity`],
    [file, `export const e = Math.exp(-1)`],
  ])('%s 放行 %s', expectAllowed)
})

describe('runtime/：不碰框架，不碰 ogl，只向下依赖 compute/', () => {
  const file = 'src/runtime/loop.ts'
  it.each<Violation>([
    [file, `import 'vue'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import type { Ref } from 'vue'\nexport type R = Ref`, 'no-restricted-imports', FRAMEWORK],
    [file, `import 'vue/server-renderer'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import '@vue/reactivity'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import 'react'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import 'react-dom/client'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import 'ogl'`, 'no-restricted-imports', OGL],
    [file, `import 'ogl/src/core/Renderer.js'`, 'no-restricted-imports', OGL],
    [file, `import '../effects/liquid-text'`, 'no-restricted-imports', RUNTIME_DOWN],
    [file, `import '../vue'`, 'no-restricted-imports', RUNTIME_DOWN],
    [file, `import '../index'`, 'no-restricted-imports', RUNTIME_DOWN],
    [file, `import '..'`, 'no-restricted-imports', RUNTIME_DOWN],
    [file, `import '@huberyyang/todo-fx'`, 'no-restricted-imports', SELF],
  ])('%s 拦住 %s', expectBlocked)

  it.each<Allowed>([
    [file, `import '../compute/approach'`],
    [file, `import './gate'`],
    [file, `export const w = window.innerWidth`],
  ])('%s 放行 %s', expectAllowed)
})

describe('effects/<name>/：不碰框架，特效之间不互相 import', () => {
  const file = 'src/effects/particle-text/index.ts'
  it.each<Violation>([
    [file, `import '../liquid-text'`, 'no-restricted-imports', SIBLING],
    [file, `import '../liquid-text/params'`, 'no-restricted-imports', SIBLING],
    [file, `import '..'`, 'no-restricted-imports', SIBLING],
    [file, `export * from '../liquid-text'`, 'no-restricted-imports', SIBLING],
    ['src/effects/new-effect/index.ts', `import '../particle-text'`, 'no-restricted-imports', SIBLING],
    [file, `import '../../effects/liquid-text'`, 'no-restricted-imports', EFFECT_DOWN],
    [file, `import '../../vue'`, 'no-restricted-imports', EFFECT_DOWN],
    [file, `import '../../index'`, 'no-restricted-imports', EFFECT_DOWN],
    [file, `import '../..'`, 'no-restricted-imports', EFFECT_DOWN],
    [file, `import 'vue'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import type { Ref } from 'vue'\nexport type R = Ref`, 'no-restricted-imports', FRAMEWORK],
    [file, `import '@vue/runtime-core'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import 'react'`, 'no-restricted-imports', FRAMEWORK],
    [file, `import '@huberyyang/todo-fx'`, 'no-restricted-imports', SELF],
  ])('%s 拦住 %s', expectBlocked)

  it.each<Allowed>([
    ['src/effects/liquid-text/index.ts', `import { Renderer } from 'ogl'\nexport const r = Renderer`],
    [file, `import './params'`],
    [file, `import '../../runtime/loop'`],
    [file, `import '../../compute/particles'`],
  ])('%s 放行 %s', expectAllowed)
})

describe('index.ts：公开入口 . 不碰框架，不引用壳', () => {
  const file = 'src/index.ts'
  it.each<Violation>([
    [file, `import 'vue'`, 'no-restricted-imports', FRAMEWORK],
    [file, `export { LiquidText } from './vue'`, 'no-restricted-imports', INDEX_NO_SHELL],
    [file, `export * from './vue/index'`, 'no-restricted-imports', INDEX_NO_SHELL],
    [file, `export * from '@huberyyang/todo-fx/vue'`, 'no-restricted-imports', SELF],
  ])('%s 拦住 %s', expectBlocked)

  it.each<Allowed>([
    [file, `export { createLiquidText } from './effects/liquid-text'`],
    [file, `export type { FxInstance } from './runtime/define-effect'`],
  ])('%s 放行 %s', expectAllowed)
})

describe('vue/：只能 import 公开入口', () => {
  const file = 'src/vue/define-component.ts'
  it.each<Violation>([
    [file, `import '../runtime/loop'`, 'no-restricted-imports', SHELL],
    [file, `import '../effects/liquid-text'`, 'no-restricted-imports', SHELL],
    [file, `import '../compute/params'`, 'no-restricted-imports', SHELL],
    [file, `import '..'`, 'no-restricted-imports', SHELL],
    ['src/vue/LiquidText.vue', `<script setup lang="ts">\nimport '../runtime/loop'\n</script>\n`, 'no-restricted-imports', SHELL],
  ])('%s 拦住 %s', expectBlocked)

  it.each<Allowed>([
    [file, `import { createLiquidText } from '../index'\nexport const c = createLiquidText`],
    [file, `import { h } from 'vue'\nexport const v = h`],
    [file, `import './index'`],
    [file, `import '@huberyyang/todo-fx'`],
  ])('%s 放行 %s', expectAllowed)
})

describe('规则只作用在 src 的对应目录上', () => {
  it.each<Allowed>([
    ['playground/main.ts', `import '../src/runtime/loop'`],
    ['test/any.test.ts', `import 'vue'`],
  ])('%s 放行 %s', expectAllowed)
})

describe('类型纪律：不写显式 any', () => {
  it.each<Violation>([
    ['src/compute/approach.ts', `export function f(v: any): number {\n  return v\n}`, 'ts/no-explicit-any', 'Unexpected any'],
    ['test/unit/x.test.ts', `export const v = 1 as any`, 'ts/no-explicit-any', 'Unexpected any'],
  ])('%s 拦住 %s', expectBlocked)
})
```

- [ ] **步骤 2：写 `vitest.config.ts`（只有 unit project）**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
    ],
  },
})
```

- [ ] **步骤 3：加脚本**

`package.json` 的 `scripts` 改为：

```json
{
  "lint": "eslint",
  "lint:fix": "eslint --fix",
  "typecheck": "vue-tsc --noEmit",
  "test": "vitest run",
  "test:unit": "vitest run --project unit"
}
```

- [ ] **步骤 4：跑测试，确认红**

Run: `pnpm test:unit`
Expected: FAIL。仓库里还没有 `eslint.config.ts`，ESLint 报找不到配置（或全部「拦住」用例失败）。

- [ ] **步骤 5：写 `eslint.config.ts`**

同一文件命中多个配置项时，后一项的规则选项**整体覆盖**前一项、不合并（实测：把 runtime 的 ogl 禁令拆成单独一项，另外 11 条守卫静默失效）。
所以每个目录只写一个配置项，把该目录的全部禁令拼进同一条 `no-restricted-imports`。
antfu 自己已对 `global`、`self` 开了 `no-restricted-globals`，compute 的覆盖必须把这两项带上。

```ts
import antfu, { parserPlain } from '@antfu/eslint-config'

// 依赖方向守卫（.docs/architecture.md 第八节）。同一文件命中多个配置项时，后一项的规则选项整体覆盖前一项、不合并，
// 所以每个目录只写一个配置项，把该目录的全部禁令拼进同一条 no-restricted-imports。
// 路径按目录深度写：compute/、runtime/ 是扁平目录，特效在 effects/<name>/ 下一层。
// 在更深的子目录里写 import 会被误报（响亮地红），届时改规则，不要放宽。

const noFramework = {
  regex: '^(?:vue|react|react-dom)(?:/|$)|^@vue/',
  message: '内核不得 import 任何框架，框架只能出现在 src/vue/ 壳里。',
}

const noOgl = {
  regex: '^ogl(?:/|$)',
  message: 'runtime/ 不碰 ogl，否则只用 particle-text 的消费方会被连带打包 ogl。',
}

const noSelfReference = {
  regex: '^@huberyyang/todo-fx(?:/|$)',
  message: '内核内部不得经由包名引用自己，那会绕过分层、把整个公开入口拉进来。',
}

const domGlobals = [
  'window',
  'document',
  'navigator',
  'location',
  'screen',
  'devicePixelRatio',
  'innerWidth',
  'innerHeight',
  'addEventListener',
  'removeEventListener',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'matchMedia',
  'ResizeObserver',
  'MutationObserver',
  'IntersectionObserver',
  'HTMLElement',
  'HTMLCanvasElement',
  'OffscreenCanvas',
  'Image',
  'CanvasRenderingContext2D',
  'WebGLRenderingContext',
  'WebGL2RenderingContext',
  'FontFace',
].map(name => ({ name, message: '纯计算层零 DOM：把需要的值作为参数传进来。' }))

export default antfu(
  {
    type: 'lib',
    vue: true,
    antislop: true,
    // md 代码块里的伪代码会被当成文件去解析，.docs 里的契约草图全是这种
    ignores: ['.docs/**'],
  },
  {
    // antfu README 说 antislop 会禁显式 any，9.5.1 实际没有开
    name: 'todo-fx/no-any',
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'ts/no-explicit-any': 'error',
    },
  },
  {
    name: 'todo-fx/boundaries/compute',
    files: ['src/compute/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?:/|$)', message: '纯计算层不得 import 其他层。' },
          noFramework,
          noSelfReference,
        ],
      }],
      'no-restricted-globals': [
        'error',
        { name: 'global', message: 'Use `globalThis` instead.' },
        { name: 'self', message: 'Use `globalThis` instead.' },
        ...domGlobals,
      ],
    },
  },
  {
    name: 'todo-fx/boundaries/runtime',
    files: ['src/runtime/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?:/(?!compute(?:/|$))|/?$)', message: 'runtime/ 只能向下依赖 compute/。' },
          noFramework,
          noOgl,
          noSelfReference,
        ],
      }],
    },
  },
  {
    name: 'todo-fx/boundaries/effects',
    files: ['src/effects/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?:/(?!\\.\\.(?:/|$))|/?$)', message: '特效之间不得互相 import，共享逻辑放进 runtime/ 或 compute/。' },
          { regex: '^\\.\\./\\.\\.(?:/?$|/(?!(?:runtime|compute)(?:/|$)))', message: '特效只能向下依赖 runtime/ 与 compute/。' },
          noFramework,
          noSelfReference,
        ],
      }],
    },
  },
  {
    name: 'todo-fx/boundaries/index',
    files: ['src/index.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\./vue(?:/|$)', message: '公开入口 . 不得引用 Vue 壳，壳走独立入口 ./vue。' },
          noFramework,
          noSelfReference,
        ],
      }],
    },
  },
  {
    name: 'todo-fx/boundaries/vue',
    files: ['src/vue/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?!/index$)(?:/|$)', message: '壳只能经由公开入口 \'../index\' 调用内核。' },
        ],
      }],
    },
  },
  {
    // antislop 挂在包括 html 在内的全部源文件上，antfu 却没给 html 配解析器，默认的 JS 解析器一读 html 就报错
    name: 'todo-fx/html',
    files: ['**/*.html'],
    languageOptions: { parser: parserPlain },
  },
  {
    // 这条规则针对英文 AI 腔，见到 U+2014 就报错，而中文破折号是正常标点。
    // files 不能省：antfu 会给没写 files 的用户配置项自动注入 ignores: ['**/*.md']，md 就放不开了
    name: 'todo-fx/chinese-dash',
    files: ['**/*'],
    rules: {
      'slop/no-em-dash': 'off',
    },
  },
)
```

- [ ] **步骤 6：写 `.vscode` 两个文件**

`.vscode/settings.json` 逐字照抄 @antfu/eslint-config 9.5.1 README 的「VS Code support」一节（与 todo-scripts、starter-ts 的旧版不同：没有 `eslint.useFlatConfig`，每项带 `"fixable": true`，validate 有 21 种语言）：

```jsonc
{
  // Disable the default formatter, use eslint instead
  "prettier.enable": false,
  "editor.formatOnSave": false,

  // Auto fix
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },

  // Silent the stylistic rules in your IDE, but still auto fix them
  "eslint.rules.customizations": [
    { "rule": "style/*", "severity": "off", "fixable": true },
    { "rule": "format/*", "severity": "off", "fixable": true },
    { "rule": "*-indent", "severity": "off", "fixable": true },
    { "rule": "*-spacing", "severity": "off", "fixable": true },
    { "rule": "*-spaces", "severity": "off", "fixable": true },
    { "rule": "*-order", "severity": "off", "fixable": true },
    { "rule": "*-dangle", "severity": "off", "fixable": true },
    { "rule": "*-newline", "severity": "off", "fixable": true },
    { "rule": "*quotes", "severity": "off", "fixable": true },
    { "rule": "*semi", "severity": "off", "fixable": true }
  ],

  // Enable eslint for all supported languages
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue",
    "html",
    "markdown",
    "json",
    "jsonc",
    "yaml",
    "toml",
    "xml",
    "gql",
    "graphql",
    "astro",
    "svelte",
    "css",
    "less",
    "scss",
    "pcss",
    "postcss"
  ]
}
```

`.vscode/extensions.json`（README 只要求这一个扩展）：

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint"
  ]
}
```

- [ ] **步骤 7：修正键顺序，全仓库 lint 通过**

Run: `pnpm lint:fix && pnpm lint; echo exit=$?`
Expected: `exit=0`。`lint:fix` 可能改动 `package.json` / `tsconfig.json` 的键顺序，`git diff` 里只应有键顺序变化。

- [ ] **步骤 8：跑测试，确认绿**

Run: `pnpm test:unit`
Expected: PASS，72 条用例全绿（约 2～3 秒）。

- [ ] **步骤 9：守卫自证（变异）**

按「执行须知」的标准动作，逐条改坏 `eslint.config.ts`，每次都跑 `node_modules/.bin/vitest run --project unit`，都必须红；还原后必须绿。

| 变异 | 预期变红的用例 |
| :--- | :--- |
| 删掉 compute 项的 `{ regex: '^\\.\\.(?:/|$)' … }` | compute 的 6 条 LAYER |
| 删掉 compute 项 `no-restricted-globals` 里的 `...domGlobals` | compute 的 8 条 DOM |
| 删掉 compute 项里带上的 `self` | `export const g = self` |
| 删掉 runtime 项的 `noOgl` | runtime 的 2 条 OGL |
| 删掉 runtime 项的 `noFramework` | runtime 的 6 条 FRAMEWORK |
| 把 runtime 项的 `noOgl` 拆成一个单独的 `files: ['src/runtime/**']` 配置项 | runtime 除 OGL 外的全部拦截用例（证明「后者覆盖前者」） |
| 删掉 effects 项的 SIBLING 正则 | effects 的 5 条 SIBLING |
| 把 effects 项的 `files` 改成 `['src/effect/**']` | effects 的全部拦截用例（glob 打错的现场） |
| 删掉 index 项 | index 的 4 条拦截用例 |
| 把 vue 项的正则改成 `'^\\.\\.(?:/|$)'`（不再放行 `../index`） | vue 的放行用例 `import { createLiquidText } from '../index'` |
| 删掉 `todo-fx/no-any` 配置项 | 「类型纪律」的 2 条 |

再做一次「缺陷现场」：把 `import 'ogl'` 写进一个真实文件 `src/runtime/probe.ts`，`pnpm lint` 必须报 `runtime/ 不碰 ogl`，删掉文件后 `pnpm lint` 回到 `exit=0`。

- [ ] **步骤 10：提交**

走 `/commit`，建议信息：`chore: 接入 ESLint 并用单测守住依赖方向规则`。勾掉 [`todo.md`](../todo.md) 的「lint」一项。

---

### 任务 3：提交钩子

**文件：**
- 新建（由工具生成）：`commitlint.config.ts`、`lint-staged.config.mjs`、`.husky/pre-commit`、`.husky/commit-msg`
- 修改（由工具改）：`package.json`（`scripts.prepare = "husky"`、`scripts.commitlint`，devDependencies 加 4 个包）、`pnpm-lock.yaml`

**接口：**
- 消费：任务 2 的 `eslint`（lint-staged 调用它）
- 产出：每次提交自动跑 `eslint --fix`（暂存文件）与 commitlint

- [ ] **步骤 1：跑 commitlint-init**

用 `dlx` 跑，todo-scripts 不会留在 devDependencies 里（与 README 流程加 `--clear` 的产物逐字节相同，已实测）。

Run: `pnpm dlx --package=@huberyyang/todo-scripts@1.4.2 hubery commitlint-init --linter eslint`
Expected: exit 0；装上 `@commitlint/cli`、`@commitlint/config-conventional`（21.2.3）、`husky`（9.1.7）、`lint-staged`（17.5.1）；
生成 `commitlint.config.ts`（因为有 tsconfig）、`lint-staged.config.mjs`（内容为 `'*': 'eslint --fix --no-error-on-unmatched-pattern'`，不带 `.`）、
两个钩子文件；`git config core.hooksPath` 输出 `.husky/_`。

- [ ] **步骤 2：lint 通过**

Run: `pnpm lint:fix && pnpm lint; echo exit=$?`
Expected: `exit=0`

- [ ] **步骤 3：确认钩子真的在拦（重点审查第 5 条）**

Run: `git commit --allow-empty -m "bad message"; echo exit=$?`
Expected: 被 commit-msg 拦下，输出含 `subject may not be empty` 与 `type may not be empty`，`husky - commit-msg script failed (code 1)`，`exit=1`；`git log -1` 仍是上一个提交。

- [ ] **步骤 4：提交**

走 `/commit`，建议信息：`chore: 接入 husky、lint-staged 与 commitlint`。提交过程本身会跑一次 pre-commit（lint-staged）与 commit-msg，确认两者都执行了。
勾掉 [`todo.md`](../todo.md) 的「提交钩子」一项。

---

### 任务 4：构建与产物校验

**文件：**
- 新建：`tsdown.config.ts`
- 修改：`package.json`（加脚本 `build`、`dev`；构建后 tsdown 写入 `exports`）

**接口：**
- 消费：任务 1 的两个入口
- 产出：`pnpm build` → `dist/{index,vue}.{js,d.ts}`；package.json 的 `exports` 为
  `{ ".": "./dist/index.js", "./vue": "./dist/vue.js", "./package.json": "./package.json" }`（纯字符串，不带 `types` 条件，类型靠同名 `.d.ts`）

- [ ] **步骤 1：写 `tsdown.config.ts`**

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    vue: 'src/vue/index.ts',
  },
  // 不写就靠自动探测，而 exports 生成的映射不带 types 条件，探测结果是 false
  dts: true,
  exports: true,
  target: 'es2020',
  platform: 'neutral',
  publint: true,
  attw: {
    profile: 'esm-only',
    // 默认 warn：类型有问题也照常构建成功
    level: 'error',
  },
  // publint 的 warning 级问题、import 了没装的包，默认都只报警告、照常产出
  failOnWarn: true,
  // 依赖一旦被打进 dist 就报错：ogl 误挪进 devDependencies 时，默认只有一条 info 级提示
  deps: {
    onlyBundle: [],
  },
})
```

- [ ] **步骤 2：加脚本**

`package.json` 的 `scripts` 加：

```json
{
  "build": "tsdown",
  "dev": "tsdown --watch"
}
```

- [ ] **步骤 3：构建**

Run: `pnpm build; echo exit=$?`
Expected: `exit=0`；输出含 `dist/index.js`、`dist/vue.js`、`dist/index.d.ts`、`dist/vue.d.ts`，`✔ [attw] No problems found`，`✔ [publint] No issues found`。
骨架期两个 `.js` 是 0 字节、`.d.ts` 内容是 `export {}`，这是预期的。

- [ ] **步骤 4：把 tsdown 追加的 `exports` 排到 antfu 规定的位置，并确认再构建不改文件**

tsdown 第一次写入时把 `exports` 追加在 package.json 末尾，antfu 的 `jsonc/sort-keys` 会报错；排好之后 tsdown 会保留位置。

```bash
pnpm lint:fix
cp package.json "$TMPDIR/fx-pkg" && pnpm build && cmp package.json "$TMPDIR/fx-pkg" && echo 再构建不改文件
```

Expected: 打印 `再构建不改文件`；`package.json` 里 `exports` 位于 `sideEffects` 之后、`files` 之前，没有 `main` / `module` / `types`。

- [ ] **步骤 5：发布清单**

Run: `npm publish --dry-run 2>&1 | grep -E 'npm notice [0-9.]+[kKM]?B|total files|access'`
Expected: 恰好 7 个文件：`LICENSE`、`README.md`、`package.json`、`dist/index.d.ts`、`dist/index.js`、`dist/vue.d.ts`、`dist/vue.js`；`total files: 7`；含 `public access`。

- [ ] **步骤 6：守卫自证（证实 tech-stack 第十二节「attw 与 publint 的问题能让构建失败」）**

按「执行须知」的标准动作，**同时备份 `tsdown.config.ts` 与 `package.json`**，逐个变异，每次直接跑 `node_modules/.bin/tsdown; echo exit=$?`，还原后 `git status --short` 必须干净。

| 变异 | 预期 |
| :--- | :--- |
| M1 `exports: true` 改成 `exports: { customExports: { './broken': './dist/nope.js' } }` | `ERROR [publint] pkg.exports["./broken"] is ./dist/nope.js but the file does not exist.`，`exit=1` |
| M2 改成 `exports: { customExports: { './glob/*': './dist/nothing/*.js' } }` | publint 只报 warning（`does not match any files`），靠 `failOnWarn` 变成 `exit=1` |
| M2 对照：在 M2 的基础上再删掉 `failOnWarn: true` | `exit=0` —— 证明 `failOnWarn` 是承重的，不是冗余 |
| M3 package.json 的 `files` 改成 `["lib"]` | publint 与 attw 同报文件不存在 / `Package has no types`，`exit=1`（两者检查的是 `pnpm pack` 打出的 tarball，不是磁盘目录） |
| M4 删掉 `dts: true` | `ERROR [attw] Package has no types`，`exit=1` |
| M5 `src/index.ts` 首行加 `import 'not-installed-pkg'` | `[UNRESOLVED_IMPORT] Could not resolve 'not-installed-pkg'`，`exit=1` |
| M6 `src/index.ts` 改成 `export { Vec3 } from 'ogl'`，**同时**把 package.json 的 ogl 从 `dependencies` 挪到 `devDependencies` | `ogl is located in node_modules but is not included in deps.onlyBundle option`，`exit=1` |
| M6 对照：只改 `src/index.ts`、ogl 留在 `dependencies` | `exit=0`，`dist/index.js` 里是 `from "ogl"`（external） |

M6 改了依赖声明，还原后再加一步：`git diff --exit-code pnpm-lock.yaml`（直接调 `node_modules/.bin/tsdown` 不会触发自动 install，锁文件必须没动）。

- [ ] **步骤 7：类型检查与 lint 仍然通过**

Run: `pnpm typecheck && pnpm lint; echo exit=$?`
Expected: `exit=0`

- [ ] **步骤 8：提交**

走 `/commit`，建议信息：`build: 接入 tsdown，并让 publint 与 attw 的问题直接中断构建`。勾掉 [`todo.md`](../todo.md) 的「构建」一项。

---

### 任务 5：浏览器测试环境与三内核探针

**文件：**
- 新建：`test/browser/commands.ts`、`test/browser/vitest-browser.d.ts`、`test/browser/setup.ts`、`test/browser/env-probe.browser.test.ts`、
  `test/browser/emulation.browser.test.ts`、`test/browser/hover.browser.test.ts`、`test/browser/hover.touch.test.ts`
- 修改：`vitest.config.ts`（加 `browser` project）、`package.json`（加脚本 `test:browser`）

**接口：**
- 消费：任务 2 的 `vitest.config.ts`
- 产出：`browser` project，6 个 instance：`browser (chromium)`、`browser (firefox)`、`browser (webkit)` 收 `test/browser/**/*.browser.test.ts`；
  `chromium-touch`、`firefox-touch`、`webkit-touch`（`contextOptions.hasTouch`）只收 `test/browser/**/*.touch.test.ts`。
  `--project browser` 会跑全部 6 个，`--project 'browser (chromium)'` 只跑一个（已实测）。
- 产出：浏览器端可调用的 `commands.emulateMedia(options)`、`commands.topMatchMedia(query)`（`import { commands } from 'vitest/browser'`），
  以及「每条用例后自动撤掉媒体仿真」的约定 —— 阶段 1 的门控测试直接用。

- [ ] **步骤 1：装浏览器**

Run: `pnpm exec playwright install chromium firefox webkit`
Expected: 装上 Chrome for Testing / Headless Shell 153.0.8010.12、Firefox 155.0、WebKit 26.6（体积约 1.2 GB，耗时可能很长）。

- [ ] **步骤 2：写 command 与类型扩充**

`test/browser/commands.ts`（运行在 Node 端）：

```ts
// ctx.page 的类型来自这个包对 vitest/node 的模块扩充；类型检查的程序里不一定有 vitest.config.ts，所以这里显式引一次
import type {} from '@vitest/browser-playwright'
import type { Page } from 'playwright'
import type { BrowserCommand } from 'vitest/node'

type EmulateMediaOptions = NonNullable<Parameters<Page['emulateMedia']>[0]>

/** ctx.page 是外层编排页；仿真作用在整个 page 上，测试 iframe 同样生效（三内核实测） */
export const emulateMedia: BrowserCommand<[options: EmulateMediaOptions]> = async (ctx, options) => {
  await ctx.page.emulateMedia(options)
}

/** 对照：在外层编排页读 matchMedia，证明仿真确实落在了 page 上 */
export const topMatchMedia: BrowserCommand<[query: string], boolean> = async (ctx, query) => {
  return ctx.page.evaluate(q => window.matchMedia(q).matches, query)
}
```

`test/browser/vitest-browser.d.ts`（浏览器端签名从 `commands.ts` 推导，只维护一份）：

```ts
import type { BrowserCommand } from 'vitest/node'
import type * as commands from './commands'

type ToBrowserCommand<T> = T extends BrowserCommand<infer Payload, infer Return>
  ? (...payload: Payload) => Promise<Awaited<Return>>
  : never

type CustomCommands = { [K in keyof typeof commands]: ToBrowserCommand<(typeof commands)[K]> }

declare module 'vitest/browser' {
  interface BrowserCommands extends CustomCommands {}
}
```

`test/browser/setup.ts`：

```ts
import { afterEach } from 'vitest'
import { commands } from 'vitest/browser'

// 仿真挂在 page 上，同一 page 里后面的用例和测试文件会原样继承（三内核实测）
afterEach(async () => {
  await commands.emulateMedia({ reducedMotion: null, forcedColors: null })
})
```

- [ ] **步骤 3：写探针测试（先于配置写，此时跑不起来）**

`test/browser/env-probe.browser.test.ts`。精确像素只能用 k/255 能整除的颜色：0.7 这类值在 SwiftShader 上取整成 179、在 GPU 上是 178，会出现只在 CI 变红的情况。

```ts
import { describe, expect, it } from 'vitest'

// 已知结果探针：清成已知颜色后读回精确像素。不通过就说明这个浏览器里 WebGL / Canvas 2D 不可用，
// 之后的内核测试会全部走进「不支持」分支：全绿，但什么都没测
const EXPECTED = [51, 102, 153, 255]

function rendererOf(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return ext
    ? `UNMASKED_RENDERER=${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}`
    : `RENDERER=${gl.getParameter(gl.RENDERER)}`
}

describe('已知结果探针', () => {
  // 用 it.for 而不是 it.each：只有前者把测试上下文（annotate）作为第二个参数传进来
  it.for(['webgl2', 'webgl'] as const)('%s：清屏成已知颜色后 readPixels 读回精确值', async (type, { annotate }) => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    // 分两个字面量调用：传联合类型时 TS 只能选到返回 RenderingContext 的通用重载
    const gl = type === 'webgl2' ? canvas.getContext('webgl2') : canvas.getContext('webgl')
    expect(gl, `${type} 上下文创建失败`).not.toBeNull()
    gl!.clearColor(0.2, 0.4, 0.6, 1)
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    const pixel = new Uint8Array(4)
    gl!.readPixels(0, 0, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, pixel)
    // CI 的 GitHub Actions 报告器会把它输出成 ::notice，三个内核各自的渲染器一眼可见
    await annotate(`${type} ${rendererOf(gl!)} pixel=${Array.from(pixel)}`)
    expect(Array.from(pixel)).toEqual(EXPECTED)
  })

  it('2d：fillRect 后 getImageData 读回精确值', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    expect(ctx, '2d 上下文创建失败').not.toBeNull()
    ctx!.fillStyle = 'rgb(51 102 153)'
    ctx!.fillRect(0, 0, 4, 4)
    expect(Array.from(ctx!.getImageData(1, 1, 1, 1).data)).toEqual(EXPECTED)
  })
})
```

`test/browser/emulation.browser.test.ts`。状态一律用**新建的** `matchMedia(query)` 读：Chromium 里在 change 事件派发前读被监听那个对象的 `.matches`，
forced-colors 的 change 事件会被吞掉（实测 5 次里 4 次失败）。最后一对用例守的是 `setup.ts` 的复位（重点审查第 4 条）。

```ts
import { describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

function watch(query: string): boolean[] {
  const events: boolean[] = []
  window.matchMedia(query).addEventListener('change', e => events.push(e.matches))
  return events
}

const matches = (query: string): boolean => window.matchMedia(query).matches

describe('媒体仿真作用到测试 iframe', () => {
  it('测试确实跑在 iframe 里', () => {
    expect(window.self).not.toBe(window.top)
  })

  it('reduced-motion：进、出各一次', async () => {
    const query = '(prefers-reduced-motion: reduce)'
    const events = watch(query)
    expect(matches(query)).toBe(false)

    await commands.emulateMedia({ reducedMotion: 'reduce' })
    expect(await commands.topMatchMedia(query)).toBe(true)
    await expect.poll(() => matches(query)).toBe(true)
    await expect.poll(() => events).toEqual([true])

    await commands.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(() => matches(query)).toBe(false)
    await expect.poll(() => events).toEqual([true, false])
  })

  it('forced-colors：进、出各一次', async () => {
    const query = '(forced-colors: active)'
    const events = watch(query)
    expect(matches(query)).toBe(false)

    await commands.emulateMedia({ forcedColors: 'active' })
    expect(await commands.topMatchMedia(query)).toBe(true)
    await expect.poll(() => matches(query)).toBe(true)
    await expect.poll(() => events).toEqual([true])

    await commands.emulateMedia({ forcedColors: 'none' })
    await expect.poll(() => matches(query)).toBe(false)
    await expect.poll(() => events).toEqual([true, false])
  })
})

describe('仿真不跨用例残留', () => {
  it('这一条打开仿真后不撤', async () => {
    await commands.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => matches('(prefers-reduced-motion: reduce)')).toBe(true)
  })

  it('下一条开始时已被 setup 复位', () => {
    expect(matches('(prefers-reduced-motion: reduce)')).toBe(false)
  })
})
```

`test/browser/hover.browser.test.ts`（对照组：没有它，touch instance 上的 `hover: none` 说明不了任何事）：

```ts
import { expect, it } from 'vitest'

it('默认 instance 上 (hover: hover) 为 true', () => {
  expect(window.matchMedia('(hover: hover)').matches).toBe(true)
  expect(window.matchMedia('(hover: none)').matches).toBe(false)
})
```

`test/browser/hover.touch.test.ts`（文件名不匹配 `*.browser.test.ts`，所以只有 touch instance 收它）：

```ts
import { expect, it } from 'vitest'

it('hasTouch 的 instance 上 (hover: none) 为 true', () => {
  expect(window.matchMedia('(hover: none)').matches).toBe(true)
  expect(window.matchMedia('(pointer: coarse)').matches).toBe(true)
})
```

- [ ] **步骤 4：写 `browser` project**

`vitest.config.ts` 整体改为：

```ts
import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import * as commands from './test/browser/commands.ts'

// Playwright 1.63 启动 Chromium 时已默认追加这个开关；显式写上，不把 CI 里 WebGL 能否创建押在上游默认值上
const chromiumArgs = ['--enable-unsafe-swiftshader']

// Linux 上 headless Firefox 建不出 WebGL（Mozilla bug 1375585），CI 里改 headed，由 xvfb-run 提供 display；
// 本地 macOS 的 headless Firefox 能建 WebGL，不必每次弹窗
const firefoxHeadless = !process.env.CI

// hover: none 只能靠 contextOptions.hasTouch 仿真，contextOptions 又只能按 instance 配，
// 所以每个内核多一个只跑 *.touch.test.ts 的 instance。instance 级的 provider 整体覆盖父级、不合并，选项要写全
const touchInclude = ['test/browser/**/*.touch.test.ts']

export default defineConfig({
  plugins: [vue()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.browser.test.ts'],
          setupFiles: ['test/browser/setup.ts'],
          browser: {
            enabled: true,
            // 默认值取 process.env.CI，本地会弹出 6 个浏览器窗口；调试时用 --browser.headless=false 覆盖
            headless: true,
            provider: playwright(),
            commands,
            instances: [
              { browser: 'chromium', provider: playwright({ launchOptions: { args: chromiumArgs } }) },
              { browser: 'firefox', headless: firefoxHeadless },
              { browser: 'webkit' },
              {
                browser: 'chromium',
                name: 'chromium-touch',
                include: touchInclude,
                provider: playwright({ launchOptions: { args: chromiumArgs }, contextOptions: { hasTouch: true } }),
              },
              {
                browser: 'firefox',
                name: 'firefox-touch',
                include: touchInclude,
                provider: playwright({ contextOptions: { hasTouch: true } }),
              },
              {
                browser: 'webkit',
                name: 'webkit-touch',
                include: touchInclude,
                provider: playwright({ contextOptions: { hasTouch: true } }),
              },
            ],
          },
        },
      },
    ],
  },
})
```

`package.json` 的 `scripts` 加 `"test:browser": "vitest run --project browser"`。

- [ ] **步骤 5：跑起来，确认全绿并留下证据**

（在 Claude Code 沙箱里先按「执行须知」设 `MOZ_APP_DATA` / `MOZ_LOCAL_APP_DATA`。）

Run: `pnpm test:browser --reporter=verbose`
Expected: PASS，共 30 条：三个默认 instance 各 9 条（探针 3、媒体仿真 5、hover 对照 1），三个 touch instance 各 1 条。
本机 Chromium 的渲染器是 SwiftShader，Firefox / WebKit 走本机 GPU。
每次运行都有一条无害警告 `Plugin "vitest:mocks:interceptor" defines Vite-specific hooks`（上游 Vite 8.3 与 @vitest/mocker 5.0.1 的兼容提示）。

- [ ] **步骤 6：守卫自证（变异）**

每次变异后跑 `node_modules/.bin/vitest run --project browser`（或括号里指定的 instance），必须按预期变红；还原后回绿。

| 变异 | 预期 |
| :--- | :--- |
| 探针里 `clearColor(0.2, …)` 改成 `clearColor(0.7, …)` | 三内核 webgl2 / webgl 共 6 条红 |
| Chromium 的 `chromiumArgs` 加 `'--disable-webgl'`（`--project 'browser (chromium)'`） | webgl2 / webgl 两条红（`上下文创建失败`），2d 仍绿 —— 负对照，证明探针不是瞎的 |
| `emulateMedia` command 的函数体换成 `void ctx; void options` | 三内核各 3 条、共 9 条红：reduced-motion、forced-colors，以及「这一条打开仿真后不撤」 |
| 删掉 `setup.ts` 里的 `afterEach` | 三内核「下一条开始时已被 setup 复位」共 3 条红 |
| 三个 touch instance 的 `hasTouch: true` 都改成 `false` | 3 条 touch 用例红 |
| 删掉 `vitest-browser.d.ts` 后跑 `pnpm typecheck` | `Property 'emulateMedia' does not exist on type 'BrowserCommands'`（TS2339） |

- [ ] **步骤 7：类型检查与 lint 通过**

Run: `pnpm typecheck && pnpm lint; echo exit=$?`
Expected: `exit=0`

- [ ] **步骤 8：提交**

走 `/commit`，建议信息：`test: 接入 Vitest 浏览器模式，用已知结果探针证明三内核环境可信`。

---

### 任务 6：dist project（公开 API 快照与 ogl 产物断言的判据）

**文件：**
- 新建：`test/artifact/global-setup.ts`、`test/artifact/api.test.ts`、`test/artifact/no-ogl.test.ts`、
  `test/artifact/fixtures/ogl-probe/{package.json,index.js,plain.js,with-ogl.js}`、
  `test/artifact/__snapshots__/tsnapi/@huberyyang/todo-fx/{index,vue}.snapshot.{js,d.ts}`（由测试生成）
- 修改：`vitest.config.ts`（加 `dist` project）、`package.json`（加脚本 `test:dist`）

**接口：**
- 消费：任务 4 的 tsdown 构建
- 产出：`dist` project（node 环境，收 `test/artifact/**/*.test.ts`，`globalSetup` 先用 tsdown CLI 构建）；
  `no-ogl.test.ts` 里的 `bundle(root, specifier, name)` 与 `OGL_REGION` 判据 —— 阶段 1 加对照、阶段 3 加主断言时，把 `root` 换成仓库根、`specifier` 换成真实入口

目录叫 `test/artifact/` 而不是 `test/dist/`：antfu 默认忽略 `**/dist`，后者会整个目录静默跳过 lint。

- [ ] **步骤 1：写 globalSetup**

`test/artifact/global-setup.ts`。必须走 CLI：tsdown 的 JS API `build()` 遇到 attw / publint 报错时不抛错，只把 `process.exitCode` 置 1，测试汇总照样全绿。
watch 模式下重跑不会再执行 setup，要靠 `onTestsRerun` 重建，否则拿旧产物断言。

```ts
import type { TestProject } from 'vitest/node'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))

// 走 CLI 而不是 tsdown 的 build()：attw / publint 报错时 build() 不抛错，只把 process.exitCode 置 1，测试照样全绿
function buildDist(): void {
  execFileSync('node_modules/.bin/tsdown', { cwd: root, stdio: 'inherit' })
}

export function setup(project: TestProject): void {
  buildDist()
  // watch 模式重跑时不会再执行 setup；这个回调对所有 project 的重跑都触发，只在轮到本 project 时重建
  project.onTestsRerun((specs) => {
    if (specs.some(spec => spec.project === project))
      buildDist()
  })
}
```

- [ ] **步骤 2：写公开 API 快照测试**

`test/artifact/api.test.ts`（starter-ts 的写法，去掉 tsdown-stale-guard，由 globalSetup 先构建代替）：

```ts
import { fileURLToPath } from 'node:url'
import { snapshotApiPerEntry } from 'tsnapi/vitest'
import { describe } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))

describe('公开 API 快照', () => {
  snapshotApiPerEntry(root)
})
```

- [ ] **步骤 3：写 ogl 探针包**

阶段 0 还没有特效。先用一个两导出的探针包证明判据本身可信：看得见 ogl（对照），也看得出 ogl 被摇掉（主断言）。
ogl 从仓库根的 `node_modules` 解析（它是本包的 dependency）；Vite 支持包名自引用，把 `root` 设为探针包目录即可解析 `ogl-probe`。

`test/artifact/fixtures/ogl-probe/package.json`：

```json
{
  "name": "ogl-probe",
  "type": "module",
  "private": true,
  "sideEffects": false,
  "exports": {
    ".": "./index.js"
  }
}
```

`test/artifact/fixtures/ogl-probe/index.js`：

```js
export { plain } from './plain.js'
export { withOgl } from './with-ogl.js'
```

`test/artifact/fixtures/ogl-probe/plain.js`：

```js
export function plain() {
  return 'plain'
}
```

`test/artifact/fixtures/ogl-probe/with-ogl.js`：

```js
import { Vec3 } from 'ogl'

export function withOgl() {
  return new Vec3(1, 2, 3)
}
```

- [ ] **步骤 4：写 ogl 产物断言**

`test/artifact/no-ogl.test.ts`：

```ts
import type { Plugin, Rolldown } from 'vite'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

const ENTRY = 'virtual:consumer-entry'

function consumerEntry(code: string): Plugin {
  return {
    name: 'consumer-entry',
    resolveId: id => (id === ENTRY ? `\0${ENTRY}` : null),
    load: id => (id === `\0${ENTRY}` ? code : null),
  }
}

// 以消费方的身份打包一个只 import 了 name 的入口，返回不压缩的最终产物。
// 不压缩时每个打进产物的模块都带一行 `//#region <模块路径>`，被死代码消除删掉的模块连同注释一起消失。
// 不用 chunk.moduleIds：它是死代码消除之前的清单，会把最终被摇掉的 ogl 也列进来；
// 也不在压缩产物里搜 'ogl'：压缩后路径与标识符都没了，ogl 在里面也搜不到
async function bundle(root: string, specifier: string, name: string): Promise<string> {
  const out = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [consumerEntry(`import { ${name} } from '${specifier}'\nconsole.log(${name})`)],
    build: { write: false, minify: false, rolldownOptions: { input: ENTRY } },
  }) as Rolldown.RolldownOutput
  return out.output.map(o => (o.type === 'chunk' ? o.code : '')).join('\n')
}

const OGL_REGION = /^\/\/#region (?:.*\/)?node_modules\/ogl\//m

describe('ogl 产物断言的判据（探针包）', () => {
  const root = fileURLToPath(new URL('./fixtures/ogl-probe', import.meta.url))

  // 对照：证明判据看得见 ogl。判据一旦失明（注释格式变了、正则写错），下一条会假绿，只有这一条会红
  it('对照：import withOgl 的打包结果里有 ogl', async () => {
    expect(await bundle(root, 'ogl-probe', 'withOgl')).toMatch(OGL_REGION)
  })

  it('只 import plain 的打包结果里没有 ogl', async () => {
    const code = await bundle(root, 'ogl-probe', 'plain')
    // 先确认确实解析到了探针包，而不是空打包。region 路径相对的是进程 cwd（仓库根），不是 Vite 的 root
    expect(code).toMatch(/^\/\/#region (?:.*\/)?ogl-probe\/plain\.js$/m)
    expect(code).not.toMatch(OGL_REGION)
  })
})
```

- [ ] **步骤 5：加 `dist` project 与脚本**

`vitest.config.ts` 的 `projects` 数组末尾追加：

```ts
      {
        extends: true,
        test: {
          name: 'dist',
          environment: 'node',
          include: ['test/artifact/**/*.test.ts'],
          globalSetup: ['test/artifact/global-setup.ts'],
        },
      },
```

`package.json` 的 `scripts` 加 `"test:dist": "vitest run --project dist"`。

- [ ] **步骤 6：首次运行，生成快照**

Run: `pnpm test:dist`
Expected: 先打印 tsdown 的 `✔ Build complete`；`Snapshots 4 written`；6 条通过（`runtime: .`、`dts: .`、`runtime: ./vue`、`dts: ./vue`、两条 ogl 判据）。
4 个快照文件内容都是 `/* no exports */`。

- [ ] **步骤 7：确认快照会进仓库（重点审查第 3 条）**

Run: `git status --porcelain --untracked-files=all test/artifact/__snapshots__ | wc -l; git check-ignore -q test/artifact/__snapshots__/tsnapi/@huberyyang/todo-fx/index.snapshot.js; echo ignored=$?`
Expected: `4`（4 个快照都是待提交的新文件），`ignored=1`（没有被忽略）。

- [ ] **步骤 8：守卫自证（证实 tech-stack 第十二节的两条假设）**

每次变异后跑 `node_modules/.bin/vitest run --project dist`（globalSetup 会重新构建），按预期变红，还原后回绿。

| 变异 | 预期 |
| :--- | :--- |
| `src/index.ts` 改成 `export const extra = 1` | `runtime: .` 与 `dts: .` 两条红，diff 分别是 `+ export var extra /* const */` 与 `+ export declare const extra: number;` |
| 把 `test/artifact/__snapshots__` 整个挪走，`CI=true node_modules/.bin/vitest run --project dist` | 4 条 `Snapshot … mismatched`，且**没有写出新文件**（`ls` 确认）；挪回后回绿 |
| `plain.js` 改成 `export { withOgl as plain } from './with-ogl.js'` | 「只 import plain … 没有 ogl」红 |
| `OGL_REGION` 里的 `ogl` 改成 `0gl` | 对照红（判据失明时只有对照兜底） |
| `tsdown.config.ts` 删掉 `dts: true` | globalSetup 报 `Command failed: node_modules/.bin/tsdown`，整个 run 失败 —— dist 测试不会拿坏产物往下跑 |

已知且接受的限制（实测，记进 tech-stack，不在这里变异）：`-u` 会把**新增**导出直接写进快照（tsnapi 只拦删除与收窄），
所以新增导出只能靠提交时审快照 diff 来守；删除或收窄导出要显式设 `TSNAPI_ALLOW_BREAKING=1` 才能更新。

- [ ] **步骤 9：类型检查与 lint 通过**

Run: `pnpm typecheck && pnpm lint; echo exit=$?`
Expected: `exit=0`

- [ ] **步骤 10：提交**

走 `/commit`，建议信息：`test: 加 dist project，用快照钉住公开 API，并证明 ogl 产物判据可信`。勾掉 [`todo.md`](../todo.md) 的「测试框架」一项。

---

### 任务 7：宿主场景夹具与 playground

**文件：**
- 新建：`playground/fixtures/types.ts`、`playground/fixtures/dom.ts`、`playground/fixtures/index.ts`，
  8 个夹具 `playground/fixtures/{reset-canvas,theme-transition,clamp-font,overflow-hidden,modern-colors,hidden-container,many-instances,narrow-wrap}.ts`，
  `playground/vite.config.ts`、`playground/index.html`、`playground/main.ts`、`playground/vue.html`、`playground/vue/main.ts`、`playground/vue/App.vue`，
  `test/browser/host-fixtures.browser.test.ts`、`test/browser/vue-fixture.browser.test.ts`
- 修改：`vitest.config.ts`（browser project 加 `optimizeDeps`）、`package.json`（加脚本 `play`）

**接口：**
- 产出（阶段 1 起的内核测试与 playground 都用）：

```ts
// playground/fixtures/types.ts
interface FxTarget { textEl: HTMLElement, layerEl: HTMLElement }
interface MountedFixture<A extends string = string> {
  targets: FxTarget[]
  actions: Record<A, () => void>
  cleanup: () => void
}
interface HostFixture<A extends string = string> {
  id: string
  title: string
  trap: string
  mount: (root: HTMLElement) => MountedFixture<A>
}
// playground/fixtures/index.ts
const hostFixtures: HostFixture[]
// 各夹具的导出名与 actions：
// resetCanvas: HostFixture<never>          themeTransition: HostFixture<'切换主题'>
// clampFont: HostFixture<never>            overflowHidden: HostFixture<never>
// modernColors: HostFixture<never>（另导出 modernColorValues: readonly string[]）
// hiddenContainer: HostFixture<'显示' | '隐藏'>
// manyInstances: HostFixture<never>        narrowWrap: HostFixture<'加宽' | '收窄'>
```

每个夹具按 [`design.md`](../design.md) 第十三节的表复刻一个 my-blog 的宿主陷阱，DOM 结构与 Vue 壳渲染的完全一致
（`<h1 style="position: relative"><span>文字</span><span data-fx-layer></span></h1>`，文字 span 不带 style，两个 span 之间没有空白）。
阶段 0 的自检只证明「陷阱确实存在」—— 守卫要先见过缺陷现场，阶段 1 的内核测试才能拿它们判定「修好了」。
下文断言里的计算值与回读值都已在三内核实测（macOS），Linux 上由 CI 确认。

- [ ] **步骤 1：写类型与 DOM 工具**

`playground/fixtures/types.ts`：

```ts
/** 交给内核的一对元素：真文本与空挂载点 */
export interface FxTarget {
  textEl: HTMLElement
  layerEl: HTMLElement
}

export interface MountedFixture<A extends string = string> {
  targets: FxTarget[]
  /** 宿主侧的操作：playground 渲染成按钮，测试直接调用 */
  actions: Record<A, () => void>
  /** 撤掉夹具加进文档的一切：DOM、样式、html 上的 class */
  cleanup: () => void
}

export interface HostFixture<A extends string = string> {
  id: string
  /** design.md 第十三节「夹具」一栏 */
  title: string
  /** 同表「对应的真实陷阱」一栏 */
  trap: string
  mount: (root: HTMLElement) => MountedFixture<A>
}
```

`playground/fixtures/dom.ts`：

```ts
import type { FxTarget } from './types'

/**
 * 按 Vue 壳的结构建标题：文字 span 不带 style，与挂载点之间不留空白（design.md 第八节）。
 * 夹具与壳结构一致，内核在这里遇到的 DOM 就是消费方页面上的 DOM
 */
export function createHeading(text: string): { heading: HTMLElement, target: FxTarget } {
  const heading = document.createElement('h1')
  heading.style.position = 'relative'
  const textEl = document.createElement('span')
  textEl.textContent = text
  const layerEl = document.createElement('span')
  layerEl.dataset.fxLayer = ''
  heading.append(textEl, layerEl)
  return { heading, target: { textEl, layerEl } }
}

/** 往 head 里插一段宿主样式，返回撤销函数 */
export function injectStyle(css: string): () => void {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

/** 建一个带宿主 class 的容器挂进 root；夹具的样式都限定在这个 class 下，免得漏到同一文档里的其他测试 */
export function createHost(root: HTMLElement, className: string): HTMLElement {
  const host = document.createElement('div')
  host.className = className
  root.append(host)
  return host
}
```

- [ ] **步骤 2：写 8 个夹具**

`playground/fixtures/reset-canvas.ts`：

```ts
import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

export const resetCanvas: HostFixture<never> = {
  id: 'reset-canvas',
  title: 'reset 里有 canvas { max-width: 100% }',
  trap: '画布被横向压扁，字又小又偏左',
  mount(root) {
    const removeStyle = injectStyle('.fx-host-reset-canvas canvas { max-width: 100%; }')
    const host = createHost(root, 'fx-host-reset-canvas')
    const { heading, target } = createHeading('Hubery')
    host.append(heading)
    return {
      targets: [target],
      actions: {},
      cleanup() {
        host.remove()
        removeStyle()
      },
    }
  },
}
```

`playground/fixtures/theme-transition.ts`：

```ts
import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

const DARK = 'fx-host-theme-dark'

export const themeTransition: HostFixture<'切换主题'> = {
  id: 'theme-transition',
  title: 'body 的 color 带 0.2s 过渡，切主题只改 html 的 class',
  trap: '颜色停在上一个主题',
  mount(root) {
    const removeStyle = injectStyle(`
      .fx-host-theme { color: rgb(20, 20, 20); background: rgb(250, 250, 250); transition: color 0.2s, background-color 0.2s; }
      html.${DARK} .fx-host-theme { color: rgb(235, 235, 235); background: rgb(24, 24, 24); }
    `)
    const host = createHost(root, 'fx-host-theme')
    const { heading, target } = createHeading('Hubery')
    host.append(heading)
    const html = document.documentElement
    return {
      targets: [target],
      actions: {
        切换主题: () => html.classList.toggle(DARK),
      },
      cleanup() {
        html.classList.remove(DARK)
        host.remove()
        removeStyle()
      },
    }
  },
}
```

`playground/fixtures/clamp-font.ts`：

```ts
import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

export const clampFont: HostFixture<never> = {
  id: 'clamp-font',
  title: 'clamp() 响应式字号 + 负 letter-spacing',
  trap: '纹理与 DOM 文字对不齐，光标压字',
  mount(root) {
    const removeStyle = injectStyle('.fx-host-clamp-font h1 { font-size: clamp(2rem, 8vw, 5rem); letter-spacing: -0.02em; }')
    const host = createHost(root, 'fx-host-clamp-font')
    const { heading, target } = createHeading('Hubery')
    host.append(heading)
    return {
      targets: [target],
      actions: {},
      cleanup() {
        host.remove()
        removeStyle()
      },
    }
  },
}
```

`playground/fixtures/overflow-hidden.ts`：

```ts
import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

export const overflowHidden: HostFixture<never> = {
  id: 'overflow-hidden',
  title: 'overflow: hidden 的容器（对应 my-blog 的 ::demo）',
  trap: '画布四周的流动溢出被裁掉',
  mount(root) {
    const removeStyle = injectStyle('.fx-host-overflow-hidden { width: 240px; padding: 8px; overflow: hidden; }')
    const host = createHost(root, 'fx-host-overflow-hidden')
    const { heading, target } = createHeading('Hubery')
    host.append(heading)
    return {
      targets: [target],
      actions: {},
      cleanup() {
        host.remove()
        removeStyle()
      },
    }
  },
}
```

`playground/fixtures/modern-colors.ts`：

```ts
import type { HostFixture } from './types'
import { createHeading, createHost } from './dom'

/** 计算值不会统一转成 rgb 的三种写法（design.md 第九节） */
export const modernColorValues = [
  'oklch(0.7 0.15 200)',
  'lab(50 40 30)',
  'color-mix(in srgb, red 50%, blue)',
] as const

export const modernColors: HostFixture<never> = {
  id: 'modern-colors',
  title: 'oklch / lab / color-mix 颜色',
  trap: '计算值不统一转成 rgb，正则解析出错值',
  mount(root) {
    const host = createHost(root, 'fx-host-modern-colors')
    const targets = modernColorValues.map((color) => {
      const { heading, target } = createHeading(color)
      heading.style.color = color
      host.append(heading)
      return target
    })
    return {
      targets,
      actions: {},
      cleanup() {
        host.remove()
      },
    }
  },
}
```

`playground/fixtures/hidden-container.ts`：

```ts
import type { HostFixture } from './types'
import { createHeading, createHost } from './dom'

export const hiddenContainer: HostFixture<'显示' | '隐藏'> = {
  id: 'hidden-container',
  title: '挂载在隐藏容器里，之后再显示',
  trap: '实例永久失效',
  mount(root) {
    const host = createHost(root, 'fx-host-hidden-container')
    host.hidden = true
    const { heading, target } = createHeading('Hubery')
    host.append(heading)
    return {
      targets: [target],
      actions: {
        显示: () => {
          host.hidden = false
        },
        隐藏: () => {
          host.hidden = true
        },
      },
      cleanup() {
        host.remove()
      },
    }
  },
}
```

`playground/fixtures/many-instances.ts`：

```ts
import type { HostFixture } from './types'
import { createHeading, createHost } from './dom'

// Chromium 与 WebKit 同一文档里第 17 个 WebGL 上下文会挤掉最旧的一个（实测），所以要比 16 多
const COUNT = 18

export const manyInstances: HostFixture<never> = {
  id: 'many-instances',
  title: '同页多个实例',
  trap: 'WebGL 上下文上限',
  mount(root) {
    const host = createHost(root, 'fx-host-many-instances')
    const targets = Array.from({ length: COUNT }, (_, i) => {
      const { heading, target } = createHeading(`Hubery ${i + 1}`)
      host.append(heading)
      return target
    })
    return {
      targets,
      actions: {},
      cleanup() {
        host.remove()
      },
    }
  },
}
```

`playground/fixtures/narrow-wrap.ts`：

```ts
import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

export const narrowWrap: HostFixture<'加宽' | '收窄'> = {
  id: 'narrow-wrap',
  title: '窄容器里文字折行',
  trap: '纹理只画一行，被裁掉（应进入休眠）',
  mount(root) {
    const removeStyle = injectStyle(`
      .fx-host-narrow-wrap { width: 120px; font: 32px/1.2 sans-serif; }
      .fx-host-narrow-wrap.is-wide { width: auto; }
      .fx-host-narrow-wrap h1 { margin: 0; font: inherit; }
    `)
    const host = createHost(root, 'fx-host-narrow-wrap')
    const { heading, target } = createHeading('Hubery Yang Space')
    host.append(heading)
    return {
      targets: [target],
      actions: {
        加宽: () => host.classList.add('is-wide'),
        收窄: () => host.classList.remove('is-wide'),
      },
      cleanup() {
        host.remove()
        removeStyle()
      },
    }
  },
}
```

`playground/fixtures/index.ts`：

```ts
import type { HostFixture } from './types'
import { clampFont } from './clamp-font'
import { hiddenContainer } from './hidden-container'
import { manyInstances } from './many-instances'
import { modernColors } from './modern-colors'
import { narrowWrap } from './narrow-wrap'
import { overflowHidden } from './overflow-hidden'
import { resetCanvas } from './reset-canvas'
import { themeTransition } from './theme-transition'

/** design.md 第十三节的 8 个宿主场景，顺序同表 */
export const hostFixtures: HostFixture[] = [
  resetCanvas,
  themeTransition,
  clampFont,
  overflowHidden,
  modernColors,
  hiddenContainer,
  manyInstances,
  narrowWrap,
]
```

- [ ] **步骤 3：写夹具自检测试（先于 playground 页面）**

`test/browser/host-fixtures.browser.test.ts`：

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { clampFont } from '../../playground/fixtures/clamp-font'
import { hiddenContainer } from '../../playground/fixtures/hidden-container'
import { hostFixtures } from '../../playground/fixtures/index'
import { manyInstances } from '../../playground/fixtures/many-instances'
import { modernColors, modernColorValues } from '../../playground/fixtures/modern-colors'
import { narrowWrap } from '../../playground/fixtures/narrow-wrap'
import { overflowHidden } from '../../playground/fixtures/overflow-hidden'
import { resetCanvas } from '../../playground/fixtures/reset-canvas'
import { themeTransition } from '../../playground/fixtures/theme-transition'

let root: HTMLElement

function freshRoot(): HTMLElement {
  root = document.createElement('div')
  document.body.append(root)
  return root
}

afterEach(() => {
  root?.remove()
})

describe.each(hostFixtures.map(f => [f.id, f] as const))('%s：结构与清理', (_, fixture) => {
  it('每对元素的结构与 Vue 壳一致', () => {
    const { targets, cleanup } = fixture.mount(freshRoot())
    expect(targets.length).toBeGreaterThan(0)
    for (const { textEl, layerEl } of targets) {
      expect(textEl.tagName).toBe('SPAN')
      expect(textEl.hasAttribute('style')).toBe(false)
      expect(layerEl.tagName).toBe('SPAN')
      expect(layerEl.hasAttribute('data-fx-layer')).toBe(true)
      expect(layerEl.childNodes).toHaveLength(0)
      expect(textEl.nextSibling).toBe(layerEl)
      expect(textEl.parentElement!.style.position).toBe('relative')
      expect(root.contains(textEl)).toBe(true)
    }
    cleanup()
  })

  it('cleanup 撤掉夹具加进文档的一切', () => {
    const head = document.head.innerHTML
    const htmlClass = document.documentElement.className
    const mounted = fixture.mount(freshRoot())
    for (const run of Object.values(mounted.actions))
      run()
    mounted.cleanup()
    expect(root.childNodes).toHaveLength(0)
    expect(document.head.innerHTML).toBe(head)
    expect(document.documentElement.className).toBe(htmlClass)
  })
})

describe('陷阱确实存在', () => {
  it('reset 把画布压到标题宽度，inline max-width: none 能解开', () => {
    const { targets: [{ textEl, layerEl }], cleanup } = resetCanvas.mount(freshRoot())
    const headingWidth = textEl.parentElement!.getBoundingClientRect().width
    const canvas = document.createElement('canvas')
    canvas.style.cssText = `position: absolute; left: -48px; top: -48px; width: ${headingWidth + 96}px; height: 100px;`
    layerEl.append(canvas)
    expect(canvas.getBoundingClientRect().width).toBeCloseTo(headingWidth, 0)
    canvas.style.maxWidth = 'none'
    expect(canvas.getBoundingClientRect().width).toBeCloseTo(headingWidth + 96, 0)
    cleanup()
  })

  it('切主题的那一刻读到的仍是旧主题的颜色，过渡结束后才是新颜色', async () => {
    const { targets: [{ textEl }], actions, cleanup } = themeTransition.mount(freshRoot())
    expect(getComputedStyle(textEl).color).toBe('rgb(20, 20, 20)')
    actions.切换主题()
    expect(getComputedStyle(textEl).color).toBe('rgb(20, 20, 20)')
    await expect.poll(() => getComputedStyle(textEl).color, { timeout: 2000 }).toBe('rgb(235, 235, 235)')
    cleanup()
  })

  it('字号由 clamp() 按视口算出，字距是负的', () => {
    const { targets: [{ textEl }], cleanup } = clampFont.mount(freshRoot())
    const style = getComputedStyle(textEl)
    const fontSize = Number.parseFloat(style.fontSize)
    expect(fontSize).toBeCloseTo(Math.min(Math.max(32, window.innerWidth * 0.08), 80), 1)
    expect(Number.parseFloat(style.letterSpacing)).toBeCloseTo(-0.02 * fontSize, 1)
    cleanup()
  })

  it('容器外的内容被裁掉，去掉 overflow: hidden 就看得见', () => {
    const { targets: [{ textEl }], cleanup } = overflowHidden.mount(freshRoot())
    const heading = textEl.parentElement!
    const container = heading.parentElement!
    const probe = document.createElement('div')
    probe.style.cssText = 'position: absolute; left: calc(100% + 40px); top: 0; width: 20px; height: 20px;'
    heading.append(probe)
    const { left, top } = probe.getBoundingClientRect()
    expect(document.elementFromPoint(left + 10, top + 10)).not.toBe(probe)
    container.style.overflow = 'visible'
    expect(document.elementFromPoint(left + 10, top + 10)).toBe(probe)
    cleanup()
  })

  it('计算值不是 rgb 形式，正则解析出错值；canvas 回读是对的', () => {
    const expected: Record<string, { computed: string, rgba: number[] }> = {
      'oklch(0.7 0.15 200)': { computed: 'oklch(0.7 0.15 200)', rgba: [0, 185, 195, 255] },
      'lab(50 40 30)': { computed: 'lab(50 40 30)', rgba: [187, 88, 70, 255] },
      'color-mix(in srgb, red 50%, blue)': { computed: 'color(srgb 0.5 0 0.5)', rgba: [128, 0, 128, 255] },
    }
    const { targets, cleanup } = modernColors.mount(freshRoot())
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    targets.forEach(({ textEl }, i) => {
      const { computed, rgba } = expected[modernColorValues[i]!]!
      const actual = getComputedStyle(textEl).color
      expect(actual).toBe(computed)
      // my-blog 现在的写法：取计算值里的前三个数字
      const naive = actual.match(/\d+/g)!.slice(0, 3).map(Number)
      probe.clearRect(0, 0, 1, 1)
      probe.fillStyle = actual
      probe.fillRect(0, 0, 1, 1)
      const readback = Array.from(probe.getImageData(0, 0, 1, 1).data)
      expect(readback).toEqual(rgba)
      expect(naive).not.toEqual(readback.slice(0, 3))
    })
    cleanup()
  })

  it('隐藏时文字宽度为 0，显示后恢复', () => {
    const { targets: [{ textEl }], actions, cleanup } = hiddenContainer.mount(freshRoot())
    expect(textEl.getBoundingClientRect().width).toBe(0)
    actions.显示()
    expect(textEl.getBoundingClientRect().width).toBeGreaterThan(0)
    actions.隐藏()
    expect(textEl.getBoundingClientRect().width).toBe(0)
    cleanup()
  })

  it('实例数超过同文档 WebGL 上下文上限（16）', () => {
    const { targets, cleanup } = manyInstances.mount(freshRoot())
    expect(targets.length).toBeGreaterThan(16)
    expect(new Set(targets.map(t => t.layerEl)).size).toBe(targets.length)
    cleanup()
  })

  it('窄容器里文字折成多行，加宽后回到一行', () => {
    const { targets: [{ textEl }], actions, cleanup } = narrowWrap.mount(freshRoot())
    expect(textEl.getClientRects().length).toBeGreaterThan(1)
    actions.加宽()
    expect(textEl.getClientRects()).toHaveLength(1)
    actions.收窄()
    expect(textEl.getClientRects().length).toBeGreaterThan(1)
    cleanup()
  })
})
```

- [ ] **步骤 4：跑测试，确认绿**

Run: `node_modules/.bin/vitest run --project browser test/browser/host-fixtures.browser.test.ts --reporter=verbose`
Expected: PASS，三内核各 24 条（8 个夹具 × 2 条结构与清理 + 8 条陷阱自检）。

- [ ] **步骤 5：守卫自证（变异）**

每次变异后跑步骤 4 的命令（三内核），按预期变红，还原后回绿：

| 变异 | 预期变红 |
| :--- | :--- |
| `dom.ts` 里给 `textEl` 加 `textEl.style.color = 'inherit'` | 8 个夹具的「结构与 Vue 壳一致」，三内核共 24 条 |
| `dom.ts` 里改成 `heading.append(textEl, document.createTextNode(' '), layerEl)` | 同上（两个 span 之间出现空白），共 24 条 |
| `theme-transition.ts` 的 cleanup 删掉 `html.classList.remove(DARK)` | 该夹具的「cleanup 撤掉一切」，以及残留的 class 连带弄坏的「切主题的那一刻…」，三内核共 6 条 |
| `reset-canvas.ts` 的样式改成 `max-width: none` | 「reset 把画布压到标题宽度」，共 3 条 |
| `narrow-wrap.ts` 的 `width: 120px` 改成 `width: 2000px` | 「窄容器里文字折成多行」，共 3 条 |

- [ ] **步骤 6：写 playground**

`playground/vite.config.ts`（alias 直接指向 `src`，调参时不必先构建；具体包名在前，否则 `@huberyyang/todo-fx` 会先吞掉 `/vue`）：

```ts
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@huberyyang/todo-fx/vue': fileURLToPath(new URL('../src/vue/index.ts', import.meta.url)),
      '@huberyyang/todo-fx': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
})
```

`playground/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>todo-fx playground</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

`playground/main.ts`（不带 `?fixture=` 时列出全部夹具；带上就挂载那一个，并把它的 actions 渲染成按钮）：

```ts
import { hostFixtures } from './fixtures/index'

const app = document.querySelector<HTMLElement>('#app')!
const fixture = hostFixtures.find(f => f.id === new URLSearchParams(location.search).get('fixture'))

if (fixture) {
  document.title = fixture.title
  const heading = document.createElement('p')
  heading.textContent = `${fixture.title}｜陷阱：${fixture.trap}`
  const toolbar = document.createElement('div')
  const stage = document.createElement('div')
  app.append(heading, toolbar, stage)
  const { actions } = fixture.mount(stage)
  for (const [label, run] of Object.entries(actions)) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', run)
    toolbar.append(button)
  }
}
else {
  const list = document.createElement('ul')
  for (const f of hostFixtures) {
    const item = document.createElement('li')
    const link = document.createElement('a')
    link.href = `?fixture=${f.id}`
    link.textContent = f.title
    item.append(link, `：${f.trap}`)
    list.append(item)
  }
  const vueLink = document.createElement('a')
  vueLink.href = './vue.html'
  vueLink.textContent = 'Vue 夹具页'
  app.append(list, vueLink)
}
```

`playground/vue.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>todo-fx playground · Vue</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./vue/main.ts"></script>
  </body>
</html>
```

`playground/vue/main.ts`：

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

`playground/vue/App.vue`（阶段 2 换成 `<LiquidText>`；现在按壳的结构手写一份，验证 SFC 管线，并给壳的写法留一个模板范本）：

```vue
<template>
  <h1 style="position: relative">
    <span>Hubery</span><span data-fx-layer />
  </h1>
</template>
```

`test/browser/vue-fixture.browser.test.ts`（也是 vitest-browser-vue 在三内核里的挂载探针，并会在最低 peer 版本 job 里用 vue 3.5.0 跑一次）：

```ts
import { expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import App from '../../playground/vue/App.vue'

it('按壳的结构渲染：文字 span 不带 style，与挂载点之间没有空白', async () => {
  const { container } = await render(App)
  const heading = container.querySelector('h1')!
  expect(heading.style.position).toBe('relative')
  const [textEl, layerEl] = Array.from(heading.children)
  expect(textEl!.textContent).toBe('Hubery')
  expect(textEl!.hasAttribute('style')).toBe(false)
  expect(textEl!.nextSibling).toBe(layerEl)
  expect(layerEl!.hasAttribute('data-fx-layer')).toBe(true)
  expect(layerEl!.childNodes).toHaveLength(0)
})
```

`vitest.config.ts` 的 browser project 加一行 `optimizeDeps`（放在 `extends: true` 之后、`test` 之前）：

```ts
      {
        extends: true,
        // 首次运行（CI 每次都是）时 vue 要到测试中途才被发现、临时预构建，随即整页重载，正在导入的测试文件全部失败
        optimizeDeps: { include: ['vue'] },
        test: {
          name: 'browser',
```

这是干跑时撞上的真实缺陷：没有 Vite 依赖缓存时，Vue 夹具页的测试第一次 import `vue`，Vite 打印 `optimized dependencies changed. reloading`，
随后若干测试文件报 `Failed to import test file … Vitest failed to find the current suite`（两次从零运行分别坏了 12 个、2 个文件）。本地有缓存时不出现，CI 每次都会出现。

`package.json` 的 `scripts` 加 `"play": "vite playground"`。

- [ ] **步骤 7：确认 vue-tsc 真的在检查 playground 的 `.vue`（tsconfig 用目录形式 include 的前提）**

变异：`App.vue` 顶部加 `<script setup lang="ts">const n: number = 'x'</script>`，`cmp` 确认后跑 `pnpm typecheck`。
Expected: `playground/vue/App.vue` 报 `TS2322`，`exit=2`；还原后 `exit=0`。

- [ ] **步骤 8：playground 能起、页面与模块都能取到**

用 Vite 的 API 起一个 dev server，逐个请求页面与模块（模块请求会触发转换，转换失败返回 500；干跑时把 `App.vue` 与 `fixtures/index.ts` 改坏，两者都变成 500，探针有效），
不需要后台进程和 sleep。dev server 的 `close()` 在这种用法下不会 resolve，所以直接 `process.exit`：

```bash
node --input-type=module -e "
import { createServer } from 'vite'
const server = await createServer({ configFile: 'playground/vite.config.ts', root: 'playground', server: { port: 5188, strictPort: true }, logLevel: 'error' })
await server.listen()
for (const p of ['/', '/?fixture=narrow-wrap', '/main.ts', '/vue.html', '/vue/main.ts', '/vue/App.vue', '/fixtures/index.ts'])
  console.log((await fetch('http://localhost:5188' + p)).status, p)
process.exit(0)
"
```

Expected: 7 行全是 `200`，退出码 0。（要看效果时由 Hubery 打开 `pnpm play`；按全局规则，浏览器里的 UI 验证需先征得同意。）

- [ ] **步骤 9：全量浏览器测试、类型检查与 lint**

Run: `pnpm test:browser && pnpm typecheck && pnpm lint; echo exit=$?`
Expected: `exit=0`；浏览器测试共 30 + 3 × 25 = 105 条（夹具自检 24 条与 Vue 夹具页 1 条进三个默认 instance）。

再模拟 CI 的冷启动：把 Vite 缓存挪走后跑全量，连跑两次。

```bash
for n in 1 2; do mv node_modules/.vite "$TMPDIR/fx-vite-$n-$$"; pnpm test > "$TMPDIR/fx-cold-$n.log" 2>&1; echo "exit=$? reloads=$(grep -c 'reloading' "$TMPDIR/fx-cold-$n.log")"; done
```

Expected: 两次都是 `exit=0 reloads=0`，`Tests 183 passed`。变异：删掉 `optimizeDeps` 那一行后同样冷启动跑一次，必须 `exit=1` 且 `reloads=1`（缺陷现场），还原后回绿。

- [ ] **步骤 10：提交**

走 `/commit`，建议信息：`test: 复刻 my-blog 的 8 个宿主场景夹具，playground 与浏览器测试共用`。勾掉 [`todo.md`](../todo.md) 的「playground」一项。

---

### 任务 8：CI 与发版流程

**文件：**
- 新建：`.github/workflows/ci.yml`、`.github/workflows/release.yml`、`changelogithub.config.ts`
- 修改：`package.json`（加脚本 `release`）

**接口：**
- 消费：前面各任务的 `typecheck` / `lint` / `test` / `build` 脚本；vitest 的 project 名 `unit`、`dist`、`browser`、`browser (chromium)`
- 产出：push 到 main / dev 与 PR 时跑的三个 job（`quality`、`browser`、`min-peer`）；tag 触发的 Release；本地 `pnpm release`

- [ ] **步骤 1：写 `.github/workflows/ci.yml`**

```yaml
name: CI

# 类型检查与测试真正跑的地方：pre-commit 只对暂存文件跑 eslint --fix。
# push 与 pull_request 都挂：dev 上会攒好几个提交才开 PR，只挂 pull_request 的话这段时间没有任何检查
on:
  push:
    branches:
      - main
      - dev
  pull_request:
    branches:
      - main
      - dev

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    # ubuntu-latest 将在 2026-10-19 ~ 11-19 分批切到 26.04，换镜像会换掉软件渲染栈；钉住，让换镜像成为一次显式提交
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      # 必须在 setup-node 之前，否则 cache: pnpm 找不到 pnpm；版本由 package.json 的 packageManager 决定
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test --project unit --project dist
      # 显式构建一次，不让下一步依赖 dist project 的 globalSetup 是否构建
      - run: pnpm build
      # tsdown 的 exports: true 每次构建都改写 package.json；有 diff 说明改了入口却没提交改写结果
      - run: git diff --exit-code

  browser:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # 不缓存浏览器：Playwright 官方不推荐，恢复与下载耗时相当，系统依赖本来就缓存不了。
      # --only-shell 只影响 Chromium：无头模式只用得到 headless shell
      - run: pnpm exec playwright install --with-deps --only-shell chromium firefox webkit
      # Firefox 在 CI 里以 headed 模式运行（headless 在 Linux 上建不出 WebGL），由 xvfb-run 提供 display
      - run: xvfb-run -a pnpm test --project browser

  min-peer:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    env:
      MIN_VUE: 3.5.0
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # 只在本 job 内生效、从不提交。不能用 pnpm add -D vue@3.5.0：它只把 specifier 改成 ^3.5.0，锁定的 3.5.43 纹丝不动。
      # @vue/compiler-dom、@vue/server-renderer 是 @vue/test-utils 的 peer，不一起钉住的话浏览器里会同时加载两套 Vue 运行时
      - name: Pin vue to the minimum peer version
        run: |
          node -e "
          const fs = require('node:fs')
          const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
          for (const name of ['vue', '@vue/compiler-dom', '@vue/server-renderer'])
            pkg.devDependencies[name] = process.env.MIN_VUE
          fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
          "
          pnpm install --no-frozen-lockfile
      # 防止 job 绿着、测的却是 3.5.43
      - name: Assert the minimum peer version is what got installed
        run: |
          node -e "
          for (const name of ['vue', '@vue/compiler-dom', '@vue/server-renderer']) {
            const v = require(name + '/package.json').version
            if (v !== process.env.MIN_VUE) {
              console.error(name + ' = ' + v + ', expected ' + process.env.MIN_VUE)
              process.exit(1)
            }
          }
          console.log('vue, @vue/compiler-dom, @vue/server-renderer = ' + process.env.MIN_VUE)
          "
      # 只降 vue 时 @vue/test-utils 会带进另一套 3.5.43 的运行时，浏览器里同时加载两套 Vue
      - name: Assert a single Vue runtime
        run: pnpm why @vue/runtime-dom | tee /dev/stderr | grep -q 'Found 1 version of @vue/runtime-dom'
      - run: pnpm exec playwright install --with-deps --only-shell chromium
      - run: pnpm test --project "browser (chromium)"
```

- [ ] **步骤 2：写 `.github/workflows/release.yml`**

沿用 todo-scripts 的写法：本地 `pnpm release`（bumpp）推送的 `v*` tag 触发，`workflow_dispatch` 用来给已有 tag 补发 Release。

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      tag:
        description: Existing tag to (re)generate a Release for, e.g. v0.1.0
        required: true

# 创建 Release 需要写权限
permissions:
  contents: write

env:
  # 本次发布的 tag 只有这一个来源：推送的 ref，或补发时的输入。run 步骤里一律读 $TAG，值不会被插进 shell
  TAG: ${{ github.event.inputs.tag || github.ref_name }}

jobs:
  release:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
        with:
          # 检出 tag 本身：补发时门禁跑的是当初发布的代码，而不是默认分支的最新提交
          ref: ${{ github.event.inputs.tag || github.ref_name }}
          # changelogithub 要完整历史才能找到上一个 tag，浅克隆会生成空的 changelog
          fetch-depth: 0
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      # 防手误：代码里还写着 0.1.9 却打了 v0.2.0，Release 正文会指向错的版本
      - name: Verify tag matches package.json version
        run: |
          # 补发时漏了 v 前缀能通过下面的版本比对，之后按 tag 查找的步骤却会找不到 ref
          case "$TAG" in
            v*) ;;
            *) echo "Tag $TAG must start with 'v', aborting"; exit 1 ;;
          esac
          PKG="$(node -p "require('./package.json').version")"
          if [ "${TAG#v}" != "$PKG" ]; then
            echo "Tag $TAG does not match package.json version $PKG, aborting"
            exit 1
          fi

      # 门禁与本地 pnpm release 同一组命令：没跑本地门禁就推上来的 tag 也到不了 Release
      - run: pnpm exec playwright install --with-deps --only-shell chromium firefox webkit
      - run: pnpm typecheck
      - run: pnpm lint
      - run: xvfb-run -a pnpm test

      # 锁大版本：不锁的 dlx 会让上游的破坏性更新在最要紧的时候搞挂发版
      - name: Generate changelog and GitHub Release
        run: pnpm dlx changelogithub@15 --to "$TAG"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **步骤 3：写 `changelogithub.config.ts`**

提交信息是中文，分类标题也用中文，Release 正文不中英夹杂。类型集合沿用 todo-scripts：changelogithub 默认只收 feat / fix / perf，
重构与文档类改动会被折叠成「No significant changes」。

```ts
export default {
  types: {
    feat: { title: '🚀 新功能' },
    fix: { title: '🐞 问题修复' },
    perf: { title: '🏎 性能优化' },
    refactor: { title: '💅 重构' },
    docs: { title: '📖 文档' },
  },
}
```

- [ ] **步骤 4：加发版脚本**

`package.json` 的 `scripts` 加：

```json
{
  "release": "nr typecheck && nr lint && nr test && bumpp --no-verify && npm publish"
}
```

不加 `prepack`：tsdown 的 attw 检查内部会调 `pnpm pack`，`prepack` 里再构建就成了递归。`nr test` 里的 dist project 会先构建，发布的就是这次门禁构建出的产物。

- [ ] **步骤 5：校验**

Run: `pnpm lint && pnpm typecheck; echo exit=$?`
Expected: `exit=0`（antfu 也会 lint yaml）。

Run: `pnpm exec nr --version`
Expected: 打印 `@antfu/ni` 的版本（证明 `release` 脚本里的 `nr` 能解析；`bumpp` 与 `npm publish` 不在阶段 0 执行）。

本机有 [actionlint](https://github.com/rhysd/actionlint) 时再跑 `actionlint .github/workflows/*.yml`，预期 0 错误；没有就跳过，推送后 GitHub 也会报语法错误。

- [ ] **步骤 6：提交**

走 `/commit`，建议信息：`ci: 加 CI 与发版流程，最低 peer 版本 job 断言实际装到的版本`。勾掉 [`todo.md`](../todo.md) 的「CI 与发版流程」一项。

---


### 任务 9：推送并验证 CI

**文件：** 无

推送是对外可见的操作，**这一步开始前先问 Hubery 是否推送**。

- [ ] **步骤 1：本地全量门禁**

Run: `pnpm typecheck && pnpm lint && pnpm test; echo exit=$?`
Expected: `exit=0`（unit 72、browser 105、dist 6）。

- [ ] **步骤 2：推送 dev**（得到同意后）

Run: `git push origin dev`

- [ ] **步骤 3：等 CI 跑完**

```bash
run_id=$(gh run list --branch dev --workflow ci.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$run_id" --exit-status; echo exit=$?
```

Expected: `exit=0`，三个 job（quality、browser、min-peer）全绿。

- [ ] **步骤 4：读日志，确认「绿」是可信的**

```bash
gh run view "$run_id" --log | grep -E 'RENDERER=|= 3\.5\.0|Found 1 version|git diff --exit-code'
```

Expected（缺一条都不算通过）：
- browser job 里三个内核各有 webgl2、webgl 两行 `::notice …RENDERER=… pixel=51,102,153,255`；Chromium 的渲染器含 `SwiftShader`；
  Firefox / WebKit 的渲染器记下来（预期是 Mesa llvmpipe 一类软件渲染，写进 tech-stack 第十二节）。
- min-peer job 打印 `vue, @vue/compiler-dom, @vue/server-renderer = 3.5.0` 与 `Found 1 version of @vue/runtime-dom`。
- quality job 的 `git diff --exit-code package.json` 步骤通过。

- [ ] **步骤 5：CI 红了怎么办**

按 superpowers:systematic-debugging 处理，先拿到失败日志再动手。已知的兜底方向（tech-stack 第十二节）：
- 某内核的 WebGL 探针红：先看渲染器与报错。Chromium 可试 `--use-angle=swiftshader`；WebKit 依赖 `--with-deps` 装上的 Mesa；
  Firefox 先确认它确实以 headed 模式跑在 xvfb 里（CI 环境变量 `CI=true` 时 `firefoxHeadless` 为 false），仍红就照 vtk.js 给 Firefox instance 加
  `provider: playwright({ launchOptions: { firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.disable-fail-if-major-performance-caveat': true } } })`，
  转绿后再逐个删掉 pref，只留必需的那个。
  **不能带着「全部走进门控分支」的全绿进阶段 1**：探针修不绿，就在 tech-stack 里写明该内核不测 WebGL，并回头问 Hubery。
- 夹具自检的计算值 / 回读值与 macOS 不同：以 CI 实测为准修正断言，并把差异记进 design 第九节。

- [ ] **步骤 6：问 Hubery 分支怎么合**

CI 全绿后问：dev 合进 main 是开 PR（tech-stack 第八节的约定）还是继续快进。按答复执行，并把结论更新进记忆 `branch-sync`。

---

### 任务 10：文档回写

**文件：**
- 修改：[`tech-stack.md`](../tech-stack.md)、[`design.md`](../design.md)、[`architecture.md`](../architecture.md)、[`todo.md`](../todo.md)、[`.docs/README.md`](../README.md)、
  [`CLAUDE.md`](../../CLAUDE.md)（按「需要 Hubery 拍板的事」第四节，审阅时未被划掉的条目）

文档是约束的来源，实测推翻了的说法不改，下一个会话会照着旧说法「修正」代码。每处改动都写成现行事实，理由与风险跟着走。

- [ ] **步骤 1：tech-stack.md**

1. 文件头日期行后加一句：`2026-09-24 · 阶段 0 落地，第一、三、四、六、七、九、十二节按实测修订`。
2. 第一节「核实过的前提」表：
   - 把「pnpm 12 对 workspace 里的未知键直接报错」那行的结论改为：拼错的键直接报错；**但 `ignoredBuiltDependencies` 被接受却完全不起作用**（v11 起由 `allowBuilds` 取代），
     本项目依赖树里没有带构建脚本的包，workspace 不写任何构建相关的键。
   - 「attw 的 esm-only 档会忽略 node10 解析」那行结论补一句：实测纯 ESM 下 tsdown 不写 `main` / `types`，node10 连根入口 `.` 都解析不到，不只是 `./vue`。
   - 「tsdown 里 attw 的 level 默认是 warn」那行补：publint 同理，warning 级问题默认不失败，已加 `failOnWarn: true`；另外 d.ts 注释写 attw 的 profile 默认 `strict`，运行时实际是 `esm-only`，配置里显式写。
   - 新增 5 行：
     | 事实 | 怎么核实的 | 结论 |
     | :--- | :--- | :--- |
     | TypeScript 6 的 `types` 默认值是 `[]`，`DOM` 已含 iterable | 装了 `@types/node` 仍报 `Cannot find name 'process'`；TS 5.9 对照组报 TS2488 | tsconfig 显式写 `types: ["node"]`，`lib` 只写 `ESNext`、`DOM` |
     | ESLint 10 加载 `eslint.config.ts` 需要 jiti | 不装时报 `The 'jiti' library is required` | devDeps 显式装 jiti |
     | antfu 9.5.1 的 antislop 没有禁显式 `any`，`type: 'lib'` 只开了 `ts/explicit-function-return-type` | 读 dist 源码 + `calculateConfigForFile` | 自己开 `ts/no-explicit-any` |
     | Playwright 1.63 启动 Chromium 时无条件追加 `--enable-unsafe-swiftshader` | 读 playwright-core 源码 + `DEBUG=pw:browser` 的启动参数 | 配置里仍显式写，环境可信靠已知结果探针证明 |
     | tsdown 的 JS API `build()` 遇到 attw / publint 报错不抛错，只置 `process.exitCode` | 读源码 + 放进 globalSetup 实测汇总全绿 | dist project 的 globalSetup 走 CLI |
3. 第三节：「workspace 配置」行的选型改为三个键 `minimumReleaseAgeExcludePrune: true`、`trustPolicy: no-downgrade`、`shellEmulator: true`（antfu 的 pnpm 规则强制，且规定键序、不许空行）；
   「tsconfig」行改为任务 1 的最终字段并附理由；「Node」行风险补「lint-staged 17.5.1 要求 Node ≥ 22.22.1，比 Vitest 更严」。
4. 第四节「产物校验」行：选型补 `failOnWarn: true`、`deps.onlyBundle: []`；风险①改为「node10 连根入口都解析不到，README 对两个入口都要写明」；风险②改为「已证实：error 级失败，warning 级靠 failOnWarn」。
5. 第六节：
   - 「browser」行：理由补 hover:none 的 touch instance；风险③改为「已证伪：并行时每个测试文件有独立的 BrowserContext + page，上下文上限只在单个文档内生效，不强制串行」；
     新增风险「媒体仿真挂在 page 上会跨用例残留，`setup.ts` 每条用例后复位；forced-colors 仿真只有 Chromium 会把 `color: transparent` 改写成黑色，重影现场只能在 Chromium 复现；
     Linux 上 headless Firefox 建不出 WebGL，CI 里 Firefox 以 headed 模式跑在 xvfb 里；冷启动时浏览器测试里首次 import 的依赖会触发整页重载，要列进 `optimizeDeps.include`」。
   - 「dist」行：目录叫 `test/artifact`（antfu 忽略 `**/dist`）；判据改为「不压缩产物里的 `//#region …node_modules/ogl/` 注释 + 对照测试」并写明为什么不用 moduleIds；风险补「`-u` 会直接接受新增导出，只能靠审快照 diff；`vitest run -u <文件>` 会吞掉文件参数」。
6. 第七节：lint 行补 jiti、`ts/no-explicit-any`、依赖方向规则共九条；`antislop` 行风险补「`slop/no-em-dash` 见到 U+2014 就报错，中文破折号也算；
   Hubery 定为全仓库关掉这一条（它针对的是英文 AI 腔）。配置项必须写 `files: ['**/*']`，否则 antfu 自动注入的 md 忽略会让 md 仍被拦」。
7. 第九节：按任务 8 实际落地的三个 job 改写「工作流」「浏览器」「最低 peer 版本」三行：`runs-on` 钉死 `ubuntu-24.04` 及理由；浏览器不缓存、每次 `--with-deps --only-shell` 安装、
   Firefox headed + `xvfb-run`；最低 peer 版本 job 的做法、为什么不能用 `pnpm add`、两条断言。
8. 第十二节：表格加一列「结论（2026-09-24）」，逐条填：

| 假设 | 结论 |
| :--- | :--- |
| CI 里三个内核都能创建 WebGL / Canvas 2D | 按任务 9 步骤 4 的实际日志填（写上三个内核的渲染器） |
| `page.emulateMedia()` 能作用到测试 iframe | 证实：三内核 iframe 内 `matchMedia` 翻转、change 事件触发；command 改成空操作即红。附条件：跨用例残留要复位；Chromium 要读新建的 `matchMedia()` |
| 三个内核都能仿真出 `hover: none` | 证实：每个内核加一个 `hasTouch: true` 的 instance；`isMobile` 无效 |
| attw 与 publint 的问题能让构建失败 | attw（level error）证实；publint 只有 error 级会失败，warning 级已用 `failOnWarn` 兜住（M2 与其对照） |
| tsnapi 能拦住导出变化 | 证实：多导出一个符号时 runtime 与 dts 两条红；限制：`-u` 直接接受新增导出 |
| 模板类型夹具能拦住错误的 prop 类型 | 在隔离目录证实（TS 6.0.3 + vue-tsc 3.3.11 + vue 3.5.43）：9 种退化都报 TS2578。夹具写法约束与工厂写法见 todo 阶段 2 |
| 产物断言能发现 ogl 被打进来 | 证实，但判据改为 region 注释 + 对照（兜底方案「按模块 id」本身会误报） |

- [ ] **步骤 2：design.md**

1. 第四节「形态」行风险：「解析不到 `./vue` 子路径的类型」改为「连根入口 `.` 的类型都解析不到（纯 ESM 下不写 `main` / `types`）」。
2. 第九节「canvas 回读转 sRGB」行风险：「只在 Chromium 实测过，Firefox / WebKit 在阶段 0 的 CI 里补测」改为「三内核实测一致（第九节表格的回读值，macOS 与 CI 各跑一遍，见 `test/browser/host-fixtures.browser.test.ts`）」；P3 裁剪那句补「三内核都回读成 `255,0,0`」。
3. 第十二节「集成层并入 Vitest 浏览器模式」那行风险：删掉「各测试文件的 iframe 共享 WebGL 上下文上限，浏览器测试要串行跑」，改为「媒体仿真跨用例残留，由 setup 复位」。
4. 第十二节「CI 里 Chromium 显式开 `--enable-unsafe-swiftshader`」行理由改为：Playwright 1.63 已默认追加，显式写上是不把可信度押在上游默认值上；环境可信由三内核的已知结果探针证明。
5. 文件头版本行加 `v9（形态不变）`，第十六节追加：`v9：阶段 0 落地。浏览器测试不再强制串行；依赖方向规则补齐为九条；ogl 产物判据改为 region 注释 + 对照`。

- [ ] **步骤 3：architecture.md**

1. 第五节 `gate` 行风险补：「媒体查询的当前状态要读新建的 `matchMedia(q).matches`，被监听的 `MediaQueryList` 只当信号源：Chromium 里在 change 事件派发前读它的 `.matches`，forced-colors 的 change 事件会被吞掉（阶段 0 实测），退出强制色后收不到恢复信号」。
2. 第八节表格加四行：

| 目录 | 禁止 | 守的是什么 |
| :--- | :--- | :--- |
| `runtime/` | import `effects/`、`vue/`、`index.ts` | runtime 借 `../effects/liquid-text` 就能把 ogl 间接拉进来，「runtime 不碰 ogl」会被绕开 |
| `effects/*` | import `vue/`、`index.ts` | 依赖方向只有一条路 |
| `index.ts` | import 框架；引用 `./vue` | 公开入口 `.` 不能把壳带进来 |
| `compute/`、`runtime/`、`effects/*`、`index.ts` | 经由包名 `@huberyyang/todo-fx` 自引用 | 自引用绕过分层，把整个公开入口拉进来 |

   第八节的决定表补一行：「同一文件命中多个配置项时后者整体覆盖前者、不合并，所以每个目录只写一个配置项 | 拆开写会让其余禁令静默失效（实测 11 条） | 新增禁令时必须加进该目录已有的那一项」。

- [ ] **步骤 4：todo.md**

1. 勾掉阶段 0 剩下的「证实 7 条假设」「守卫自证」两项（其余在各任务提交时已勾）。
2. 阶段 1 加三条注意：
   - 「**门控**：媒体查询状态读新建的 `matchMedia(q).matches`（见 architecture 第五节 `gate`）」
   - 「**产物断言**：`test/artifact/no-ogl.test.ts` 加真实入口的对照 —— `import createLiquidText` 的打包结果里必须有 ogl（它是 ogl 被误打进 dist 时唯一会红的一条）」
   - 「**playground**：夹具页调用 `createLiquidText` 时，`playground/main.ts` 对每个 `targets` 创建实例」
3. 阶段 2 加两条注意：
   - 「**工厂写法**：公开签名 `<T extends OptionTypes>(name, optionTypes: T): FxComponent<T>`，实现签名不带泛型、返回类型写 `Component`（写成带 props 的 `DefineComponent` 会把 setup 里的 props 推成 any）；工厂函数加 `/* @__NO_SIDE_EFFECTS__ */`，否则只用 `ParticleText` 的消费方也会带上 ogl（实测 26.8 KB）」
   - 「**模板类型夹具**：每行错误用法只比正确用法多改一个属性（否则 `@vue-expect-error` 被别的错误用掉，守卫变瞎）；另配一条 SSR 测试断言选项确实注册成了 props（类型夹具管不到运行时）」
4. 阶段 3 的「产物断言转实」改为：「加主断言 —— 只 import `createParticleText` / `ParticleText` 的打包结果里没有 ogl；然后删掉探针包 `test/artifact/fixtures/ogl-probe/` 及其两条用例（真实入口已覆盖同样的判据）」。

- [ ] **步骤 5：.docs/README.md**

索引表加一行：`| [plans/](plans/) | 执行某个阶段时；每个阶段开工前写一份，审阅通过再动手 |`。

- [ ] **步骤 6：CLAUDE.md（仅限 Hubery 审阅时同意的条目）**

1. 「当前状态」一行改为：`**当前状态：阶段 0（基建）已完成，下一步是阶段 1（运行时 + liquid-text）。**`，后面那句「工具链未初始化 …工具链落地后在这里补上命令」换成下面的命令表：

   | 命令 | 作用 |
   | :--- | :--- |
   | `pnpm build` | 构建 dist；publint / attw 有问题直接失败 |
   | `pnpm typecheck` | `vue-tsc --noEmit`，覆盖 `.ts` 与 `.vue` |
   | `pnpm lint` / `pnpm lint:fix` | ESLint，含依赖方向守卫 |
   | `pnpm test` | unit + browser（三内核 + 三个 touch instance）+ dist（先构建） |
   | `pnpm test:unit` / `test:browser` / `test:dist` | 单跑一个 project；只跑一个内核用 `vitest run --project 'browser (chromium)'` |
   | `pnpm play` | playground：`?fixture=<id>` 打开单个宿主场景夹具 |

2. 「工程约定」第一条改为：
   `- **CI 里的 Chromium 显式开 `--enable-unsafe-swiftshader`，但真正证明环境可信的是已知结果探针。** Playwright 1.63 已默认追加这个开关，显式写是不把可信度押在上游默认值上。`
   `  探针（`test/browser/env-probe.browser.test.ts`）在三个内核里清屏成已知颜色再读回；不通过就说明内核测试会全部走进「不支持」分支 —— 全绿，但什么都没测。`
3. 「工程约定」末尾追加五条坑（原文见「需要 Hubery 拍板的事」第四节第 3 条）。

- [ ] **步骤 7：提交**

走 `/commit`，建议信息：`docs: 按阶段 0 实测修订选型与架构文档，勾掉阶段 0`。

---

## 自查记录

### 覆盖对照

| [`todo.md`](../todo.md) 阶段 0 的项 | 落在哪个任务 |
| :--- | :--- |
| 包骨架、TypeScript | 任务 1 |
| 构建 | 任务 4 |
| lint（含 `.vscode`、依赖方向规则） | 任务 2 |
| 提交钩子 | 任务 3 |
| 测试框架（三个 project、三内核、swiftshader、vitest-browser-vue、plugin-vue、vue-tsc、globalSetup、tsnapi） | 任务 2（unit）、5（browser）、6（dist）、7（vitest-browser-vue 与 plugin-vue 的首个消费方） |
| playground（多页 + Vue 夹具页、alias、8 个夹具共用） | 任务 7 |
| CI 与发版流程 | 任务 8 |
| 证实 7 条假设 | ① 任务 9；② ③ 任务 5；④ 任务 4；⑤ ⑦ 任务 6；⑥ 已在隔离目录证实，任务 10 记录（阶段 0 还没有 Vue 组件可挂夹具，正式夹具在阶段 2 落地） |
| 守卫自证 | 各任务的「守卫自证」步骤 |
| design 第九节「Firefox / WebKit 的颜色回读在阶段 0 的 CI 里补测」 | 任务 7 的 modern-colors 自检（三内核断言回读值），任务 9 在 CI 上跑 |

完成判据逐条：CI 全绿 → 任务 9；三内核已知结果探针 → 任务 5 写、任务 9 在 CI 读日志；两个入口的 d.ts 与 publint / attw 零报错 → 任务 4；
`npm publish --dry-run` 只有 dist 与元数据 → 任务 4；第十二节假设 → 任务 10 逐条填结论。

### 干跑（2026-09-24）

把本计划的每个代码块原样抽出、装配成完整仓库，在隔离目录里执行了任务 1～8：

- pnpm 12.5.1 安装零警告，`pnpm peers check` 无问题；`lint:fix` 零改动，`lint`、`typecheck` 为 0；构建通过、再构建不改 package.json、发布清单 7 个文件。
- 测试：unit 72、browser 105（三内核 + 三个 touch instance）、dist 6，共 183 条；删掉 Vite 缓存冷启动连跑 3 次全绿。
- 任务 4～7 的全部变异按表中预期变红（表里的条数就是干跑数出来的），每次都确认改动落地、还原后干净。
- 最低 peer 版本 job 的三步在 `CI=true` 下模拟通过，「只钉 vue」的变异让单一运行时断言变红；actionlint 1.7.12 校验两份 workflow 为 0 错误。
- commitlint-init 原样执行：坏提交信息被拦下，中文合规信息通过；装上 husky 之后构建照常（`pnpm pack` 不受 `prepare` 影响）。

干跑中发现、已改进计划的问题：antfu + antislop 用 JS 解析器读 html 报错（加 `parserPlain`）；导出的常量要写 `/** */` 注释；
代码注释里的「——」与英文开头的测试标题各被 lint 拦一次；`getContext` 传联合类型选错重载；region 注释的路径相对进程 cwd；
失败截图目录是 `.vitest` 不是 `__screenshots__`；**冷启动时 vue 临时预构建导致整页重载**（稳定复现后才修，修后冷启动 3 次全绿）；
dev server 的 `close()` 不 resolve；两处变异的预期条数；以及补上「只有一套 Vue 运行时」的断言。

### 只能在 CI 上证实的

- Linux 上三个内核的 WebGL，尤其 Firefox 的 headed + xvfb（Chromium 与 WebKit 的把握较高，Firefox 有 vtk.js 的先例但没在本项目跑过）。
- 夹具自检里的计算值与 canvas 回读值在 Linux 上是否与 macOS 一致。
- CI 各 job 的实际耗时（浏览器系统依赖每次都要 apt 安装）。

这三条都在任务 9 读日志时逐条确认，红了按任务 9 步骤 5 处理。
