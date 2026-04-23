// ═══ VOL.3 — Feedback Module (Faille #8 corrigee) ═══
// Sentiment analysis via proph3tService + panneau Insights Proph3t

import { useState, useMemo, useEffect } from 'react'
import { MessageSquare, Star, ThumbsUp, AlertCircle, Filter, Sparkles, Loader2 } from 'lucide-react'
import { analyzeSentiment, type SentimentResult } from '../../shared/proph3t/proph3tService'

type FeedbackType = 'reclamation' | 'suggestion' | 'compliment'
type FeedbackChannel = 'borne' | 'app' | 'email' | 'google' | 'social'
type FeedbackStatus = 'nouveau' | 'en_cours' | 'resolu' | 'classe'

interface Feedback {
  id: string
  type: FeedbackType
  channel: FeedbackChannel
  zone: string
  message: string
  rating: number
  status: FeedbackStatus
  date: string
  assignee: string
  response?: string
  sentiment?: SentimentResult
}

const FEEDBACKS: Feedback[] = [
  { id: 'fb1', type: 'compliment', channel: 'app', zone: 'Hall Central', message: 'Tres beau mall, propre et bien decore. Le personnel est accueillant.', rating: 5, status: 'classe', date: '2026-09-15', assignee: 'CX Team' },
  { id: 'fb2', type: 'reclamation', channel: 'borne', zone: 'Parking B1', message: 'Eclairage trop faible au niveau -1. J\'ai eu peur en revenant tard.', rating: 2, status: 'en_cours', date: '2026-09-14', assignee: 'Technique' },
  { id: 'fb3', type: 'suggestion', channel: 'email', zone: 'Food Court', message: 'Il faudrait plus de restaurants africains haut de gamme et pas que du fast food.', rating: 3, status: 'nouveau', date: '2026-09-13', assignee: '' },
  { id: 'fb4', type: 'reclamation', channel: 'google', zone: 'Toilettes R+1', message: 'Toilettes souvent sales le week-end. Inacceptable pour un mall premium.', rating: 1, status: 'en_cours', date: '2026-09-12', assignee: 'Entretien' },
  { id: 'fb5', type: 'compliment', channel: 'social', zone: 'Cinema Pathe', message: 'Super seances IMAX ! Meilleur cinema d\'Abidjan sans contestation.', rating: 5, status: 'classe', date: '2026-09-11', assignee: 'Pathe' },
  { id: 'fb6', type: 'suggestion', channel: 'app', zone: 'Galerie Est', message: 'Manque un espace coworking ou on peut travailler avec un bon WiFi.', rating: 3, status: 'nouveau', date: '2026-09-10', assignee: '' },
  { id: 'fb7', type: 'reclamation', channel: 'borne', zone: 'Escalators', message: 'Escalator en panne depuis 3 jours au RDC. Dur avec une poussette.', rating: 1, status: 'resolu', date: '2026-09-09', assignee: 'Technique', response: 'Reparation effectuee le 11/09.' },
  { id: 'fb8', type: 'compliment', channel: 'app', zone: 'Cosmos Club', message: 'Le programme fidelite est top, j\'ai deja eu des reductions chez Zara.', rating: 4, status: 'classe', date: '2026-09-08', assignee: 'Marketing' },
  { id: 'fb9', type: 'suggestion', channel: 'email', zone: 'Entree Principale', message: 'Ajouter une fontaine ou un espace de repos a l\'entree. On ne sait pas ou s\'asseoir.', rating: 3, status: 'nouveau', date: '2026-09-07', assignee: '' },
  { id: 'fb10', type: 'reclamation', channel: 'google', zone: 'Parking B1', message: 'Pas assez de places handicapees. J\'ai du marcher tres loin avec mon fauteuil.', rating: 1, status: 'en_cours', date: '2026-09-06', assignee: 'PMR Team' },
]

const TYPE_CONFIG: Record<FeedbackType, { color: string; label: string; icon: typeof ThumbsUp }> = {
  reclamation: { color: '#ef4444', label: 'Reclamation', icon: AlertCircle },
  suggestion: { color: '#f59e0b', label: 'Suggestion', icon: MessageSquare },
  compliment: { color: '#22c55e', label: 'Compliment', icon: ThumbsUp },
}

const SENTIMENT_BADGE: Record<string, { color: string; bg: string }> = {
  positif: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  neutre: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  negatif: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
}

