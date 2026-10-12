import type { MountedHeading } from './helpers'
import { afterEach, describe, expect, it } from 'vitest'
import { placeCanvas } from '../../src/runtime/layer'
import { rasterizeText } from '../../src/runtime/text-raster'
import { mountHeading } from './helpers'

let target: MountedHeading

afterEach(() => {
  target?.cleanup()
})

const PADDING = 20
// 不取 devicePixelRatio：无头浏览器里它是 1，乘不乘 dpr 都一样，测不出来
const DPR = 2

function raster(): ReturnType<typeof rasterizeText> {
  const dpr = DPR
  const canvas = document.createElement('canvas')
  target.layerEl.append(canvas)
  canvas.style.position = 'absolute'
  const size = placeCanvas(canvas, target.textEl.getBoundingClientRect(), PADDING, dpr)
  return rasterizeText(target.textEl, size, PADDING, dpr)
}

function pixels({ image, width, height }: ReturnType<typeof rasterizeText>): string {
  return image.getContext('2d')!.getImageData(0, 0, width, height).data.join()
}

/** 墨迹的外框（alpha 过半的像素），物理像素 */
function inkBox({ image, width, height }: ReturnType<typeof rasterizeText>): { left: number, right: number, bottom: number } {
  const data = image.getContext('2d')!.getImageData(0, 0, width, height).data
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 127) {
        left = Math.min(left, x)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    }
  }
  return { left, right, bottom }
}

// 纹理必须与底下那份 DOM 文字对齐：错开时真文本与画布的交接会跳一下，紧跟其后的插槽内容会压字
describe('text-raster 与 DOM 文字对齐', () => {
  it('基线与 DOM 的基线重合', () => {
    target = mountHeading('H', 'font: 700 80px sans-serif; margin: 0;')
    // inline-block 的空元素底边落在基线上，用它量出 DOM 文字的基线
    const probe = document.createElement('span')
    probe.style.cssText = 'display: inline-block; width: 0; height: 0;'
    target.heading.append(probe)
    const baseline = probe.getBoundingClientRect().bottom - target.textEl.getBoundingClientRect().top
    const result = raster()
    // H 没有下伸部，墨迹底边就是基线
    expect(inkBox(result).bottom + 1).toBeCloseTo((PADDING + baseline) * result.dpr, -0.5)
  })

  it('letter-spacing 同步进纹理：负字距让墨迹按字符间隔数收窄', () => {
    target = mountHeading('Hubery', 'font: 700 80px sans-serif; margin: 0;')
    const loose = inkBox(raster())
    target.textEl.style.letterSpacing = '-4px'
    const result = raster()
    const tight = inkBox(result)
    // 6 个字符之间有 5 个间隔，每个收紧 4px
    expect((loose.right - loose.left) - (tight.right - tight.left)).toBeCloseTo(5 * 4 * result.dpr, -0.5)
  })

  it.for([
    ['uppercase', 'hubery yang', 'HUBERY YANG'],
    ['lowercase', 'HUBERY YANG', 'hubery yang'],
    // 连字符后要大写；撇号、数字、下划线后不大写（Chromium 与 WebKit 实测一致）
    ['capitalize', 'hubery yang-space don\'t a1b c_d', 'Hubery Yang-Space Don\'t A1b C_d'],
  ] as const)('text-transform: %s 也画进纹理（canvas 不认这条 CSS）', ([transform, source, shown]) => {
    target = mountHeading(shown, 'font: 700 64px sans-serif; margin: 0; white-space: nowrap;')
    const expected = pixels(raster())
    target.cleanup()
    target = mountHeading(source, `font: 700 64px sans-serif; margin: 0; white-space: nowrap; text-transform: ${transform};`)
    // 逐像素比：墨迹外框只看两头，中间某个字母大小写不对也一样
    expect(pixels(raster())).toEqual(expected)
  })

  it('lang 不是合法的语言标签时照样画（toLocaleUpperCase 会抛 RangeError，抛出去就熔断了）', () => {
    target = mountHeading('hubery', 'font: 700 64px sans-serif; margin: 0; text-transform: uppercase;')
    target.heading.lang = '!!'
    expect(inkBox(raster()).right).toBeGreaterThan(0)
  })
})
