import type { ParamTable } from '../../compute/params'

/** design.md 第七节；color、enterRadius、wakeSpeed / calmSpeed、padding、maxDpr、debug 是公共参数，由运行时补上 */
export const liquidTextParams = {
  /** 高光色：划得快的地方往它偏。默认等于 color，即没有高光；不读任何宿主 CSS 变量，要接站点主色就传 `var(--c-primary)` */
  accent: { type: 'color', route: 'patch', fallback: 'color' },
  /** 位移强度（uv 单位）。再大就不像流动而像撕裂了 */
  strength: { type: 'number', default: 0.075, route: 'patch' },
  /** 色差强度，乘在 flowmap 的速度长度上 */
  chroma: { type: 'number', default: 0.04, route: 'patch' },
  /**
   * 静止时表面微流的振幅（uv 单位），调节「不碰它的时候有多活」的唯一旋钮。
   * 标题在 280 × 162 的画布上时，0.0022 折合横向约 1.6px 的峰值位移；0.0032 起就明显在晃，0.006 以上读作「抖」
   */
  idle: { type: 'number', default: 0.0022, route: 'patch' },
  /**
   * 鼠标轨迹速度图的参数。在 ogl 里它们其实是 uniform，但只能经未公开字段改，ogl 升级可能悄悄失效，所以走重建；
   * 重建会清掉当前残留的笔触。dissipation 越接近 1 消散越慢：0.96 让划过之后水面还在晃，短了会显得一碰就弹回去
   */
  flowmap: { type: 'object', default: { falloff: 0.32, alpha: 0.6, dissipation: 0.96 }, route: 'rebuild' },
} as const satisfies ParamTable
