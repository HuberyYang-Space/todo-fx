import { approach } from '../compute/approach'
import { proximity } from '../compute/proximity'

export interface PointerState {
  /** 画布内的 CSS 像素 */
  x: number
  y: number
  /** CSS 像素 / 秒，按原写法逐事件计算 */
  vx: number
  vy: number
  /** 上一帧之后有没有新的 mousemove：特效据此决定要不要采用这一帧的坐标与速度 */
  moved: boolean
}

interface PointerSample {
  /** 0~1：靠近度经快慢不对称的逼近后的值 */
  hover: number
  pointer: PointerState
}

interface Pointer {
  /** 每帧调一次：推进 hover，并取走「有新事件」这个标记 */
  sample: (dt: number, wakeSpeed: number, calmSpeed: number) => PointerSample
  stop: () => void
}

/** 两次事件的最短间隔（毫秒）：事件挤在一起时，避免除以一个极小的时间差算出离谱的速度 */
const MIN_EVENT_GAP = 14

export function createPointer(canvas: HTMLCanvasElement, enterRadius: () => number): Pointer {
  let x = 0
  let y = 0
  let vx = 0
  let vy = 0
  let moved = false
  let lastTime = 0
  let target = 0
  let hover = 0

  function onMouseMove(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect()
    // 换算成画布自己的 CSS 像素：祖先带 transform: scale 时屏幕上的距离被缩放过
    const scaleX = rect.width ? Number.parseFloat(canvas.style.width) / rect.width : 1
    const scaleY = rect.height ? Number.parseFloat(canvas.style.height) / rect.height : 1
    const nextX = (event.clientX - rect.left) * scaleX
    const nextY = (event.clientY - rect.top) * scaleY
    const now = performance.now()
    if (lastTime) {
      const gap = Math.max(now - lastTime, MIN_EVENT_GAP)
      vx = ((nextX - x) / gap) * 1000
      vy = ((nextY - y) / gap) * 1000
    }
    x = nextX
    y = nextY
    lastTime = now
    moved = true
    target = proximity(event.clientX, event.clientY, rect, enterRadius())
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })

  return {
    sample(dt, wakeSpeed, calmSpeed) {
      // 醒得快、静得慢：反过来会显得黏
      hover = approach(hover, target, dt * 1000, target > hover ? wakeSpeed : calmSpeed)
      const pointer = { x, y, vx, vy, moved }
      moved = false
      return { hover, pointer }
    },
    stop() {
      window.removeEventListener('mousemove', onMouseMove)
    },
  }
}
