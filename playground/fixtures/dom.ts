import type { FxTarget } from './types'

/**
 * 按 Vue 壳的结构建标题：文字 span 不带 style，与挂载点之间不留空白（design.md 第八节）。
 * 夹具与壳结构一致，内核在这里遇到的 DOM 就是消费方页面上的 DOM
 */
export function createHeading(text: string): { heading: HTMLElement, target: FxTarget } {
  const heading = document.createElement('h1')
  heading.style.position = 'relative'
  const textEl = document.createElement('span')
  textEl.textContent = text
  const layerEl = document.createElement('span')
  layerEl.dataset.fxLayer = ''
  heading.append(textEl, layerEl)
  return { heading, target: { textEl, layerEl } }
}

/** 往 head 里插一段宿主样式，返回撤销函数 */
export function injectStyle(css: string): () => void {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

/** 建一个带宿主 class 的容器挂进 root；夹具的样式都限定在这个 class 下，免得漏到同一文档里的其他测试 */
export function createHost(root: HTMLElement, className: string): HTMLElement {
  const host = document.createElement('div')
  host.className = className
  root.append(host)
  return host
}
