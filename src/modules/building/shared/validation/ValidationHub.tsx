// ═══ VALIDATION HUB — Document approval workflow ═══
//
// Source : reportShareEngine (IndexedDB + Supabase). Les "documents" sont les
// rapports partagés via `ReportShareManager` (Section 7 de l'audit).
// Zéro donnée mockée — alimentation 100% depuis les shares réels.

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  RefreshCw,
} from 'lucide-react'
import type { ValidationDocument, ValidationStatus, ValidationComment } from './validationTypes'
import { STATUS_CONFIG, ROLE_LABELS, DOC_TYPE_LABELS } from './validationTypes'
import { listReportShares, pullSharesFromCloud, type ReportShare } from '../engines/reportShareEngine'

// ─── Bridge ReportShare → ValidationDocument ───

function shareToValidationDocument(share: ReportShare): ValidationDocument {
  const status: ValidationStatus =
    share.status === 'approved' ? 'approuve'
    : share.status === 'rejected' ? 'rejete'
    : share.status === 'commented' ? 'en_revue'
    : share.status === 'opened' ? 'en_revue'
    : share.status === 'sent' ? 'en_revue'
    : 'brouillon'

  const comments: ValidationComment[] = share.events
    .filter(e => e.type === 'commented' && e.comment)
    .map(e => ({
      id: e.id,
      author: e.actor ?? 'Destinataire',
      role: 'security_expert',
      text: e.comment ?? '',
      status: 'ouvert' as const,
      createdAt: e.at,
    }))

  const workflow = share.recipients.map((r, i) => {
    const approved = share.events.some(e => e.type === 'approved' && e.actor === r.email)
    const rejected = share.events.some(e => e.type === 'corrections_requested' && e.actor === r.email)
    return {
      id: `ws-${share.token}-${i}`,
      role: (r.role as any) ?? 'security_expert',
      assignedTo: r.email,
      status: approved ? 'valide' as const
            : rejected ? 'rejete' as const
            : 'en_attente' as const,
      completedAt: approved || rejected
        ? share.events.find(e => (e.type === 'approved' || e.type === 'corrections_requested') && e.actor === r.email)?.at
        : undefined,
    }
  })

  return {
    id: share.token,
    title: share.title,
    type: share.volumeId === 'vol2' ? 'plan_securitaire'
        : share.volumeId === 'vol1' ? 'plan_commercial'
        : share.volumeId === 'vol3' ? 'plan_signaletique'
        : 'plan_commercial',
    version: 'v1.0',
    status,
    createdBy: 'Auteur',
    createdAt: share.createdAt,
    updatedAt: share.events.length > 0
      ? share.events[share.events.length - 1].at
      : share.createdAt,
    workflow,
    comments,
  }
}

// ── Component ────────────────────────────────────────────────

interface ValidationHubProps {
  volumeColor?: string
}

export default function ValidationHub({ volumeColor = '#b38a5a' }: ValidationHubProps) {
  const [documents, setDocuments] = useState<ValidationDocument[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      // Pull cloud avant d'afficher (non-bloquant si Supabase indispo)
      try { await pullSharesFromCloud() } catch { /* offline ok */ }
      const shares = await listReportShares()
      setDocuments(shares.map(shareToValidationDocument))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const selectedDoc = documents.find((d) => d.id === selectedDocId)

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'approuve': return <CheckCircle size={14} className="text-green-400" />
      case 'rejete': return <XCircle size={14} className="text-red-400" />
      case 'en_revue': return <Clock size={14} className="text-blue-400" />
      default: return <FileText size={14} className="text-slate-500" />
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] font-medium mb-1" style={{ color: volumeColor }}>
            VALIDATION HUB
          </p>
          <h2 className="text-[22px] font-light text-white">Circuit d'approbation</h2>
          <p className="text-[12px] text-slate-500 mt-1">
            {documents.length} document{documents.length > 1 ? 's' : ''} — rapports partagés et leur état de validation
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/[0.06] text-[11px] text-slate-300 hover:bg-slate-700 disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {documents.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-surface-1/20 p-10 text-center">
          <FileText size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aucun rapport partagé pour validation.</p>
          <p className="text-slate-500 text-xs mt-1">
            Utilisez l'onglet « Rapports &amp; partage » de chaque volume pour envoyer un rapport à valider.
          </p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Document list */}
        <div className="w-80 flex-shrink-0 space-y-2">
          {documents.map((doc) => {
            const cfg = STATUS_CONFIG[doc.status]
            const isSelected = selectedDocId === doc.id
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-white/20 bg-white/[0.04]'
                    : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(doc.status)}
                  <span className="text-[12px] font-medium text-white truncate flex-1">{doc.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <span className="text-slate-600">{doc.version}</span>
                  <span className="text-slate-600">{DOC_TYPE_LABELS[doc.type]}</span>
                </div>
                {doc.workflow.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {doc.workflow.map((ws) => (
                      <div
                        key={ws.id}
                        className="w-4 h-1.5 rounded-full"
                        style={{
                          background: ws.status === 'valide'
                            ? '#22c55e'
                            : ws.status === 'rejete'
                            ? '#ef4444'
                            : '#374151',
                        }}
                        title={`${ROLE_LABELS[ws.role]}: ${ws.status}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Document detail */}
        {selectedDoc ? (
          <div className="flex-1 space-y-4">
            {/* Workflow steps */}
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <h3 className="text-[12px] font-medium text-white mb-3">Circuit de validation</h3>
              <div className="space-y-2">
                {selectedDoc.workflow.map((ws, i) => (
                  <div key={ws.id} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        ws.status === 'valide'
                          ? 'bg-green-500/20 text-green-400'
                          : ws.status === 'rejete'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-white">{ROLE_LABELS[ws.role]}</div>
                      <div className="text-[10px] text-slate-500">{ws.assignedTo}</div>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{
                        background: ws.status === 'valide' ? '#22c55e20' : ws.status === 'rejete' ? '#ef444420' : '#37415120',
                        color: ws.status === 'valide' ? '#22c55e' : ws.status === 'rejete' ? '#ef4444' : '#6b7280',
                      }}
                    >
                      {ws.status === 'valide' ? 'Valide' : ws.status === 'rejete' ? 'Rejete' : ws.status === 'commentaire' ? 'Commentaire' : 'En attente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <h3 className="text-[12px] font-medium text-white mb-3">
                <MessageSquare size={12} className="inline mr-1" />
                Commentaires ({selectedDoc.comments.length})
              </h3>
              <div className="space-y-3 mb-4">
                {selectedDoc.comments.map((c) => (
                  <div key={c.id} className="p-3 rounded bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium text-slate-300">{c.author}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-slate-500">
                        {ROLE_LABELS[c.role]}
                      </span>
                      <span className="text-[9px] text-slate-600 ml-auto">
                        {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{c.text}</p>
                  </div>
                ))}
                {selectedDoc.comments.length === 0 && (
                  <p className="text-[11px] text-slate-600 text-center py-4">Aucun commentaire</p>
                )}
              </div>

              {/* Add comment */}
              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[12px] text-white placeholder:text-slate-600 outline-none focus:border-atlas-500/50"
                />
                <button
                  className="px-3 py-2 rounded-lg bg-atlas-600 hover:bg-atlas-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1"
                  disabled={!newComment.trim()}
                >
                  <Send size={12} />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[12px] text-slate-600">
            Selectionnez un document pour voir les details
          </div>
        )}
      </div>
    </div>
  )
}
