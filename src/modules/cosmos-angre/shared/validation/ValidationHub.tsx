// ═══ VALIDATION HUB — Document approval workflow ═══

import React, { useState } from 'react'
import {
  FileText, CheckCircle, XCircle, Clock,
  MessageSquare, Send, ChevronDown, ChevronRight,
} from 'lucide-react'
import type {
  ValidationDocument, ValidationComment, ValidationStatus,
} from './validationTypes'
import { STATUS_CONFIG, ROLE_LABELS, DOC_TYPE_LABELS } from './validationTypes'

// ── Mock documents for demo ──────────────────────────────────

const DEMO_DOCUMENTS: ValidationDocument[] = [
  {
    id: 'vd-01',
    title: 'Plan securitaire Cosmos Angre v2.1',
    type: 'plan_securitaire',
    version: 'v2.1',
    status: 'en_revue',
    createdBy: 'pame@atlastudio.ci',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-28T14:00:00Z',
    workflow: [
      { id: 'ws-01', role: 'owner', assignedTo: 'pame@atlastudio.ci', status: 'valide', completedAt: '2026-03-20T10:00:00Z' },
      { id: 'ws-02', role: 'security_expert', assignedTo: 'expert@securite.ci', status: 'en_attente' },
      { id: 'ws-03', role: 'architect', assignedTo: 'archi@cosmos.ci', status: 'en_attente' },
    ],
    comments: [
      {
        id: 'vc-01', author: 'pame@atlastudio.ci', role: 'owner',
        text: 'Approuve pour envoi a l\'expert securite. Verifier la couverture parking B1.',
        status: 'ouvert', createdAt: '2026-03-20T10:00:00Z',
      },
    ],
  },
  {
    id: 'vd-02',
    title: 'Rapport APSAD R82 — Conformite',
    type: 'rapport_apsad',
    version: 'v1.0',
    status: 'brouillon',
    createdBy: 'pame@atlastudio.ci',
    createdAt: '2026-03-25T08:00:00Z',
    updatedAt: '2026-03-25T08:00:00Z',
    workflow: [],
    comments: [],
  },
]

// ── Component ────────────────────────────────────────────────

interface ValidationHubProps {
  volumeColor?: string
}

export default function ValidationHub({ volumeColor = '#a855f7' }: ValidationHubProps) {
  const [documents] = useState<ValidationDocument[]>(DEMO_DOCUMENTS)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')

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
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-1" style={{ color: volumeColor }}>
          VALIDATION HUB
        </p>
        <h2 className="text-[22px] font-light text-white">Circuit d'approbation</h2>
        <p className="text-[12px] text-slate-500 mt-1">
          {documents.length} document(s) — validez les livrables avant transmission
        </p>
      </div>

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
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[12px] text-white placeholder:text-slate-600 outline-none focus:border-purple-500/50"
                />
                <button
                  className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1"
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
