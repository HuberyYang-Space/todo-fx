import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

export const overflowHidden: HostFixture<never> = {
  id: 'overflow-hidden',
  title: 'overflow: hidden 的容器（对应 my-blog 的 ::demo）',
  trap: '画布四周的流动溢出被裁掉',
  mount(root) {
    const removeStyle = injectStyle('.fx-host-overflow-hidden { width: 240px; padding: 8px; overflow: hidden; }')
    const host = createHost(root, 'fx-host-overflow-hidden')
    const { heading, target } = createHeading('Hubery')
    host.append(heading)
    return {
      targets: [target],
      actions: {},
      cleanup() {
        host.remove()
        removeStyle()
      },
    }
  },
}
