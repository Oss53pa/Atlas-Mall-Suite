import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('vol1-commercial')) return 'vol1'
          if (id.includes('vol2-securitaire')) return 'vol2'
          if (id.includes('vol3-parcours'))   return 'vol3'
          if (id.includes('planReader'))      return 'plan-reader'
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
