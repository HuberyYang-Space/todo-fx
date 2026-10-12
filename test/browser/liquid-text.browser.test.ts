import type { LiquidTextOptions } from '../../src/index'
import type { MountedHeading } from './helpers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { createLiquidText } from '../../src/index'
import { mountHeading, nextFrames, readPixels } from './helpers'

// 液态版只测自己的渲染（architecture.md 第九节）；时序由 runtime 的测试管。
// shader 编译失败是静默的：画布一片空白、无报错，只有读回像素才发现得了
let target: MountedHeading
const cleanups: Array<() => void> = []

beforeEach(() => {
  target = mountHeading('Hubery', 'font: 700 64px sans-serif; margin: 0; color: rgb(0, 0, 0);')
  cleanups.push(target.cleanup)
})

afterEach(() => {
  while (cleanups.length)
    cleanups.pop()!()
  vi.restoreAllMocks()
})

function start(options?: LiquidTextOptions) {
  const instance = createLiquidText(target.textEl, target.layerEl, options)!
  expect(instance).not.toBeNull()
  cleanups.push(() => instance.destroy())
  return instance
}

const canvas = (): HTMLCanvasElement => target.layerEl.querySelector('canvas')!

/** 完全不透明的像素里，各通道的平均值；字心处三通道采样一致，没有色差，颜色就是 uColor */
async function solidColor(): Promise<{ count: number, rgb: number[] }> {
  const pixels = await readPixels(canvas())
  let count = 0
  const sum = [0, 0, 0]
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 255) {
      count++
      sum[0]! += pixels[i]!
      sum[1]! += pixels[i + 1]!
      sum[2]! += pixels[i + 2]!
    }
  }
  return { count, rgb: sum.map(v => Math.round(v / Math.max(count, 1))) }
}

/** 鼠标从左到右横扫画布中线 */
function sweep(): void {
  const rect = canvas().getBoundingClientRect()
  for (let x = 0; x <= 10; x++)
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + rect.width * (0.2 + x * 0.06), clientY: rect.top + rect.height / 2 }))
}

/** idle 为 0 时画面静止；横扫一遍鼠标之后，读回的像素必须与扫之前不同 */
async function expectStirred(): Promise<void> {
  const still = await readPixels(canvas())
  sweep()
  await expect.poll(async () => {
    const moved = await readPixels(canvas())
    return moved.some((v, i) => v !== still[i])
  }).toBe(true)
}

async function maxAlpha(): Promise<number> {
  const pixels = await readPixels(canvas())
  let max = 0
  for (let i = 3; i < pixels.length; i += 4)
    max = Math.max(max, pixels[i]!)
  return max
}

describe('liquid-text', () => {
  it('画得出字：读回不透明像素，颜色继承自父元素', async () => {
    target.heading.style.color = 'rgb(255, 0, 0)'
    start()
    await expect.poll(() => target.textEl.style.color).toBe('transparent')
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    expect((await solidColor()).rgb).toEqual([255, 0, 0])
  })

  it('patch 颜色之后画面跟着变（颜色每帧写进 uniform，不是只写一次）', async () => {
    const instance = start()
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    await new Promise(resolve => setTimeout(resolve, 300))
    instance.patch({ color: 'rgb(0, 0, 255)' })
    await expect.poll(async () => (await solidColor()).rgb).toEqual([0, 0, 255])
  })

  it('颜色自带的 alpha 乘进最终 alpha', async () => {
    target.heading.style.color = 'rgba(0, 0, 0, 0.6)'
    start()
    await expect.poll(() => target.textEl.style.color).toBe('transparent')
    // 0.6 × 255 ≈ 153；软件渲染与 GPU 取整可能差 1。开着混合时 alpha 会再乘一次，落到 92
    await expect.poll(async () => Math.abs(await maxAlpha() - 153)).toBeLessThanOrEqual(1)
  })

  it('重建类参数（flowmap）改了之后照样画得出字、照样跟着鼠标流动', async () => {
    const instance = start({ idle: 0 })
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    instance.patch({ flowmap: { dissipation: 0.5 }, padding: 10 })
    await expect.poll(() => Number.parseFloat(canvas().style.width)).toBeCloseTo(target.textEl.getBoundingClientRect().width + 20, 3)
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    await expectStirred()
  })

  it('flowmap 的新值确实生效：alpha 改成 0 之后鼠标划过不再搅动画面', async () => {
    const instance = start({ idle: 0 })
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    instance.patch({ flowmap: { alpha: 0 } })
    await nextFrames(3)
    const still = await readPixels(canvas())
    sweep()
    await nextFrames(10)
    expect((await readPixels(canvas())).every((v, i) => v === still[i])).toBe(true)
  })

  it('上下文丢失后恢复：全部 GL 资源重建，照样画得出字', async () => {
    start()
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    const lose = canvas().getContext('webgl2')!.getExtension('WEBGL_lose_context')!
    lose.loseContext()
    await expect.poll(() => target.textEl.style.color).toBe('')
    lose.restoreContext()
    await expect.poll(() => target.textEl.style.color).toBe('transparent')
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
  })

  it('鼠标划过时画面随之变化', async () => {
    start({ idle: 0 })
    await expect.poll(async () => (await solidColor()).count).toBeGreaterThan(100)
    await expectStirred()
  })

  it('休眠中（从没 build 过）的画布不撑出横向滚动：触屏用户一开始就是这个状态', async () => {
    await commands.emulateMedia({ reducedMotion: 'reduce' })
    const box = document.createElement('div')
    box.style.cssText = 'width: 300px; overflow: auto;'
    target.heading.before(box)
    box.append(target.heading)
    cleanups.push(() => box.remove())
    start()
    await nextFrames(3)
    expect(target.textEl.style.color).toBe('')
    // ogl 的 Renderer 一构造就往画布上写 300×150，它又排在标题末尾
    expect(box.scrollWidth).toBe(box.clientWidth)
  })

  it('拿不到 WebGL 上下文时返回 null，不报错', () => {
    const getContext = HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type.startsWith('webgl') ? null : getContext.call(this, type, ...rest as [])
    } as typeof getContext)
    const error = vi.spyOn(console, 'error')
    expect(createLiquidText(target.textEl, target.layerEl)).toBeNull()
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(error).not.toHaveBeenCalled()
  })
})
