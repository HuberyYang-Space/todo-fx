/**
 * 监听画布上的上下文丢失与恢复，返回退订函数。2D 画布永远收不到这两个事件，天然不生效。
 * 不持有任何 GL 句柄：恢复后由运行时重新 setup，ogl 对象里的旧句柄全部作废
 */
export function watchContext(canvas: HTMLCanvasElement, onLost: () => void, onRestored: () => void): () => void {
  function lost(event: Event): void {
    // 不调的话浏览器永远不恢复：GPU 重置（睡眠唤醒、驱动更新）后标题就一直停在真文本
    event.preventDefault()
    onLost()
  }
  canvas.addEventListener('webglcontextlost', lost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  return () => {
    canvas.removeEventListener('webglcontextlost', lost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
  }
}

/** 画布上的 WebGL 上下文此刻是否已丢失；2D 画布拿不到 WebGL 上下文，恒为 false */
export function isContextLost(canvas: HTMLCanvasElement): boolean {
  return (canvas.getContext('webgl2') ?? canvas.getContext('webgl'))?.isContextLost() ?? false
}

/**
 * 主动交还 WebGL 上下文：不等垃圾回收，不再占着同页约 16 个的上下文名额。
 * 同一画布上 getContext 只返回已有的那个上下文；2D 画布在这里拿到 null，天然跳过
 */
export function releaseContext(canvas: HTMLCanvasElement): void {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
}
