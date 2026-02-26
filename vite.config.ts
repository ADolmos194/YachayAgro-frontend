/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    ui({
      ui: {
        colors: {
          primary: 'yellow',
          neutral: 'zinc'
        }
      }
    })
  ],
  envPrefix: 'VUE_',
  test: {
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e']
  }
})
