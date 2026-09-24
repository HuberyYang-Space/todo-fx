import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

export const resetCanvas: HostFixture<never> = {
  id: 'reset-canvas',
  title: 'reset 里有 canvas { max-width: 100% }',
  trap: '画布被横向压扁，字又小又偏左',
  mount(root) {
    const removeStyle = injectStyle('.fx-host-reset-canvas canvas { max-width: 100%; }')
    const host = createHost(root, 'fx-host-reset-canvas')
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
