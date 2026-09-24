import type { HostFixture } from './types'
import { createHeading, createHost } from './dom'

export const hiddenContainer: HostFixture<'显示' | '隐藏'> = {
  id: 'hidden-container',
  title: '挂载在隐藏容器里，之后再显示',
  trap: '实例永久失效',
  mount(root) {
    const host = createHost(root, 'fx-host-hidden-container')
    host.hidden = true
    const { heading, target } = createHeading('Hubery')
    host.append(heading)
    return {
      targets: [target],
      actions: {
        显示: () => {
          host.hidden = false
        },
        隐藏: () => {
          host.hidden = true
        },
      },
      cleanup() {
        host.remove()
      },
    }
  },
}
