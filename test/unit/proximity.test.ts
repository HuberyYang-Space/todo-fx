import { describe, expect, it } from 'vitest'
import { proximity } from '../../src/compute/proximity'

const box = { left: 100, top: 100, right: 200, bottom: 150 }

describe('proximity', () => {
  it('压在框内（含边线）为 1', () => {
    expect(proximity(150, 120, box, 50)).toBe(1)
    expect(proximity(100, 100, box, 50)).toBe(1)
    expect(proximity(200, 150, box, 50)).toBe(1)
  })

  it('四个方向按到边的距离线性衰减', () => {
    expect(proximity(75, 120, box, 50)).toBeCloseTo(0.5)
    expect(proximity(225, 120, box, 50)).toBeCloseTo(0.5)
    expect(proximity(150, 75, box, 50)).toBeCloseTo(0.5)
    expect(proximity(150, 175, box, 50)).toBeCloseTo(0.5)
  })

  it('斜角方向按到角点的直线距离算，不是两轴分别算', () => {
    // 到右下角 (200, 150) 的距离是 30·√2 ≈ 42.4
    expect(proximity(230, 180, box, 50)).toBeCloseTo(1 - Math.hypot(30, 30) / 50)
  })

  it('超出半径为 0，不会变负', () => {
    expect(proximity(0, 0, box, 50)).toBe(0)
  })

  it('半径为 0 时框内为 1、框外为 0，不出 NaN', () => {
    expect(proximity(150, 120, box, 0)).toBe(1)
    expect(proximity(201, 120, box, 0)).toBe(0)
  })
})
