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
