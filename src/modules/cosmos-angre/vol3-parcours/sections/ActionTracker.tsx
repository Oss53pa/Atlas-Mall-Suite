import React, { useState } from 'react'
import { CheckCircle, Clock, AlertTriangle, Circle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

type ActionStatus = 'termine' | 'en_cours' | 'en_retard' | 'a_venir'

interface TrackedAction {
  id: string
  title: string
  responsable: string
  echeance: string
  status: ActionStatus
  progress: number
  notes: string
  milestones: { label: string; done: boolean }[]
}

const ACTIONS: TrackedAction[] = [
  { id: 'A01', title: 'Charte signaletique Cosmos complete', responsable: 'Marketing + Fernand', echeance: '2026-07-15', status: 'en_cours', progress: 75, notes: 'Maquettes validees, production en cours', milestones: [{ label: 'Brief creatif', done: true }, { label: 'Maquettes v1', done: true }, { label: 'Validation DG', done: true }, { label: 'Production', done: false }] },
  { id: 'A02', title: 'Installation 12 panneaux + totem + bache', responsable: 'Operations + Mairie', echeance: '2026-09-01', status: 'a_venir', progress: 15, notes: 'Autorisation mairie en attente', milestones: [{ label: 'Demande mairie', done: true }, { label: 'Autorisation obtenue', done: false }, { label: 'Fabrication', done: false }, { label: 'Installation', done: false }] },
  { id: 'A03', title: 'App Cosmos Club iOS + Android', responsable: 'DSI + Agence mobile', echeance: '2026-08-30', status: 'en_cours', progress: 45, notes: 'Sprint 4/8 termine. Integration Orange Money en cours.', milestones: [{ label: 'Specs + wireframes', done: true }, { label: 'Dev Sprint 1-4', done: true }, { label: 'Integration paiement', done: false }, { label: 'Tests + Store', done: false }] },
  { id: 'A04', title: 'Formation personnel accueil', responsable: 'RH + Cabinet', echeance: '2026-09-15', status: 'a_venir', progress: 10, notes: 'Cabinet selectionne, programme valide', milestones: [{ label: 'Selection cabinet', done: true }, { label: 'Programme defini', done: false }, { label: 'Sessions formation', done: false }, { label: 'Evaluation', done: false }] },
  { id: 'A05', title: 'CRM HubSpot + automatisations', responsable: 'CRM Manager + DSI', echeance: '2026-08-15', status: 'en_cours', progress: 60, notes: '10/15 workflows configures', milestones: [{ label: 'Setup HubSpot', done: true }, { label: 'Import contacts', done: true }, { label: '15 workflows', done: false }, { label: 'Tests + go-live', done: false }] },
  { id: 'A06', title: 'Systeme parking ANPR + IoT', responsable: 'DSI + Integrateur', echeance: '2026-09-30', status: 'en_retard', progress: 25, notes: 'Retard livraison capteurs (delai fournisseur +3 sem)', milestones: [{ label: 'Cahier des charges', done: true }, { label: 'Commande equipements', done: true }, { label: 'Installation', done: false }, { label: 'Tests charge', done: false }] },
  { id: 'A07', title: 'Activation Cosmos Club J0', responsable: 'CRM + Accueil', echeance: '2026-10-16', status: 'a_venir', progress: 5, notes: 'Depend de A03 + A05', milestones: [{ label: 'Cartes imprimees', done: false }, { label: 'Tablettes configurees', done: false }, { label: 'Test inscription', done: false }, { label: 'Go-live J0', done: false }] },
  { id: 'A08', title: 'Protocole accueil J0 Soft Opening', responsable: 'Operations + Events', echeance: '2026-10-16', status: 'a_venir', progress: 20, notes: 'Brief evenementiel valide', milestones: [{ label: 'Brief creatif', done: true }, { label: 'Logistique confirmee', done: false }, { label: 'Repetition', done: false }, { label: 'Execution J0', done: false }] },
  { id: 'A09', title: 'Lancement food court + Le Cosmos', responsable: 'F&B Manager + DSI', echeance: '2026-10-16', status: 'en_cours', progress: 55, notes: '10/12 enseignes signees', milestones: [{ label: 'Signature enseignes', done: true }, { label: 'Amenagement', done: false }, { label: 'Test QR commande', done: false }, { label: 'Ouverture J0', done: false }] },
  { id: 'A10', title: 'Enquete NPS M+1', responsable: 'Marketing + CRM', echeance: '2026-11-15', status: 'a_venir', progress: 0, notes: 'Questionnaire en cours de redaction', milestones: [{ label: 'Questionnaire', done: false }, { label: 'Deploiement', done: false }, { label: 'Analyse', done: false }, { label: 'Plan correctif', done: false }] },
  { id: 'A11', title: 'Optimisation signaletique M+2', responsable: 'Operations + DSI', echeance: '2026-12-15', status: 'a_venir', progress: 0, notes: '', milestones: [{ label: 'Analyse heatmaps', done: false }, { label: 'Recommandations', done: false }, { label: 'Ajustements', done: false }, { label: 'Validation', done: false }] },
  { id: 'A12', title: 'Programme Cosmos Vivant mensuel', responsable: 'Events Manager', echeance: '2026-12-01', status: 'a_venir', progress: 10, notes: 'Calendrier provisoire etabli', milestones: [{ label: 'Calendrier An 1', done: true }, { label: 'Partenaires confirmes', done: false }, { label: 'Lancement M1', done: false }, { label: 'Bilan M3', done: false }] },
  { id: 'A13', title: 'Bilan parcours client An 1', responsable: 'Direction + Marketing', echeance: '2027-10-16', status: 'a_venir', progress: 0, notes: '', milestones: [{ label: 'Collecte data', done: false }, { label: 'Analyse', done: false }, { label: 'Rapport', done: false }, { label: 'Presentation CA', done: false }] },
]

const statusConfig: Record<ActionStatus, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  termine: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', label: 'Termine', icon: CheckCircle },
  en_cours: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', label: 'En cours', icon: Clock },
  en_retard: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'En retard', icon: AlertTriangle },
  a_venir: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'A venir', icon: Circle },
}

