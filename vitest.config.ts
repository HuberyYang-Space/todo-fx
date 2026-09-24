import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import * as commands from './test/browser/commands.ts'

// Playwright 1.63 启动 Chromium 时已默认追加这个开关；显式写上，不把 CI 里 WebGL 能否创建押在上游默认值上
const chromiumArgs = ['--enable-unsafe-swiftshader']

// Linux 上 headless Firefox 建不出 WebGL（Mozilla bug 1375585），CI 里改 headed，由 xvfb-run 提供 display；
// 本地 macOS 的 headless Firefox 能建 WebGL，不必每次弹窗
const firefoxHeadless = !process.env.CI

// hover: none 只能靠 contextOptions.hasTouch 仿真，contextOptions 又只能按 instance 配，
// 所以每个内核多一个只跑 *.touch.test.ts 的 instance。instance 级的 provider 整体覆盖父级、不合并，选项要写全
const touchInclude = ['test/browser/**/*.touch.test.ts']

export default defineConfig({
  plugins: [vue()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.browser.test.ts'],
          setupFiles: ['test/browser/setup.ts'],
          browser: {
            enabled: true,
            // 默认值取 process.env.CI，本地会弹出 6 个浏览器窗口；调试时用 --browser.headless=false 覆盖
            headless: true,
            provider: playwright(),
            commands,
            instances: [
              { browser: 'chromium', provider: playwright({ launchOptions: { args: chromiumArgs } }) },
              { browser: 'firefox', headless: firefoxHeadless },
              { browser: 'webkit' },
              {
                browser: 'chromium',
                name: 'chromium-touch',
                include: touchInclude,
                provider: playwright({ launchOptions: { args: chromiumArgs }, contextOptions: { hasTouch: true } }),
              },
              {
                browser: 'firefox',
                name: 'firefox-touch',
                include: touchInclude,
                provider: playwright({ contextOptions: { hasTouch: true } }),
              },
              {
                browser: 'webkit',
                name: 'webkit-touch',
                include: touchInclude,
                provider: playwright({ contextOptions: { hasTouch: true } }),
              },
            ],
          },
        },
      },
    ],
  },
})
