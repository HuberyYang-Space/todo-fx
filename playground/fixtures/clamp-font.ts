import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

export const clampFont: HostFixture<never> = {
  id: 'clamp-font',
  title: 'clamp() 响应式字号 + 负 letter-spacing',
  trap: '纹理与 DOM 文字对不齐，光标压字',
  mount(root) {
    const removeStyle = injectStyle('.fx-host-clamp-font h1 { font-size: clamp(2rem, 8vw, 5rem); letter-spacing: -0.02em; }')
    const host = createHost(root, 'fx-host-clamp-font')
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
