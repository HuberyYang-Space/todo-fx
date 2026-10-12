/** 需要重建纹理的信号源；debug 开启时打印 */
type RebuildSource = 'resize' | 'ResizeObserver' | 'dpr' | 'fonts' | 'text'

/**
 * 监听会让纹理过期的变化，每来一个信号就回调一次；合并到每帧最多一次重建由运行时负责。
 * 返回退订函数
 */
export function watchRebuild(textEl: HTMLElement, onSignal: (source: RebuildSource) => void): () => void {
  const onResize = (): void => onSignal('resize')
  window.addEventListener('resize', onResize, { passive: true })

  // 挂在父元素上：ResizeObserver 规范跳过 display: inline 的非替换元素，挂在 span 上等于没挂
  const resizeObserver = new ResizeObserver(() => onSignal('ResizeObserver'))
  resizeObserver.observe(textEl.parentElement ?? textEl)

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
