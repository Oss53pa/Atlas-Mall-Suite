// ═══ VOL.1 PLAN COMMERCIAL — Main Module Component ═══

import React, { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Users,
  BarChart2,
  Map,
  Brain,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react'

const DashboardSectionLazy = lazy(() => import('./sections/DashboardSection'))
const PlanCommercialSectionLazy = lazy(() => import('./sections/PlanCommercialSection'))
const TenantsSectionLazy = lazy(() => import('./sections/TenantsSection'))
const Proph3tCommercialSectionLazy = lazy(() => import('./sections/Proph3tCommercialSection'))
const ExportCommercialSectionLazy = lazy(() => import('./sections/ExportCommercialSection'))
const PlanImportsSectionLazy = lazy(() => import('../shared/components/PlanImportsSection'))

type Vol1Tab = 'dashboard' | 'plan' | 'plan_imports' | 'tenants' | 'proph3t' | 'exports'

interface NavItem {
  id: Vol1Tab
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard Occupancy', icon: BarChart2, color: '#f59e0b' },
  { id: 'plan_imports', label: 'Plans importés', icon: Upload, color: '#8b5cf6' },
  { id: 'plan', label: 'Plan Commercial', icon: Map, color: '#22c55e' },
  { id: 'tenants', label: 'Preneurs', icon: Users, color: '#38bdf8' },
  { id: 'proph3t', label: 'Proph3t IA', icon: Brain, color: '#a855f7' },
  { id: 'exports', label: 'Exports', icon: Download, color: '#6b7280' },
]

const Loading = () => (
  <div className="flex items-center justify-center h-96">
    <Loader2 className="animate-spin text-slate-500" size={24} />
  </div>
)

export default function Vol1Module() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Vol1Tab>('dashboard')

  return (
    <div className="flex h-screen" style={{ background: '#080c14', color: '#e2e8f0' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r overflow-y-auto" style={{ background: '#0b1120', borderColor: '#1e2a3a' }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/cosmos-angre')}
          className="flex items-center gap-2 px-4 py-3 text-[12px] text-slate-400 hover:text-white transition-colors border-b"
          style={{ borderColor: '#1e2a3a' }}
        >
          <ArrowLeft size={14} />
          Atlas Mall Suite
        </button>

        {/* Volume header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: '#1e2a3a' }}>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} style={{ color: '#f59e0b' }} />
            <span className="text-[11px] tracking-[0.15em] font-semibold" style={{ color: '#f59e0b' }}>VOL. 1</span>
          </div>
          <h2 className="text-white font-bold text-[15px]">Plan Commercial</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Mix enseigne · Occupancy · Preneurs</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: isActive ? `${item.color}12` : 'transparent',
                  color: isActive ? item.color : '#4a5568',
                  border: `1px solid ${isActive ? `${item.color}30` : 'transparent'}`,
                }}
              >
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Proph3t badge */}
        <div className="p-3 m-2 rounded-lg" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-purple-400" />
            <span className="text-[10px] font-medium text-purple-300">Proph3t Engine</span>
          </div>
          <p className="text-[9px] text-slate-500">IA commerciale — analyse mix, recommendations, optimisation loyers</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<Loading />}>
          {activeTab === 'dashboard' && <DashboardSectionLazy />}
          {activeTab === 'plan_imports' && (
            <PlanImportsSectionLazy
              volumeColor="#f59e0b"
              volumeLabel="VOL. 1 — PLAN COMMERCIAL"
              floors={[
                { id: 'floor-b1', level: 'B1' as any, order: 0, widthM: 180, heightM: 120, zones: [], transitions: [] },
                { id: 'floor-rdc', level: 'RDC' as any, order: 1, widthM: 200, heightM: 140, zones: [], transitions: [] },
                { id: 'floor-r1', level: 'R+1' as any, order: 2, widthM: 200, heightM: 140, zones: [], transitions: [] },
              ]}
              activeFloorId="floor-rdc"
              onImportComplete={() => {}}
            />
          )}
          {activeTab === 'plan' && <PlanCommercialSectionLazy />}
          {activeTab === 'tenants' && <TenantsSectionLazy />}
          {activeTab === 'proph3t' && <Proph3tCommercialSectionLazy />}
          {activeTab === 'exports' && <ExportCommercialSectionLazy />}
        </Suspense>
      </main>
    </div>
  )
}
