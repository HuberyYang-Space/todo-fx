import { beforeAll, beforeEach } from 'vitest'
import { commands } from 'vitest/browser'

// 仿真挂在 page 上，同一 page 会依次跑多个测试文件，前面的用例和文件留下的仿真会原样继承（三内核实测）；
// 基线也不能交给宿主系统：CI 的 Linux WebKit 不仿真时就是 prefers-reduced-motion: reduce。
// 所以显式回到同一个基线：beforeAll 比测试文件自己的 beforeAll 先注册、先执行，beforeEach 护住每条用例
const baseline = { reducedMotion: 'no-preference', forcedColors: 'none' } as const

beforeAll(async () => {
  await commands.emulateMedia(baseline)
})

beforeEach(async () => {
  await commands.emulateMedia(baseline)
})
