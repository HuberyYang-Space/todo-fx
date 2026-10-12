import type { MountedHeading } from './helpers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { hiddenContainer } from '../../playground/fixtures/hidden-container'
import { modernColors } from '../../playground/fixtures/modern-colors'
import { narrowWrap } from '../../playground/fixtures/narrow-wrap'
import { themeTransition } from '../../playground/fixtures/theme-transition'
import { createFakeEffect } from './fake-effect'
import { mountHeading, nextFrames } from './helpers'

// 运行时的全部时序只在这里测一次（architecture.md 第九节）：特效换成只记录调用的假特效
let target: MountedHeading
const cleanups: Array<() => void> = []

beforeEach(() => {
  target = mountHeading()
  cleanups.push(target.cleanup)
})

afterEach(() => {
  while (cleanups.length)
    cleanups.pop()!()
  vi.restoreAllMocks()
})

function start(options = {}) {
  const fake = createFakeEffect(target.textEl)
  const instance = fake.create(target.textEl, target.layerEl, options)
  if (instance)
    cleanups.push(() => instance.destroy())
  return { ...fake, instance: instance! }
}

const painted = (): string => target.textEl.style.color

/**
 * 画布此刻露没露出来。休眠时只撤涂透明不够：WebGL 画布停在最后一帧，和真文本叠成重影；
 * 被挤掉上下文的画布在 Chromium 里还会画成不透明的白块，把真文本整个盖住（真实 Chrome 里 A/B 证实）
 */
function shown(layerEl = target.layerEl): boolean {
  const style = getComputedStyle(layerEl.querySelector('canvas')!)
  return style.display !== 'none' && style.visibility === 'visible'
}

async function expectFrozen(frames: unknown[]): Promise<void> {
  const count = frames.length
  await nextFrames(3)
  expect(frames).toHaveLength(count)
}

describe('不支持：一个 DOM 节点都不碰，返回 null', () => {
  const prototypeApis = [
    ['CanvasRenderingContext2D.letterSpacing', () => CanvasRenderingContext2D.prototype, 'letterSpacing'],
    ['TextMetrics.fontBoundingBoxAscent', () => TextMetrics.prototype, 'fontBoundingBoxAscent'],
    ['document.fonts 的 loadingdone 事件', () => FontFaceSet.prototype, 'onloadingdone'],
  ] as const

  it.for(prototypeApis)('缺 %s', ([name, proto, key]) => {
    const descriptor = Object.getOwnPropertyDescriptor(proto(), key)!
    Reflect.deleteProperty(proto(), key)
    cleanups.push(() => Object.defineProperty(proto(), key, descriptor))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { instance, log } = start({ debug: true })
    expect(instance).toBeNull()
    expect(log.calls).toEqual([])
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(`[todo-fx] create 返回 null：浏览器缺少 ${name}`)
  })

  it('缺 ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    cleanups.push(() => vi.unstubAllGlobals())
    const { instance, log } = start()
    expect(instance).toBeNull()
    expect(log.calls).toEqual([])
    expect(target.layerEl.childNodes).toHaveLength(0)
  })

  it('setup 返回 null：撤掉画布，不涂透明', () => {
    const fake = createFakeEffect(target.textEl)
    fake.control.setupReturnsNull = true
    expect(fake.create(target.textEl, target.layerEl)).toBeNull()
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(painted()).toBe('')
  })

  it('setup 抛错：返回 null，控制台报一次错', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = createFakeEffect(target.textEl)
    fake.control.throwIn = 'setup'
    expect(fake.create(target.textEl, target.layerEl)).toBeNull()
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(error).toHaveBeenCalledTimes(1)
  })
})

