import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/AppLayout'

const DashboardPage = lazy(() => import('./modules/projects/DashboardPage'))
const SettingsPage = lazy(() => import('./modules/projects/SettingsPage'))
const CosmosAngre = lazy(() => import('./modules/cosmos-angre'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

const Loading = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="text-gray-400 flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin" />
      Chargement...
    </div>
  </div>
)

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Dashboard principal */}
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Paramètres */}
              <Route path="/settings" element={<SettingsPage />} />
              {/* Projet Cosmos Angré (existant) */}
              <Route path="/projects/cosmos-angre/*" element={<CosmosAngre />} />
              {/* Autres projets (futurs) — redirigent vers le dashboard pour l'instant */}
              <Route path="/projects/:projectId/*" element={<DashboardPage />} />
            </Route>
            {/* Legacy route compat */}
            <Route path="/cosmos-angre/*" element={<Navigate to="/projects/cosmos-angre" replace />} />
            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'bg-gray-800 text-white text-sm',
            duration: 3000,
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
