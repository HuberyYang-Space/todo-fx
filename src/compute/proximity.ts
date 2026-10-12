/** 矩形外框，字段与 DOMRect 同名，可以直接传 getBoundingClientRect() 的结果 */
interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * 点到矩形外框的最短距离换算成 0~1 的靠近度：压在框内为 1，距离达到 radius 时降到 0。
 *
 * 用距离而不是 mouseenter / mouseleave：事件是个开关，鼠标一压线整块字突然开始流动，
 * 那一下的突兀正是要避免的东西。
 */
export function proximity(x: number, y: number, box: Box, radius: number): number {
  const outX = Math.max(box.left - x, 0, x - box.right)
  const outY = Math.max(box.top - y, 0, y - box.bottom)
  const distance = Math.hypot(outX, outY)
  // radius 为 0 时下面的除法在框内得到 NaN
  if (radius <= 0)
    return distance === 0 ? 1 : 0
  return Math.max(0, 1 - distance / radius)
}
