// ═══ ATLAS MALL SUITE — Root Router ═══

import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/AppLayout'

// Landing (public, no layout)
const LandingPage = lazy(() => import('./modules/landing/LandingPage'))

// Auth pages (no layout)
const LoginPage = lazy(() => import('./modules/auth/LoginPage'))
const RegisterPage = lazy(() => import('./modules/auth/RegisterPage'))

// Onboarding (no layout)
const OrgOnboarding = lazy(() => import('./modules/onboarding/OrgOnboarding'))
const ProjectOnboarding = lazy(() => import('./modules/onboarding/ProjectOnboarding'))
const TeamOnboarding = lazy(() => import('./modules/onboarding/TeamOnboarding'))

// Main app (inside AppLayout)
const DashboardPage = lazy(() => import('./modules/projects/DashboardPage'))
const OrgSettingsPage = lazy(() => import('./modules/settings/OrgSettingsPage'))
const CosmosAngre = lazy(() => import('./modules/cosmos-angre'))

// Transversal pages
const ScenariosPage = lazy(() => import('./modules/transversal/ScenariosPage'))
const ValidationExcoPage = lazy(() => import('./modules/transversal/ValidationExcoPage'))
const DcePage = lazy(() => import('./modules/transversal/DcePage'))
const BenchmarkPage = lazy(() => import('./modules/transversal/BenchmarkPage'))

// Tools pages
const Proph3tPage = lazy(() => import('./modules/tools/Proph3tPage'))
const ExportPage = lazy(() => import('./modules/tools/ExportPage'))
const VirtualTourPage = lazy(() => import('./modules/tools/VirtualTourPage'))

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
            {/* ── Main app (with TopBar + Sidebar layout) ── */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/settings/*" element={<OrgSettingsPage />} />
              {/* Transversal */}
              <Route path="/scenarios" element={<ScenariosPage />} />
              <Route path="/validation" element={<ValidationExcoPage />} />
              <Route path="/dce" element={<DcePage />} />
              <Route path="/benchmark" element={<BenchmarkPage />} />
              {/* Tools */}
              <Route path="/proph3t" element={<Proph3tPage />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/virtual-tour" element={<VirtualTourPage />} />
              {/* Projects */}
              <Route path="/projects/cosmos-angre/*" element={<CosmosAngre />} />
              <Route path="/projects/:projectId/*" element={<DashboardPage />} />
            </Route>

            {/* ── Everything else → project ── */}
            <Route path="*" element={<Navigate to="/projects/cosmos-angre" replace />} />
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
