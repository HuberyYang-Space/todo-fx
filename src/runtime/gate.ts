const mediaConditions = {
  'prefers-reduced-motion': '(prefers-reduced-motion: reduce)',
  'hover: none': '(hover: none)',
  'forced-colors': '(forced-colors: active)',
} as const

export type SleepReason = keyof typeof mediaConditions | 'WebGL 上下文丢失' | '文字宽度为 0' | '文字折行'

/**
 * 必需 API 清单（design.md 第十一节），返回缺的第一项；都在返回 null。
 * 太旧的浏览器直接回退真文本，不为它们写逐个 API 的回退分支
 */
export function missingApi(): string | null {
  if (typeof window === 'undefined')
    return 'window（非浏览器环境）'
  if (!('letterSpacing' in CanvasRenderingContext2D.prototype))
    return 'CanvasRenderingContext2D.letterSpacing'
  if (!('fontBoundingBoxAscent' in TextMetrics.prototype))
    return 'TextMetrics.fontBoundingBoxAscent'
  if (typeof ResizeObserver !== 'function')
    return 'ResizeObserver'
  if (!('onloadingdone' in document.fonts))
    return 'document.fonts 的 loadingdone 事件'
  return null
}

/** 订阅三个媒体查询的变化，返回退订函数。这些 MediaQueryList 只当信号源，当前状态由 sleepReason 读 */
export function watchMedia(onChange: () => void): () => void {
  const lists = Object.values(mediaConditions).map(query => window.matchMedia(query))
  for (const list of lists)
    list.addEventListener('change', onChange)
  return () => {
    for (const list of lists)
      list.removeEventListener('change', onChange)
  }
}

/**
 * 休眠判定：返回第一个成立的休眠条件，都不成立返回 null。
 * 折行判定靠 getClientRects() 多于一个矩形，只在 textEl 是 inline 元素时成立
 */
export function sleepReason(textEl: HTMLElement, contextLost: boolean): SleepReason | null {
  for (const [reason, query] of Object.entries(mediaConditions)) {
    // 必须新建查询：Chromium 里在 change 事件派发前读被监听那个 MediaQueryList 的 .matches，
    // forced-colors 的 change 会被吞掉，退出强制色后再也收不到恢复信号（阶段 0 实测）
    if (window.matchMedia(query).matches)
      return reason as SleepReason
  }
  if (contextLost)
    return 'WebGL 上下文丢失'
  if (textEl.getBoundingClientRect().width === 0)
    return '文字宽度为 0'
  if (textEl.getClientRects().length > 1)
    return '文字折行'
  return null
}
