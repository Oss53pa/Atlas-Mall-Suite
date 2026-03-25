import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'zustand'],
  },
  worker: {
    format: 'es',
  },
  server: {
    // COOP/COEP only needed in production for SharedArrayBuffer
    // In dev they break HMR websocket and cause duplicate React instances
    hmr: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep React/Zustand in a single vendor chunk to prevent duplicate instances
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/zustand')) {
            return 'react-vendor'
          }
          if (id.includes('three'))           return 'three'
          if (id.includes('pdfjs-dist'))      return 'pdfjs'
          if (id.includes('web-ifc'))         return 'web-ifc'
          if (id.includes('dxf-parser'))      return 'dxf-parser'
          if (id.includes('recharts') || id.includes('d3')) return 'charts'
          if (id.includes('@supabase'))       return 'supabase'
          if (id.includes('jspdf'))           return 'jspdf'
          if (id.includes('docx'))            return 'docx'
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['web-ifc'],
  },
});
