import type { ParamTable } from '../compute/params'

/** 0~1，含 alpha */
export type Rgba = [number, number, number, number]

interface Probe {
  key: string
  fallback: string | undefined
  span: HTMLElement
  input: string | undefined
  computed: string
  rgba: Rgba
}

interface ColorProbe {
  /** 解析参数表里每个颜色类参数本帧的值。每帧调用：主题切换时颜色带过渡，只读一次会停在旧主题 */
  read: (values: Readonly<Record<string, unknown>>) => Record<string, Rgba>
  /** 撤掉探针 */
  remove: () => void
}

/**
 * design.md 第九节的颜色继承：每个颜色类参数一个隐藏的探针 span，建在挂载点里（内核独占），
 * 继承的正是根元素的 color。解析交给浏览器：1×1 画布填色后 getImageData 读回 sRGB——
 * 计算值不会统一转成 rgb，正则会把 oklch(0.7 0.15 200) 解析成 0,7,0
 */
export function createColorProbe(layerEl: HTMLElement, table: ParamTable): ColorProbe {
  const scratch = document.createElement('canvas')
  scratch.width = 1
  scratch.height = 1
  const ctx = scratch.getContext('2d', { willReadFrequently: true })
  if (!ctx)
    throw new Error('颜色回读用的 2D 上下文创建失败')

  const probes: Probe[] = []
  for (const [key, spec] of Object.entries(table)) {
    if (spec.type !== 'color')
      continue
    const span = document.createElement('span')
    span.hidden = true
    layerEl.append(span)
    probes.push({ key, fallback: spec.fallback, span, input: undefined, computed: '', rgba: [0, 0, 0, 1] })
  }

  const toRgba = (color: string): Rgba => {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data
    return [r / 255, g / 255, b / 255, a / 255]
  }

  return {
    read(values) {
      const colors: Record<string, Rgba> = {}
      for (const probe of probes) {
        const input = (values[probe.key] ?? (probe.fallback === undefined ? undefined : values[probe.fallback])) as string | undefined
        if (input !== probe.input) {
          // 先清空：非法颜色串的赋值会被忽略、留下上一个值，清空后它回落为继承色
          probe.span.style.color = ''
          if (input !== undefined)
            probe.span.style.color = input
          probe.input = input
        }
        const computed = getComputedStyle(probe.span).color
        if (computed !== probe.computed) {
          probe.computed = computed
          probe.rgba = toRgba(computed)
        }
        colors[probe.key] = probe.rgba
      }
      return colors
    },
    remove() {
      for (const probe of probes)
        probe.span.remove()
    },
  }
}