export default function FeedbackModule() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(FEEDBACKS)
  const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Analyse de sentiment au montage
  useEffect(() => {
    const unscored = feedbacks.filter(f => !f.sentiment)
    if (unscored.length === 0) return

    setIsAnalyzing(true)
    Promise.all(
      unscored.map(f =>
        analyzeSentiment(f.message).then(result => ({ id: f.id, result }))
      )
    ).then(results => {
      setFeedbacks(prev => prev.map(f => {
        const r = results.find(res => res.id === f.id)
        return r ? { ...f, sentiment: r.result } : f
      }))
    }).finally(() => setIsAnalyzing(false))
  }, [])

  const filtered = useMemo(() => {
    return feedbacks.filter(f => {
      if (filterType !== 'all' && f.type !== filterType) return false
      if (filterStatus !== 'all' && f.status !== filterStatus) return false
      return true
    })
  }, [feedbacks, filterType, filterStatus])

  const avgSentiment = useMemo(() => {
    const scored = feedbacks.filter(f => f.sentiment)
    return scored.length > 0 ? scored.reduce((s, f) => s + (f.sentiment?.score ?? 0), 0) / scored.length : 0
  }, [feedbacks])

  const topKeywords = useMemo(() => {
    const counts = new Map<string, { count: number; avgScore: number }>()
    feedbacks.forEach(f => {
      f.sentiment?.keywords.forEach(k => {
        const prev = counts.get(k) ?? { count: 0, avgScore: 0 }
        counts.set(k, { count: prev.count + 1, avgScore: (prev.avgScore * prev.count + (f.sentiment?.score ?? 0)) / (prev.count + 1) })
      })
    })
    return counts
  }, [feedbacks])

  const positiveKw = [...topKeywords.entries()].filter(([, v]) => v.avgScore > 0).sort((a, b) => b[1].count - a[1].count).slice(0, 3)
  const negativeKw = [...topKeywords.entries()].filter(([, v]) => v.avgScore < 0).sort((a, b) => b[1].count - a[1].count).slice(0, 3)

  const nps = feedbacks.length > 0
    ? Math.round(((feedbacks.filter(f => f.rating >= 4).length - feedbacks.filter(f => f.rating <= 2).length) / feedbacks.length) * 100)
    : 0

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#ec4899' }}>VOL. 3 — PARCOURS CLIENT</p>
        <h1 className="text-[28px] font-display font-bold text-white mb-2">Feedback Visiteurs</h1>
      </div>

      {/* Insights Proph3t */}
      <div className="rounded-xl p-5 border border-atlas-500/20 bg-purple-900/10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-atlas-400" />
          <h3 className="text-[13px] font-semibold text-atlas-300">Insights Proph3t</h3>
          {isAnalyzing && <Loader2 size={12} className="animate-spin text-atlas-400 ml-2" />}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Sentiment moyen</p>
            <p className="text-xl font-display font-bold mt-1" style={{ color: avgSentiment > 0.2 ? '#22c55e' : avgSentiment < -0.2 ? '#ef4444' : '#f59e0b' }}>
              {avgSentiment > 0 ? '+' : ''}{avgSentiment.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">NPS</p>
            <p className="text-xl font-display font-bold mt-1" style={{ color: nps >= 0 ? '#22c55e' : '#ef4444' }}>{nps}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Mots positifs</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {positiveKw.map(([k]) => <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">{k}</span>)}
              {positiveKw.length === 0 && <span className="text-[9px] text-gray-600">—</span>}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Mots negatifs</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {negativeKw.map(([k]) => <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{k}</span>)}
              {negativeKw.length === 0 && <span className="text-[9px] text-gray-600">—</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-gray-500" />
        <div className="flex gap-1">
          {(['all', 'reclamation', 'suggestion', 'compliment'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${filterType === t ? 'bg-atlas-700 text-white' : 'bg-surface-3 text-gray-400 hover:text-white'}`}>
              {t === 'all' ? 'Tout' : TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-gray-800" />
        <div className="flex gap-1">
          {(['all', 'nouveau', 'en_cours', 'resolu'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${filterStatus === s ? 'bg-atlas-700 text-white' : 'bg-surface-3 text-gray-400 hover:text-white'}`}>
              {s === 'all' ? 'Tout' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-gray-600 ml-auto">{filtered.length} feedback(s)</span>
      </div>

      {/* Feedback list */}
      <div className="space-y-3">
        {filtered.map(f => {
          const typeConf = TYPE_CONFIG[f.type]
          const TypeIcon = typeConf.icon
          const sentConf = f.sentiment ? SENTIMENT_BADGE[f.sentiment.label] : null

          return (
            <div key={f.id} className="rounded-xl p-4 border border-white/[0.06] bg-surface-2">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TypeIcon size={14} style={{ color: typeConf.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: typeConf.color }}>{typeConf.label}</span>
                  <span className="text-[10px] text-gray-600">{f.channel} · {f.zone}</span>
                </div>
                <div className="flex items-center gap-2">
                  {f.sentiment && sentConf && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ color: sentConf.color, background: sentConf.bg }}>
                      {f.sentiment.label === 'positif' ? '🟢' : f.sentiment.label === 'negatif' ? '🔴' : '🟡'} {f.sentiment.score.toFixed(2)}
                    </span>
                  )}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} className={i < f.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-700'} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-gray-300 leading-relaxed">{f.message}</p>
              {f.response && (
                <div className="mt-2 pl-3 border-l-2 border-green-500/30">
                  <p className="text-[11px] text-green-400/70">{f.response}</p>
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-gray-600">{f.date} · {f.assignee || 'Non assigne'}</span>
                {f.sentiment?.keywords && f.sentiment.keywords.length > 0 && (
                  <div className="flex gap-1">
                    {f.sentiment.keywords.slice(0, 3).map(k => (
                      <span key={k} className="text-[8px] px-1 py-0.5 rounded bg-surface-3 text-gray-500">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
