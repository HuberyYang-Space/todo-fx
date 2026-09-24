import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@huberyyang/todo-fx/vue': fileURLToPath(new URL('../src/vue/index.ts', import.meta.url)),
      '@huberyyang/todo-fx': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
})
