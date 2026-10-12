import type { ParamTable } from '../compute/params'

/**
 * 公共参数：由运行时的共享件消费，每个特效都有（architecture.md 第六节）。
 * 特效要改某个公共参数的默认值，就在自己的参数表里用同名键重写那一行
 */
export const commonParams = {
  color: { type: 'color', route: 'patch' },
  enterRadius: { type: 'number', default: 150, route: 'patch' },
  wakeSpeed: { type: 'number', default: 4.5, route: 'patch' },
  calmSpeed: { type: 'number', default: 2.4, route: 'patch' },
  padding: { type: 'number', default: 48, route: 'rebuild' },
  maxDpr: { type: 'number', default: 2, route: 'rebuild' },
  debug: { type: 'boolean', default: false, route: 'patch' },
} as const satisfies ParamTable
