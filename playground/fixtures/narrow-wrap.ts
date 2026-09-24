import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

export const narrowWrap: HostFixture<'加宽' | '收窄'> = {
  id: 'narrow-wrap',
  title: '窄容器里文字折行',
  trap: '纹理只画一行，被裁掉（应进入休眠）',
  mount(root) {
    const removeStyle = injectStyle(`
      .fx-host-narrow-wrap { width: 120px; font: 32px/1.2 sans-serif; }
      .fx-host-narrow-wrap.is-wide { width: auto; }
      .fx-host-narrow-wrap h1 { margin: 0; font: inherit; }
    `)
    const host = createHost(root, 'fx-host-narrow-wrap')
    const { heading, target } = createHeading('Hubery Yang Space')
    host.append(heading)
    return {
      targets: [target],
      actions: {
        加宽: () => host.classList.add('is-wide'),
        收窄: () => host.classList.remove('is-wide'),
      },
      cleanup() {
        host.remove()
        removeStyle()
      },
    }
  },
}
