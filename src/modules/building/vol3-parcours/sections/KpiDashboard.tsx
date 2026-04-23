// ═══ VOL.3 — KPI Dashboard (dynamique) ═══
//
// Hydraté depuis experienceStore. Valeurs calculées en live depuis
// usePlanEngineStore / useLotsStore / useJourneyStore quand le KPI a
// un `computedBy` non-manual.

import { Check, AlertCircle, Clock, Edit3, Trash2, Plus, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useExperienceForProject } from '../hooks/useExperienceForProject'
import { useExperienceStore, type Kpi, type KpiStatus } from '../store/experienceStore'

const statusConfig: Record<KpiStatus, { icon: typeof Check; bg: string; text: string; label: string }> = {
  atteint:     { icon: Check,       bg: 'rgba(52,211,153,0.1)',  text: '#34d399', label: 'Atteint' },
  en_cours:    { icon: Clock,       bg: 'rgba(59,130,246,0.1)',  text: '#3b82f6', label: 'En cours' },
  non_atteint: { icon: AlertCircle, bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', label: 'Non atteint' },
}

export default function KpiDashboard() {
  const { projectId, projectName, verticalId, kpis } = useExperienceForProject()
  const updateKpi = useExperienceStore(s => s.updateKpi)
  const deleteKpi = useExperienceStore(s => s.deleteKpi)
  const addKpi    = useExperienceStore(s => s.addKpi)
  const resetToTemplate = useExperienceStore(s => s.resetToTemplate)

  const [editingId, setEditingId] = useState<string | null>(null)

  // Grouper par groupTitle
  const groups: Array<{ title: string; color: string; kpis: Kpi[] }> = []
  for (const k of kpis) {
    let g = groups.find(g => g.title === k.groupTitle)
    if (!g) { g = { title: k.groupTitle, color: k.groupColor, kpis: [] }; groups.push(g) }
    g.kpis.push(k)
  }

  const handleReset = () => {
    if (confirm(`Remplacer les KPIs actuels par les templates pour la verticale « ${verticalId} » ? Toutes les modifications seront perdues.`)) {
      resetToTemplate(projectId, verticalId)
    }
  }

  const handleAdd = () => {
    const label = prompt('Nom du KPI :')
    if (!label) return
    const cible = prompt('Valeur cible (ex: "> 80 %", "< 5 min") :') ?? ''
    const groupTitle = prompt('Groupe (ex: Satisfaction, Opérations) :') ?? 'Nouveau groupe'
    addKpi(projectId, {
      groupTitle, groupColor: '#64748b',
      label, cible, frequence: 'Mensuel', source: 'Manuel',
      status: 'en_cours', computedBy: 'manual',
    })
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Dashboard KPIs</h1>
          <p className="text-gray-400 max-w-2xl text-[13px] leading-relaxed">
            Indicateurs de performance du projet <strong className="text-white font-medium">{projectName}</strong>.
            Les KPIs marqués <em className="text-atlas-300 not-italic font-mono text-[11px]">· auto</em> se mettent à jour
            depuis les plans modélisés (Atlas Studio), les lots Vol.1 et la Journey Map.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] text-[12px] text-gray-300 hover:text-white hover:border-atlas-500/40 transition-colors">
            <Plus size={13} /> Ajouter
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] text-[12px] text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            title="Réinitialiser avec les templates de la verticale">
            <RotateCw size={13} /> Reset template
          </button>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-dashed border-white/[0.08] text-gray-500">
          <p className="text-sm">Aucun KPI défini.</p>
          <p className="text-[11px] text-gray-600 mt-1">Cliquez sur <strong className="text-atlas-400">Ajouter</strong> ou <strong>Reset template</strong>.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(group => (
            <section key={group.title}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-1 h-7 rounded-full" style={{ background: group.color }} />
                <h2 className="text-lg font-medium text-white">{group.title}</h2>
                <span className="text-[11px] text-gray-600 font-mono">{group.kpis.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.kpis.map(kpi => {
                  const st = statusConfig[kpi.status]
                  const Icon = st.icon
                  const isEditing = editingId === kpi.id
                  return (
                    <article key={kpi.id}
                      className="group rounded-xl p-4 border border-white/[0.06] transition-colors hover:border-white/[0.12]"
                      style={{ background: '#15181d' }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        {isEditing ? (
                          <input
                            autoFocus
                            defaultValue={kpi.label}
                            onBlur={(e) => { updateKpi(projectId, kpi.id, { label: e.currentTarget.value }); setEditingId(null) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingId(null) }}
                            className="flex-1 bg-transparent border border-white/[0.2] rounded px-2 py-1 text-[13px] font-medium text-white outline-none focus:border-atlas-500"
                          />
                        ) : (
                          <h3 className="text-[13px] font-medium text-white flex-1 leading-snug">{kpi.label}</h3>
                        )}
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 font-mono"
                          style={{ background: st.bg, color: st.text }}>
                          <Icon size={10} /> {st.label}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 mb-3">
                        Cible : <span className="text-gray-300">{kpi.cible}</span>
                      </div>

                      {kpi.currentValue !== undefined && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                            Valeur actuelle
                            {kpi.computedBy && kpi.computedBy !== 'manual' && (
                              <span className="text-atlas-400 normal-case tracking-normal font-mono text-[9px]">· auto</span>
                            )}
                          </div>
                          <div className="text-[13px] text-white font-medium font-mono">{kpi.currentValue}</div>
                        </div>
                      )}

                      {typeof kpi.progress === 'number' && (
                        <div className="mb-3">
                          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, kpi.progress))}%`,
                                background: st.text,
                              }} />
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1 font-mono">{kpi.progress}% de la cible</div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-gray-600">
                        <div className="truncate">
                          <span>{kpi.frequence}</span> · <span className="text-gray-500">{kpi.source}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                          <button onClick={() => setEditingId(isEditing ? null : kpi.id)}
                            className="p-1 text-gray-500 hover:text-white" title="Renommer">
                            <Edit3 size={11} />
                          </button>
                          <button onClick={() => { if (confirm('Supprimer ce KPI ?')) deleteKpi(projectId, kpi.id) }}
                            className="p-1 text-gray-500 hover:text-red-400" title="Supprimer">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
