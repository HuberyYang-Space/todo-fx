import antfu, { parserPlain } from '@antfu/eslint-config'

// 依赖方向守卫（.docs/architecture.md 第八节）。同一文件命中多个配置项时，后一项的规则选项整体覆盖前一项、不合并，
// 所以每个目录只写一个配置项，把该目录的全部禁令拼进同一条 no-restricted-imports。
// 路径按目录深度写：compute/、runtime/ 是扁平目录，特效在 effects/<name>/ 下一层。
// 在更深的子目录里写 import 会被误报（响亮地红），届时改规则，不要放宽。

const noFramework = {
  regex: '^(?:vue|react|react-dom)(?:/|$)|^@vue/',
  message: '内核不得 import 任何框架，框架只能出现在 src/vue/ 壳里。',
}

const noOgl = {
  regex: '^ogl(?:/|$)',
  message: 'runtime/ 不碰 ogl，否则只用 particle-text 的消费方会被连带打包 ogl。',
}

const noSelfReference = {
  regex: '^@huberyyang/todo-fx(?:/|$)',
  message: '内核内部不得经由包名引用自己，那会绕过分层、把整个公开入口拉进来。',
}

const domGlobals = [
  'window',
  'document',
  'navigator',
  'location',
  'screen',
  'devicePixelRatio',
  'innerWidth',
  'innerHeight',
  'addEventListener',
  'removeEventListener',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'matchMedia',
  'ResizeObserver',
  'MutationObserver',
  'IntersectionObserver',
  'HTMLElement',
  'HTMLCanvasElement',
  'OffscreenCanvas',
  'Image',
  'CanvasRenderingContext2D',
  'WebGLRenderingContext',
  'WebGL2RenderingContext',
  'FontFace',
].map(name => ({ name, message: '纯计算层零 DOM：把需要的值作为参数传进来。' }))

export default antfu(
  {
    type: 'lib',
    vue: true,
    antislop: true,
    // md 代码块里的伪代码会被当成文件去解析，.docs 里的契约草图全是这种
    ignores: ['.docs/**'],
  },
  {
    // antfu README 说 antislop 会禁显式 any，9.5.1 实际没有开
    name: 'todo-fx/no-any',
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'ts/no-explicit-any': 'error',
    },
  },
  {
    name: 'todo-fx/boundaries/compute',
    files: ['src/compute/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?:/|$)', message: '纯计算层不得 import 其他层。' },
          noFramework,
          noSelfReference,
        ],
      }],
      'no-restricted-globals': [
        'error',
        { name: 'global', message: 'Use `globalThis` instead.' },
        { name: 'self', message: 'Use `globalThis` instead.' },
        ...domGlobals,
      ],
    },
  },
  {
    name: 'todo-fx/boundaries/runtime',
    files: ['src/runtime/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?:/(?!compute(?:/|$))|/?$)', message: 'runtime/ 只能向下依赖 compute/。' },
          noFramework,
          noOgl,
          noSelfReference,
        ],
      }],
    },
  },
  {
    name: 'todo-fx/boundaries/effects',
    files: ['src/effects/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?:/(?!\\.\\.(?:/|$))|/?$)', message: '特效之间不得互相 import，共享逻辑放进 runtime/ 或 compute/。' },
          { regex: '^\\.\\./\\.\\.(?:/?$|/(?!(?:runtime|compute)(?:/|$)))', message: '特效只能向下依赖 runtime/ 与 compute/。' },
          noFramework,
          noSelfReference,
        ],
      }],
    },
  },
  {
    name: 'todo-fx/boundaries/index',
    files: ['src/index.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\./vue(?:/|$)', message: '公开入口 . 不得引用 Vue 壳，壳走独立入口 ./vue。' },
          noFramework,
          noSelfReference,
        ],
      }],
    },
  },
  {
    name: 'todo-fx/boundaries/vue',
    files: ['src/vue/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^\\.\\.(?!/index$)(?:/|$)', message: '壳只能经由公开入口 \'../index\' 调用内核。' },
        ],
      }],
    },
  },
  {
    // antislop 挂在包括 html 在内的全部源文件上，antfu 却没给 html 配解析器，默认的 JS 解析器一读 html 就报错
    name: 'todo-fx/html',
    files: ['**/*.html'],
    languageOptions: { parser: parserPlain },
  },
  {
    // 这条规则针对英文 AI 腔，见到 U+2014 就报错，而中文破折号是正常标点。
    // files 不能省：antfu 会给没写 files 的用户配置项自动注入 ignores: ['**/*.md']，md 就放不开了
    name: 'todo-fx/chinese-dash',
    files: ['**/*'],
    rules: {
      'slop/no-em-dash': 'off',
    },
  },
)
