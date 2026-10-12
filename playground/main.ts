import { createLiquidText } from '@huberyyang/todo-fx'
import { hostFixtures } from './fixtures/index'

const app = document.querySelector<HTMLElement>('#app')!
const fixture = hostFixtures.find(f => f.id === new URLSearchParams(location.search).get('fixture'))

if (fixture) {
  document.title = fixture.title
  const heading = document.createElement('p')
  heading.textContent = `${fixture.title}｜陷阱：${fixture.trap}`
  const toolbar = document.createElement('div')
  const stage = document.createElement('div')
  app.append(heading, toolbar, stage)
  const { targets, actions } = fixture.mount(stage)
  // debug：在控制台看休眠、恢复与重建的原因；accent 用 my-blog 亮色主题的 --c-primary，与首页现状对照
  for (const { textEl, layerEl } of targets)
    createLiquidText(textEl, layerEl, { accent: '#2b7a6f', debug: true })
  for (const [label, run] of Object.entries(actions)) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', run)
    toolbar.append(button)
  }
}
else {
  const list = document.createElement('ul')
  for (const f of hostFixtures) {
    const item = document.createElement('li')
    const link = document.createElement('a')
    link.href = `?fixture=${f.id}`
    link.textContent = f.title
    item.append(link, `：${f.trap}`)
    list.append(item)
  }
  const vueLink = document.createElement('a')
  vueLink.href = './vue.html'
  vueLink.textContent = 'Vue 夹具页'
  app.append(list, vueLink)
}
