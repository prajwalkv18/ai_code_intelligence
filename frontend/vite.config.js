import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All requests to /api are forwarded to the FastAPI backend.
      // The frontend never hardcodes http://localhost:8000.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // CRITICAL: disable proxy buffering so SSE events stream through immediately.
        // Without this, Vite buffers the entire response and panels stay on LOADING forever.
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // If the backend sends text/event-stream, disable buffering
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.socket?.setNoDelay(true)
            }
          })
        },
      },
    },
  },
})