describe('开播', () => {
  it('build → frame，首帧画完之后才涂透明', async () => {
    const { log } = start()
    await expect.poll(painted).toBe('transparent')
    expect(log.calls.slice(0, 3)).toEqual(['setup', 'build', 'frame'])
    // build 与首帧时文字都还没涂透明，画布也还没露出来；首帧画完两边同时交接
    expect(log.colorAtHook.slice(0, 2)).toEqual(['', ''])
    expect(log.canvasAtHook.slice(0, 2)).toEqual(['hidden', 'hidden'])
    expect(shown()).toBe(true)
  })

  it('dt 夹取在 [0, 1/30] 秒，time 是 dt 的累计', async () => {
    const { log, control } = start()
    await nextFrames(3)
    // 一次 100ms 的长帧：不夹取的话下一帧的 dt 约 0.1 秒
    control.stallMs = 100
    await nextFrames(3)
    expect(log.frames.length).toBeGreaterThan(2)
    let time = 0
    for (const frame of log.frames) {
      expect(frame.dt).toBeGreaterThanOrEqual(0)
      expect(frame.dt).toBeLessThanOrEqual(1 / 30)
      time += frame.dt
      expect(frame.time).toBeCloseTo(time, 6)
    }
  })

  it('画布按文字外框加四周 padding 定尺寸与位置，解除 max-width、不挡指针、对读屏隐藏', async () => {
    target.heading.style.border = '5px solid'
    const { log } = start({ padding: 20 })
    await expect.poll(painted).toBe('transparent')
    const canvas = target.layerEl.querySelector('canvas')!
    const text = target.textEl.getBoundingClientRect()
    const rect = canvas.getBoundingClientRect()
    // 布局会把画布对齐到像素，留 1px 余量
    expect(Math.abs(rect.left - (text.left - 20))).toBeLessThanOrEqual(1)
    expect(Math.abs(rect.top - (text.top - 20))).toBeLessThanOrEqual(1)
    expect(Math.abs(rect.width - (text.width + 40))).toBeLessThanOrEqual(1)
    expect(Math.abs(rect.height - (text.height + 40))).toBeLessThanOrEqual(1)
    const raster = log.rasters.at(-1)!
    expect(canvas.width).toBe(raster.width)
    expect(raster.width).toBe(Math.round((text.width + 40) * raster.dpr))
    // 每次 build 定出的位置都一样：首次 build 时画布还 display: none，自己的 offsetParent 是 null，不能拿它当基准
    expect(new Set(log.placementAtBuild)).toEqual(new Set([`${canvas.style.left} ${canvas.style.top}`]))
    expect(canvas.style.maxWidth).toBe('none')
    expect(canvas.style.pointerEvents).toBe('none')
    expect(canvas.getAttribute('aria-hidden')).toBe('true')
  })

  it('宿主用 visibility: hidden 藏起容器（下拉、弹层、淡出过渡）时，画布跟着藏', async () => {
    start()
    await expect.poll(painted).toBe('transparent')
    // 文字宽度不为 0、特效照常播放；画布要像真文本一样继承祖先的 hidden，否则真文本藏了、画布还悬在原位
    target.heading.style.visibility = 'hidden'
    expect(getComputedStyle(target.textEl).visibility).toBe('hidden')
    expect(shown()).toBe(false)
  })

  it('宿主 reset 的 canvas { max-width: 100% } 压不扁画布', async () => {
    const style = document.createElement('style')
    style.textContent = 'canvas { max-width: 100%; }'
    document.head.append(style)
    cleanups.push(() => style.remove())
    start()
    await expect.poll(painted).toBe('transparent')
    const canvas = target.layerEl.querySelector('canvas')!
    expect(Math.abs(canvas.getBoundingClientRect().width - (target.textEl.getBoundingClientRect().width + 96))).toBeLessThanOrEqual(1)
  })
})

