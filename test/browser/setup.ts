import { afterEach } from 'vitest'
import { commands } from 'vitest/browser'

// 仿真挂在 page 上，同一 page 里后面的用例和测试文件会原样继承（三内核实测）
afterEach(async () => {
  await commands.emulateMedia({ reducedMotion: null, forcedColors: null })
})
