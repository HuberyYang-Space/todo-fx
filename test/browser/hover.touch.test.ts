import { expect, it } from 'vitest'

it('hasTouch 的 instance 上 (hover: none) 为 true', () => {
  expect(window.matchMedia('(hover: none)').matches).toBe(true)
  expect(window.matchMedia('(pointer: coarse)').matches).toBe(true)
})
