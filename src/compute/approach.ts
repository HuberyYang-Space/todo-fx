/**
 * 把一个值朝目标推进一步，返回新值。
 *
 * 指数逼近而不是每帧加一个固定增量：后者的收敛速度会随帧率变化——
 * 120Hz 屏上到位的时间是 60Hz 的一半，同一份参数在两台机器上是两种手感。
 * 指数逼近也天然不会越过目标，不需要额外夹取。
 *
 * @param current 当前值
 * @param target 目标值
 * @param dt 距上一帧的时长（毫秒）
 * @param speed 收敛速度，越大越快。约 1/speed 秒走完 63% 的距离
 */
export function approach(current: number, target: number, dt: number, speed: number): number {
  return current + (target - current) * (1 - Math.exp((-speed * dt) / 1000))
}
