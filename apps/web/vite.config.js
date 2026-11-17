import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['dev.roark.uno', 'app.roark.uno'],
    fs: {
      // Keep Vite's default exclusions and deny migration sources/backups.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/private/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
