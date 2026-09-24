import { expect, it } from 'vitest'

it('默认 instance 上 (hover: hover) 为 true', () => {
  expect(window.matchMedia('(hover: hover)').matches).toBe(true)
  expect(window.matchMedia('(hover: none)').matches).toBe(false)
})
