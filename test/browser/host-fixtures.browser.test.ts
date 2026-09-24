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
