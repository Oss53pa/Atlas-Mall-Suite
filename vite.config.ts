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
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep React/Zustand in a single vendor chunk to prevent duplicate instances
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/zustand')) {
            return 'react-vendor'
          }
          // Volume code splitting
          if (id.includes('vol1-commercial'))    return 'vol1'
          if (id.includes('vol2-securitaire'))   return 'vol2'
          if (id.includes('vol3-parcours'))      return 'vol3'
          if (id.includes('view3d') || id.includes('vol-3d')) return 'view3d'
          if (id.includes('scenarios'))          return 'scenarios'
          if (id.includes('dce'))                return 'dce'
          if (id.includes('validation'))         return 'validation'
          if (id.includes('planReader'))          return 'plan-reader'
          // Vendor chunks
          if (id.includes('three'))              return 'vendor-three'
          if (id.includes('pdfjs-dist'))         return 'vendor-pdfjs'
          if (id.includes('web-ifc'))            return 'vendor-web-ifc'
          if (id.includes('dxf-parser'))         return 'vendor-dxf'
          if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts'
          if (id.includes('@supabase'))          return 'vendor-supabase'
          if (id.includes('@tanstack'))          return 'vendor-query'
          if (id.includes('jspdf'))              return 'vendor-jspdf'
          if (id.includes('docx'))               return 'vendor-docx'
        },
      },
    },
  },
  optimizeDeps: {
    include: ['dxf-parser', 'dexie'],
    exclude: ['web-ifc'],
  },
  // ═══ Vitest configuration ═══
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/modules/cosmos-angre/shared/**/*.ts'],
      thresholds: {
        functions: 65,
        lines: 60,
      },
    },
  },
});
