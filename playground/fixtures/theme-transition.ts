import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

const DARK = 'fx-host-theme-dark'

export const themeTransition: HostFixture<'切换主题'> = {
  id: 'theme-transition',
  title: 'body 的 color 带 0.2s 过渡，切主题只改 html 的 class',
  trap: '颜色停在上一个主题',
  mount(root) {
    const removeStyle = injectStyle(`
      .fx-host-theme { color: rgb(20, 20, 20); background: rgb(250, 250, 250); transition: color 0.2s, background-color 0.2s; }
      html.${DARK} .fx-host-theme { color: rgb(235, 235, 235); background: rgb(24, 24, 24); }
    `)
    const host = createHost(root, 'fx-host-theme')
    const { heading, target } = createHeading('Hubery')
    host.append(heading)
    const html = document.documentElement
    return {
      targets: [target],
      actions: {
        切换主题: () => html.classList.toggle(DARK),
      },
      cleanup() {
        html.classList.remove(DARK)
        host.remove()
        removeStyle()
      },
    }
  },
}
