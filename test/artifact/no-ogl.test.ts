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
