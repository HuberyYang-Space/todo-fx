import type { Options, OptionTypes, ParamTable, ParamValues } from '../compute/params'
import type { Rgba } from './color-probe'
import type { SleepReason } from './gate'
import type { PointerState } from './pointer'
import type { TextRaster } from './text-raster'
import { applyPatch, optionTypesOf, resolveParams } from '../compute/params'
import { createColorProbe } from './color-probe'
import { commonParams } from './common-params'
import { missingApi, sleepReason, watchMedia } from './gate'
import { releaseContext, watchContext } from './gl-lifecycle'
import { createCanvas, placeCanvas } from './layer'
import { createLoop } from './loop'
import { createPointer } from './pointer'
import { watchRebuild } from './rebuild-watcher'
import { rasterizeText } from './text-raster'

/** 特效的完整参数表：公共参数加上特效自己的；同名键以特效的为准（用来改公共参数的默认值） */
export type EffectTable<T> = Omit<typeof commonParams, keyof T> & T

interface SetupContext<P> {
  /** layer 建好的画布 */
  canvas: HTMLCanvasElement
  /** 当前生效的参数值；patch 后原地更新，每次读都是最新值。不要在 setup 里把值缓存成常量 */
  params: Readonly<P>
}

interface FrameState {
  /** 秒，已夹取到 [0, 1/30] */
  dt: number
  /** 累计秒数 */
  time: number
  /** 0~1：靠近度经快慢不对称的逼近后的值 */
  hover: number
  pointer: PointerState
  /** 每个颜色类参数本帧的解析值 */
  colors: Record<string, Rgba>
}

interface EffectHooks {
  /** 首次开播前，以及之后每次合并后的重建（休眠中推迟到恢复时）。不要碰 textEl */
  build: (raster: TextRaster) => void
  /** 播放期间每帧。从 ctx.params 读参数，不要读 DOM */
  frame: (state: FrameState) => void
  /** destroy、熔断、上下文恢复前 */
  dispose: () => void
}

interface EffectDefinition<T extends ParamTable> {
  /** 本特效独有的参数，外加对公共参数默认值的重写 */
  params: T
  /** create 时一次、上下文恢复后再一次。在 ctx.canvas 上拿渲染上下文，拿不到返回 null */
  setup: (ctx: SetupContext<ParamValues<EffectTable<T>>>) => EffectHooks | null
}

export interface FxInstance<O> {
  /**
   * 改任意选项，按参数表路由：patch 类下一帧生效，重建类自动排一次重建（按帧合并，
   * 但每帧都 patch 一个重建类参数就会每帧重建，很重）。值为 undefined 恢复默认
   */
  patch: (options: O) => void
  /** 停止渲染、撤掉涂透明、移除画布与全部监听，并交还 WebGL 上下文 */
  destroy: () => void
}

interface Effect<T> {
  /**
   * @param textEl 真文本元素，必须是 inline 元素（折行判定依赖它）；内核只会给它设 inline color
   * @param layerEl 空挂载点，内核独占其内部；它所在的根元素要有定位上下文（如 position: relative）
   * @returns 浏览器不支持时返回 null，真文本原样显示，调用方不必写降级分支
   */
  create: (textEl: HTMLElement, layerEl: HTMLElement, options?: Options<T>) => FxInstance<Options<T>> | null
  /** 选项类型映射，供框架壳声明 props */
  optionTypes: OptionTypes<T>
}

const TAG = '[todo-fx]'

/**
 * 运行时骨架：特效只给参数表和钩子，支持检测、休眠判定与它的全部信号、raf、重建合并、涂透明的时机、
 * 上下文丢失与恢复、异常熔断、destroy 清理都在这里，只写一次（architecture.md 第二、三节）
 */
