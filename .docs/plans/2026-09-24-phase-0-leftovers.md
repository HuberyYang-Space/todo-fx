# 阶段 0 遗留问题 实现计划

> **给执行者（agent）：** 必须配合 superpowers:executing-plans（本会话内执行）或 superpowers:subagent-driven-development（逐任务派子 agent）使用。
> 步骤用 `- [ ]` 勾选框跟踪。

**目标：** 把 [`todo.md`](../todo.md)「阶段 0 遗留问题」的 8 项全部清零，每一项都留下证据（守卫类先见一次红），然后关闭阶段 0。

**做法：** 先做本地就能闭环的 4 项（release.yml、零消费方脚本、lint 自引用、TS 7 下的 d.ts）与两条浏览器自检的本地部分；
再开两条临时分支，在 CI 上一次拿齐「Firefox 要不要 headed / 要不要 display」和「Linux 上的上下文挤掉个数、p3 回读」三组数据；
据此在 dev 上定稿配置、断言与文档，推 dev 看 CI 全绿，最后独立终审。

**技术栈：** 同阶段 0：pnpm 12.5.1 · TypeScript 6.0.3 · tsdown 0.23.0 · Vitest 5.0.1（浏览器模式 + Playwright 1.63.0）· ESLint 10 + @antfu/eslint-config 9.5.1 · GitHub Actions（ubuntu-24.04）

**依据：** [`todo.md`](../todo.md) 第 42–66 行 · [`design.md`](../design.md) 第九、十二、十三节 · [`architecture.md`](../architecture.md) 第八节 ·
[`tech-stack.md`](../tech-stack.md) 第一、六、九、十二节 · 阶段 0 计划 [`2026-09-24-phase-0-infra.md`](2026-09-24-phase-0-infra.md) 的「执行偏离」。

---

## 需要 Hubery 拍板的事

### 一、CLAUDE.md 的三处改动（按全局规则须同意）

| # | 改哪里 | 改成什么 | 什么时候改 |
| :-- | :-- | :-- | :-- |
| 1 | 「触发式索引」表加一行（遗留问题第 8 项） | `\| 写浏览器测试，或新增会改 page 状态的自定义 command \| [`.docs/tech-stack.md`](.docs/tech-stack.md) 第六节「集成」一行 \| 测试依赖宿主系统默认的媒体状态，本地全绿、只在 CI 的 Linux WebKit 上红；或新 command 的状态跨用例、跨文件残留 \|` | 任务 9 |
| 2 | 「工程约定」里「TypeScript 锁在 6.x」一条（**只在任务 4 证实 tsdown 在 TS 7.0 下能生成 d.ts 时才改**） | 理由从「vue-tsc、typescript-eslint、tsdown 生成 d.ts 都依赖它」改为「vue-tsc、typescript-eslint 都依赖它（tsdown 装了 TS 7.0 会自动改用 tsgo 生成 d.ts，不受影响，实测见 tech-stack 第一节）」；末句「等这三者都声明支持 7 再议」改为「等这两者都声明支持 7 再议」 | 任务 9 |
| 3 | 「当前状态」一行 | 「**当前状态：阶段 0（基建）已完成并关闭（遗留问题已清零），下一步是阶段 1（运行时 + liquid-text）。**」 | 任务 9，终审通过之后 |

不同意的项：第 1 项从 todo 里划掉并注明「Hubery 未采纳」；第 2 项只改 tech-stack 与 design，CLAUDE.md 保留旧理由；第 3 项保持现状。

### 二、对外操作的授权

批准本计划即授权以下对外操作，执行时不再逐次询问：

- 把两条临时分支 `lab/ff-headless-xvfb`、`lab/ff-headless-bare` 推到 origin，只用来触发 CI；实验结束后删除本地与远端的这两条分支。
- 任务 8 完成后把 dev 推到 origin，看 CI 全绿。

**合并到 main 仍然到时再问**（记忆里的做法：本地快进后推送，但每次先问一句）。

### 三、执行方式

建议本会话直接执行（superpowers:executing-plans）：9 个任务里有 3 个要等 CI，彼此之间传递的是实测数字而不是代码接口，逐任务派子 agent 的收益小。

---

## 全局约束

- 回答、注释、提交、文档一律简体中文；注释只写「为什么」。
- 提交一律走 `/commit` skill（中文、conventional commits、不加 Co-Authored-By），正文每行不超过 100 字符（commitlint）。
- 零消费方的定义一律删除；依赖方向 lint 规则不许为过 lint 放宽或加 disable 注释。
- TypeScript 锁 6.x；已有依赖不升级；本计划不新增项目依赖（TS 7 实验只在 scratchpad 里装）。
- 变异实验直接调 `node_modules/.bin/<工具>`，不走 `pnpm exec` / `pnpm run`；每次变异后 `cmp` 确认文件真的变了，再读测试结果。
- 浏览器测试在 Claude Code 沙箱里起不来 Firefox，**浏览器相关命令一律在沙箱外执行**。
- 守卫写完要让它见一次红；修 bug 前先复现，复现不出来不修。
- `vitest run <文件> -u`，不要写成 `vitest run -u <文件>`。

## 执行须知

- **开工前的检查（任务 0）**：本机 Firefox 目前启动即退出（`Could not find profile folder`，2026-09-24 下午起；Playwright 的 Firefox 155 安装文件完好，
  macOS 9 月 3 日之后没有系统更新；系统日志里 TCC 把它归到 Warp 名下）。Hubery 在 Claude 之外的终端复测，结果决定本地门禁带不带 Firefox：
  - 能跑：问题只在本会话的启动环境。本地门禁里 Firefox 那部分请 Hubery 在外部终端跑，或者整体以 CI 为准。
  - 也跑不了：整机问题，另行排查。本计划照常执行，Firefox 的结论一律以 CI 为准，并记进「执行偏离」。
  - 下文的「本地门禁」写作 `LOCAL_BROWSER`：Firefox 能跑时是 `--project browser`；不能跑时是
    `--project 'browser (chromium)' --project 'browser (webkit)' --project 'browser (chromium-touch)' --project 'browser (webkit-touch)'`。
- **账本**：`.superpowers/sdd/2026-09-24-phase-0-leftovers/progress.md`（`sdd-workspace` 脚本给出的目录，已被 git 忽略）。
  每个 `Ruling:` 都记在那里，最后汇总进本文件的「执行偏离」。
