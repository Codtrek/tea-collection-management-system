import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Listen on all interfaces (needed inside the deploy/preview containers).
    host: '0.0.0.0',
    // Pin the port so a stray second `npm run dev` fails loudly instead of
    // silently drifting to 5174/5175 and leaving stale tabs on dead ports.
    port: 5173,
    strictPort: true,
  },
})
