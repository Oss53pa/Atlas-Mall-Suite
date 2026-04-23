// ═══ SIGNAGE FEEDBACK INBOX ═══
// Panneau latéral manager : liste tous les signalements terrain reçus
// via QR code, permet de les filtrer, les marquer résolus, voir les photos.

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Inbox,
  Filter,
  CheckCircle,
  MapPin,
  RefreshCw,
  Loader2,
  User
} from 'lucide-react'
import {
  listFeedback,
  resolveFeedback,
  computeFeedbackStats,
  type SignageFeedback,
  type FeedbackStatus,
  type FeedbackSeverity
} from '../services/signageFeedbackService'

interface Props {
  projetId: string
  onClose: () => void
}

const STATUS_META: Record<FeedbackStatus, { label: string; color: string; icon: string }> = {
  ok:             { label: 'OK',              color: '#10b981', icon: '✓' },
  illisible:      { label: 'Illisible',       color: '#f59e0b', icon: '🔍' },
  absent:         { label: 'Absent',          color: '#ef4444', icon: '✗' },
  'mal-oriente':  { label: 'Mal orienté',     color: '#f97316', icon: '↪' },
  degrade:        { label: 'Dégradé',         color: '#b38a5a', icon: '🖌' },
  obsolete:       { label: 'Obsolète',        color: '#3b82f6', icon: '⏰' },
  autre:          { label: 'Autre',           color: '#64748b', icon: '·' },
}

const SEVERITY_COLOR: Record<FeedbackSeverity, string> = {
  low: 'bg-slate-600', medium: 'bg-blue-600', high: 'bg-amber-600', critical: 'bg-red-600',
}

export function SignageFeedbackInbox({ projetId, onClose }: Props) {
  const [items, setItems] = useState<SignageFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState<{ total: number; unresolved: number } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listFeedback(projetId, { limit: 200 })
      setItems(data)
      const st = await computeFeedbackStats(projetId)
      setStats({ total: st.total, unresolved: st.unresolved })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projetId])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'unresolved') return items.filter(i => !i.resolved)
    if (filter === 'critical') return items.filter(i => i.severity === 'critical' || i.severity === 'high')
    return items
  }, [items, filter])

  const handleResolve = async (id: string) => {
    const ok = await resolveFeedback(id)
    if (ok) {
      setItems(items.map(i => i.id === id ? { ...i, resolved: true, resolved_at: new Date().toISOString() } : i))
      setStats(s => s ? { ...s, unresolved: Math.max(0, s.unresolved - 1) } : null)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-end bg-surface-0/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[520px] max-w-[95vw] h-full bg-surface-1 border-l border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Signalements terrain</h2>
            {stats && (
              <span className="text-[10px] text-slate-500">
                {stats.unresolved} à traiter · {stats.total} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
              title="Recharger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="px-5 py-3 border-b border-white/5 bg-surface-0/40 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          {(['all', 'unresolved', 'critical'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold ${
                filter === f
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'unresolved' ? 'À traiter' : 'Critiques'}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Chargement…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-sm">Aucun signalement {filter === 'unresolved' ? 'en attente' : filter === 'critical' ? 'critique' : ''}.</p>
            </div>
          )}
          {!loading && filtered.map(item => {
            const meta = STATUS_META[item.status]
            const expanded = expandedId === item.id
            return (
              <div
                key={item.id}
                className={`mb-2 rounded-md border overflow-hidden ${
                  item.resolved
                    ? 'border-white/5 bg-surface-0/30 opacity-60'
                    : 'border-white/10 bg-surface-0/60'
                }`}
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="w-full px-3 py-2 text-left hover:bg-surface-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-white">
                          {meta.label}
                        </span>
                        {item.severity && (
                          <span className={`px-1 py-0.5 rounded text-[8px] font-bold text-white ${SEVERITY_COLOR[item.severity]}`}>
                            {item.severity.toUpperCase()}
                          </span>
                        )}
                        {item.resolved && (
                          <span className="text-[8px] text-emerald-400 font-bold">✓ TRAITÉ</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        <span className="font-mono">{item.panel_ref.slice(0, 24)}</span>
                        {item.floor_id && <span> · {item.floor_id}</span>}
                        {item.agent_name && <span> · par {item.agent_name}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[9px] text-slate-600">
                        {new Date(item.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit',
                        })}
                      </div>
                      <div className="text-[9px] text-slate-600">
                        {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-2 text-[11px]">
                    {item.note && (
                      <div>
                        <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Note agent</div>
                        <p className="text-slate-300 m-0">{item.note}</p>
                      </div>
                    )}
                    {item.photo_url && (
                      <div>
                        <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Photo</div>
                        <a href={item.photo_url} target="_blank" rel="noreferrer">
                          <img
                            src={item.photo_url}
                            alt="Photo agent"
                            className="max-h-40 rounded border border-white/10"
                          />
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-slate-400">
                      {item.x !== null && item.x !== undefined && (
                        <span><MapPin className="w-3 h-3 inline mr-1" />({item.x?.toFixed(0)}, {item.y?.toFixed(0)})</span>
                      )}
                      {item.panel_type && <span>Type : {item.panel_type}</span>}
                      {item.agent_name && <span><User className="w-3 h-3 inline mr-1" />{item.agent_name}</span>}
                    </div>
                    {!item.resolved && (
                      <button
                        onClick={() => handleResolve(item.id)}
                        className="w-full py-1.5 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Marquer comme traité
                      </button>
                    )}
                    {item.resolved && item.resolution_note && (
                      <div className="px-2 py-1.5 rounded bg-emerald-950/40 border border-emerald-900/40 text-emerald-200 text-[10px]">
                        Résolution : {item.resolution_note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
