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
  const { actions } = fixture.mount(stage)
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