- **`task-start` 脚本认的是英文的 `### Task N` 标题**，本计划用中文「任务 N」，阶段 0 已踩过：按标题的行号直接读对应任务，不跑这个脚本（沿用阶段 0 的 Ruling）。
- **临时文件**（备份、实验目录）一律放 scratchpad：`/private/tmp/claude-501/-Users-hubery-Desktop-code-todo-fx/6fa0999c-f684-4535-ab47-68595d5bd730/scratchpad`，不用 `/tmp`。
- **CI 的日志怎么读**：`gh run view <id> --log | grep -E '::notice|✓|×|FAIL'`。`annotate()` 在 CI 里会输出成 `::notice`。
  推送和 `gh` 在沙箱里连接不稳，一律在沙箱外执行。

## 重点审查

测试覆盖不到、最可能出问题的五处，终审逐条看：

1. **Linux 上的上下文上限可能与 macOS 不同**（SwiftShader、llvmpipe、WPE 的上限未知）。断言按内核写死之前，必须先看到 CI 的实测数字；数字不同就按 `平台/内核` 分开写预期，不要改成宽判据。
2. **去掉 xvfb 之后，release.yml 的门禁要跟着改**。只改 ci.yml 会让发版门禁留着一个已经证明不需要的 `xvfb-run`，或者反过来，CI 去掉了 display 而发版门禁还依赖它。两个文件必须一起改。
3. **lint 新拦截的包名自引用不能误伤 `./vue` 之外的合法写法**：`src/vue/` 里 `import { h } from 'vue'`、`import '../index'`、`import './index'` 必须仍然放行。
4. **`persist-credentials: false` 之后 changelogithub 还要能认出仓库**：它读 `git config --get remote.origin.url` 解析 owner/repo，这个 URL 在不持久化凭据时依然存在；发版流程要到第一次发版才会真正跑到，交付时明说这一点。
5. **display-p3 那一行加进夹具之后，playground 与夹具结构测试都会多一行**：`hostFixtures` 的结构与清理用例对每个 target 都要成立，新行不能破坏「textEl 没有 style」这类断言。

---

## 文件结构

| 文件 | 改动 | 任务 |
| :--- | :--- | :--- |
| `.github/workflows/release.yml` | checkout 加 `persist-credentials: false`；任务 8 按实验结论改 `xvfb-run` | 1、8 |
| `package.json` | 删 `dev`、`commitlint` 两个脚本 | 2 |
| `eslint.config.ts` | `todo-fx/boundaries/vue` 加包名自引用的拦截 | 3 |
| `test/unit/eslint-guards.test.ts` | vue 项的自引用从放行改为拦截，另加一条子路径用例 | 3 |
| `test/browser/host-fixtures.browser.test.ts` | many-instances 自检改为真的建上下文、数被挤掉的个数；modern-colors 自检加 p3 预期 | 5、6、8 |
| `playground/fixtures/many-instances.ts` | 注释补上 Firefox | 5 |
| `playground/fixtures/modern-colors.ts` | 加 `color(display-p3 1 0 0)`，改标题与注释 | 6 |
| `vitest.config.ts` | 任务 8 按实验结论删 `firefoxHeadless` 与 `process` import，改注释 | 8 |
| `.github/workflows/ci.yml` | 任务 8 按实验结论改 browser job 的 `xvfb-run` 与注释 | 8 |
| `.docs/architecture.md` | 第八节 vue 行补上包名自引用 | 3 |
| `.docs/tech-stack.md` | 第一节 TS 7 一行；第六、九、十二节 Firefox 与 xvfb；第八节 release 一行 | 1、4、8 |
| `.docs/design.md` | 第九节 p3 措辞；第十二节 Firefox / xvfb；第十三节夹具表；v7 一行 | 4、6、8 |
| `.docs/todo.md` | 逐项勾掉；阶段 0 关闭 | 各任务、9 |
| `CLAUDE.md` | 见「需要 Hubery 拍板的事」一 | 9 |
| `.docs/plans/2026-09-24-phase-0-leftovers.md` | 执行后补记「执行偏离」 | 9 |

---

### 任务 0：开工检查

**Files:** 无

- [ ] **Step 1：拿到 Hubery 在外部终端复测 Firefox 的结果**，按「执行须知」定下 `LOCAL_BROWSER`，记进账本：
  `Task 0: Ruling: LOCAL_BROWSER = <…> — <外部终端的结果> — 若错：Firefox 的本地证据缺失，靠 CI 兜`
- [ ] **Step 2：确认起点**

Run: `git status --short && git rev-parse --abbrev-ref HEAD && git log --oneline -1`
Expected: 工作区干净，分支 `dev`，HEAD 为 `0de4ba5`（或其后本计划的提交）

- [ ] **Step 3：建账本**

Run: `/Users/hubery/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/skills/subagent-driven-development/scripts/sdd-workspace .docs/plans/2026-09-24-phase-0-leftovers.md`
Expected: 打印工作区目录；在其中写 `progress.md`，首行 `# SDD ledger — plan: .docs/plans/2026-09-24-phase-0-leftovers.md`

---

### 任务 1：release.yml 不把可写 token 留给后续步骤（遗留第 3 项）

**Files:**
- Modify: `.github/workflows/release.yml:25-31`
- Modify: `.docs/tech-stack.md` 第八节「Release」一行
- Modify: `.docs/todo.md:51-53`

**Interfaces:** 无

**证据的边界：** release.yml 只有推 tag 才会跑，第一次发版之前没有运行时证据。这里能拿到的证据是：①changelogithub 15.0.5 的源码里没有需要 git 凭据的操作；
②YAML 改完仍能被解析。交付时明说「运行时未验证」。

- [ ] **Step 1：复核 changelogithub 不需要 git 凭据**（计划阶段已读过 15.0.5，执行时按 `pnpm dlx changelogithub@15` 实际会拿到的版本再核一次）

Run（沙箱外）:
```bash
S=$(mktemp -d) && cd "$S" && npm pack changelogithub@15 --silent && tar xzf changelogithub-*.tgz \
  && grep -n -A3 -E 'execCommand\("git"|x\("git"' package/dist/*.mjs | grep -oE '"(config|tag|rev-parse|log|show-ref|rev-list|fetch|push|pull|ls-remote|clone)"' | sort | uniq -c
```
Expected: 只有 `config`、`tag`、`rev-parse`、`log`、`show-ref`、`rev-list`，**没有** `fetch` / `push` / `pull` / `ls-remote` / `clone`。
出现任何一个需要联网的 git 子命令 → 停下，按 systematic-debugging 查它是否需要凭据，再决定。

- [ ] **Step 2：改 release.yml**

把 checkout 一步改成：

```yaml
      - uses: actions/checkout@v7
        with:
          # 检出 tag 本身：补发时门禁跑的是当初发布的代码，而不是默认分支的最新提交
          ref: ${{ github.event.inputs.tag || github.ref_name }}
          # changelogithub 要完整历史才能找到上一个 tag，浅克隆会生成空的 changelog
          fetch-depth: 0
          # 默认会把 contents: write 的 token 写进 .git/config，之后的 pnpm install 与测试里的第三方代码都读得到。
          # changelogithub 只在本地读 git、调 API 用的是环境变量里的 GITHUB_TOKEN，不需要 git 凭据
          persist-credentials: false
```