describe('休眠条件逐个进出', () => {
  it.for([
    ['prefers-reduced-motion', { reducedMotion: 'reduce' }, { reducedMotion: 'no-preference' }],
    ['forced-colors', { forcedColors: 'active' }, { forcedColors: 'none' }],
  ] as const)('%s', async ([, enter, exit]) => {
    const { log } = start()
    await expect.poll(painted).toBe('transparent')

    await commands.emulateMedia(enter)
    await expect.poll(painted).toBe('')
    expect(shown()).toBe(false)
    await expectFrozen(log.frames)

    await commands.emulateMedia(exit)
    await expect.poll(painted).toBe('transparent')
    expect(shown()).toBe(true)
    const count = log.frames.length
    await nextFrames(2)
    expect(log.frames.length).toBeGreaterThan(count)
  })

  it('开局就在休眠：不 build、不涂透明，条件解除后才开播', async () => {
    await commands.emulateMedia({ reducedMotion: 'reduce' })
    const { log } = start()
    await nextFrames(3)
    expect(log.calls).toEqual(['setup'])
    expect(painted()).toBe('')
    expect(shown()).toBe(false)

    await commands.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(painted).toBe('transparent')
    expect(log.calls.slice(0, 3)).toEqual(['setup', 'build', 'frame'])
  })

  it('文字宽度为 0（挂在隐藏容器里）：显示后开播，再隐藏又休眠', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    cleanups.push(() => root.remove())
    const { targets: [{ textEl, layerEl }], actions, cleanup } = hiddenContainer.mount(root)
    cleanups.push(cleanup)
    const fake = createFakeEffect(textEl)
    const instance = fake.create(textEl, layerEl)!
    cleanups.push(() => instance.destroy())
    await nextFrames(3)
    expect(fake.log.calls).toEqual(['setup'])

    actions.显示()
    await expect.poll(() => textEl.style.color).toBe('transparent')
    expect(fake.log.rasters.at(-1)!.width).toBeGreaterThan(0)

    actions.隐藏()
    await expect.poll(() => textEl.style.color).toBe('')
    expect(shown(layerEl)).toBe(false)
    await expectFrozen(fake.log.frames)
  })

  it('文字折行：加宽后开播，收窄后休眠', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    cleanups.push(() => root.remove())
    const { targets: [{ textEl, layerEl }], actions, cleanup } = narrowWrap.mount(root)
    cleanups.push(cleanup)
    const fake = createFakeEffect(textEl)
    const instance = fake.create(textEl, layerEl)!
    cleanups.push(() => instance.destroy())
    await nextFrames(3)
    expect(fake.log.calls).toEqual(['setup'])

    actions.加宽()
    await expect.poll(() => textEl.style.color).toBe('transparent')

    actions.收窄()
    await expect.poll(() => textEl.style.color).toBe('')
    expect(shown(layerEl)).toBe(false)
    await expectFrozen(fake.log.frames)
  })

  it('webGL 上下文丢失：休眠；恢复后依次 dispose → setup → build → frame 再涂透明', async () => {
    const { log } = start()
    await expect.poll(painted).toBe('transparent')
    const canvas = target.layerEl.querySelector('canvas')!
    const lose = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!

    lose.loseContext()
    await expect.poll(painted).toBe('')
    expect(shown()).toBe(false)
    await expectFrozen(log.frames)
    const before = log.calls.length

    lose.restoreContext()
    await expect.poll(painted).toBe('transparent')
    expect(shown()).toBe(true)
    expect(log.calls.slice(before, before + 4)).toEqual(['dispose', 'setup', 'build', 'frame'])
  })
})

