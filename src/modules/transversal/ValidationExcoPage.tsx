// ═══ VALIDATION EXCO — Workflow d'approbation ═══

import React, { useState } from 'react'
import { ClipboardList, Check, X, Clock, MessageSquare, FileText, User, ChevronRight, Send } from 'lucide-react'

interface Document {
  id: string; title: string; type: string; version: string; author: string; date: string
  status: 'en_attente' | 'approuve' | 'rejete' | 'en_revue'
  approvals: { name: string; role: string; status: 'approved' | 'pending' | 'rejected'; date?: string }[]
  comments: { author: string; text: string; date: string }[]
}

const DOCS: Document[] = [
  {
    id: '1', title: 'Plan sécuritaire v2.1', type: 'Plan', version: '2.1', author: 'Jean-Marc Dupont', date: '15/03/2026',
    status: 'en_attente',
    approvals: [
      { name: 'Aminata Koné', role: 'DGA', status: 'approved', date: '16/03/2026' },
      { name: 'Cheick Sanankoua', role: 'DG', status: 'pending' },
    ],
    comments: [
      { author: 'Aminata Koné', text: 'Couverture caméra validée pour le RDC. Vérifier le B1.', date: '16/03/2026' },
    ],
  },
  {
    id: '2', title: 'Rapport APSAD R82', type: 'Rapport', version: '1.0', author: 'Jean-Marc Dupont', date: '10/03/2026',
    status: 'approuve',
    approvals: [
      { name: 'Aminata Koné', role: 'DGA', status: 'approved', date: '11/03/2026' },
      { name: 'Cheick Sanankoua', role: 'DG', status: 'approved', date: '12/03/2026' },
    ],
    comments: [],
  },
  {
    id: '3', title: 'Budget CAPEX Sécurité', type: 'Budget', version: '3.2', author: 'Aminata Koné', date: '08/03/2026',
    status: 'en_revue',
    approvals: [
      { name: 'Cheick Sanankoua', role: 'DG', status: 'pending' },
      { name: 'Conseil d\'administration', role: 'CA', status: 'pending' },
    ],
    comments: [
      { author: 'Cheick Sanankoua', text: 'Revoir le poste vidéosurveillance — budget dépassé de 12%.', date: '09/03/2026' },
    ],
  },
  {
    id: '4', title: 'Plan commercial v3.0', type: 'Plan', version: '3.0', author: 'Aminata Koné', date: '05/03/2026',
    status: 'rejete',
    approvals: [
      { name: 'Cheick Sanankoua', role: 'DG', status: 'rejected', date: '06/03/2026' },
    ],
    comments: [
      { author: 'Cheick Sanankoua', text: 'Taux d\'occupancy trop optimiste. Revoir les projections.', date: '06/03/2026' },
    ],
  },
  {
    id: '5', title: 'Rapport signalétique ISO 7010', type: 'Rapport', version: '1.2', author: 'Aminata Koné', date: '01/03/2026',
    status: 'en_attente',
    approvals: [
      { name: 'Jean-Marc Dupont', role: 'Consultant', status: 'approved', date: '02/03/2026' },
      { name: 'Aminata Koné', role: 'DGA', status: 'pending' },
    ],
    comments: [],
  },
]

const STATUS_CFG = {
  en_attente: { label: 'En attente', color: '#f59e0b', bg: 'bg-amber-500/10' },
  approuve: { label: 'Approuvé', color: '#22c55e', bg: 'bg-emerald-500/10' },
  rejete: { label: 'Rejeté', color: '#ef4444', bg: 'bg-red-500/10' },
  en_revue: { label: 'En revue', color: '#38bdf8', bg: 'bg-blue-500/10' },
}

export default function ValidationExcoPage() {
  const [selectedId, setSelectedId] = useState('1')
  const [comment, setComment] = useState('')
  const doc = DOCS.find(d => d.id === selectedId)!
  const st = STATUS_CFG[doc.status]

  return (
    <div className="flex h-full" style={{ background: '#060a13', color: '#e2e8f0' }}>
      {/* Left: Document list */}
      <div className="w-80 flex-shrink-0 border-r border-white/[0.05] overflow-y-auto" style={{ background: '#0a0f1a' }}>
        <div className="p-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 mb-1"><ClipboardList size={16} className="text-indigo-400" /><h2 className="text-sm font-semibold text-white">Validation Exco</h2></div>
          <p className="text-[11px] text-gray-500">{DOCS.filter(d => d.status === 'en_attente').length} document(s) en attente</p>
        </div>
        {DOCS.map(d => {
          const s = STATUS_CFG[d.status]
          return (
            <button key={d.id} onClick={() => setSelectedId(d.id)}
              className={`w-full text-left p-4 border-b border-white/[0.03] transition-colors ${selectedId === d.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium text-white truncate">{d.title}</span>
                <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`${s.bg} text-[9px] font-semibold px-1.5 py-0.5 rounded-full`} style={{ color: s.color }}>{s.label}</span>
                <span className="text-[10px] text-gray-600">{d.date}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">{doc.title}</h2>
              <p className="text-[12px] text-gray-500">{doc.type} — Version {doc.version} — Par {doc.author}</p>
            </div>
            <span className={`${st.bg} text-[11px] font-semibold px-3 py-1 rounded-full`} style={{ color: st.color }}>{st.label}</span>
          </div>

          {/* Approval workflow */}
          <div className="rounded-xl border border-white/[0.06] p-5 mb-6" style={{ background: '#0e1629' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Circuit de validation</h3>
            <div className="space-y-3">
              {doc.approvals.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    a.status === 'approved' ? 'bg-emerald-500/15' : a.status === 'rejected' ? 'bg-red-500/15' : 'bg-gray-500/15'}`}>
                    {a.status === 'approved' ? <Check size={14} className="text-emerald-400" /> :
                     a.status === 'rejected' ? <X size={14} className="text-red-400" /> :
                     <Clock size={14} className="text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-white font-medium">{a.name}</p>
                    <p className="text-[10px] text-gray-500">{a.role}</p>
                  </div>
                  <span className={`text-[10px] font-medium ${
                    a.status === 'approved' ? 'text-emerald-400' : a.status === 'rejected' ? 'text-red-400' : 'text-gray-500'}`}>
                    {a.status === 'approved' ? `Approuvé le ${a.date}` : a.status === 'rejected' ? `Rejeté le ${a.date}` : 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {doc.status !== 'approuve' && (
            <div className="flex gap-3 mb-6">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
                <Check size={14} /> Approuver
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                <X size={14} /> Rejeter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:text-white text-sm transition-colors">
                <MessageSquare size={14} /> Demander révision
              </button>
            </div>
          )}

          {/* Comments */}
          <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#0e1629' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Commentaires ({doc.comments.length})</h3>
            {doc.comments.length === 0 && <p className="text-[12px] text-gray-600">Aucun commentaire</p>}
            {doc.comments.map((c, i) => (
              <div key={i} className="mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-1">
                  <User size={12} className="text-gray-500" />
                  <span className="text-[11px] font-medium text-white">{c.author}</span>
                  <span className="text-[10px] text-gray-600">{c.date}</span>
                </div>
                <p className="text-[12px] text-gray-300">{c.text}</p>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Ajouter un commentaire..."
                className="flex-1 bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none placeholder:text-gray-600" />
              <button className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"><Send size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
