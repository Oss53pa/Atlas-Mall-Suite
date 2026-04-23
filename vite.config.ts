import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Réduit le bruit dans les logs CI/Vercel (4 MB limit) — on ne veut voir
  // que les vraies erreurs et les warnings sérieux, pas chaque transformation.
  logLevel: process.env.CI ? 'warn' : 'info',
  define: {
    __BUILD_ID__: JSON.stringify(new Date().toISOString().replace(/[:.]/g, '-')),
  },
  plugins: [
    react(),
    // ─── Strip inlined WASM base64 from @mlightcad/libredwg-web ──────────
    // Le package publie un glue Emscripten qui embarque le .wasm (5.6 MB) en
    // base64 dans findWasmBinary(). Ce chemin n'est utilisé qu'en fallback
    // quand Module.locateFile n'est pas défini. Or on appelle toujours
    // LibreDwg.create('') qui déclenche locateFile → /libredwg-web.wasm
    // (servi depuis public/). La string base64 est donc du code mort :
    // on la retire au build pour économiser ~5.6 MB dans le bundle.
    {
      name: 'strip-libredwg-inline-wasm',
      enforce: 'pre' as const,
      transform(code: string, id: string) {
        if (!id.includes('libredwg-web')) return null
        if (!code.includes('data:application/wasm;base64,')) return null
        // Remplace la string base64 par un stub. findWasmBinary() ne passe
        // par cette branche que si locateFile est absent — auquel cas on
        // préfère une 404 claire à un bundle géant.
        const stripped = code.replace(
          /"data:application\/wasm;base64,[A-Za-z0-9+/=]+"/g,
          '"/libredwg-web.wasm"',
        )
        return { code: stripped, map: null }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Alias @core → dossier building/ (multi-verticale).
      // Le dossier contient en réalité le code générique multi-projets (4 volumes + workspace).
      // Renommé le 2026-04-23 (pivot Atlas BIM).
      // puis faire pointer cet alias vers le nouveau chemin. Voir CONTRIBUTING.md.
      '@core': path.resolve(__dirname, './src/modules/building'),
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
    // Sourcemaps en dev (débug) mais désactivés en CI/prod (économise ~30 MB
    // de disque de build sur Vercel, surtout les chunks vendor-three/libredwg).
    sourcemap: process.env.CI ? false : true,
    chunkSizeWarningLimit: 2500,  // vendor-three seul ≈ 4 MB → évite spam warnings
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
          // ─── Shared building code ───
          // Must be in its own chunk (or merged with react-vendor) so it
          // evaluates before any vol{1,2,3} lazy chunk that imports from it.
          // Without this, cross-chunk TDZ hits constants like
          // ATLAS_STUDIO_GROUP_META, CANVAS_SCALE, etc.
          if (id.includes('modules/building/shared/')) {
            return 'building-shared'
          }
          // ─── Volume code splitting ───
          if (id.includes('vol1-commercial'))    return 'vol1'
          if (id.includes('vol2-securitaire'))   return 'vol2'
          if (id.includes('vol3-parcours'))      return 'vol3'
          if (id.includes('vol4-wayfinder'))     return 'vol4'
          if (id.includes('view3d') || id.includes('vol-3d')) return 'view3d'
          // ─── @react-three : split par package ─────────────────────────
          // Chaque package R3F dans son propre chunk. Évite qu'un consommateur
          // de <Canvas> (fiber seul) tire aussi drei + xr.
          if (id.includes('node_modules/@react-three/xr'))    return 'vendor-r3f-xr'
          if (id.includes('node_modules/@react-three/drei'))  return 'vendor-r3f-drei'
          if (id.includes('node_modules/@react-three/fiber')) return 'vendor-r3f-fiber'
          if (id.includes('map-viewer/ar') ||
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
          // ─── Three.js : séparer core et addons ────────────────────────
          // three/examples/jsm/* (loaders, controls, exporters) pèse ~1.5 MB.
          // Uniquement utilisé par vol-3d → on sort du core pour éviter que
          // tout consommateur de three.core les embarque.
          if (id.includes('node_modules/three/examples/')) return 'vendor-three-addons'
          if (id.includes('node_modules/three/'))          return 'vendor-three'
          // ─── CAD/DWG lourds (WASM) ───────────────────────────────────
          // libredwg-web ≈ 5.6 MB (WASM inliné). Déjà lazy via dynamic
          // import ; nom figé pour cache stable.
          if (id.includes('libredwg-web'))       return 'vendor-libredwg'
          if (id.includes('web-ifc-three'))      return 'vendor-web-ifc-three'
          if (id.includes('web-ifc'))            return 'vendor-web-ifc'
          if (id.includes('dxf-viewer'))         return 'vendor-dxf-viewer'
          if (id.includes('dxf-parser'))         return 'vendor-dxf'
          // ─── Other vendor chunks ─────────────────────────────────────
          if (id.includes('pdfjs-dist'))         return 'vendor-pdfjs'
          if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts'
          if (id.includes('@supabase'))          return 'vendor-supabase'
          if (id.includes('@tanstack'))          return 'vendor-query'
          if (id.includes('jspdf'))              return 'vendor-jspdf'
          if (id.includes('docx'))               return 'vendor-docx'
          if (id.includes('framer-motion'))      return 'vendor-animation'
          if (id.includes('konva'))              return 'vendor-konva'
          // xlsx et exceljs sont deux libs indépendantes (~1.2 MB cumulé) →
          // séparer permet à chaque feature de charger seulement la sienne.
          if (id.includes('node_modules/xlsx/'))    return 'vendor-xlsx'
          if (id.includes('node_modules/exceljs/')) return 'vendor-exceljs'
          if (id.includes('pptxgenjs'))          return 'vendor-pptx'
          if (id.includes('html2canvas'))        return 'vendor-html2canvas'
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
      include: ['src/modules/building/shared/**/*.ts'],
      thresholds: {
        functions: 65,
        lines: 60,
      },
    },
  },
});