- [ ] **Step 3：确认 YAML 能解析、键落在 checkout 的 `with:` 里**

Run: `node_modules/.bin/eslint .github/workflows/release.yml && grep -n -B9 'persist-credentials: false' .github/workflows/release.yml`
Expected: eslint 0 problems（antfu 配置用 yaml-eslint-parser 解析 workflow，语法错会报 fatal）；grep 输出里 `persist-credentials` 与 `fetch-depth`、`ref` 同为 10 格缩进，
往上最近的非注释行是 `with:`、再往上是 `- uses: actions/checkout@v7`
（`yaml` 包从仓库根 `require` 不到，所以不用 node 直接解析）

- [ ] **Step 4：文档**

`tech-stack.md` 第八节「Release」一行的「选型」列末尾补一句：「checkout 设 `persist-credentials: false`：可写 token 不留在 `.git/config` 里给 `pnpm install` 与测试读到」。
`todo.md` 第 51 行的 `- [ ]` 改为 `- [x]`，行末补「（2026-09-24 已修；运行时证据要等第一次发版）」。

- [ ] **Step 5：提交**（走 `/commit`）

建议信息：`ci: 发版 workflow 的 checkout 不再持久化可写 token`

---

### 任务 2：删掉两个零消费方的脚本（遗留第 4 项）

**Files:**
- Modify: `package.json:39-48`（scripts）
- Modify: `.docs/todo.md:54-55`

**Interfaces:** 无

- [ ] **Step 1：确认零消费方**

Run: `git grep -n -e 'tsdown --watch' -e 'commitlint --edit' -e 'pnpm dev' -e 'nr dev' -e '"dev"' -e 'pnpm commitlint' -e 'run commitlint' -e 'nr commitlint' -- ':!.docs/plans' ':!pnpm-lock.yaml'`
Expected: 只有 `package.json` 的两行、`.husky/commit-msg` 的 `pnpm exec commitlint --edit "$1"`（直接调 bin，不经过脚本）、`todo.md` 第 54 行。
出现其他引用 → 先读它，确认是否真的在用。

- [ ] **Step 2：删掉两行**

`package.json` 的 `scripts` 删去 `"commitlint": "commitlint --edit",` 与 `"dev": "tsdown --watch",`，其余键与顺序不动。

- [ ] **Step 3：验证**

Run: `node -e "const s=require('./package.json').scripts;console.log(Object.keys(s).join(' '))" && node_modules/.bin/eslint package.json`
Expected: 键里没有 `dev`、`commitlint`；eslint 0 problems（antfu 的 package.json 键序规则不报错）

- [ ] **Step 4：文档**

`todo.md` 第 54 行改 `- [x]`，行末补「（2026-09-24 已删；README 与 CLAUDE.md 本来就没提）」。

- [ ] **Step 5：提交**（走 `/commit`）。这次提交本身经过 commit-msg 钩子，就是「删掉脚本后提交钩子照常工作」的证据：看到 commitlint 通过、提交成功。

建议信息：`chore: 删掉没有消费方的 dev 与 commitlint 脚本`

---

### 任务 3：壳里经由包名引用内核改为拦截（遗留第 5 项）

**Files:**
- Modify: `test/unit/eslint-guards.test.ts:30-42`（常量）、`:141-156`（vue 项）
- Modify: `eslint.config.ts:136-146`（`todo-fx/boundaries/vue`）
- Modify: `.docs/architecture.md` 第八节 vue 一行
- Modify: `.docs/todo.md:56-58`

**Interfaces:** 无

**缺陷现场（计划阶段已在 scratchpad 副本里复现）：** `src/vue/index.ts` 写 `import '@huberyyang/todo-fx'`，`node_modules/.bin/tsdown` 报
`[UNRESOLVED_IMPORT] Could not resolve '@huberyyang/todo-fx' in src/vue/index.ts`，exit 1。dist 不存在、已存在两种状态都一样。
而 lint 守卫现在把这种写法列为「放行」。

- [ ] **Step 1：在仓库里再复现一次缺陷现场，并跑一次对照**

Run:
```bash
S=/private/tmp/claude-501/-Users-hubery-Desktop-code-todo-fx/6fa0999c-f684-4535-ab47-68595d5bd730/scratchpad/selfref
rm -rf $S && mkdir -p $S && cp -R src package.json tsdown.config.ts tsconfig.json $S && ln -s "$PWD/node_modules" $S/node_modules
printf "import '@huberyyang/todo-fx'\n\nexport {}\n" > $S/src/vue/index.ts
(cd $S && node_modules/.bin/tsdown; echo "exit=$?") 2>&1 | grep -E 'UNRESOLVED_IMPORT|exit='
printf "import '../index'\n\nexport {}\n" > $S/src/vue/index.ts
(cd $S && node_modules/.bin/tsdown; echo "exit=$?") 2>&1 | grep -E 'UNRESOLVED_IMPORT|exit='
```
Expected: 第一次有 `UNRESOLVED_IMPORT` 且 `exit=1`；第二次（对照，`'../index'`）没有 `UNRESOLVED_IMPORT` 且 `exit=0`

- [ ] **Step 2：写失败的测试**

`eslint-guards.test.ts` 常量区在 `SHELL` 下面加一行：

```ts
const SHELL_SELF = '壳不得经由包名引用内核'
```

vue 项改成：

```ts
describe('vue/：只能 import 公开入口', () => {
  const file = 'src/vue/define-component.ts'
  it.each<Violation>([
    [file, `import '../runtime/loop'`, 'no-restricted-imports', SHELL],
    [file, `import '../effects/liquid-text'`, 'no-restricted-imports', SHELL],
    [file, `import '../compute/params'`, 'no-restricted-imports', SHELL],
    [file, `import '..'`, 'no-restricted-imports', SHELL],
    ['src/vue/LiquidText.vue', `<script setup lang="ts">\nimport '../runtime/loop'\n</script>\n`, 'no-restricted-imports', SHELL],
    [file, `import { createLiquidText } from '@huberyyang/todo-fx'\nexport const c = createLiquidText`, 'no-restricted-imports', SHELL_SELF],
    [file, `import '@huberyyang/todo-fx/vue'`, 'no-restricted-imports', SHELL_SELF],
  ])('%s 拦住 %s', expectBlocked)

  it.each<Allowed>([
    [file, `import { createLiquidText } from '../index'\nexport const c = createLiquidText`],
    [file, `import { h } from 'vue'\nexport const v = h`],
    [file, `import './index'`],
  ])('%s 放行 %s', expectAllowed)
})
```

