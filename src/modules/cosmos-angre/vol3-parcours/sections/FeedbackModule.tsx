import React, { useState } from 'react'
import { MessageSquare, ThumbsUp, ThumbsDown, Clock, CheckCircle, AlertTriangle, Filter, Star } from 'lucide-react'

type FeedbackStatus = 'nouveau' | 'en_cours' | 'resolu' | 'classe'
type FeedbackType = 'reclamation' | 'suggestion' | 'compliment'
type Channel = 'borne' | 'app' | 'email' | 'google' | 'social'

interface Feedback {
  id: string
  type: FeedbackType
  channel: Channel
  zone: string
  message: string
  rating: number | null
  status: FeedbackStatus
  date: string
  assignee: string
  response?: string
}

const FEEDBACKS: Feedback[] = [
  { id: 'FB-001', type: 'reclamation', channel: 'borne', zone: 'Parking B1', message: "Impossible de trouver la sortie pietons depuis le parking. Aucune signaletique claire vers les escalators.", rating: 2, status: 'en_cours', date: '2026-03-22', assignee: 'Operations' },
  { id: 'FB-002', type: 'reclamation', channel: 'app', zone: 'Food Court R+1', message: "Temps d'attente trop long au food court samedi midi. Plus de 25 minutes pour une commande simple.", rating: 2, status: 'nouveau', date: '2026-03-23', assignee: 'F&B Manager' },
  { id: 'FB-003', type: 'compliment', channel: 'google', zone: 'Accueil RDC', message: "Personnel d'accueil tres professionnel et souriant. Le mall est magnifique, bravo !", rating: 5, status: 'classe', date: '2026-03-21', assignee: 'RH' },
  { id: 'FB-004', type: 'suggestion', channel: 'app', zone: 'Galerie Est RDC', message: "Il manque des bancs pour se reposer dans la galerie est. Beaucoup de personnes agees font leurs courses ici.", rating: 3, status: 'en_cours', date: '2026-03-20', assignee: 'Operations', response: "Merci pour votre suggestion. 4 bancs sont en commande et seront installes d'ici fin mars." },
  { id: 'FB-005', type: 'reclamation', channel: 'borne', zone: 'WC RDC', message: "Toilettes du RDC mal entretenues en fin de journee. Papier manquant.", rating: 1, status: 'resolu', date: '2026-03-19', assignee: 'Entretien', response: "Frequence de nettoyage augmentee a toutes les heures. Distributeurs papier remplaces." },
  { id: 'FB-006', type: 'compliment', channel: 'social', zone: 'Espace Loisirs R+1', message: "L'espace enfants est top ! Mes enfants adorent. On revient chaque weekend. #CosmosAngre", rating: 5, status: 'classe', date: '2026-03-22', assignee: 'Marketing' },
  { id: 'FB-007', type: 'suggestion', channel: 'email', zone: 'General', message: "Serait-il possible d'avoir un espace coworking ? Beaucoup de jeunes actifs viennent ici en journee.", rating: 4, status: 'nouveau', date: '2026-03-23', assignee: 'Direction' },
  { id: 'FB-008', type: 'reclamation', channel: 'app', zone: 'Parking B1', message: "La borne de paiement parking n'accepte pas Orange Money. Uniquement CB.", rating: 2, status: 'en_cours', date: '2026-03-21', assignee: 'DSI', response: "Integration Orange Money prevue dans la mise a jour de fin mars." },
  { id: 'FB-009', type: 'reclamation', channel: 'borne', zone: 'Escalators RDC', message: "Escalator cote sud en panne depuis 3 jours. Difficile pour les personnes agees.", rating: 1, status: 'resolu', date: '2026-03-18', assignee: 'Maintenance', response: "Escalator repare le 20/03. Maintenance preventive planifiee." },
  { id: 'FB-010', type: 'compliment', channel: 'google', zone: 'Food Court R+1', message: "Excellent choix de restaurants, qualite au rendez-vous. Le meilleur food court d'Abidjan !", rating: 5, status: 'classe', date: '2026-03-23', assignee: 'F&B Manager' },
]

const statusConfig: Record<FeedbackStatus, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  nouveau: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'Nouveau', icon: AlertTriangle },
  en_cours: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', label: 'En cours', icon: Clock },
  resolu: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', label: 'Resolu', icon: CheckCircle },
  classe: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Classe', icon: CheckCircle },
}

