import type { HostFixture } from './types'
import { createHeading, createHost } from './dom'

// Chromium 与 WebKit 同一文档里第 17 个 WebGL 上下文会挤掉最旧的一个（实测），所以要比 16 多
const COUNT = 18

export const manyInstances: HostFixture<never> = {
  id: 'many-instances',
  title: '同页多个实例',
  trap: 'WebGL 上下文上限',
  mount(root) {
    const host = createHost(root, 'fx-host-many-instances')
    const targets = Array.from({ length: COUNT }, (_, i) => {
      const { heading, target } = createHeading(`Hubery ${i + 1}`)
      host.append(heading)
      return target
    })
    return {
      targets,
      actions: {},
      cleanup() {
        host.remove()
      },
    }
  },
}
