// ═══ VISITE VIRTUELLE — Page standalone (sidebar Outils) ═══

import { useState, lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import type { ScenarioRole, Waypoint, TourZone } from '../building/shared/virtual-tour/VirtualTourEngine'

const VirtualTourEngine = lazy(() => import('../building/shared/virtual-tour/VirtualTourEngine'))

// Demo data for The Mall
const DEMO_ZONES: TourZone[] = [
  { id: 'z1', name: 'Hall Principal', polygon: [[20,10],[80,10],[80,30],[20,30]], height: 5, color: '#38bdf8', type: 'circulation' },
  { id: 'z2', name: 'Zara', polygon: [[5,10],[18,10],[18,30],[5,30]], height: 4.5, color: '#22c55e', type: 'commerce', tenantName: 'Zara CI', rentPerSqm: 22000, status: 'Signé' },
  { id: 'z3', name: 'Sephora', polygon: [[82,10],[95,10],[95,25],[82,25]], height: 4, color: '#ec4899', type: 'commerce', tenantName: 'Sephora', status: 'Signé' },
  { id: 'z4', name: 'Food Court', polygon: [[20,32],[60,32],[60,50],[20,50]], height: 5, color: '#f59e0b', type: 'restauration', tenantName: 'KFC + Brioche Dorée' },
  { id: 'z5', name: 'Carrefour', polygon: [[10,55],[70,55],[70,80],[10,80]], height: 4, color: '#22c55e', type: 'alimentaire', tenantName: 'Carrefour Market', status: 'Signé' },
  { id: 'z6', name: 'Pathé Cinéma', polygon: [[72,32],[95,32],[95,55],[72,55]], height: 6, color: '#b38a5a', type: 'loisirs', tenantName: 'Pathé', status: 'Signé' },
  { id: 'z7', name: 'Cellule vacante', polygon: [[82,26],[95,26],[95,30],[82,30]], height: 4, color: '#ef4444', type: 'commerce', status: 'Vacant' },
]

const DEMO_WAYPOINTS: Waypoint[] = [
  { id: 'wp1', position: [50, 1.7, 5], lookAt: [50, 1.7, 20], label: 'Entrée principale', description: 'Accès principal depuis le parking', scenario: ['investisseur', 'enseigne', 'fm'], order: 1 },
  { id: 'wp2', position: [50, 1.7, 20], lookAt: [50, 1.7, 40], label: 'Hall central', description: 'Atrium principal — 30 000 visiteurs/mois projetés', scenario: ['investisseur', 'enseigne', 'fm'], order: 2 },
  { id: 'wp3', position: [12, 1.7, 20], lookAt: [12, 1.7, 30], label: 'Galerie Ouest — Zara', description: 'Ancre mode — 350 m² — 22 000 FCFA/m²/an', scenario: ['investisseur', 'enseigne'], order: 3 },
  { id: 'wp4', position: [40, 1.7, 42], lookAt: [40, 1.7, 50], label: 'Food Court', description: 'KFC + Brioche Dorée — 240 m² total', scenario: ['investisseur', 'enseigne', 'fm'], order: 4 },
  { id: 'wp5', position: [83, 1.7, 42], lookAt: [83, 1.7, 50], label: 'Pathé Cinéma', description: 'Ancre loisirs — 1 800 m² — 12 000 FCFA/m²/an', scenario: ['investisseur'], order: 5 },
  { id: 'wp6', position: [88, 1.7, 28], lookAt: [88, 1.7, 20], label: 'Cellule disponible', description: 'Opportunité — 75 m² face Food Court — Loyer cible 20 000 FCFA/m²/an', scenario: ['investisseur', 'enseigne'], order: 6 },
  { id: 'wp7', position: [40, 1.7, 68], lookAt: [40, 1.7, 80], label: 'Carrefour Market', description: 'Hypermarché ancre — 2 500 m² — Bail 10 ans', scenario: ['investisseur'], order: 7 },
]

export default function VirtualTourPage() {
  const [role, setRole] = useState<ScenarioRole>('investisseur')
  const [activeWP, setActiveWP] = useState<Waypoint | null>(null)

  return (
    <div className="h-full flex flex-col" style={{ background: '#1a1d23' }}>
      {/* Role selector */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.05]" style={{ background: '#202329' }}>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Scénario :</span>
        {(['investisseur', 'enseigne', 'fm'] as ScenarioRole[]).map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              role === r ? 'bg-atlas-500 text-white' : 'text-gray-500 hover:text-gray-300 bg-white/[0.04]'}`}>
            {r === 'investisseur' ? 'Investisseur' : r === 'enseigne' ? 'Enseigne' : 'Facility Manager'}
          </button>
        ))}
        <div className="flex-1" />
        {activeWP && (
          <div className="text-[11px] text-gray-400">
            <span className="text-white font-medium">{activeWP.label}</span> — {activeWP.description}
          </div>
        )}
      </div>

      {/* Tour engine */}
      <div className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement de la visite virtuelle...
          </div>
        }>
          <VirtualTourEngine
            context="standalone"
            zones={DEMO_ZONES}
            waypoints={DEMO_WAYPOINTS}
            floorWidth={100}
            floorDepth={90}
            scenarioRole={role}
            onWaypointReached={(wp) => setActiveWP(wp)}
            onZoneClick={(z) => setActiveWP({ id: z.id, position: [0,0,0], lookAt: [0,0,0], label: z.name, description: z.tenantName ?? z.type, scenario: ['investisseur','enseigne','fm'], order: 0 })}
          />
        </Suspense>
      </div>
    </div>
  )
}
