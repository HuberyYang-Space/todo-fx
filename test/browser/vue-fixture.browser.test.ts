import { expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import App from '../../playground/vue/App.vue'

it('按壳的结构渲染：文字 span 不带 style，与挂载点之间没有空白', async () => {
  const { container } = await render(App)
  const heading = container.querySelector('h1')!
  expect(heading.style.position).toBe('relative')
  const [textEl, layerEl] = Array.from(heading.children)
  expect(textEl!.textContent).toBe('Hubery')
  expect(textEl!.hasAttribute('style')).toBe(false)
  expect(textEl!.nextSibling).toBe(layerEl)
  expect(layerEl!.hasAttribute('data-fx-layer')).toBe(true)
  expect(layerEl!.childNodes).toHaveLength(0)
})
