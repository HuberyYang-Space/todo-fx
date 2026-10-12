import type { PixelSize } from './layer'

export interface TextRaster {
  /** 白字透明底，已按 dpr 放大，四周含 padding；颜色留给特效现填，切主题不必重画 */
  image: HTMLCanvasElement
  /** 物理像素 */
  width: number
  height: number
  dpr: number
}

/**
 * canvas 不认 CSS 的 text-transform，宿主给标题挂了 uppercase 时，画上去的会是小写原文。
 * 其余取值（full-width 等）不处理
 */
function transformText(text: string, transform: string, lang: string | null | undefined): string {
  const locale = lang || undefined
  const upper = (value: string): string => {
    try {
      return value.toLocaleUpperCase(locale)
    }
    catch {
      // lang 不是合法的语言标签时 toLocaleUpperCase 抛 RangeError
      return value.toUpperCase()
    }
  }
  if (transform === 'uppercase')
    return upper(text)
  if (transform === 'lowercase') {
    try {
      return text.toLocaleLowerCase(locale)
    }
    catch {
      return text.toLowerCase()
    }
  }
  if (transform === 'capitalize')
    return text.replace(/(^|[^\p{L}\p{N}_'’])(\p{L})/gu, (_, before: string, letter: string) => before + upper(letter))
  return text
}

/** 把 textEl 的文字画进离屏画布，与 DOM 那份文字精确对齐。只画一行：折行由 gate 负责休眠 */
export function rasterizeText(textEl: HTMLElement, size: PixelSize, padding: number, dpr: number): TextRaster {
  const image = document.createElement('canvas')
  image.width = size.width
  image.height = size.height
  const ctx = image.getContext('2d')
  if (!ctx)
    throw new Error('离屏 2D 上下文创建失败')

  const style = getComputedStyle(textEl)
  ctx.font = `${style.fontWeight} ${Number.parseFloat(style.fontSize) * dpr}px ${style.fontFamily}`
  // letter-spacing 不在 font 简写里，要单独设：不同步的话画出的字比 DOM 那份宽出几个像素，
  // 紧跟在后面的插槽内容（光标）会压到最后一个字母上。乘 dpr：纹理里的字号也放大了同样倍数
  const spacing = Number.parseFloat(style.letterSpacing)
  if (Number.isFinite(spacing))
    ctx.letterSpacing = `${spacing * dpr}px`
  ctx.fillStyle = '#fff'

  // 用基线定位，不用 textBaseline: 'middle'：middle 对齐 em 方块的中点，而字体的 ascent 与 descent
  // 并不对称，摆在外框垂直中心会整体上移几个像素、和 DOM 文字错开。
  // fontBoundingBoxAscent 正是浏览器算 inline 外框顶部用的量，「外框顶部往下 ascent」就是 DOM 文字的基线
  const text = transformText(textEl.textContent ?? '', style.textTransform, textEl.closest('[lang]')?.getAttribute('lang'))
  ctx.textBaseline = 'alphabetic'
  const ascent = ctx.measureText(text).fontBoundingBoxAscent
  ctx.fillText(text, padding * dpr, padding * dpr + ascent)

  return { image, width: size.width, height: size.height, dpr }
}
