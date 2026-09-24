import type { HostFixture } from './types'
import { createHeading, createHost } from './dom'

/** 计算值不会统一转成 rgb 的三种写法（design.md 第九节） */
export const modernColorValues = [
  'oklch(0.7 0.15 200)',
  'lab(50 40 30)',
  'color-mix(in srgb, red 50%, blue)',
] as const

export const modernColors: HostFixture<never> = {
  id: 'modern-colors',
  title: 'oklch / lab / color-mix 颜色',
  trap: '计算值不统一转成 rgb，正则解析出错值',
  mount(root) {
    const host = createHost(root, 'fx-host-modern-colors')
    const targets = modernColorValues.map((color) => {
      const { heading, target } = createHeading(color)
      heading.style.color = color
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
