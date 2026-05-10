import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000'),
    __BUILD_ID__: JSON.stringify(
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      new Date().toISOString()
    )
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/ws': {
        target: (process.env.VITE_API_URL || 'http://localhost:8000').replace('http', 'ws'),
        ws: true
      }
    }
  }
})
