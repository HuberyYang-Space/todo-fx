import type { HostFixture } from './types'
import { createHeading, createHost, injectStyle } from './dom'

/** 计算值不会统一转成 rgb 的写法（design.md 第九节）；display-p3 超出 sRGB 色域，回读时被裁到 sRGB */
export const modernColorValues = [
  'oklch(0.7 0.15 200)',
  'lab(50 40 30)',
  'color-mix(in srgb, red 50%, blue)',
  'color(display-p3 1 0 0)',
] as const

export const modernColors: HostFixture<never> = {
  id: 'modern-colors',
  title: 'oklch / lab / color-mix / display-p3 颜色',
  trap: '计算值不统一转成 rgb，正则解析出错值',
  mount(root) {
    // 标题文字就是颜色串本身，较长；不折行，免得窄视口里进入折行休眠、看不到效果
    const removeStyle = injectStyle('.fx-host-modern-colors h1 { font-size: 24px; white-space: nowrap; }')
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
        removeStyle()
      },
    }
  },
}
