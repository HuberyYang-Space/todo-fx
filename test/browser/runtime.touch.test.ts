import { expect, it, vi } from 'vitest'
import { createFakeEffect } from './fake-effect'
import { mountHeading, nextFrames } from './helpers'

// hover: none 只能靠 hasTouch 的 instance 仿真，进不了也出不去：这里只验「一直休眠」这一半
it('hover: none 时一直休眠：不 build、不涂透明', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const target = mountHeading()
  const fake = createFakeEffect(target.textEl)
  const instance = fake.create(target.textEl, target.layerEl, { debug: true })!
  await nextFrames(5)
  expect(fake.log.calls).toEqual(['setup'])
  expect(target.textEl.style.color).toBe('')
  expect(warn).toHaveBeenCalledWith('[todo-fx] 休眠：hover: none')
  instance.destroy()
  target.cleanup()
  warn.mockRestore()
})
