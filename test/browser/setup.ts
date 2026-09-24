import { beforeEach } from 'vitest'
import { commands } from 'vitest/browser'

// 仿真挂在 page 上，同一 page 里后面的用例和测试文件会原样继承（三内核实测）；
// 基线也不能交给宿主系统：CI 的 Linux WebKit 不仿真时就是 prefers-reduced-motion: reduce。
// 所以每条用例开始前都显式回到同一个基线
beforeEach(async () => {
  await commands.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' })
})
