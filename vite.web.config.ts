import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Standalone web build for GitHub Pages.
// The Electron build uses electron.vite.config.ts instead.
export default defineConfig({
  root: resolve(__dirname, '.'),
  base: '/jigsaw/',
  publicDir: 'public',
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
