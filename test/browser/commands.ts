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
