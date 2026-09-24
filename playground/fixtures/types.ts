/** 交给内核的一对元素：真文本与空挂载点 */
export interface FxTarget {
  textEl: HTMLElement
  layerEl: HTMLElement
}

export interface MountedFixture<A extends string = string> {
  targets: FxTarget[]
  /** 宿主侧的操作：playground 渲染成按钮，测试直接调用 */
  actions: Record<A, () => void>
  /** 撤掉夹具加进文档的一切：DOM、样式、html 上的 class */
  cleanup: () => void
}

export interface HostFixture<A extends string = string> {
  id: string
  /** design.md 第十三节「夹具」一栏 */
  title: string
  /** 同表「对应的真实陷阱」一栏 */
  trap: string
  mount: (root: HTMLElement) => MountedFixture<A>
}
