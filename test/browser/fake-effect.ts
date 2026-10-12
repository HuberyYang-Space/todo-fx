import type { TextRaster } from '../../src/runtime/text-raster'
import { defineEffect } from '../../src/runtime/define-effect'

// FrameState 不从运行时导出（除测试外没有消费方），从钩子签名里取
type Hooks = NonNullable<ReturnType<Parameters<typeof defineEffect>[0]['setup']>>
type FrameState = Parameters<Hooks['frame']>[0]

/** 假特效的可控行为：测试中途改它就能让某个钩子抛错 */
export interface FakeControl {
  setupReturnsNull: boolean
  throwIn: 'setup' | 'build' | 'frame' | null
  /** 下一帧在 frame 里忙等这么多毫秒，制造一次长帧 */
  stallMs: number
}

export interface FakeLog {
  /** 钩子的调用顺序 */
  calls: string[]
  rasters: TextRaster[]
  frames: Array<FrameState & { level: number }>
  /** 每次调 build / frame 时 textEl 的 inline color：证明首帧画完之前没有涂透明 */
  colorAtHook: string[]
  /** 每次调 build / frame 时画布的计算 visibility：首帧画完之前画布不该露出来 */
  canvasAtHook: string[]
  /** 与 calls 一一对应的 document.timeline.currentTime：同一帧里调用的值相同 */
  frameTimes: unknown[]
}

/**
 * 一个只记录调用的特效：独有参数 level（patch 类）与 tint（颜色类，没传时取 color）；
 * 在画布上拿 WebGL2 上下文，好测上下文丢失与释放
 */
export function createFakeEffect(textEl: HTMLElement): { create: typeof fake.create, log: FakeLog, control: FakeControl } {
  const log: FakeLog = { calls: [], rasters: [], frames: [], colorAtHook: [], canvasAtHook: [], frameTimes: [] }
  const control: FakeControl = { setupReturnsNull: false, throwIn: null, stallMs: 0 }
  const record = (call: string): void => {
    log.calls.push(call)
    log.frameTimes.push(document.timeline.currentTime)
  }
  const fake = defineEffect({
    params: {
      level: { type: 'number', default: 1, route: 'patch' },
      tint: { type: 'color', route: 'patch', fallback: 'color' },
    },
    setup({ canvas, params }) {
      record('setup')
      if (control.throwIn === 'setup')
        throw new Error('setup 故意抛错')
      const gl = canvas.getContext('webgl2')
      if (control.setupReturnsNull || !gl)
        return null
      return {
        build(raster) {
          record('build')
          log.colorAtHook.push(textEl.style.color)
          log.canvasAtHook.push(getComputedStyle(canvas).visibility)
          log.rasters.push(raster)
          if (control.throwIn === 'build')
            throw new Error('build 故意抛错')
        },
        frame(state) {
          record('frame')
          log.colorAtHook.push(textEl.style.color)
          log.canvasAtHook.push(getComputedStyle(canvas).visibility)
          log.frames.push({ ...state, level: params.level })
          if (control.throwIn === 'frame')
            throw new Error('frame 故意抛错')
          const until = performance.now() + control.stallMs
          control.stallMs = 0
          while (performance.now() < until)
            continue
          gl.clearColor(1, 0, 0, 1)
          gl.clear(gl.COLOR_BUFFER_BIT)
        },
        dispose() {
          record('dispose')
        },
      }
    },
  })
  return { create: fake.create, log, control }
}
