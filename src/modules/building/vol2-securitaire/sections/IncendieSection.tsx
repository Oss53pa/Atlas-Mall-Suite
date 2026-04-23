import { useState } from 'react'
import { Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useSecurityConfigForProject } from '../hooks/useSecurityConfigForProject'

const conformiteIcons = {
  conforme: { icon: CheckCircle, color: '#22c55e', label: 'Conforme' },
  non_conforme: { icon: XCircle, color: '#ef4444', label: 'Non conforme' },
  a_verifier: { icon: AlertTriangle, color: '#f59e0b', label: 'À vérifier' },
}

export default function IncendieSection() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const { fireEquipments: equipments, fireScenarios: scenarios, fireExercises: exercises, erpChecks } = useSecurityConfigForProject()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SÉCURITAIRE</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>ZONE 04</span>
          <h1 className="text-[28px] font-light text-white">Sécurité incendie</h1>
        </div>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>Système de sécurité incendie (SSI) conforme aux normes ERP catégorie 1.</p>
      </div>

      {/* Dispositif */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Dispositif</h2>
        {equipments.map((eq) => (
          <div key={eq.name} className="rounded-[10px] p-4 flex items-start gap-3" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
            <div>
              <span className="text-[13px] font-medium text-white">{eq.name}</span>
              <p className="text-[12px] mt-1" style={{ color: '#4a5568' }}>{eq.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Simulation */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Simulation évacuation</h2>
        <div className="grid grid-cols-3 gap-3">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenario(sc.id)}
              className="rounded-[10px] p-4 text-left transition-all"
              style={{
                background: selectedScenario === sc.id ? 'rgba(56,189,248,0.08)' : '#141e2e',
                border: `1px solid ${selectedScenario === sc.id ? 'rgba(56,189,248,0.4)' : '#1e2a3a'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Play size={14} style={{ color: '#38bdf8' }} />
                <span className="text-[13px] font-medium text-white">{sc.name}</span>
              </div>
              <p className="text-[11px]" style={{ color: '#4a5568' }}>{sc.description}</p>
            </button>
          ))}
        </div>
        {selectedScenario && (
          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: '#38bdf8' }}>
            <Play size={16} /> Lancer simulation
          </button>
        )}
      </div>

      {/* Calendrier exercices */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Calendrier exercices</h2>
        <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: '#0f1623' }}>
                {['Date', 'Type', 'Résultat', 'Statut'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#4a5568', borderBottom: '1px solid #1e2a3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exercises.map((ex, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e2a3a' }}>
                  <td className="px-4 py-3 text-white">{ex.date}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ex.type}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ex.result}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                      background: ex.status === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${ex.status === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                      color: ex.status === 'ok' ? '#22c55e' : '#f59e0b',
                    }}>{ex.status === 'ok' ? 'Réalisé' : 'Planifié'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conformité ERP */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Conformité ERP catégorie 1</h2>
        <div className="space-y-2">
          {erpChecks.map((check) => {
            const cfg = conformiteIcons[check.status]
            const Icon = cfg.icon
            return (
              <div key={check.item} className="rounded-[10px] p-3 flex items-center gap-3" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
                <Icon size={16} style={{ color: cfg.color }} />
                <span className="text-[13px] text-white flex-1">{check.item}</span>
                <span className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
