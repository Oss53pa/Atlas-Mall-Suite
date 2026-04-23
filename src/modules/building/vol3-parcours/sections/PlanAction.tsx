// ═══ VOL.3 — Plan d'action (dynamique) ═══
// Branché sur experienceStore. Actions créées manuellement OU générées
// automatiquement par les skills Proph3t (via syncFromProph3t).

import { useMemo, useState } from 'react'
import { Plus, Trash2, RotateCw, Sparkles } from 'lucide-react'
import { useExperienceForProject } from '../hooks/useExperienceForProject'
import { useExperienceStore, type ActionItem, type ActionStatus, type ActionPriority } from '../store/experienceStore'

const statusLabels: Record<ActionStatus, { label: string; color: string }> = {
  a_faire:   { label: 'À faire',   color: '#94a3b8' },
  en_cours:  { label: 'En cours',  color: '#3b82f6' },
  termine:   { label: 'Terminé',   color: '#10b981' },
  bloque:    { label: 'Bloqué',    color: '#ef4444' },
}

const priorityLabels: Record<ActionPriority, { label: string; bg: string; text: string }> = {
  p0: { label: 'P0 · Critique', bg: 'rgba(239,68,68,0.12)',  text: '#ef4444' },
  p1: { label: 'P1 · Important', bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  p2: { label: 'P2 · Nice-to-have', bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
}

export default function PlanAction() {
  const { projectId, projectName, verticalId, actions } = useExperienceForProject()
  const addAction       = useExperienceStore(s => s.addAction)
  const updateAction    = useExperienceStore(s => s.updateAction)
  const deleteAction    = useExperienceStore(s => s.deleteAction)
  const resetToTemplate = useExperienceStore(s => s.resetToTemplate)

  const [filter, setFilter] = useState<'all' | ActionStatus>('all')

  const filtered = useMemo(() =>
    filter === 'all' ? actions : actions.filter(a => a.status === filter),
    [actions, filter],
  )
  const counts = useMemo(() => ({
    all: actions.length,
    a_faire:  actions.filter(a => a.status === 'a_faire').length,
    en_cours: actions.filter(a => a.status === 'en_cours').length,
    termine:  actions.filter(a => a.status === 'termine').length,
    bloque:   actions.filter(a => a.status === 'bloque').length,
  }), [actions])
  const proph3tCount = actions.filter(a => a.origin === 'proph3t').length

  const handleAdd = () => {
    const title = prompt('Titre de l\'action :')
    if (!title) return
    const category = prompt('Catégorie (ex: Digital, Travaux, RH) :') ?? 'Général'
    const responsable = prompt('Responsable :') ?? 'À définir'
    const priority = (prompt('Priorité (p0 / p1 / p2) :') ?? 'p1') as ActionPriority
    addAction(projectId, {
      title, category, responsable,
      impact: '',
      priority, status: 'a_faire',
      origin: 'manual',
    })
  }

  const handleReset = () => {
    if (confirm(`Recharger les actions template pour « ${verticalId} » ?`)) {
      resetToTemplate(projectId, verticalId)
    }
  }

  const cycleStatus = (action: ActionItem) => {
    const order: ActionStatus[] = ['a_faire', 'en_cours', 'termine', 'bloque']
    const next = order[(order.indexOf(action.status) + 1) % order.length]
    updateAction(projectId, action.id, { status: next })
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Plan d'action</h1>
          <p className="text-gray-400 max-w-2xl text-[13px] leading-relaxed">
            Liste priorisée des actions à mener sur <strong className="text-white font-medium">{projectName}</strong>.
            Mix d'actions manuelles et d'actions générées par Proph3t via les skills d'analyse.
          </p>
          {proph3tCount > 0 && (
            <p className="text-[11px] text-atlas-300 mt-2 flex items-center gap-1">
              <Sparkles size={11} /> {proph3tCount} action{proph3tCount > 1 ? 's' : ''} générée{proph3tCount > 1 ? 's' : ''} par Proph3t
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] text-[12px] text-gray-300 hover:text-white hover:border-atlas-500/40 transition-colors">
            <Plus size={13} /> Ajouter
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] text-[12px] text-gray-400 hover:text-white transition-colors">
            <RotateCw size={13} /> Reset template
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['all', 'a_faire', 'en_cours', 'termine', 'bloque'] as const).map(f => {
          const label = f === 'all' ? 'Toutes' : statusLabels[f].label
          const count = counts[f]
          const active = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-all"
              style={{
                background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(245,158,11,0.4)' : '#1e2a3a'}`,
                color: active ? '#f59e0b' : '#4a5568',
              }}>
              {label} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.08] text-gray-500 text-sm">
          Aucune action pour ce filtre.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(action => {
            const st = statusLabels[action.status]
            const prio = priorityLabels[action.priority]
            const budget = action.capexFcfa
              ? `${(action.capexFcfa / 1_000_000).toFixed(1)} M FCFA CAPEX`
              : action.opexFcfaPerYear
                ? `${(action.opexFcfaPerYear / 1_000_000).toFixed(1)} M FCFA/an OPEX`
                : null
            return (
              <article key={action.id} className="group rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                style={{ background: '#15181d' }}>
                <div className="flex items-start gap-4">
                  <button onClick={() => cycleStatus(action)}
                    className="flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-colors"
                    style={{ borderColor: st.color, background: action.status === 'termine' ? st.color : 'transparent' }}
                    title={`Cliquer pour changer (actuel : ${st.label})`}>
                    {action.status === 'termine' && <span className="text-[10px] text-white">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 flex-wrap mb-1">
                      <h3 className="text-[14px] font-medium text-white flex-1">{action.title}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: prio.bg, color: prio.text }}>{prio.label}</span>
                      {action.origin === 'proph3t' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-atlas-500/10 text-atlas-400 border border-atlas-500/30 flex items-center gap-1">
                          <Sparkles size={9} /> Proph3t
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                      <span><strong className="text-gray-300">Catégorie :</strong> {action.category}</span>
                      <span className="text-gray-700">·</span>
                      <span><strong className="text-gray-300">Responsable :</strong> {action.responsable}</span>
                      {action.deadline && (<><span className="text-gray-700">·</span>
                        <span><strong className="text-gray-300">Deadline :</strong> {action.deadline}</span></>)}
                      {budget && (<><span className="text-gray-700">·</span>
                        <span className="text-atlas-300 font-mono">{budget}</span></>)}
                    </div>
                    {action.impact && (
                      <p className="text-[12px] text-gray-400 mt-2 italic">Impact attendu : {action.impact}</p>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 flex gap-1">
                    <button onClick={() => { if (confirm('Supprimer cette action ?')) deleteAction(projectId, action.id) }}
                      className="p-1.5 text-gray-500 hover:text-red-400" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