- [ ] **Step 3：跑，确认失败**

Run: `node_modules/.bin/vitest run test/unit/eslint-guards.test.ts`
Expected: 恰好 2 条 FAIL，都是新加的 `SHELL_SELF` 用例，失败原因是 `expected [] to have a length of 1`（规则还不拦）；其余 71 条通过

- [ ] **Step 4：改规则**

`eslint.config.ts` 的 `todo-fx/boundaries/vue` 改为：

```ts
  {
    name: 'todo-fx/boundaries/vue',
    files: ['src/vue/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?!/index$)(?:/|$)', message: '壳只能经由公开入口 \'../index\' 调用内核。' },
          { regex: '^@huberyyang/todo-fx(?:/|$)', message: '壳不得经由包名引用内核：tsdown 构建时解析不到自己的包名（UNRESOLVED_IMPORT），改用 \'../index\'。' },
        ],
      }],
    },
  },
```

- [ ] **Step 5：跑，确认通过**

Run: `node_modules/.bin/vitest run test/unit/eslint-guards.test.ts`
Expected: 73 passed（原 72 条：放行里删 1 条、拦截里加 2 条）

- [ ] **Step 6：变异验证**

变异脚本用单引号 heredoc，免得 shell 把正则里的 `$` 吃掉；按行过滤而不是写正则匹配，打偏的风险更小：

```bash
BAK=/private/tmp/claude-501/-Users-hubery-Desktop-code-todo-fx/6fa0999c-f684-4535-ab47-68595d5bd730/scratchpad/eslint.config.ts.bak
cp eslint.config.ts $BAK
node --input-type=module <<'EOF'
import fs from 'node:fs'
const p = 'eslint.config.ts'
const lines = fs.readFileSync(p, 'utf8').split('\n')
const kept = lines.filter(l => !l.includes('message: \'壳不得经由包名引用内核'))
if (kept.length !== lines.length - 1)
  throw new Error(`应删 1 行，实际删了 ${lines.length - kept.length} 行`)
fs.writeFileSync(p, kept.join('\n'))
EOF
cmp -s eslint.config.ts $BAK && echo '文件没变' || echo '文件已变'
node_modules/.bin/vitest run test/unit/eslint-guards.test.ts
cp $BAK eslint.config.ts && cmp eslint.config.ts $BAK && echo '已还原'
```
Expected: 「文件已变」；测试恰好 2 条 FAIL（两条 `SHELL_SELF`）；「已还原」

- [ ] **Step 7：全量 lint 与 unit**

Run: `node_modules/.bin/eslint && node_modules/.bin/vitest run --project unit`
Expected: eslint 0 problems；unit 73 passed

- [ ] **Step 8：文档**

`architecture.md` 第八节表格的 vue 一行改为：

```markdown
| `vue/` | import 公开入口以外的任何内部路径；经由包名 `@huberyyang/todo-fx` 自引用 | 壳只能走公开内核 API；包名自引用在 tsdown 构建时解析不到（`UNRESOLVED_IMPORT`），只能写 `'../index'` |
```

`todo.md` 第 56 行改 `- [x]`，行末补「（2026-09-24 已修：先复现构建失败，新用例先红后绿，删规则变异后恰好这 2 条红）」。

- [ ] **Step 9：提交**（走 `/commit`）

建议信息：`fix(lint): 壳里经由包名引用内核改为拦截，这种写法构建不通`

---

### 任务 4：核实 tsdown 在 TS 7 下能不能生成 d.ts（遗留第 7 项）

**Files:**
- Create（scratchpad，不进仓库）：`<scratchpad>/ts7-dts/{package.json,tsconfig.json,tsdown.config.ts,src/index.ts,src/vue/index.ts}`
- Modify: `.docs/tech-stack.md:16`（第一节 TS 7 一行）
- Modify: `.docs/design.md:409`（v7 一行，仅当结论要求改措辞）
- Modify: `.docs/todo.md:62-64`

**Interfaces:** 无

**计划阶段读源码得到的预期**（rolldown-plugin-dts 0.28.6）：`isTS70Installed()` 判断 `typescript/package.json` 的版本前缀是否为 `"7.0"`；
没开 `isolatedDeclarations`、也没有自定义语言（Vue SFC）时，装了 TS 7.0 就自动改用 `generator: 'tsgo'`（启动 TS 7.0 自带的原生二进制），不再调用编译器 API。
本项目的 Vue 壳写成 `defineComponent` + 渲染函数，`src` 里没有 `.vue`，tsdown 0.23.0 也不会自动开 `vue` 选项。
**风险点**：前缀判断写死 `"7.0"`，TS 7.1 会走回 `tsc` 路径，然后因为没有编译器 API 报错。

- [ ] **Step 1：搭实验目录**（沙箱外，需联网）

```bash
S=/private/tmp/claude-501/-Users-hubery-Desktop-code-todo-fx/6fa0999c-f684-4535-ab47-68595d5bd730/scratchpad/ts7-dts
rm -rf $S && mkdir -p $S/src/vue && cd $S
cat > package.json <<'EOF'
{ "name": "ts7-dts-probe", "type": "module", "version": "0.0.0", "private": true }
EOF
cat > tsconfig.json <<'EOF'
{ "compilerOptions": { "target": "ESNext", "module": "ESNext", "moduleResolution": "Bundler", "strict": true,
  "verbatimModuleSyntax": true, "skipLibCheck": true, "lib": ["ESNext", "DOM"], "types": [] }, "include": ["src"] }
EOF
cat > tsdown.config.ts <<'EOF'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts', vue: 'src/vue/index.ts' },
  dts: true,
  target: 'es2020',
  platform: 'neutral',
})
EOF
cat > src/index.ts <<'EOF'
export interface FxOptions { strength?: number, accent?: string }
export interface FxInstance { patch: (opts: Partial<FxOptions>) => void, destroy: () => void }
export function createX(textEl: HTMLElement, layerEl: HTMLElement, opts: FxOptions = {}): FxInstance | null {
  return textEl && layerEl && opts ? { patch() {}, destroy() {} } : null
}
EOF
cat > src/vue/index.ts <<'EOF'
import type { FxOptions } from '../index'
import { createX } from '../index'

export type ShellProps = FxOptions & { text: string }
export const create = createX
EOF
pnpm add -D tsdown@0.23.0 typescript@~7.0.0
```
Expected: 安装成功；`node -p "require('typescript/package.json').version"` 输出 `7.0.x`

- [ ] **Step 2：TS 7.0 下构建，看 generator**

