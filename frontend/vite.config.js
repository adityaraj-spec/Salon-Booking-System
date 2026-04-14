import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss()
  ],
  base: '/',  // This ensures assets load correctly on refresh
  server: {
    port: 5173,  // Change to 3001 for admin panel to avoid conflicts
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000, // suppress warning for large libs like mapbox-gl, framer-motion
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor libs into separate chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mapbox': ['mapbox-gl'],  // react-map-gl excluded (non-standard exports)
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
})
