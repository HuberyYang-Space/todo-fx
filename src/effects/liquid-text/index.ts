import type { Options, OptionTypes, ParamValues } from '../../compute/params'
import type { EffectTable, FxInstance } from '../../runtime/define-effect'
import { Flowmap, Mesh, Program, Renderer, Texture, Triangle, Vec2 } from 'ogl'
import { defineEffect } from '../../runtime/define-effect'
import { liquidTextParams } from './params'
import { fragment, vertex } from './shaders'

type LiquidTextTable = EffectTable<typeof liquidTextParams>
type FlowmapOptions = ParamValues<LiquidTextTable>['flowmap']

export type LiquidTextOptions = Options<LiquidTextTable>

// 与 ogl Renderer 在 alpha: true 时传给 getContext 的属性一致：同一画布上第一次 getContext 定下的属性才算数
const contextAttributes: WebGLContextAttributes = {
  alpha: true,
  depth: true,
  stencil: false,
  antialias: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
}

/** 鼠标停下后速度每帧的衰减：不衰减的话 flowmap 会一直按最后那一下的速度盖章，水面永远停不下来 */
const VELOCITY_DECAY = 0.92
/** 盖章速度向目标插值的系数：比 0.15 再低一档，笔触之间过渡得更连 */
const VELOCITY_EASE = 0.12

function sameFlowmap(a: FlowmapOptions, b: FlowmapOptions): boolean {
  return a.falloff === b.falloff && a.alpha === b.alpha && a.dissipation === b.dissipation
}

const liquidText = defineEffect({
  params: liquidTextParams,
  setup({ canvas, params }) {
    // ogl 的 Renderer 拿不到上下文时先 console.error、再抛 TypeError，所以先自己取一次
    const context = canvas.getContext('webgl2', contextAttributes) ?? canvas.getContext('webgl', contextAttributes)
    if (!context)
      return null

    const renderer = new Renderer({ canvas, alpha: true })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)

    const texture = new Texture(gl)
    const mouse = new Vec2(-1, -1)
    const velocity = new Vec2()
    let flowmapOptions: FlowmapOptions = { ...params.flowmap }
    let flowmap = new Flowmap(gl, flowmapOptions)
    let aspect = 1
    let cssWidth = 1
    let cssHeight = 1

    const uniforms = {
      tMap: { value: texture },
      tFlow: flowmap.uniform,
      uColor: { value: [0, 0, 0, 1] },
      uAccent: { value: [0, 0, 0, 1] },
      uStrength: { value: params.strength },
      uChroma: { value: params.chroma },
      uIdle: { value: params.idle },
      uTime: { value: 0 },
      uHover: { value: 0 },
    }
    const geometry = new Triangle(gl)
    // 不开混合：画布每帧清成全透明后只画这一遍，混合只会把 alpha 再乘一次——
    // 字的抗锯齿边缘变成 alpha² 比 DOM 文字细一圈，半透明色（0.6）落到 0.36。shader 输出的就是最终颜色
    const program = new Program(gl, { vertex, fragment, uniforms })
    const mesh = new Mesh(gl, { geometry, program })

    function disposeFlowmap(): void {
      for (const target of [flowmap.mask.read, flowmap.mask.write]) {
        gl.deleteFramebuffer(target.buffer)
        gl.deleteTexture(target.texture.texture)
      }
      flowmap.mesh.program.remove()
      flowmap.mesh.geometry.remove()
    }

    return {
      build(raster) {
        cssWidth = raster.width / raster.dpr
        cssHeight = raster.height / raster.dpr
        aspect = raster.width / raster.height
        // 不调 renderer.setSize：画布的尺寸归 layer 管（它已按 raster 设好），setSize 会把 style 改写成取整后的值。
        // render 按 width × dpr 定视口，这三个字段对上 raster 就行
        renderer.dpr = raster.dpr
        renderer.width = cssWidth
        renderer.height = cssHeight
        if (!sameFlowmap(params.flowmap, flowmapOptions)) {
          disposeFlowmap()
          flowmapOptions = { ...params.flowmap }
          flowmap = new Flowmap(gl, flowmapOptions)
          uniforms.tFlow = flowmap.uniform
        }
        // ogl 发现 image 换了对象就会重新上传，raster 每次都是新画布
        texture.image = raster.image
      },
      frame({ time, hover, pointer, colors }) {
        if (pointer.moved) {
          // uv 的原点在左下，画布坐标的 y 向下增长，所以 y 要翻过来
          mouse.set(pointer.x / cssWidth, 1 - pointer.y / cssHeight)
          velocity.set(pointer.vx / cssWidth, -pointer.vy / cssHeight)
        }
        velocity.multiply(VELOCITY_DECAY)
        flowmap.aspect = aspect
        flowmap.mouse.copy(mouse)
        flowmap.velocity.x += (velocity.x - flowmap.velocity.x) * VELOCITY_EASE
        flowmap.velocity.y += (velocity.y - flowmap.velocity.y) * VELOCITY_EASE
        flowmap.update()

        uniforms.uTime.value = time
        uniforms.uHover.value = hover
        uniforms.uStrength.value = params.strength
        uniforms.uChroma.value = params.chroma
        uniforms.uIdle.value = params.idle
        uniforms.uColor.value = colors.color!
        uniforms.uAccent.value = colors.accent!
        renderer.render({ scene: mesh })
      },
      dispose() {
        disposeFlowmap()
        program.remove()
        geometry.remove()
        gl.deleteTexture(texture.texture)
      },
    }
  },
})

/**
 * 给一行标题加液态交互效果：真文本留在 DOM 里只涂透明，画布盖在上面。
 * 浏览器不支持时返回 null，真文本原样显示
 */
export const createLiquidText: (textEl: HTMLElement, layerEl: HTMLElement, options?: LiquidTextOptions) => FxInstance<LiquidTextOptions> | null = liquidText.create

/** 选项类型映射：键名 → 原生类型构造器，供框架壳声明 props */
export const liquidTextOptionTypes: OptionTypes<LiquidTextTable> = liquidText.optionTypes