Run: `cd $S && DEBUG='rolldown-plugin-dts:*' node_modules/.bin/tsdown > build-ts7.log 2>&1; echo "exit=$?"; grep -iE 'tsgo|generator|error' build-ts7.log | head; ls dist; cat dist/index.d.ts dist/vue.d.ts`
Expected（按源码推断）: `exit=0`；日志里出现 `[tsgo]`；`dist/index.d.ts` 含 `FxOptions`、`FxInstance`、`createX` 的声明，`dist/vue.d.ts` 含 `ShellProps` 与 `create`

- [ ] **Step 3：对照：同一目录换回 TS 6.0.3**

Run: `cp -R dist dist-ts7 && pnpm add -D typescript@6.0.3 && DEBUG='rolldown-plugin-dts:*' node_modules/.bin/tsdown > build-ts6.log 2>&1; echo "exit=$?"; grep -ciE '\[tsgo\]' build-ts6.log; diff -r dist-ts7 dist && echo 'd.ts 与 TS 6 一致'`
Expected: `exit=0`；`[tsgo]` 计数为 0；`diff` 只可能有 chunk 哈希或格式差异。声明内容不一致 → 逐处记进 tech-stack，不要只写「能用」

- [ ] **Step 4：按结果改文档**

**若 Step 2 通过：** `tech-stack.md` 第 16 行「结论」列改为：

```markdown
vue-tsc（Volar）、typescript-eslint（peer `>=4.8.4 <6.1.0`）都依赖这套 API → 锁 6。tsdown 0.23.0 不受影响：装了 TS 7.0 时 rolldown-plugin-dts 0.28.6 自动改用 tsgo 生成 d.ts（2026-09-24 在隔离目录实测，产物与 TS 6 <一致 / 差异写在这里>）；但它按版本前缀 `"7.0"` 判断，TS 7.1 会退回编译器 API 路径而失败，将来迁移时要先看它是否跟进
```

`design.md` 第 409 行「TypeScript 锁 6.0.3（7 没有编译器 API）」保持不变（锁 6 的结论没变）。CLAUDE.md 那条等任务 9 按 Hubery 的答复改。

**若 Step 2 失败：** 把报错原文记进账本；`tech-stack.md` 第 16 行在结论后补「tsdown 0.23.0 在 TS 7.0 下实测失败：<报错>」，CLAUDE.md 不改。

`todo.md` 第 62 行改 `- [x]`，行末补一句实测结论。

- [ ] **Step 5：提交**（走 `/commit`）

建议信息：`docs: 核实 TS 7.0 下 tsdown 生成 d.ts 的实际行为`

---

### 任务 5：many-instances 自检改为真的观测上下文被挤掉（遗留第 1 项，本地部分）

**Files:**
- Modify: `test/browser/host-fixtures.browser.test.ts:1-10`（import）、`:130-135`（这条自检）
- Modify: `playground/fixtures/many-instances.ts:4`（注释）

**Interfaces:**
- Consumes: `manyInstances.mount(root)` 返回 18 个 `{ textEl, layerEl }`；`server` 来自 `vitest/browser`，`server.browser` 在默认 instance 上是 `'chromium' | 'firefox' | 'webkit'`，`server.platform` 是 `'darwin' | 'linux'`（计划阶段干跑确认）
- Produces: 常量 `evicted: Record<string, number[]>`，任务 8 可能改成按 `平台/内核` 取值

**缺陷现场：** 旧用例只断言 `targets.length > 16`，这是夹具自己的常量，从没见过「上下文被挤掉」。在 Firefox 上它照样全绿，而 Firefox 到 40 个上下文也不丢（tech-stack 第六节），这个夹具在 Firefox 上根本不构成陷阱。

**计划阶段干跑（macOS，2026-09-24）：** Chromium、WebKit 建 18 个 WebGL2 上下文，`isContextLost()` 在建完当场就是第 0、1 个为 `true`，等两帧再加 300 ms 仍是 `[0, 1]`。
Firefox 这次没跑成（任务 0），终审当时实测一个不丢。按 tech-stack 第六节③，上限只在单个文档内生效，每个测试文件都是新的 iframe 文档，所以不必在用例结束时释放上下文。

- [ ] **Step 1：写新用例替换旧的**

import 区加一行（按 antfu 的 import 排序放在 `vitest` 之后）：

```ts
import { server } from 'vitest/browser'
```

在 `describe('陷阱确实存在', …)` 之前加：

```ts
// 同一文档里超过上限时，最早建的上下文当场被挤掉（isContextLost() 立即为 true）。
// Firefox 的上限高得多（tech-stack 第六节：40 个也不丢），在它上面这个夹具不构成陷阱
const evicted: Record<string, number[]> = { chromium: [0, 1], firefox: [], webkit: [0, 1] }
```

把 `it('实例数超过同文档 WebGL 上下文上限（16）', …)` 整条替换为：

```ts
  it('每个实例一个 WebGL 上下文时，最早建的被挤掉', async ({ annotate }) => {
    const { targets, cleanup } = manyInstances.mount(freshRoot())
    const contexts = targets.map(({ layerEl }) => {
      const canvas = document.createElement('canvas')
      layerEl.append(canvas)
      return canvas.getContext('webgl2')!
    })
    const lost = contexts.flatMap((gl, i) => gl.isContextLost() ? [i] : [])
    await annotate(`${server.platform}/${server.browser}：${targets.length} 个上下文里被挤掉的是 ${JSON.stringify(lost)}`)
    expect(lost).toEqual(evicted[server.browser])
    cleanup()
  })
```

- [ ] **Step 2：跑，看它在三个内核上的结果**（沙箱外）

Run: `node_modules/.bin/vitest run --project 'browser (chromium)' --project 'browser (webkit)' --project 'browser (firefox)' test/browser/host-fixtures.browser.test.ts --reporter=verbose 2>&1 | grep -E '被挤掉|✓|×|Tests '`
（`LOCAL_BROWSER` 不含 Firefox 时去掉 firefox 那个 `--project`）
Expected: 注解 `darwin/chromium：18 个上下文里被挤掉的是 [0,1]`、`darwin/webkit：… [0,1]`、`darwin/firefox：… []`；全部通过

- [ ] **Step 3：变异验证：夹具不再超上限，Chromium / WebKit 必须红**

```bash
BAK=/private/tmp/claude-501/-Users-hubery-Desktop-code-todo-fx/6fa0999c-f684-4535-ab47-68595d5bd730/scratchpad/many-instances.ts.bak
cp playground/fixtures/many-instances.ts $BAK
sed -i '' 's/^const COUNT = 18$/const COUNT = 16/' playground/fixtures/many-instances.ts
cmp -s playground/fixtures/many-instances.ts $BAK && echo '文件没变' || echo '文件已变'
node_modules/.bin/vitest run --project 'browser (chromium)' --project 'browser (webkit)' test/browser/host-fixtures.browser.test.ts 2>&1 | grep -E '×|FAIL|Tests '
cp $BAK playground/fixtures/many-instances.ts && cmp playground/fixtures/many-instances.ts $BAK && echo '已还原'
```
Expected: 「文件已变」；两个内核各恰好 1 条 FAIL（这条新用例，`expected [] to deeply equal [0, 1]`）；「已还原」

