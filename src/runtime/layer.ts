/** 物理像素尺寸 */
export interface PixelSize {
  width: number
  height: number
}

/** 在挂载点里建画布。挂载点归内核独占，框架不往里渲染任何东西 */
export function createCanvas(layerEl: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  // max-width: none：宿主 reset 常把 canvas 和 img 一起纳入 max-width: 100%，而这块画布刻意比容器宽
  // （四周留 padding 给流动溢出），被压回容器宽度、高度却不变，纹理就横向压扁，字又小又偏左。
  // 全用 inline style：库不发 CSS 文件，inline 也压得过宿主 class
  canvas.style.cssText = 'position: absolute; pointer-events: none; max-width: none;'
  layerEl.append(canvas)
  return canvas
}

/**
 * 按文字外框加四周 padding 定画布的尺寸与位置。
 * 定位基准是画布的 offsetParent（壳的根元素带 inline position: relative）；
 * 文字未必在根元素左上角（后面还可能跟着插槽内容），所以按实测偏移算，不写死成负的 padding
 */
export function placeCanvas(canvas: HTMLCanvasElement, textRect: DOMRect, padding: number, dpr: number): PixelSize {
  const cssWidth = textRect.width + padding * 2
  const cssHeight = textRect.height + padding * 2
  const width = Math.round(cssWidth * dpr)
  const height = Math.round(cssHeight * dpr)
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  const base = canvas.offsetParent ?? document.documentElement
  const baseRect = base.getBoundingClientRect()
  // 绝对定位相对的是 padding box，getBoundingClientRect 量的是 border box，差一圈边框
  canvas.style.left = `${textRect.left - baseRect.left - base.clientLeft - padding}px`
  canvas.style.top = `${textRect.top - baseRect.top - base.clientTop - padding}px`
  return { width, height }
}
