import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(new Date().toISOString().replace(/[:.]/g, '-')),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Alias @core → ancien dossier cosmos-angre (historiquement nommé d'après le projet pilote).
      // Le dossier contient en réalité le code générique multi-projets (4 volumes + workspace).
      // À terme, renommer physiquement src/modules/cosmos-angre/ → src/modules/core/
      // puis faire pointer cet alias vers le nouveau chemin. Voir CONTRIBUTING.md.
      '@core': path.resolve(__dirname, './src/modules/cosmos-angre'),
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
  esbuild: {
    // En production : supprime console.log/debug/info (on garde console.warn/error)
    // En dev : on conserve tout pour le débogage
    drop: (process.env.NODE_ENV === 'production' ? ['debugger'] : []) as ('debugger' | 'console')[],
    pure: process.env.NODE_ENV === 'production'
      ? ['console.log', 'console.debug', 'console.info', 'console.trace']
      : [],
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ─── Vendors that must load before any volume chunk ───
          // lucide-react is used by every volume and every section; when it
          // falls into the default chunk, lazy-loaded section chunks can
          // evaluate before their icons resolve → TDZ "Cannot access 'X'
          // before initialization". Pinning it to react-vendor guarantees
          // eager loading.
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/zustand/') ||
            id.includes('node_modules/lucide-react/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
          // ─── Shared cosmos-angre code ───
          // Must be in its own chunk (or merged with react-vendor) so it
          // evaluates before any vol{1,2,3} lazy chunk that imports from it.
          // Without this, cross-chunk TDZ hits constants like
          // ATLAS_STUDIO_GROUP_META, CANVAS_SCALE, etc.
          if (id.includes('modules/cosmos-angre/shared/')) {
            return 'cosmos-shared'
          }
          // ─── Volume code splitting ───
          if (id.includes('vol1-commercial'))    return 'vol1'
          if (id.includes('vol2-securitaire'))   return 'vol2'
          if (id.includes('vol3-parcours'))      return 'vol3'
          if (id.includes('vol4-wayfinder'))     return 'vol4'
          if (id.includes('view3d') || id.includes('vol-3d')) return 'view3d'
          // AR : isolé pour ne pas charger @react-three/xr hors mode AR
          if (id.includes('@react-three') ||
              id.includes('map-viewer/ar') ||
              id.includes('view3d/modes/ARRenderer')) return 'ar-chunk'
          // Map-viewer (2D/3D/AR shell)
          if (id.includes('shared/map-viewer'))  return 'map-viewer'
          if (id.includes('shared/guided-tour')) return 'guided-tour'
          if (id.includes('wayfinder-designer')) return 'wayfinder-designer'
          if (id.includes('proph3t-core'))       return 'proph3t-core'
          if (id.includes('scenarios'))          return 'scenarios'
          if (id.includes('dce'))                return 'dce'
          if (id.includes('validation'))         return 'validation'
          if (id.includes('planReader'))         return 'plan-reader'
          // ─── Other vendor chunks ───
          if (id.includes('three'))              return 'vendor-three'
          if (id.includes('pdfjs-dist'))         return 'vendor-pdfjs'
          if (id.includes('web-ifc'))            return 'vendor-web-ifc'
          if (id.includes('dxf-parser'))         return 'vendor-dxf'
          if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts'
          if (id.includes('@supabase'))          return 'vendor-supabase'
          if (id.includes('@tanstack'))          return 'vendor-query'
          if (id.includes('jspdf'))              return 'vendor-jspdf'
          if (id.includes('docx'))               return 'vendor-docx'
          if (id.includes('framer-motion'))      return 'vendor-animation'
          if (id.includes('konva'))              return 'vendor-konva'
          if (id.includes('xlsx') || id.includes('exceljs')) return 'vendor-excel'
          if (id.includes('pptxgenjs'))          return 'vendor-pptx'
        },
        // Nommage explicite pour cache efficace
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
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