- [ ] **Step 4：变异验证：预期表写错，Firefox 必须红**（`LOCAL_BROWSER` 不含 Firefox 时跳过，记进账本，由任务 7 的 CI 兜）

把 `firefox: []` 临时改成 `firefox: [0, 1]`，`cmp` 确认后只跑 `--project 'browser (firefox)'`。
Expected: 恰好 1 条 FAIL；还原后 `cmp` 一致

- [ ] **Step 5：夹具注释**

`many-instances.ts` 第 4 行改为：

```ts
// Chromium 与 WebKit 同一文档里第 17 个 WebGL 上下文会挤掉最旧的一个（实测），所以要比 16 多；Firefox 上限高得多，这里不会触发
```

- [ ] **Step 6：lint、类型检查**

Run: `node_modules/.bin/eslint test/browser/host-fixtures.browser.test.ts playground/fixtures/many-instances.ts && node_modules/.bin/vue-tsc --noEmit`
Expected: 0 problems；vue-tsc 无输出、exit 0

- [ ] **Step 7：提交**（走 `/commit`）。todo 第 46 行**先不勾**：Linux 的数字要等任务 7。

建议信息：`test: many-instances 自检改为真的建上下文、数被挤掉的个数`

---

### 任务 6：modern-colors 自检加 display-p3（遗留第 2 项，本地部分）

**Files:**
- Modify: `playground/fixtures/modern-colors.ts:4-15`
- Modify: `test/browser/host-fixtures.browser.test.ts`（`计算值不是 rgb 形式…` 那条的 `expected` 表）
- Modify: `.docs/design.md` 第十三节夹具表「oklch / lab / color-mix 颜色」一行

**Interfaces:**
- Produces: `modernColorValues` 多一项 `'color(display-p3 1 0 0)'`，下标 3

**计划阶段干跑（macOS）：** Chromium、WebKit 上 `color(display-p3 1 0 0)` 的计算值原样保留，回读 `255,0,0,255`；正则取前三个数字得到 `3,1,0`。

- [ ] **Step 1：先改测试的预期表**（夹具还没有这一项，所以这一步只是让预期先落地）

`expected` 表加一项：

```ts
      'color(display-p3 1 0 0)': { computed: 'color(display-p3 1 0 0)', rgba: [255, 0, 0, 255] },
```

- [ ] **Step 2：夹具加这一项**

```ts
/** 计算值不会统一转成 rgb 的写法（design.md 第九节）；display-p3 超出 sRGB 色域，回读时被裁到 sRGB */
export const modernColorValues = [
  'oklch(0.7 0.15 200)',
  'lab(50 40 30)',
  'color-mix(in srgb, red 50%, blue)',
  'color(display-p3 1 0 0)',
] as const
```

`title` 改为 `'oklch / lab / color-mix / display-p3 颜色'`。

- [ ] **Step 3：跑夹具测试**（沙箱外）

Run: `node_modules/.bin/vitest run --project 'browser (chromium)' --project 'browser (webkit)' --project 'browser (firefox)' test/browser/host-fixtures.browser.test.ts 2>&1 | grep -E '×|FAIL|Tests '`
（不含 Firefox 时去掉那个 `--project`）
Expected: 全部通过。modern-colors 的「结构与清理」两条也通过（新 target 同样没有 style、结构一致）

- [ ] **Step 4：变异验证：p3 的预期写错，必须红**

把 `rgba: [255, 0, 0, 255]` 临时改成 `rgba: [254, 0, 0, 255]`，`cmp` 确认文件已变，跑 Step 3 的命令。
Expected: 每个内核恰好 1 条 FAIL（`计算值不是 rgb 形式…`），报错里的实际值是 `[255, 0, 0, 255]`；还原后 `cmp` 一致

- [ ] **Step 5：design 第十三节**

夹具表那一行改为 `| oklch / lab / color-mix / display-p3 颜色 | 第九节的解析坑 |`。第九节 p3 那句等任务 8 看过 CI 再改。

- [ ] **Step 6：lint、类型检查**

Run: `node_modules/.bin/eslint playground test .docs/design.md && node_modules/.bin/vue-tsc --noEmit`
Expected: 0 problems；vue-tsc exit 0

- [ ] **Step 7：提交**（走 `/commit`）。todo 第 49 行先不勾。

建议信息：`test: modern-colors 自检加 display-p3，让 Linux 上也验一遍回读`

---

### 任务 7：CI 实验：Firefox 的 headless / display，以及 Linux 上的两组数字（遗留第 6 项，第 1、2 项的 Linux 部分）

**Files（只在临时分支上，不进 dev）:**
- `.github/workflows/ci.yml`（push 触发分支加 `lab/**`；bare 分支去掉 `xvfb-run`）
- `vitest.config.ts`（两条分支都删 `firefoxHeadless`）

**Interfaces:**
- Consumes: 任务 5、6 在 dev 上的提交（实验分支从 dev 的 HEAD 切出）
- Produces: 三组实测数据，写进账本，供任务 8 定稿：
  - `lab/ff-headless-xvfb`：所有 Firefox instance 都 headless、仍在 `xvfb-run` 下时，Firefox 探针过不过
  - `lab/ff-headless-bare`：同上但不套 `xvfb-run` 时，**全部 6 个 instance** 的探针过不过
  - 两条分支上 Linux 三内核的 `被挤掉` 注解与 p3 那条用例的结果

**实验设计的理由：** 现在的配置是默认 Firefox instance 在 CI 里 headed、firefox-touch 继承 headless，整条命令都在 `xvfb-run` 下。
run 35950071354 已经证明「headless + xvfb」能建出 WebGL，但分不清是 headless 本身就行，还是 xvfb 提供的 display 在起作用。
bare 分支上 display 不存在：headed 的 Firefox 会直接起不来，所以那里如果通过，就同时证明了「headless」和「不需要 display」。
两条分支的 ref 不同，`concurrency` 按 ref 分组，互不取消，可以同时跑。

- [ ] **Step 1：切 xvfb 分支并改两处**

```bash
git switch -c lab/ff-headless-xvfb dev
```

`ci.yml` 的 `on.push.branches` 加一项 `- 'lab/**'`。
`vitest.config.ts`：删掉 `import process from 'node:process'`、`firefoxHeadless` 常量和它上面两行注释，默认 Firefox instance 改成 `{ browser: 'firefox' },`。

