// ═══ ATLAS MALL SUITE — Root Router ═══

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/AppLayout'
import { HelpFloatingBall } from './components/HelpFloatingBall'
import ConsentBanner from './modules/cosmos-angre/shared/components/ConsentBanner'

// Landing (public, no layout) + HomeRoute intelligent
const LandingPage = lazy(() => import('./modules/landing/LandingPage'))
const HomeRoute   = lazy(() => import('./modules/landing/HomeRoute'))
const DemoReportPage = lazy(() => import('./modules/landing/DemoReportPage'))

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
// Workspace projet (anciennement CosmosAngre — désormais générique pour tout projet)
const ProjectWorkspace = lazy(() => import('./modules/cosmos-angre'))

// Transversal pages
const ScenariosPage = lazy(() => import('./modules/transversal/ScenariosPage'))
const ValidationExcoPage = lazy(() => import('./modules/transversal/ValidationExcoPage'))
const DcePage = lazy(() => import('./modules/transversal/DcePage'))
const BenchmarkPage = lazy(() => import('./modules/transversal/BenchmarkPage'))

// Tools pages
const Proph3tPage = lazy(() => import('./modules/tools/Proph3tPage'))
const ExportPage = lazy(() => import('./modules/tools/ExportPage'))
const VirtualTourPage = lazy(() => import('./modules/tools/VirtualTourPage'))

// Mobile feedback (public, no layout) — scanné via QR code sur un panneau
const SignageFeedbackPage = lazy(() => import('./modules/cosmos-angre/shared/pages/SignageFeedbackPage'))

// Notice d'utilisation (public, plein écran, imprimable)
const NoticePage = lazy(() => import('./modules/docs/NoticePage'))

// Wayfinder Kiosk Runtime (public, plein écran, sans AppLayout)
const KioskRuntime = lazy(() => import('./modules/cosmos-angre/wayfinder-designer/runtime/KioskRuntime'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

const Loading = () => (
  <div className="min-h-screen bg-surface-0 flex items-center justify-center">
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
            {/* ── Page publique mobile (QR code scanné par un agent terrain) ── */}
            <Route path="/feedback" element={<SignageFeedbackPage />} />

            {/* ── Notice d'utilisation (publique, imprimable) ── */}
            <Route path="/notice" element={<NoticePage />} />

            {/* ── Runtime borne autonome (CDC §08) ── */}
            <Route path="/kiosk/:kioskId" element={<KioskRuntime />} />

            {/* ── Page d'accueil : Landing publique / redirect dashboard si loggé ── */}
            <Route path="/" element={<HomeRoute />} />

            {/* ── Landing page publique (URL directe) ── */}
            <Route path="/landing" element={<LandingPage />} />

            {/* ── Démo publique : rapport Proph3t parcours client ── */}
            <Route path="/demo/rapport-parcours-client" element={<DemoReportPage />} />

            {/* ── Auth pages (sans AppLayout) ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── Onboarding (séquence à compléter après inscription) ── */}
            <Route path="/onboard/org" element={<OrgOnboarding />} />
            <Route path="/onboard/project" element={<ProjectOnboarding />} />
            <Route path="/onboard/team" element={<TeamOnboarding />} />

            {/* ── Main app (with TopBar + Sidebar layout) ── */}
            <Route element={<AppLayout />}>
              {/* Dashboard multi-projet (accessible via /dashboard — / est géré par HomeRoute) */}
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
              {/* Workspace projet — générique, fonctionne pour TOUT projectId (Cosmos Angré est le pilote) */}
              <Route path="/projects/:projectId/*" element={<ProjectWorkspace />} />
            </Route>

            {/* ── Everything else → home (landing ou dashboard selon auth) ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <HelpFloatingBall />
        <ConsentBanner />
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
