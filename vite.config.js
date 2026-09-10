import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // shadcn's generated components import each other through `@/`, so the
      // alias is not optional once any of them are vendored in.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5175,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