Run: `node_modules/.bin/eslint vitest.config.ts .github/workflows/ci.yml && node_modules/.bin/vue-tsc --noEmit`
Expected: 0 problems；exit 0

提交（走 `/commit`），建议信息：`ci: 实验：CI 里的 Firefox 全部 headless，仍套 xvfb`

- [ ] **Step 2：从它切 bare 分支，去掉 xvfb**

```bash
git switch -c lab/ff-headless-bare
```

`ci.yml` browser job 的最后一步改为 `- run: pnpm test --project browser`，上面那行注释删掉。
提交（走 `/commit`），建议信息：`ci: 实验：浏览器测试不套 xvfb-run`

- [ ] **Step 3：推两条分支**（沙箱外；已由计划授权）

Run: `git push -u origin lab/ff-headless-xvfb lab/ff-headless-bare && git switch dev`
Expected: 两条分支都推上去；随后 `gh run list --branch lab/ff-headless-xvfb --limit 1` 与 `--branch lab/ff-headless-bare` 各有一个 `in_progress` 的 CI

- [ ] **Step 4：等两个 run 结束**（用 Monitor 或后台命令等 `gh run watch <id> --exit-status`，不要前台 sleep 轮询）

- [ ] **Step 5：读结果，记进账本**

每个 run 执行：

```bash
gh run view <id> --json jobs --jq '.jobs[] | "\(.name)=\(.conclusion)"'
gh run view <id> --log --job <browser job id> | grep -E '::notice|×|FAIL|Tests ' | sed 's/^.*::notice/::notice/' | sort -u
```

账本里记这些：

| 数据 | xvfb 分支 | bare 分支 |
| :-- | :-- | :-- |
| browser job 结论 | | |
| firefox / firefox-touch 的 webgl2、webgl、2d 探针 | | |
| chromium、webkit 及其 touch instance 的探针（仅 bare 分支有新信息） | — | |
| Linux 三内核「被挤掉的是」注解 | | |
| Linux 三内核 modern-colors 那条是否通过；不通过时的实际回读值 | | |

- [ ] **Step 6：按决策表下结论**，记为账本里的 `Task 7: Ruling:`

| xvfb 分支（Firefox） | bare 分支 | 结论（任务 8 照此改） |
| :-- | :-- | :-- |
| 通过 | 全部 6 个 instance 通过 | **headed 与 display 都不需要**：删 `firefoxHeadless`，ci.yml 与 release.yml 都去掉 `xvfb-run` |
| 通过 | Firefox 失败，其余通过 | **headed 不需要，display 需要**：删 `firefoxHeadless`，保留 `xvfb-run`，注释改成「headless 的 Firefox 在 Linux 上也要有 display 才建得出 WebGL」 |
| 通过 | Chromium 或 WebKit 失败 | 同上一行，注释写明是哪个内核需要 display |
| 失败 | 任意 | 与 run 35950071354 矛盾（那次 headless 的 firefox-touch 在 xvfb 下通过）。**停下**，按 systematic-debugging 先查清两次的差别，不改配置 |

被挤掉的个数与 p3：与 macOS 一致 → 任务 8 不改断言；不一致 → 任务 8 按 `平台/内核` 分开写预期。

---

### 任务 8：在 dev 上定稿配置、断言与文档（遗留第 6 项，第 1、2 项收尾）

**Files:**
- Modify: `vitest.config.ts`
- Modify: `.github/workflows/ci.yml:55-59`、`.github/workflows/release.yml:54-57`
- Modify: `test/browser/host-fixtures.browser.test.ts`（仅当 Linux 数字与 macOS 不同）
- Modify: `.docs/tech-stack.md` 第六节 `browser` 一行、第九节「浏览器」一行、第十二节「CI 里三个内核都能创建 WebGL」一行
- Modify: `.docs/design.md` 第九节 p3 那句、第十二节 swiftshader 那一行末尾的 Firefox 说明
- Modify: `.docs/todo.md:46-50`、`:59-61`

**Interfaces:**
- Consumes: 任务 7 的 Ruling 与账本数据

下面按决策表第一行（「都不需要」）写出具体改法；落在第二、三行时，保留 `xvfb-run` 与它的注释，只把注释的理由换成实测结论，其余照做。

- [ ] **Step 1：vitest.config.ts**

删掉 `import process from 'node:process'`、`firefoxHeadless` 及其两行注释；默认 Firefox instance 改为 `{ browser: 'firefox' },`。

- [ ] **Step 2：ci.yml 的 browser job**

```yaml
      # 不缓存浏览器：Playwright 官方不推荐，恢复与下载耗时相当，系统依赖本来就缓存不了。
      # --only-shell 只影响 Chromium：无头模式只用得到 headless shell
      - run: pnpm exec playwright install --with-deps --only-shell chromium firefox webkit
      # 三个内核全部 headless，不需要 xvfb：CI 实测（run <bare 分支的 run id>）不套 xvfb-run 时三内核的 WebGL 探针都通过
      - run: pnpm test --project browser
```

- [ ] **Step 3：release.yml 的门禁**

`- run: xvfb-run -a pnpm test` 改为 `- run: pnpm test`。

- [ ] **Step 4：Linux 数字不同时才做：断言按平台分开**

例（数字以任务 7 实测为准）：

```ts
// 键是 `${server.platform}/${server.browser}`：Linux（CI）与 macOS 的上限不同，实测见 tech-stack 第六节
const evicted: Record<string, number[]> = {
  'darwin/chromium': [0, 1],
  'darwin/firefox': [],
  'darwin/webkit': [0, 1],
  'linux/chromium': [/* 任务 7 实测 */],
  'linux/firefox': [/* 任务 7 实测 */],
  'linux/webkit': [/* 任务 7 实测 */],
}
```

用例里取值改为 `evicted[`${server.platform}/${server.browser}`]`。p3 在 Linux 上回读不同的话，同样按平台分开写，并在 design 第九节写明差异。

- [ ] **Step 5：本地门禁**（沙箱外）

Run: `node_modules/.bin/vue-tsc --noEmit && node_modules/.bin/eslint && node_modules/.bin/vitest run --project unit --project dist <LOCAL_BROWSER>`
Expected: 类型检查与 lint 为 0；测试全部通过。条数：unit 73（任务 3 净增 1）、dist 6；browser 不变——任务 5 是替换一条用例，任务 6 只给已有用例加了一个 target，
夹具个数没变。`LOCAL_BROWSER` 含 Firefox 时 browser 117、合计 196；不含时 browser 78（Chromium、WebKit 各 35，两个 touch instance 各 4）、合计 157

- [ ] **Step 6：文档**

