import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('echarts')) return 'echarts'
          if (id.includes('element-plus')) return 'element-plus'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('/vue/') || id.includes('pinia') || id.includes('vue-router')) {
            return 'vue-vendor'
          }
          return 'vendor'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'https://warblood.online',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