const typeConfig: Record<FeedbackType, { color: string; icon: React.ElementType; label: string }> = {
  reclamation: { color: '#ef4444', icon: ThumbsDown, label: 'Reclamation' },
  suggestion: { color: '#f59e0b', icon: MessageSquare, label: 'Suggestion' },
  compliment: { color: '#22c55e', icon: ThumbsUp, label: 'Compliment' },
}

export default function FeedbackModule() {
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all')

  const filtered = FEEDBACKS.filter(f => (statusFilter === 'all' || f.status === statusFilter) && (typeFilter === 'all' || f.type === typeFilter))

  const npsAvg = Math.round(FEEDBACKS.filter(f => f.rating !== null).reduce((s, f) => s + (f.rating ?? 0), 0) / FEEDBACKS.filter(f => f.rating !== null).length * 10) / 10
  const reclamCount = FEEDBACKS.filter(f => f.type === 'reclamation').length
  const openCount = FEEDBACKS.filter(f => f.status === 'nouveau' || f.status === 'en_cours').length

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#ec4899' }}>VOL. 3 — PILOTAGE</p>
        <h1 className="text-[28px] font-light text-white mb-2">Reclamations & Retours Visiteurs</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>Centralisation des feedbacks visiteurs — bornes, app, email, Google, reseaux sociaux.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <p className="text-2xl font-bold text-white">{FEEDBACKS.length}</p>
          <p className="text-[11px]" style={{ color: '#4a5568' }}>Total feedbacks</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{openCount}</p>
          <p className="text-[11px]" style={{ color: '#4a5568' }}>Ouverts</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{npsAvg}</p>
          <p className="text-[11px]" style={{ color: '#4a5568' }}>Note moyenne /5</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{reclamCount}</p>
          <p className="text-[11px]" style={{ color: '#4a5568' }}>Reclamations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-slate-500" />
          <span className="text-[10px] text-slate-500">Statut:</span>
          {(['all', 'nouveau', 'en_cours', 'resolu', 'classe'] as const).map(f => {
            const label = f === 'all' ? 'Tous' : statusConfig[f].label
            const color = f === 'all' ? '#34d399' : statusConfig[f].color
            return (
              <button key={f} onClick={() => setStatusFilter(f)} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: statusFilter === f ? `${color}15` : 'transparent', border: `1px solid ${statusFilter === f ? `${color}50` : '#1e2a3a'}`, color: statusFilter === f ? color : '#4a5568' }}>
                {label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Type:</span>
          {(['all', 'reclamation', 'suggestion', 'compliment'] as const).map(f => {
            const label = f === 'all' ? 'Tous' : typeConfig[f].label
            const color = f === 'all' ? '#34d399' : typeConfig[f].color
            return (
              <button key={f} onClick={() => setTypeFilter(f)} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: typeFilter === f ? `${color}15` : 'transparent', border: `1px solid ${typeFilter === f ? `${color}50` : '#1e2a3a'}`, color: typeFilter === f ? color : '#4a5568' }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback list */}
      <div className="space-y-3">
        {filtered.map((fb) => {
          const sCfg = statusConfig[fb.status]
          const tCfg = typeConfig[fb.type]
          const TypeIcon = tCfg.icon
          return (
            <div key={fb.id} className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <TypeIcon size={16} style={{ color: tCfg.color }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono" style={{ color: '#4a5568' }}>{fb.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: tCfg.color + '15', color: tCfg.color }}>{tCfg.label}</span>
                      <span className="text-[10px]" style={{ color: '#4a5568' }}>{fb.channel} · {fb.zone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {fb.rating !== null && (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={10} fill={i < fb.rating! ? '#f59e0b' : 'none'} style={{ color: i < fb.rating! ? '#f59e0b' : '#334155' }} />
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: sCfg.bg, border: `1px solid ${sCfg.color}30`, color: sCfg.color }}>{sCfg.label}</span>
                </div>
              </div>
              <p className="text-[13px] text-slate-300 mb-2">"{fb.message}"</p>
              {fb.response && (
                <div className="rounded-lg p-3 mt-2" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <p className="text-[11px] font-medium mb-1" style={{ color: '#22c55e' }}>Reponse ({fb.assignee})</p>
                  <p className="text-[12px] text-slate-400">{fb.response}</p>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-[10px]" style={{ color: '#4a5568' }}>
                <span>{fb.date}</span>
                <span>Assigne: {fb.assignee}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
