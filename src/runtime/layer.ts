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

/** 元素的 border box 在屏幕上被祖先 transform 缩放的倍数；offsetWidth 是取整后的布局宽度，差不到半像素就当没有缩放 */
function scaleOf(rect: number, layout: number): number {
  return layout === 0 || Math.abs(rect - layout) <= 0.5 ? 1 : rect / layout
}

/**
 * 按文字外框加四周 padding 定画布的尺寸与位置。
 * 定位基准是画布的 offsetParent（壳的根元素带 inline position: relative）；
 * 文字未必在根元素左上角（后面还可能跟着插槽内容），所以按实测偏移算，不写死成负的 padding。
 * 量到的是屏幕坐标，要换算回布局坐标：祖先带 transform: scale 时画布就在同一个变换里，会被再缩一次；
 * 而 ResizeObserver 不响应 transform，入场动画中途建错的尺寸永远不会被纠正
 */
export function placeCanvas(canvas: HTMLCanvasElement, textRect: DOMRect, padding: number, dpr: number): PixelSize {
  // 画布可能还 display: none（首次 build 在露出之前），它自己的 offsetParent 是 null，从挂载点取定位基准
  const layerEl = canvas.parentElement!
  const base = (getComputedStyle(layerEl).position === 'static' ? layerEl.offsetParent ?? document.documentElement : layerEl) as HTMLElement
  const baseRect = base.getBoundingClientRect()
  const scaleX = scaleOf(baseRect.width, base.offsetWidth)
  const scaleY = scaleOf(baseRect.height, base.offsetHeight)

  const cssWidth = textRect.width / scaleX + padding * 2
  const cssHeight = textRect.height / scaleY + padding * 2
  const width = Math.round(cssWidth * dpr)
  const height = Math.round(cssHeight * dpr)
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  // 绝对定位相对的是 padding box，getBoundingClientRect 量的是 border box，差一圈边框
  canvas.style.left = `${(textRect.left - baseRect.left) / scaleX - base.clientLeft - padding}px`
  canvas.style.top = `${(textRect.top - baseRect.top) / scaleY - base.clientTop - padding}px`
  return { width, height }
}
