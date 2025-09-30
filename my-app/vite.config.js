import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],
  server:
  {
    headers:{
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  },
  test: {
    environment: 'jsdom',
    
    globals: true,
    setupFiles: ['./src/test-setup.js'], 
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js', 'src/**/*.jsx'],
      exclude: ['node_modules/**', 'public/**','src/tests/','src/pages/vendor/VendorContract.jsx']
    },
  },
})