describe('重建', () => {
  it('休眠中不重建：只记着，恢复时建一次，用的是最新的文字', async () => {
    const { instance, log } = start()
    await expect.poll(painted).toBe('transparent')
    await commands.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(painted).toBe('')
    const builds = log.calls.filter(c => c === 'build').length

    target.textEl.textContent = 'Hubery Yang'
    instance.patch({ padding: 10 })
    await nextFrames(3)
    expect(log.calls.filter(c => c === 'build')).toHaveLength(builds)

    await commands.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(painted).toBe('transparent')
    expect(log.calls.filter(c => c === 'build')).toHaveLength(builds + 1)
    const width = target.textEl.getBoundingClientRect().width
    const raster = log.rasters.at(-1)!
    expect(raster.width).toBe(Math.round((width + 20) * raster.dpr))
  })

  it('同一帧里来自不同信号源的重建合并成一次，并且在帧里紧接着画', async () => {
    const { instance, log } = start()
    await expect.poll(painted).toBe('transparent')
    const builds = log.calls.filter(c => c === 'build').length

    target.textEl.textContent = 'Hubery Yang'
    instance.patch({ padding: 40 })
    window.dispatchEvent(new Event('resize'))
    await nextFrames(3)
    expect(log.calls.filter(c => c === 'build')).toHaveLength(builds + 1)
    // build 与下一次 frame 在同一个 raf 回调里：画布改尺寸会清空，分在两帧的话中间会合成出一帧空白
    const index = log.calls.lastIndexOf('build')
    expect(log.calls[index + 1]).toBe('frame')
    expect(log.frameTimes[index + 1]).toBe(log.frameTimes[index])
  })

  it.for(['resize', 'fonts'] as const)('%s 信号触发重建', async (source) => {
    const { log } = start({ debug: true })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect.poll(painted).toBe('transparent')
    const builds = log.calls.filter(c => c === 'build').length
    if (source === 'resize')
      window.dispatchEvent(new Event('resize'))
    else
      document.fonts.dispatchEvent(new Event('loadingdone'))
    await expect.poll(() => log.calls.filter(c => c === 'build').length).toBe(builds + 1)
    expect(warn).toHaveBeenCalledWith(`[todo-fx] 重建：${source}`)
  })

  it('maxDpr 不是正数时按 1 处理，不会建出 0 尺寸的画布（那样文字透明、画布空白，标题隐身）', async () => {
    const { log } = start({ maxDpr: 0 })
    await expect.poll(painted).toBe('transparent')
    expect(log.rasters.at(-1)!.dpr).toBe(1)
    expect(log.rasters.at(-1)!.width).toBeGreaterThan(0)
  })

  it('patch 按参数表路由：patch 类下一帧生效且不重建，重建类排一次重建，undefined 恢复默认', async () => {
    const { instance, log } = start()
    await expect.poll(painted).toBe('transparent')
    const builds = (): number => log.calls.filter(c => c === 'build').length
    const before = builds()

    instance.patch({ level: 7, enterRadius: 10 })
    await expect.poll(() => log.frames.at(-1)!.level).toBe(7)
    expect(builds()).toBe(before)

    instance.patch({ padding: 10 })
    await expect.poll(builds).toBe(before + 1)
    expect(log.rasters.at(-1)!.width).toBe(Math.round((target.textEl.getBoundingClientRect().width + 20) * log.rasters.at(-1)!.dpr))

    instance.patch({ padding: undefined, level: undefined })
    await expect.poll(builds).toBe(before + 2)
    expect(log.rasters.at(-1)!.width).toBe(Math.round((target.textEl.getBoundingClientRect().width + 96) * log.rasters.at(-1)!.dpr))
    await expect.poll(() => log.frames.at(-1)!.level).toBe(1)
  })
})

describe('熔断', () => {
  it.for(['frame', 'build'] as const)('%s 抛错：报一次错、撤掉涂透明、停止渲染，之后 patch 是空操作', async (hook) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { instance, log, control } = start()
    await expect.poll(painted).toBe('transparent')

    control.throwIn = hook
    if (hook === 'build')
      target.textEl.textContent = 'Hubery Yang'
    await expect.poll(painted).toBe('')
    expect(shown()).toBe(false)
    await expectFrozen(log.frames)
    expect(error).toHaveBeenCalledTimes(1)
    expect(log.calls.at(-1)).toBe('dispose')

    control.throwIn = null
    instance.patch({ padding: 10 })
    target.textEl.textContent = 'Hubery'
    await nextFrames(3)
    expect(painted()).toBe('')
    expect(error).toHaveBeenCalledTimes(1)

    instance.destroy()
    expect(log.calls.filter(c => c === 'dispose')).toHaveLength(1)
    expect(target.layerEl.childNodes).toHaveLength(0)
  })
})