export default function ActionTracker() {
  const [actions, setActions] = useState<TrackedAction[]>(ACTIONS)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ActionStatus>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newResp, setNewResp] = useState('')
  const [newDate, setNewDate] = useState('')

  const handleAddAction = () => {
    if (!newTitle.trim()) return
    const id = `A${String(actions.length + 1).padStart(2, '0')}`
    setActions(prev => [...prev, {
      id, title: newTitle, responsable: newResp || 'Non assigne',
      echeance: newDate || '2026-12-31', status: 'a_venir' as ActionStatus,
      progress: 0, notes: '', milestones: [],
    }])
    setNewTitle(''); setNewResp(''); setNewDate(''); setShowAdd(false)
  }

  const handleUpdateStatus = (id: string, status: ActionStatus) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status, progress: status === 'termine' ? 100 : a.progress } : a))
  }

  const handleUpdateProgress = (id: string, progress: number) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, progress: Math.min(100, Math.max(0, progress)) } : a))
  }

  const handleDelete = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id))
  }

  const filtered = filter === 'all' ? actions : actions.filter(a => a.status === filter)

  const counts = {
    all: actions.length,
    termine: actions.filter(a => a.status === 'termine').length,
    en_cours: actions.filter(a => a.status === 'en_cours').length,
    en_retard: actions.filter(a => a.status === 'en_retard').length,
    a_venir: actions.filter(a => a.status === 'a_venir').length,
  }

  const globalProgress = actions.length > 0 ? Math.round(actions.reduce((s, a) => s + a.progress, 0) / actions.length) : 0

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#06b6d4' }}>VOL. 3 — PILOTAGE</p>
          <h1 className="text-[28px] font-display font-bold text-white mb-2">Plan d'action — Suivi</h1>
          <p className="text-[13px]" style={{ color: '#4a5568' }}>Suivi operationnel des {actions.length} actions du plan parcours client.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-[12px]">
          <Plus size={14} /> Ajouter une action
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl p-4 border border-cyan-500/20 bg-cyan-900/10 space-y-3">
          <p className="text-[12px] font-semibold text-cyan-400">Nouvelle action</p>
          <div className="grid grid-cols-3 gap-3">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre de l'action..." className="input-dark text-[12px] col-span-2" />
            <input value={newDate} onChange={e => setNewDate(e.target.value)} type="date" className="input-dark text-[12px]" />
          </div>
          <div className="flex gap-3">
            <input value={newResp} onChange={e => setNewResp(e.target.value)} placeholder="Responsable..." className="input-dark text-[12px] flex-1" />
            <button onClick={handleAddAction} disabled={!newTitle.trim()} className="btn-primary text-[12px]">Creer</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-[12px]">Annuler</button>
          </div>
        </div>
      )}

      {/* Global progress */}
      <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold">Avancement global</span>
          <span className="text-lg font-bold" style={{ color: '#34d399' }}>{globalProgress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${globalProgress}%`, background: 'linear-gradient(90deg, #34d399, #38bdf8)' }} />
        </div>
        <div className="flex gap-4 mt-3 text-[11px]">
          {(['termine', 'en_cours', 'en_retard', 'a_venir'] as ActionStatus[]).map(s => {
            const cfg = statusConfig[s]
            return <span key={s} style={{ color: cfg.color }}>{cfg.label}: {counts[s]}</span>
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'en_retard', 'en_cours', 'a_venir', 'termine'] as const).map(f => {
          const label = f === 'all' ? 'Toutes' : statusConfig[f].label
          const color = f === 'all' ? '#34d399' : statusConfig[f].color
          return (
            <button key={f} onClick={() => setFilter(f)} className="text-[11px] font-medium px-3 py-1 rounded-full transition-all" style={{ background: filter === f ? `${color}15` : 'transparent', border: `1px solid ${filter === f ? `${color}50` : '#1e2a3a'}`, color: filter === f ? color : '#4a5568' }}>
              {label} ({counts[f]})
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {filtered.map((action) => {
          const cfg = statusConfig[action.status]
          const StatusIcon = cfg.icon
          const isOpen = expanded === action.id
          return (
            <div key={action.id} className="rounded-xl" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <button onClick={() => setExpanded(isOpen ? null : action.id)} className="w-full flex items-center gap-4 p-4 text-left">
                <span className="text-[11px] font-mono font-bold flex-shrink-0" style={{ color: '#34d399' }}>{action.id}</span>
                <StatusIcon size={16} style={{ color: cfg.color }} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white font-medium truncate">{action.title}</p>
                  <p className="text-[11px]" style={{ color: '#4a5568' }}>{action.responsable} — {action.echeance}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${action.progress}%`, background: cfg.color }} />
                  </div>
                  <span className="text-[11px] font-mono w-8 text-right" style={{ color: cfg.color }}>{action.progress}%</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(action.id) }} className="p-1 rounded hover:bg-red-500/10 text-slate-700 hover:text-red-400 transition-colors" title="Supprimer">
                    <Trash2 size={12} />
                  </button>
                  {isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: '#1e2a3a' }}>
                  {action.notes && <p className="text-[12px] text-slate-400 mt-3 mb-3">{action.notes}</p>}
                  {/* Controles d'edition */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] text-slate-600">Statut :</span>
                    {(['a_venir', 'en_cours', 'en_retard', 'termine'] as ActionStatus[]).map(s => (
                      <button key={s} onClick={() => handleUpdateStatus(action.id, s)}
                        className={`text-[9px] px-2 py-0.5 rounded-full transition-colors ${action.status === s ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                        style={{ background: action.status === s ? statusConfig[s].bg : 'transparent', border: `1px solid ${action.status === s ? statusConfig[s].color + '40' : '#1e2a3a'}`, color: action.status === s ? statusConfig[s].color : undefined }}>
                        {statusConfig[s].label}
                      </button>
                    ))}
                    <span className="text-[10px] text-slate-600 ml-3">Avancement :</span>
                    <input type="range" min={0} max={100} step={5} value={action.progress} onChange={e => handleUpdateProgress(action.id, parseInt(e.target.value))} className="w-24 accent-cyan-500" />
                    <span className="text-[10px] text-cyan-400 font-mono">{action.progress}%</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {action.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md" style={{ background: m.done ? 'rgba(34,197,94,0.08)' : 'rgba(107,114,128,0.08)', border: `1px solid ${m.done ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)'}` }}>
                        {m.done ? <CheckCircle size={10} style={{ color: '#22c55e' }} /> : <Circle size={10} style={{ color: '#4a5568' }} />}
                        <span style={{ color: m.done ? '#22c55e' : '#6b7280' }}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
