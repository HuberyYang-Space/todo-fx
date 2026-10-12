/** 需要重建纹理的信号源；debug 开启时打印 */
type RebuildSource = 'resize' | 'ResizeObserver' | 'dpr' | 'fonts' | 'text'

/**
 * 元素的 border box 布局尺寸，与 ResizeObserver 的 borderBoxSize 同一口径。
 * 不用 getBoundingClientRect：祖先带 transform 时它量到的是缩放后的值；也不用 offsetWidth：它取了整
 */
function layoutBorderBox(el: Element): [number, number] {
  const style = getComputedStyle(el)
  let width = Number.parseFloat(style.width)
  let height = Number.parseFloat(style.height)
  // 没有渲染（挂在 display: none 里）或 inline 元素时计算宽高是 auto
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    const rect = el.getBoundingClientRect()
    return [rect.width, rect.height]
  }
  if (style.boxSizing !== 'border-box') {
    const sum = (...values: string[]): number => values.reduce((total, value) => total + Number.parseFloat(value), 0)
    width += sum(style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth)
    height += sum(style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth)
  }
  return [width, height]
}

/**
 * 监听会让纹理过期的变化，每来一个信号就回调一次；合并到每帧最多一次重建由运行时负责。
 * 返回退订函数
 */
export function watchRebuild(textEl: HTMLElement, onSignal: (source: RebuildSource) => void): () => void {
  const onResize = (): void => onSignal('resize')
  window.addEventListener('resize', onResize, { passive: true })

  // 挂在父元素上：ResizeObserver 规范跳过 display: inline 的非替换元素，挂在 span 上等于没挂。
  // 首次回调总会来一次，报告的是开播时已经量过的尺寸：尺寸没变就不算信号，否则每次开播都多建一次纹理
  const observed = textEl.parentElement ?? textEl
  let [lastWidth, lastHeight] = layoutBorderBox(observed)
  const resizeObserver = new ResizeObserver(([entry]) => {
    const box = entry?.borderBoxSize[0]
    const width = box?.inlineSize ?? Number.NaN
    const height = box?.blockSize ?? Number.NaN
    // 计算样式里的内边距是声明值，布局用的是对齐到 1/64px 的值，几处相加会差出一两个百分之一像素
    if (Math.abs(width - lastWidth) < 0.1 && Math.abs(height - lastHeight) < 0.1)
      return
    lastWidth = width
    lastHeight = height
    onSignal('ResizeObserver')
  })
  resizeObserver.observe(observed)

  // devicePixelRatio 没有变化事件：给当前值建一个媒体查询，它失配的那一刻就是 dpr 变了；
  // 查询钉死在具体数值上，变了之后要按新值重建一个
  let dprQuery: MediaQueryList | undefined
  function watchDpr(): void {
    dprQuery?.removeEventListener('change', onDprChange)
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    dprQuery.addEventListener('change', onDprChange)
  }
  function onDprChange(): void {
    watchDpr()
    onSignal('dpr')
  }
  watchDpr()

  // 纹理用的是画字那一刻的字体，webfont 晚到时字形与 DOM 对不上
  const onFonts = (): void => onSignal('fonts')
  document.fonts.addEventListener('loadingdone', onFonts)

  // 调用方改了文字却没有别的信号时，画布会继续画旧字、盖在透明的新字上
  const mutationObserver = new MutationObserver(() => onSignal('text'))
  mutationObserver.observe(textEl, { characterData: true, childList: true, subtree: true })

  return () => {
    window.removeEventListener('resize', onResize)
    resizeObserver.disconnect()
    dprQuery?.removeEventListener('change', onDprChange)
    document.fonts.removeEventListener('loadingdone', onFonts)
    mutationObserver.disconnect()
  }
}
