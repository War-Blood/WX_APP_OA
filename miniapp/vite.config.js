import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  server: {
    host: '127.0.0.1',   // 只绑本地,绕开 0.0.0.0 的 EACCES
    port: 8080,          // 换成你确认的空闲端口
    strictPort: false    // 万一还被占,自动顺延到下一个
  }
})
