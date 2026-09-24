import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    vue: 'src/vue/index.ts',
  },
  // 不写就靠自动探测，而 exports 生成的映射不带 types 条件，探测结果是 false
  dts: true,
  exports: true,
  target: 'es2020',
  platform: 'neutral',
  publint: true,
  attw: {
    profile: 'esm-only',
    // 默认 warn：类型有问题也照常构建成功
    level: 'error',
  },
  // publint 的 warning 级问题、import 了没装的包，默认都只报警告、照常产出
  failOnWarn: true,
  // 依赖一旦被打进 dist 就报错：ogl 误挪进 devDependencies 时，默认只有一条 info 级提示
  deps: {
    onlyBundle: [],
  },
})
