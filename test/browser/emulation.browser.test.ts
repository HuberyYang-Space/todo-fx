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