- `tech-stack.md` 第六节 `browser` 一行：删「Firefox 在 CI 里以 headed 模式运行」；「风险」列里 Mozilla bug 1375585 那段改写为实测结论：
  「外部报告（Mozilla bug 1375585）说 Linux 上 headless Firefox 建不出 WebGL，已被实测推翻：CI（ubuntu-24.04、Firefox 155）不套 xvfb 时 headless 的三内核都建得出 WebGL（run <id>）」；
  「集成」一行③里的上限补上 Linux 的实测数字。
- `tech-stack.md` 第九节「浏览器」一行：删「测试命令包在 `xvfb-run -a` 里」与「xvfb：默认 Firefox instance …待证（第六节）」。
- `tech-stack.md` 第十二节「CI 里三个内核都能创建 WebGL」一行的结论列末尾补：「2026-09-24 复核：三内核全部 headless、不套 xvfb 同样通过（run <id>）」。
- `design.md` 第九节 p3 那句改为「实测 `color(display-p3 1 0 0)` 回读成 `255,0,0`（三内核一致，macOS 与 CI 的 Linux 各跑一遍，见 modern-colors 自检）」；Linux 不一致时如实写差异。
- `design.md` 第十二节 swiftshader 那一行末尾的括号改为「CI 里三内核全部 headless，不需要 xvfb（实测见 tech-stack 第六节）」。
- `todo.md` 第 46、49、59 行改 `- [x]`，各补一句证据（run id、数字）。

- [ ] **Step 7：提交**（走 `/commit`）。配置与文档可分两次提交：

建议信息：`ci: 浏览器测试全部 headless，去掉用不上的 xvfb`；`docs: 按 CI 实测改正 Firefox 与 WebGL 上限的说法`

- [ ] **Step 8：推 dev，看 CI**（沙箱外；已由计划授权）

Run: `git push origin dev`，然后等这次 CI 结束，`gh run view <id> --json jobs --jq '.jobs[] | "\(.name)=\(.conclusion)"'`
Expected: `quality=success`、`browser=success`、`min-peer=success`；browser job 日志里三内核探针的 `::notice` 都在，`被挤掉的是` 注解与预期一致

- [ ] **Step 9：删实验分支**（已由计划授权）

Run: `git push origin --delete lab/ff-headless-xvfb lab/ff-headless-bare && git branch -D lab/ff-headless-xvfb lab/ff-headless-bare`
Expected: 远端与本地都删掉；`git branch -a | grep lab/` 无输出

---

### 任务 9：终审、CLAUDE.md、关闭阶段 0

**Files:**
- Modify: `CLAUDE.md`（按「需要 Hubery 拍板的事」一的答复）
- Modify: `.docs/todo.md`（第 8 项；阶段 0 关闭的说明；第 70 行提醒）
- Modify: `.docs/plans/2026-09-24-phase-0-leftovers.md`（补「执行偏离」）
- Modify: `.docs/README.md`（plans 一行加上本计划）

- [ ] **Step 1：独立终审**

按 executing-plans 的 Final Review：`review-package` 打包 `0de4ba5..HEAD`，派最强模型的 reviewer，附上本计划的「重点审查」原文与账本里的 `Ruling:`。
Critical / Important 进一次修复（每条先写复现它的测试、见红再修）；Minor 按新规则**也要清零**（Hubery 2026-09-24 定：遗留问题包括 Minor 全部清零才推进），修不了的列给 Hubery。

- [ ] **Step 2：CLAUDE.md**：只做 Hubery 同意的项（见上文表格）。第 1 项的原文：

```markdown
| 写浏览器测试，或新增会改 page 状态的自定义 command | [`.docs/tech-stack.md`](.docs/tech-stack.md) 第六节「集成」一行 | 测试依赖宿主系统默认的媒体状态，本地全绿、只在 CI 的 Linux WebKit 上红；或新 command 的状态跨用例、跨文件残留 |
```

- [ ] **Step 3：todo.md**

第 65 行（CLAUDE.md 候选）改 `- [x]`（或注明「Hubery 未采纳」）；第 37 行那句改为「遗留问题已于 2026-09-24 全部清零（计划见 [`plans/2026-09-24-phase-0-leftovers.md`](plans/2026-09-24-phase-0-leftovers.md)），阶段 0 关闭」；
第 70 行的提醒保留。

- [ ] **Step 4：本计划补「执行偏离」**，把账本里的 `Ruling:` 与实测数字汇总进去；`.docs/README.md` 的 plans 一行加上「[阶段 0 遗留问题](plans/2026-09-24-phase-0-leftovers.md)」。

- [ ] **Step 5：最终门禁**（沙箱外）

Run: `node_modules/.bin/vue-tsc --noEmit && node_modules/.bin/eslint && node_modules/.bin/vitest run --project unit --project dist <LOCAL_BROWSER> && git status --short`
Expected: 全部为 0 / 通过；工作区只剩本任务的文档改动

- [ ] **Step 6：提交**（走 `/commit`），推 dev（已授权），看 CI 全绿；删掉账本工作区目录。

建议信息：`docs: 阶段 0 遗留问题清零，关闭阶段 0`

- [ ] **Step 7：问 Hubery 是否合并到 main**（按记忆里的流程：本地快进、在 main 上跑全量门禁、推送、切回 dev）。

---

## 自查记录

### 覆盖对照

| 遗留项 | 任务 |
| :-- | :-- |
| 1 many-instances 同义反复 | 5（本地）、7（Linux 数字）、8（定稿） |
| 2 display-p3 无测试 | 6（本地）、7（Linux）、8（design 措辞） |
| 3 release.yml token | 1 |
| 4 零消费方脚本 | 2 |
| 5 lint 放行构建不通的路 | 3 |
| 6 Firefox headed | 7（实验）、8（定稿） |
| 7 tsdown 与 TS 7 | 4 |
| 8 CLAUDE.md 候选 | 9（须同意） |

### 计划阶段的干跑（2026-09-24）

- 上下文挤掉与 p3：见任务 5、6 的「计划阶段干跑」。临时测试文件跑完即删，工作区干净。
- 包名自引用：scratchpad 副本里复现 `UNRESOLVED_IMPORT`，见任务 3。
- changelogithub 15.0.5：`npm pack` 后读源码，git 子命令只有本地读操作，GitHub API 用 `options.token`（来自 `GITHUB_TOKEN`），见任务 1。
- rolldown-plugin-dts 0.28.6：读 `resolveOptions` 与 `isTS70Installed`，见任务 4；**没有实跑**，这正是任务 4 要做的事。

### 只能在 CI 上证实的

- Firefox 的 headless 与 display（任务 7）。
- Linux 三内核的上下文上限与 p3 回读（任务 7）。
- `persist-credentials: false` 下的发版：要到第一次发版（阶段 3 之后）才会真正跑到。