describe('destroy', () => {
  it('raf、监听器、observer 归零，画布与探针撤掉，上下文交还', async () => {
    // window 上的 addEventListener 被 vitest 换成了自己的包装，绕过 EventTarget.prototype，要单独盯
    const adds = [vi.spyOn(EventTarget.prototype, 'addEventListener'), vi.spyOn(window, 'addEventListener')]
    const removes = [vi.spyOn(EventTarget.prototype, 'removeEventListener'), vi.spyOn(window, 'removeEventListener')]
    const observers = [ResizeObserver, MutationObserver].map(Observer => ({
      observe: vi.spyOn(Observer.prototype, 'observe'),
      disconnect: vi.spyOn(Observer.prototype, 'disconnect'),
    }))

    const { instance, log } = start()
    const added = adds.flatMap(spy => spy.mock.calls.map((args, i) => [spy.mock.contexts[i], args[0], args[1]] as const))
    expect(added.map(([, type]) => type).sort()).toEqual(['change', 'change', 'change', 'change', 'loadingdone', 'mousemove', 'resize', 'webglcontextlost', 'webglcontextrestored'])
    await expect.poll(painted).toBe('transparent')
    const canvas = target.layerEl.querySelector('canvas')!
    const gl = canvas.getContext('webgl2')!

    instance.destroy()
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(raf).not.toHaveBeenCalled()
    const removed = removes.flatMap(spy => spy.mock.calls.map((args, i) => [spy.mock.contexts[i], args[0], args[1]] as const))
    for (const [context, type, listener] of added)
      expect(removed.some(([c, t, l]) => c === context && t === type && l === listener), `${type} 没有退订`).toBe(true)
    for (const { observe, disconnect } of observers) {
      expect(observe).toHaveBeenCalledTimes(1)
      expect(disconnect).toHaveBeenCalledTimes(1)
    }
    expect(target.layerEl.childNodes).toHaveLength(0)
    expect(painted()).toBe('')
    expect(gl.isContextLost()).toBe(true)
    expect(log.calls.filter(c => c === 'dispose')).toHaveLength(1)

    instance.destroy()
    expect(log.calls.filter(c => c === 'dispose')).toHaveLength(1)
  })

  it('首帧之前就 destroy：不涂透明、不报错，上下文照样交还', async () => {
    const error = vi.spyOn(console, 'error')
    const { instance, log } = start()
    const gl = target.layerEl.querySelector('canvas')!.getContext('webgl2')!
    instance.destroy()
    await nextFrames(3)
    expect(log.calls).toEqual(['setup', 'build', 'dispose'])
    expect(painted()).toBe('')
    expect(gl.isContextLost()).toBe(true)
    expect(error).not.toHaveBeenCalled()
  })

  it('撤掉涂透明时还原宿主原有的 inline color', async () => {
    target.textEl.style.color = 'rgb(1, 2, 3)'
    const { instance } = start()
    await expect.poll(painted).toBe('transparent')
    instance.destroy()
    expect(painted()).toBe('rgb(1, 2, 3)')
  })
})

