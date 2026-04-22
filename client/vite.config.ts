import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3300',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3300',
        ws: true,
      },
    },
  },
})
