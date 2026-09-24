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
