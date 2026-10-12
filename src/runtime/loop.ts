/** dt 上限：标签页切回来、断点停住之后，第一帧不会一步跳过一大段模拟 */
const MAX_DT = 1 / 30

interface Loop {
  start: () => void
  stop: () => void
}

/** raf 循环，回调拿到夹取到 [0, 1/30] 的 dt（秒） */
export function createLoop(onFrame: (dt: number) => void): Loop {
  let raf = 0
  let last = 0

  function tick(now: number): void {
    // raf 的时间戳是帧开始的时刻，可能早于 start() 里取的 performance.now()
    const dt = Math.min(Math.max((now - last) / 1000, 0), MAX_DT)
    last = now
    // 先排下一帧：onFrame 里调了 stop() 时能把它撤掉；反过来排在后面会在 stop 之后又续上一帧
    raf = requestAnimationFrame(tick)
    onFrame(dt)
  }

  return {
    start() {
      if (raf)
        return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    },
    stop() {
      cancelAnimationFrame(raf)
      raf = 0
    },
  }
}
