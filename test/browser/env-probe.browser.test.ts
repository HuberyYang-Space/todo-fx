import { describe, expect, it } from 'vitest'

// 已知结果探针：清成已知颜色后读回精确像素。不通过就说明这个浏览器里 WebGL / Canvas 2D 不可用，
// 之后的内核测试会全部走进「不支持」分支：全绿，但什么都没测
const EXPECTED = [51, 102, 153, 255]

function rendererOf(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return ext
    ? `UNMASKED_RENDERER=${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}`
    : `RENDERER=${gl.getParameter(gl.RENDERER)}`
}

describe('已知结果探针', () => {
  // 用 it.for 而不是 it.each：只有前者把测试上下文（annotate）作为第二个参数传进来
  it.for(['webgl2', 'webgl'] as const)('%s：清屏成已知颜色后 readPixels 读回精确值', async (type, { annotate }) => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    // 分两个字面量调用：传联合类型时 TS 只能选到返回 RenderingContext 的通用重载
    const gl = type === 'webgl2' ? canvas.getContext('webgl2') : canvas.getContext('webgl')
    expect(gl, `${type} 上下文创建失败`).not.toBeNull()
    gl!.clearColor(0.2, 0.4, 0.6, 1)
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    const pixel = new Uint8Array(4)
    gl!.readPixels(0, 0, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, pixel)
    // CI 的 GitHub Actions 报告器会把它输出成 ::notice，三个内核各自的渲染器一眼可见
    await annotate(`${type} ${rendererOf(gl!)} pixel=${Array.from(pixel)}`)
    expect(Array.from(pixel)).toEqual(EXPECTED)
  })

  it('2d：fillRect 后 getImageData 读回精确值', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    expect(ctx, '2d 上下文创建失败').not.toBeNull()
    ctx!.fillStyle = 'rgb(51 102 153)'
    ctx!.fillRect(0, 0, 4, 4)
    expect(Array.from(ctx!.getImageData(1, 1, 1, 1).data)).toEqual(EXPECTED)
  })
})
