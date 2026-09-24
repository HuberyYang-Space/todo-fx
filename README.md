# @huberyyang/todo-fx

可复用的页面特效库：框架无关的内核 + Vue 壳。真文本始终留在 DOM 里，特效只把它涂透明，
所以布局不抖、能被选中和朗读，浏览器不支持时什么都不用做就是正确的降级。

> 开发中，尚未发布到 npm。安装与用法在第一版（`0.1.0`）发布时补齐。

## 开发

需要 Node 24（或 22.22.1 以上）与 pnpm 12.5.1。

```bash
pnpm install
pnpm exec playwright install chromium firefox webkit
```

| 命令 | 作用 |
| :--- | :--- |
| `pnpm play` | 启动 playground：宿主场景夹具与 Vue 夹具页 |
| `pnpm build` | 构建 `dist`，同时跑 publint 与 attw |
| `pnpm typecheck` | `vue-tsc --noEmit`，覆盖 `.ts` 与 `.vue` |
| `pnpm lint` | ESLint，含依赖方向守卫 |
| `pnpm test` | 全部测试：`unit`、`browser`（三内核）、`dist`（先构建） |

## License

[MIT](./LICENSE)
