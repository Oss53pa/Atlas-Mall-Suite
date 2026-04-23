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

const sevConfig: Record<string, { color: string; bg: string }> = {
  critique: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  haute: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  moyenne: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  basse: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
}

export default function IncidentWorkflow() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filterState, setFilterState] = useState<IncidentState | 'all'>('all')
  const [selected, setSelected] = useState<Incident | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newZone, setNewZone] = useState('')
  const [newSeverity, setNewSeverity] = useState<Incident['severity']>('moyenne')

  const handleCreateIncident = () => {
    if (!newTitle.trim()) return
    const incident: Incident = {
      id: `INC-${String(incidents.length + 1).padStart(3, '0')}`,
      title: newTitle,
      zone: newZone || 'Non defini',
      detectedAt: new Date().toISOString(),
      assignee: '',
      state: 'detecte',
      severity: newSeverity,
      description: '',
      responseTimeSec: 0,
    }
    setIncidents(prev => [incident, ...prev])
    setNewTitle('')
    setNewZone('')
    setShowCreate(false)
  }

  const _handleUpdateState = (id: string, newState: IncidentState) => {
    setIncidents(prev => prev.map(i => i.id === id ? {
      ...i,
      state: newState,
      ...(newState === 'resolu' ? { responseTimeSec: Math.round((Date.now() - new Date(i.detectedAt).getTime()) / 1000) } : {}),
    } : i))
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, state: newState } : null)
    }
  }

  const _handleDelete = (id: string) => {
    setIncidents(prev => prev.filter(i => i.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = filterState === 'all' ? incidents : incidents.filter(i => i.state === filterState)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-display font-bold text-white mb-3">Workflow Incidents</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Suivi du cycle de vie des incidents — de la detection a la cloture.
        </p>
      </div>

      {/* Bouton + formulaire creation */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-[12px]">
          <AlertTriangle size={14} /> Declarer un incident
        </button>
        <span className="text-[10px] text-gray-600">{incidents.filter(i => i.state === 'detecte' || i.state === 'assigne').length} incident(s) ouvert(s)</span>
      </div>

      {showCreate && (
        <div className="rounded-xl p-4 border border-red-500/20 bg-red-900/10 space-y-3">
          <p className="text-[12px] font-semibold text-red-400">Nouvel incident</p>
          <div className="grid grid-cols-3 gap-3">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre de l'incident..." className="input-dark text-[12px] col-span-2" />
            <select value={newSeverity} onChange={e => setNewSeverity(e.target.value as Incident['severity'])} className="input-dark text-[12px]">
              <option value="critique">Critique</option>
              <option value="haute">Haute</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Basse</option>
            </select>
          </div>
          <div className="flex gap-3">
            <input value={newZone} onChange={e => setNewZone(e.target.value)} placeholder="Zone (ex: B1 - Parking P2)" className="input-dark text-[12px] flex-1" />
            <button onClick={handleCreateIncident} disabled={!newTitle.trim()} className="btn-primary text-[12px]">Creer</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-[12px]">Annuler</button>
          </div>
        </div>
      )}

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
          Tous ({incidents.length})
        </button>
        {STATES.map(s => {
          const count = incidents.filter(i => i.state === s.key).length
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
          {filtered.length === 0 && (
            <div className="rounded-lg p-8 text-center" style={{ background: '#141e2e', border: '1px dashed #1e2a3a' }}>
              <AlertTriangle size={24} className="mx-auto text-slate-600 mb-2" />
              <p className="text-[13px] text-slate-400">
                {incidents.length === 0 ? 'Aucun incident enregistré' : 'Aucun incident dans ce statut'}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">Utilisez « Déclarer un incident » pour en créer.</p>
            </div>
          )}
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
