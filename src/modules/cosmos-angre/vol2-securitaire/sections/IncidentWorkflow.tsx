import React, { useState } from 'react'
import { AlertTriangle, Clock, User, CheckCircle, Archive, ChevronRight } from 'lucide-react'

type IncidentState = 'detecte' | 'assigne' | 'en_cours' | 'resolu' | 'cloture'

interface Incident {
  id: string
  title: string
  zone: string
  detectedAt: string
  assignee: string
  state: IncidentState
  severity: 'critique' | 'haute' | 'moyenne' | 'basse'
  description: string
  responseTimeSec: number
}

const STATES: { key: IncidentState; label: string; color: string; icon: React.ElementType }[] = [
  { key: 'detecte', label: 'Detecte', color: '#ef4444', icon: AlertTriangle },
  { key: 'assigne', label: 'Assigne', color: '#f59e0b', icon: User },
  { key: 'en_cours', label: 'En cours', color: '#38bdf8', icon: Clock },
  { key: 'resolu', label: 'Resolu', color: '#22c55e', icon: CheckCircle },
  { key: 'cloture', label: 'Cloture', color: '#6b7280', icon: Archive },
]

const MOCK_INCIDENTS: Incident[] = [
  { id: 'INC-001', title: 'Intrusion zone technique B1', zone: 'B1 - Local TGBT', detectedAt: '2026-03-23T14:32:00', assignee: 'Konate M.', state: 'detecte', severity: 'critique', description: 'Detection mouvement par camera PTZ-B1-03. Aucun badge valide enregistre.', responseTimeSec: 0 },
  { id: 'INC-002', title: 'Camera CAM-RDC-07 hors ligne', zone: 'RDC - Hall Est', detectedAt: '2026-03-23T13:45:00', assignee: 'Diallo A.', state: 'assigne', severity: 'haute', description: 'Perte de signal camera dome hall est. Derniere image il y a 47 minutes.', responseTimeSec: 180 },
  { id: 'INC-003', title: 'Issue secours 3 forcee', zone: 'R+1 - Sortie Est', detectedAt: '2026-03-23T12:18:00', assignee: 'Toure I.', state: 'en_cours', severity: 'haute', description: 'Alarme porte issue secours 3. Agent depeche sur place.', responseTimeSec: 120 },
  { id: 'INC-004', title: 'Mouvement suspect parking P2', zone: 'B1 - Parking P2', detectedAt: '2026-03-23T11:05:00', assignee: 'Bamba K.', state: 'resolu', severity: 'moyenne', description: 'Personne identifiee comme employe technicien CIE. Badge verifie.', responseTimeSec: 240 },
  { id: 'INC-005', title: 'Alarme incendie test food court', zone: 'R+1 - Food Court', detectedAt: '2026-03-23T09:30:00', assignee: 'Yao P.', state: 'cloture', severity: 'basse', description: 'Test mensuel SSI programme. Aucune anomalie.', responseTimeSec: 60 },
]

const sevConfig: Record<string, { color: string; bg: string }> = {
  critique: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  haute: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  moyenne: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  basse: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
}

export default function IncidentWorkflow() {
  const [filterState, setFilterState] = useState<IncidentState | 'all'>('all')
  const [selected, setSelected] = useState<Incident | null>(null)

  const filtered = filterState === 'all' ? MOCK_INCIDENTS : MOCK_INCIDENTS.filter(i => i.state === filterState)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Workflow Incidents</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Suivi du cycle de vie des incidents — de la detection a la cloture.
        </p>
      </div>

      {/* State Pipeline */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterState('all')}
          className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full"
          style={{
            background: filterState === 'all' ? 'rgba(56,189,248,0.15)' : '#141e2e',
            color: filterState === 'all' ? '#38bdf8' : '#6b7280',
            border: '1px solid #1e2a3a',
          }}
        >
          Tous ({MOCK_INCIDENTS.length})
        </button>
        {STATES.map(s => {
          const count = MOCK_INCIDENTS.filter(i => i.state === s.key).length
          const Icon = s.icon
          return (
            <React.Fragment key={s.key}>
              <ChevronRight size={12} style={{ color: '#1e2a3a', flexShrink: 0 }} />
              <button
                onClick={() => setFilterState(s.key)}
                className="flex-shrink-0 flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full"
                style={{
                  background: filterState === s.key ? `${s.color}20` : '#141e2e',
                  color: filterState === s.key ? s.color : '#6b7280',
                  border: `1px solid ${filterState === s.key ? `${s.color}40` : '#1e2a3a'}`,
                }}
              >
                <Icon size={12} /> {s.label} ({count})
              </button>
            </React.Fragment>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Incident List */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.map(inc => {
            const sev = sevConfig[inc.severity]
            const stateInfo = STATES.find(s => s.key === inc.state)!
            const StateIcon = stateInfo.icon
            return (
              <div
                key={inc.id}
                onClick={() => setSelected(inc)}
                className="rounded-lg p-4 cursor-pointer transition-colors"
                style={{
                  background: selected?.id === inc.id ? '#1a2744' : '#141e2e',
                  border: `1px solid ${selected?.id === inc.id ? '#38bdf840' : '#1e2a3a'}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <StateIcon size={16} style={{ color: stateInfo.color, marginTop: 2, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono" style={{ color: '#6b7280' }}>{inc.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: sev.bg, color: sev.color }}>
                        {inc.severity}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-white">{inc.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: '#6b7280' }}>
                      <span>{inc.zone}</span>
                      <span>{new Date(inc.detectedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>{inc.assignee}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail Panel */}
        <div className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          {selected ? (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono" style={{ color: '#6b7280' }}>{selected.id}</span>
                <h3 className="text-sm font-semibold text-white mt-1">{selected.title}</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Zone', value: selected.zone },
                  { label: 'Detection', value: new Date(selected.detectedAt).toLocaleString('fr-FR') },
                  { label: 'Assigne a', value: selected.assignee },
                  { label: 'Severite', value: selected.severity },
                  { label: 'Temps de reponse', value: selected.responseTimeSec > 0 ? `${Math.round(selected.responseTimeSec / 60)} min` : 'En attente' },
                ].map(item => (
                  <div key={item.label}>
                    <span className="text-[10px]" style={{ color: '#6b7280' }}>{item.label}</span>
                    <p className="text-[13px] text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <span className="text-[10px]" style={{ color: '#6b7280' }}>Description</span>
                <p className="text-[12px] mt-1" style={{ color: '#94a3b8' }}>{selected.description}</p>
              </div>
              {/* State machine visualization */}
              <div>
                <span className="text-[10px]" style={{ color: '#6b7280' }}>Progression</span>
                <div className="flex items-center gap-1 mt-2">
                  {STATES.map((s, i) => {
                    const idx = STATES.findIndex(st => st.key === selected.state)
                    const active = i <= idx
                    return (
                      <React.Fragment key={s.key}>
                        <div
                          className="flex-1 h-2 rounded-full"
                          style={{ background: active ? s.color : '#1e2a3a' }}
                        />
                      </React.Fragment>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  {STATES.map(s => (
                    <span key={s.key} className="text-[8px]" style={{ color: '#4a5568' }}>{s.label}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-[13px] py-12" style={{ color: '#4a5568' }}>
              Selectionnez un incident pour voir les details
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