export function defineEffect<T extends ParamTable>(definition: EffectDefinition<T>): Effect<EffectTable<T>> {
  const table: ParamTable = { ...commonParams, ...definition.params }

  function create(textEl: HTMLElement, layerEl: HTMLElement, options?: Options<EffectTable<T>>): FxInstance<Options<EffectTable<T>>> | null {
    const values = resolveParams(table, options as Options<ParamTable>)
    const params = values as ParamValues<EffectTable<T>>
    const common = values as ParamValues<typeof commonParams>
    const log = (message: string): void => {
      if (common.debug)
        console.warn(`${TAG} ${message}`)
    }

    const missing = missingApi()
    if (missing) {
      log(`create 返回 null：浏览器缺少 ${missing}`)
      return null
    }

    const canvas = createCanvas(layerEl)
    const ctx: SetupContext<ParamValues<EffectTable<T>>> = { canvas, params }
    let hooks: EffectHooks | null
    try {
      hooks = definition.setup(ctx)
    }
    catch (error) {
      canvas.remove()
      console.error(`${TAG} setup 抛错，回退为真文本`, error)
      return null
    }
    if (!hooks) {
      canvas.remove()
      log('create 返回 null：setup 拿不到渲染上下文')
      return null
    }

    let running = false
    let painted = false
    let fused = false
    let destroyed = false
    let contextLost = false
    let pendingBuild = true
    let rebuildSources = new Set<string>(['首次构建'])
    let lastReason: SleepReason | 'setup 返回 null' | null = null
    let time = 0
    let colorBeforePaint = ''

    const probe = createColorProbe(layerEl, table)
    const pointer = createPointer(canvas, () => common.enterRadius)
    const loop = createLoop(tick)

    // 画布与涂透明同进同退：休眠时只撤涂透明的话，WebGL 画布停在最后一帧、和真文本叠成重影；
    // 被挤掉上下文的画布在 Chromium 里还会画成不透明的白块，把真文本整个盖住（真实 Chrome 里实测）
    function paint(): void {
      if (painted)
        return
      colorBeforePaint = textEl.style.color
      textEl.style.color = 'transparent'
      canvas.style.visibility = 'visible'
      painted = true
    }

    function unpaint(): void {
      if (!painted)
        return
      textEl.style.color = colorBeforePaint
      canvas.style.visibility = 'hidden'
      painted = false
    }

    // 钩子抛错时熔断：raf 链断掉会让画面停在「文字透明 + 画布冻住」，标题隐身；熔断后至少看得到真文本
    function fuse(error: unknown): void {
      fused = true
      running = false
      loop.stop()
      unpaint()
      console.error(`${TAG} 特效出错，已停止并回退为真文本`, error)
      try {
        hooks?.dispose()
      }
      catch {}
    }

    function build(): boolean {
      // maxDpr 传成 0 或负数时按 1：0 尺寸的画布画不出东西，文字却照样涂透明，标题就隐身了
      const dpr = Math.min(window.devicePixelRatio || 1, common.maxDpr > 0 ? common.maxDpr : 1)
      const size = placeCanvas(canvas, textEl.getBoundingClientRect(), common.padding, dpr)
      log(`重建：${[...rebuildSources].join('、')}`)
      rebuildSources = new Set()
      try {
        hooks!.build(rasterizeText(textEl, size, common.padding, dpr))
      }
      catch (error) {
        fuse(error)
        return false
      }
      pendingBuild = false
      return true
    }

    function tick(dt: number): void {
      if (pendingBuild && !build())
        return
      time += dt
      const { hover, pointer: pointerState } = pointer.sample(dt, common.wakeSpeed, common.calmSpeed)
      try {
        hooks!.frame({ dt, time, hover, pointer: pointerState, colors: probe.read(values) })
      }
      catch (error) {
        fuse(error)
        return
      }
      // 首帧画完才涂透明，同一帧内交接：没有两边都看不见的空隙，也没有重影
      paint()
    }

    /** 唯一的判定入口：任何信号到来都只调它，幂等 */
    function evaluate(): void {
      if (fused || destroyed)
        return
      const reason = hooks ? sleepReason(textEl, contextLost) : 'setup 返回 null'
      if (reason !== lastReason) {
        log(reason ? `休眠：${reason}` : `恢复：${lastReason} 已解除`)
        lastReason = reason
      }
      if (!reason && !running) {
        // 休眠中不重建，只记着；恢复时先建好纹理再开播
        if (pendingBuild && !build())
          return
        running = true
        loop.start()
      }
      else if (reason && running) {
        running = false
        loop.stop()
        unpaint()
      }
    }

    function invalidate(source: string): void {
      pendingBuild = true
      rebuildSources.add(source)
      evaluate()
    }

    function onContextLost(): void {
      contextLost = true
      evaluate()
    }

    // 依次 dispose → setup → build：重新 setup 保证全部 GL 资源重建，漏不掉哪一个
    function onContextRestored(): void {
      if (fused || destroyed)
        return
      contextLost = false
      try {
        hooks?.dispose()
        hooks = definition.setup(ctx)
      }
      catch (error) {
        fuse(error)
        return
      }
      invalidate('上下文恢复')
    }

    const unwatchMedia = watchMedia(evaluate)
    const unwatchRebuild = watchRebuild(textEl, invalidate)
    const unwatchContext = watchContext(canvas, onContextLost, onContextRestored)
    evaluate()

    return {
      patch(patch) {
        const rebuildKeys = applyPatch(table, values, patch as Options<ParamTable>)
        if (rebuildKeys.length)
          invalidate(`patch ${rebuildKeys.join('、')}`)
      },
      destroy() {
        if (destroyed)
          return
        destroyed = true
        running = false
        loop.stop()
        unpaint()
        unwatchMedia()
        unwatchRebuild()
        unwatchContext()
        pointer.stop()
        if (!fused) {
          try {
            hooks?.dispose()
          }
          catch {}
        }
        releaseContext(canvas)
        canvas.remove()
        probe.remove()
      },
    }
  }

  return { create, optionTypes: optionTypesOf(table) as OptionTypes<EffectTable<T>> }
}
