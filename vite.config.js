// Corrected vite.config.js for Netlify
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Changed for Netlify: base path should be root '/'
  base: '/', 
})