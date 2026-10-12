import { describe, expect, it } from 'vitest'
import { approach } from '../../src/compute/approach'

// 从 my-blog 的 test/animation.test.ts 原样迁入
describe('approach', () => {
  it('朝目标推进，不会越过目标', () => {
    expect(approach(0, 1, 1000, 1)).toBeLessThanOrEqual(1)
    expect(approach(1, 0, 1000, 1)).toBeGreaterThanOrEqual(0)
  })

  it('dt 为 0 时原地不动', () => {
    expect(approach(0.4, 1, 0, 1)).toBeCloseTo(0.4)
  })

  it('收敛速度与帧率无关——同样的总时长，拆成多帧走到的位置相同', () => {
    const once = approach(0, 1, 100, 6)
    let stepped = 0
    for (let i = 0; i < 10; i++)
      stepped = approach(stepped, 1, 10, 6)

    expect(stepped).toBeCloseTo(once, 4)
  })

  it('已经在目标上就停住', () => {
    expect(approach(1, 1, 16, 6)).toBeCloseTo(1)
  })

  it('speed 越大收敛越快', () => {
    expect(approach(0, 1, 100, 12)).toBeGreaterThan(approach(0, 1, 100, 3))
  })
})