describe('颜色', () => {
  it('默认继承父元素的计算 color；写了 fallback 的颜色参数没传时等于它', async () => {
    target.heading.style.color = 'rgb(51, 102, 153)'
    const { instance, log } = start()
    await expect.poll(() => log.frames.length).toBeGreaterThan(0)
    expect(log.frames.at(-1)!.colors).toEqual({ color: [0.2, 0.4, 0.6, 1], tint: [0.2, 0.4, 0.6, 1] })

    instance.patch({ color: 'rgb(255, 0, 0)' })
    await expect.poll(() => log.frames.at(-1)!.colors.tint).toEqual([1, 0, 0, 1])
    instance.patch({ tint: 'rgb(0, 0, 255)' })
    await expect.poll(() => log.frames.at(-1)!.colors).toEqual({ color: [1, 0, 0, 1], tint: [0, 0, 1, 1] })
  })

  it('主题切换时颜色跟着过渡走到新主题，不停在旧主题', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    cleanups.push(() => root.remove())
    const { targets: [{ textEl, layerEl }], actions, cleanup } = themeTransition.mount(root)
    cleanups.push(cleanup)
    const fake = createFakeEffect(textEl)
    const instance = fake.create(textEl, layerEl)!
    cleanups.push(() => instance.destroy())
    const rgb = (): number[] => fake.log.frames.at(-1)!.colors.color.slice(0, 3).map(c => Math.round(c * 255))
    await expect.poll(rgb).toEqual([20, 20, 20])

    actions.切换主题()
    await expect.poll(rgb, { timeout: 2000 }).toEqual([235, 235, 235])
  })

  it('oklch / lab / color-mix / display-p3 都解析成浏览器回读的 sRGB', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    cleanups.push(() => root.remove())
    const { targets, cleanup } = modernColors.mount(root)
    cleanups.push(cleanup)
    const expected = [[0, 185, 195, 255], [187, 88, 70, 255], [128, 0, 128, 255], [255, 0, 0, 255]]
    const fakes = targets.map(({ textEl, layerEl }) => {
      const fake = createFakeEffect(textEl)
      const instance = fake.create(textEl, layerEl)!
      cleanups.push(() => instance.destroy())
      return fake
    })
    for (const [i, fake] of fakes.entries())
      await expect.poll(() => fake.log.frames.at(-1)?.colors.color.map(c => Math.round(c * 255))).toEqual(expected[i])
  })

  it('patch 任意 CSS 颜色串由浏览器解析；非法串回落为继承色', async () => {
    target.heading.style.color = 'rgb(51, 102, 153)'
    const { instance, log } = start()
    await expect.poll(() => log.frames.length).toBeGreaterThan(0)

    instance.patch({ color: 'color-mix(in srgb, red 50%, blue)' })
    await expect.poll(() => log.frames.at(-1)!.colors.color.map(c => Math.round(c * 255))).toEqual([128, 0, 128, 255])

    instance.patch({ color: '不是颜色' })
    await expect.poll(() => log.frames.at(-1)!.colors.color).toEqual([0.2, 0.4, 0.6, 1])
  })

  it('颜色带 alpha 时如实给出', async () => {
    target.heading.style.color = 'rgba(0, 0, 0, 0.6)'
    const { log } = start()
    await expect.poll(() => log.frames.length).toBeGreaterThan(0)
    expect(log.frames.at(-1)!.colors.color[3]).toBeCloseTo(0.6, 2)
  })
})

describe('指针', () => {
  it('压在画布上时 hover 逼近 1，坐标是画布内的 CSS 像素；只有事件之后那一帧 moved 为 true', async () => {
    const { log } = start()
    await expect.poll(painted).toBe('transparent')
    const rect = target.layerEl.querySelector('canvas')!.getBoundingClientRect()
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + 30, clientY: rect.top + 20 }))
    await expect.poll(() => log.frames.at(-1)!.hover).toBeGreaterThan(0.9)
    const movedFrames = log.frames.filter(f => f.pointer.moved)
    expect(movedFrames).toHaveLength(1)
    expect(movedFrames[0]!.pointer.x).toBeCloseTo(30, 0)
    expect(movedFrames[0]!.pointer.y).toBeCloseTo(20, 0)
  })

  it('离开 enterRadius 之外 hover 回落到 0', async () => {
    const { log } = start({ enterRadius: 10, calmSpeed: 50, wakeSpeed: 50 })
    await expect.poll(painted).toBe('transparent')
    const rect = target.layerEl.querySelector('canvas')!.getBoundingClientRect()
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + 5, clientY: rect.top + 5 }))
    await expect.poll(() => log.frames.at(-1)!.hover).toBeGreaterThan(0.9)
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.right + 50, clientY: rect.top + 5 }))
    await expect.poll(() => log.frames.at(-1)!.hover).toBeLessThan(0.05)
  })
})

describe('debug', () => {
  it('打印休眠与恢复的条件、重建的触发源', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({ debug: true })
    await expect.poll(painted).toBe('transparent')
    expect(warn).toHaveBeenCalledWith('[todo-fx] 重建：首次构建')

    await commands.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(painted).toBe('')
    expect(warn).toHaveBeenCalledWith('[todo-fx] 休眠：prefers-reduced-motion')

    target.textEl.textContent = 'Hubery Yang'
    await commands.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(painted).toBe('transparent')
    expect(warn).toHaveBeenCalledWith('[todo-fx] 恢复：prefers-reduced-motion 已解除')
    expect(warn.mock.calls.some(([message]) => /^\[todo-fx\] 重建：.*text/.test(message))).toBe(true)
  })

  it('默认不打印', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start()
    await expect.poll(painted).toBe('transparent')
    expect(warn).not.toHaveBeenCalled()
  })
})
