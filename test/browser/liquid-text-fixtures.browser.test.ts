import type { FxInstance, LiquidTextOptions } from '../../src/index'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from 'vitest/browser'
import { hiddenContainer } from '../../playground/fixtures/hidden-container'
import { hostFixtures } from '../../playground/fixtures/index'
import { manyInstances } from '../../playground/fixtures/many-instances'
import { narrowWrap } from '../../playground/fixtures/narrow-wrap'
import { createLiquidText } from '../../src/index'
import { nextFrames } from './helpers'

// 8 个宿主场景夹具（design.md 第十三节）原样跑一遍 createLiquidText：playground 手调看到的就是这里测的
const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length)
    cleanups.pop()!()
})

function mount(fixture: typeof hostFixtures[number]) {
  const root = document.createElement('div')
  document.body.append(root)
  const mounted = fixture.mount(root)
  const instances = mounted.targets.map(({ textEl, layerEl }) => createLiquidText(textEl, layerEl))
  cleanups.push(() => root.remove(), mounted.cleanup, () => instances.forEach(i => i?.destroy()))
  const colors = (): string[] => mounted.targets.map(t => t.textEl.style.color)
  return { ...mounted, instances: instances as Array<FxInstance<LiquidTextOptions>>, colors }
}

describe('宿主场景夹具', () => {
  // 这几个夹具里每个实例都该开播
  it.for(hostFixtures.filter(f => ![hiddenContainer, manyInstances, narrowWrap].includes(f)).map(f => [f.id, f] as const))('%s：开播并接管', async ([, fixture]) => {
    const { instances, colors } = mount(fixture)
    expect(instances.every(Boolean)).toBe(true)
    await expect.poll(colors).toEqual(colors().map(() => 'transparent'))
  })

  it('hidden-container：隐藏时显示真文本，显示后接管', async () => {
    const { actions, colors } = mount(hiddenContainer)
    await nextFrames(3)
    expect(colors()).toEqual([''])
    actions.显示()
    await expect.poll(colors).toEqual(['transparent'])
  })

  it('narrow-wrap：折行时显示真文本，加宽后接管', async () => {
    const { actions, colors } = mount(narrowWrap)
    await nextFrames(3)
    expect(colors()).toEqual([''])
    actions.加宽()
    await expect.poll(colors).toEqual(['transparent'])
  })

  // 被挤掉上下文的实例停在真文本，不会变成「透明文字 + 空白画布」；Firefox 的上限高得多，一个都不丢
  const evicted: Record<string, number[]> = { chromium: [0, 1], firefox: [], webkit: [0, 1] }

  it('many-instances：超出上下文上限被挤掉的实例显示真文本，其余接管', async () => {
    const { targets, colors } = mount(manyInstances)
    const expected = colors().map((_, i) => evicted[server.browser]!.includes(i) ? '' : 'transparent')
    await expect.poll(colors).toEqual(expected)
    await nextFrames(10)
    expect(colors()).toEqual(expected)
    // 被挤掉的画布在 Chromium 里会画成不透明白块，必须藏起来，否则真文本被盖住
    const shown = targets.map(({ layerEl }) => getComputedStyle(layerEl.querySelector('canvas')!).display !== 'none')
    expect(shown).toEqual(expected.map(c => c === 'transparent'))
  })

  it('many-instances：被挤掉的实例一次都没有涂透明过（哪怕 lost 事件晚到一帧）', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    const { targets, cleanup } = manyInstances.mount(root)
    const everTransparent = new Set<number>()
    const observer = new MutationObserver(() => {
      targets.forEach(({ textEl }, i) => {
        if (textEl.style.color === 'transparent')
          everTransparent.add(i)
      })
    })
    observer.observe(root, { attributes: true, attributeFilter: ['style'], subtree: true })
    const instances = targets.map(({ textEl, layerEl }) => createLiquidText(textEl, layerEl))
    cleanups.push(() => root.remove(), cleanup, () => observer.disconnect(), () => instances.forEach(i => i?.destroy()))
    await nextFrames(10)
    // WebKit 首帧时 isContextLost() 已经为 true，lost 事件却要到下一帧才派发
    for (const i of evicted[server.browser]!)
      expect(everTransparent.has(i), `第 ${i} 个实例涂过透明`).toBe(false)
  })
})
