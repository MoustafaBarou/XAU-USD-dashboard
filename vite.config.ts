import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base set to './' so the build works on GitHub Pages under any repo subpath
export default defineConfig({
  plugins: [react()],
  base: './',
})
