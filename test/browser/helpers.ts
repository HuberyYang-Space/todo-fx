import type { FxTarget } from '../../playground/fixtures/types'
import { createHeading } from '../../playground/fixtures/dom'

/** 等 n 帧 raf */
export function nextFrames(n = 1): Promise<void> {
  return new Promise((resolve) => {
    let left = n
    const step = (): void => {
      left -= 1
      if (left <= 0)
        resolve()
      else
        requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

export interface MountedHeading extends FxTarget {
  heading: HTMLElement
  cleanup: () => void
}

/** 按壳的结构建一个标题挂进 body；style 写在 h1 上 */
export function mountHeading(text = 'Hubery', style = ''): MountedHeading {
  const { heading, target } = createHeading(text)
  heading.style.cssText += style
  document.body.append(heading)
  return { ...target, heading, cleanup: () => heading.remove() }
}

/** 在下一帧 raf 里读回 WebGL 画布的像素：画面合成之后绘图缓冲区会被清空，raf 之外读到的全是 0 */
export function readPixels(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  if (!gl)
    throw new Error('画布上没有 WebGL 上下文')
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      resolve(pixels)
    })
  })
}
