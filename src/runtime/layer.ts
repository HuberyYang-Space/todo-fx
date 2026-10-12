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
  // 全用 inline style：库不发 CSS 文件，inline 也压得过宿主 class。
  // 先藏着：画布与涂透明同进同退，由运行时在首帧画完后一起交接。用 display 不用 visibility：
  // 显式写 visible 会盖过宿主祖先的 visibility: hidden（真文本藏了、画布还悬着）；而 hidden 的画布仍算进滚动溢出，
  // ogl 一构造就给它写上 300×150，从没 build 过的画布会在标题末尾撑出横向滚动
  canvas.style.cssText = 'position: absolute; pointer-events: none; max-width: none; display: none;'
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
  // 画布可能还 display: none（首次 build 在露出之前），它自己的 offsetParent 是 null，从挂载点取定位基准
  const layerEl = canvas.parentElement!
  const base = getComputedStyle(layerEl).position === 'static' ? layerEl.offsetParent ?? document.documentElement : layerEl
  const baseRect = base.getBoundingClientRect()
  // 绝对定位相对的是 padding box，getBoundingClientRect 量的是 border box，差一圈边框
  canvas.style.left = `${textRect.left - baseRect.left - base.clientLeft - padding}px`
  canvas.style.top = `${textRect.top - baseRect.top - base.clientTop - padding}px`
  return { width, height }
}
