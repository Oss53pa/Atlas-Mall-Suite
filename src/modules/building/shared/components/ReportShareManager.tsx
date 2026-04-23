// ═══ REPORT SHARE MANAGER — UI d'envoi & suivi des rapports ═══
//
// Flow :
//   1. Formulaire d'envoi (destinataires + canal email/lien + durée)
//   2. Prévisualisation du HTML final
//   3. Envoi + création du share (tracking token)
//   4. Dashboard : liste des shares, statut temps réel (reçu/ouvert/validé/commenté)
//   5. Détail d'un share : timeline des événements

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Send, Link as LinkIcon, Mail, Clock, CheckCircle2, XCircle,
  MessageCircle, Eye, AlertCircle, Plus, Trash2, Copy, Check,
  FileText, Users, Shield,
} from 'lucide-react'
import {
  createReportShare, sendByEmail, sendByLink, listReportShares,
  getShareEvents, getSharesSummary, deleteReportShare,
  type ReportShare, type ShareEvent, type ShareChannel,
} from '../engines/reportShareEngine'

// ─── Props ────────────────────────────────────────────────

interface Props {
  /** ID du volume émetteur. */
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  /** Titre par défaut (ex: nom du volume). */
  defaultTitle: string
  /** HTML du rapport à partager. */
  reportHtml: string | null
  /** Action de composition du rapport (si HTML absent). */
  onComposeReport?: () => void
  /** Thème. */
  volumeColor?: string
}

const STATUS_META: Record<ReportShare['status'], { label: string; color: string; icon: React.ReactNode }> = {
  draft:    { label: 'Brouillon',             color: '#64748b', icon: <FileText size={11} /> },
  sent:     { label: 'Envoyé',                color: '#0ea5e9', icon: <Send size={11} /> },
  opened:   { label: 'Ouvert par destinataire', color: '#a77d4c', icon: <Eye size={11} /> },
  approved: { label: 'Validé ✓',              color: '#10b981', icon: <CheckCircle2 size={11} /> },
  rejected: { label: 'Corrections demandées', color: '#f59e0b', icon: <AlertCircle size={11} /> },
  commented:{ label: 'Commenté',              color: '#ec4899', icon: <MessageCircle size={11} /> },
  expired:  { label: 'Expiré',                color: '#6b7280', icon: <XCircle size={11} /> },
}

export default function ReportShareManager({
  volumeId, defaultTitle, reportHtml, onComposeReport, volumeColor = '#c9a068',
}: Props) {

  const [shares, setShares] = useState<ReportShare[]>([])
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getSharesSummary>> | null>(null)
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [events, setEvents] = useState<ShareEvent[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const selectedShare = shares.find(s => s.token === selectedToken) ?? null

  const refresh = useCallback(async () => {
    const [ss, sm] = await Promise.all([
      listReportShares(volumeId),
      getSharesSummary(volumeId),
    ])
    setShares(ss)
    setSummary(sm)
  }, [volumeId])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!selectedToken) { setEvents([]); return }
    void getShareEvents(selectedToken).then(setEvents)
  }, [selectedToken, shares])

  const handleDelete = async (token: string) => {
    await deleteReportShare(token)
    if (selectedToken === token) setSelectedToken(null)
    await refresh()
  }

  return (
    <div className="flex flex-col h-full bg-surface-0 text-slate-200">

      {/* Header */}
      <div className="border-b border-white/[0.06] p-4 flex items-center justify-between">
        <div>
          <h2 className="text-white text-sm font-semibold flex items-center gap-2">
            <Send size={14} style={{ color: volumeColor }} />
            Partage & validation des rapports
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Envoi e-mail / lien · suivi temps réel · retours centralisés
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!reportHtml && onComposeReport && (
            <button onClick={onComposeReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/[0.06] text-[11px] text-slate-300">
              <FileText size={11} />
              Composer un rapport
            </button>
          )}
          <button
            disabled={!reportHtml}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-40"
            style={{ background: `${volumeColor}18`, border: `1px solid ${volumeColor}40`, color: volumeColor }}
          >
            <Plus size={12} />
            Nouveau partage
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && summary.total > 0 && (
        <div className="border-b border-white/[0.06] p-3 bg-surface-1/40 flex items-center gap-4 text-[11px] text-slate-400">
          <span>Total : <strong className="text-slate-200">{summary.total}</strong></span>
          <span>Validés : <strong className="text-emerald-400">{summary.byStatus.approved}</strong></span>
          <span>En attente : <strong className="text-sky-400">{summary.byStatus.sent + summary.byStatus.opened}</strong></span>
          <span>Taux validation : <strong className="text-emerald-400">{(summary.approvalRate * 100).toFixed(0)}%</strong></span>
          {summary.avgResponseTimeMinutes > 0 && (
            <span>Délai réponse moy. : <strong className="text-amber-400">{summary.avgResponseTimeMinutes.toFixed(0)} min</strong></span>
          )}
        </div>
      )}

      {/* Body : liste + détail */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">

        {/* Liste des shares */}
        <div className="border-r border-white/[0.06] overflow-y-auto">
          {shares.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 px-6 text-center">
              <Send size={36} strokeWidth={1.3} />
              <p className="text-[13px] mt-3">Aucun rapport partagé</p>
              <p className="text-[11px] mt-1">Générez un rapport et partagez-le avec les décideurs.</p>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {shares.map(s => (
                <ShareRow key={s.token}
                  share={s}
                  selected={selectedToken === s.token}
                  onSelect={() => setSelectedToken(s.token)}
                  onDelete={() => handleDelete(s.token)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Détail du share */}
        <div className="overflow-y-auto">
          {!selectedShare ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Users size={40} strokeWidth={1.3} />
              <p className="text-[13px] mt-3">Sélectionnez un partage</p>
            </div>
          ) : (
            <ShareDetail share={selectedShare} events={events} />
          )}
        </div>
      </div>

      {/* Modal création */}
      {showCreate && reportHtml && (
        <CreateShareModal
          defaultTitle={defaultTitle}
          volumeId={volumeId}
          html={reportHtml}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await refresh() }}
          volumeColor={volumeColor}
        />
      )}
    </div>
  )
}

// ─── Share row ────────────────────────────────────────────

function ShareRow({
  share, selected, onSelect, onDelete,
}: {
  share: ReportShare; selected: boolean; onSelect: () => void; onDelete: () => void
}) {
  const meta = STATUS_META[share.status]
  return (
    <li>
      <div className={`rounded-lg p-2.5 transition border cursor-pointer ${
        selected ? 'bg-white/[0.04] border-white/15' : 'border-transparent hover:bg-white/[0.02]'
      }`} onClick={onSelect}>
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
            {share.channel === 'email' ? <Mail size={12} /> : <LinkIcon size={12} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-white truncate">{share.title}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{share.recipients.length} destinataire{share.recipients.length > 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{new Date(share.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded"
              style={{ background: `${meta.color}15`, color: meta.color }}>
              {meta.icon}
              {meta.label}
            </span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="shrink-0 p-1 text-slate-600 hover:text-red-400">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </li>
  )
}

// ─── Share detail ─────────────────────────────────────────

function ShareDetail({ share, events }: { share: ReportShare; events: ShareEvent[] }) {
  const meta = STATUS_META[share.status]
  const [copied, setCopied] = useState(false)
  const copyLink = () => {
    void navigator.clipboard.writeText(share.url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="p-5">
      <div className="mb-4">
        <h3 className="text-white text-[15px] font-semibold">{share.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ background: `${meta.color}15`, color: meta.color }}>
            {meta.icon}
            {meta.label}
          </span>
          <span className="text-[10px] text-slate-500">
            Créé le {new Date(share.createdAt).toLocaleString('fr-FR')}
          </span>
        </div>
      </div>

      {/* URL */}
      <div className="mb-4 rounded-lg border border-white/[0.05] bg-surface-1/30 p-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
          <LinkIcon size={10} /> Lien du rapport
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate text-[11px] text-sky-300 bg-surface-0 px-2 py-1 rounded">{share.url}</code>
          <button onClick={copyLink} className="shrink-0 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
          <a href={share.url} target="_blank" rel="noreferrer"
            className="shrink-0 px-2 py-1 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px]">
            Ouvrir
          </a>
        </div>
      </div>

      {/* Destinataires */}
      <div className="mb-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Users size={10} /> Destinataires ({share.recipients.length})
        </div>
        <ul className="space-y-1">
          {share.recipients.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-[11px] bg-surface-1/30 border border-white/[0.04] rounded px-2.5 py-1.5">
              <Users size={10} className="text-slate-500" />
              <span className="text-slate-200">{r.name}</span>
              {r.email && <span className="text-slate-500">&lt;{r.email}&gt;</span>}
              {r.role && <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{r.role}</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Timeline événements */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Clock size={10} /> Timeline ({events.length})
        </div>
        {events.length === 0 ? (
          <div className="text-[11px] text-slate-500 bg-surface-1/30 border border-dashed border-white/[0.06] rounded p-3 text-center">
            Aucun événement encore enregistré.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {[...events].sort((a, b) => b.at.localeCompare(a.at)).map(e => {
              const eMeta: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
                sent: { color: '#0ea5e9', icon: <Send size={10} />, label: 'Envoyé' },
                opened: { color: '#a77d4c', icon: <Eye size={10} />, label: 'Ouvert' },
                approved: { color: '#10b981', icon: <CheckCircle2 size={10} />, label: 'Validé' },
                corrections_requested: { color: '#f59e0b', icon: <AlertCircle size={10} />, label: 'Corrections demandées' },
                commented: { color: '#ec4899', icon: <MessageCircle size={10} />, label: 'Commentaire' },
                expired: { color: '#6b7280', icon: <XCircle size={10} />, label: 'Expiré' },
              }
              const em = eMeta[e.type] ?? { color: '#64748b', icon: <Clock size={10} />, label: e.type }
              return (
                <li key={e.id} className="flex items-start gap-2.5 rounded-lg bg-surface-1/30 border border-white/[0.04] p-2.5">
                  <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: `${em.color}18`, color: em.color, border: `1px solid ${em.color}30` }}>
                    {em.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span style={{ color: em.color }} className="font-semibold">{em.label}</span>
                      {e.actor && <span className="text-slate-400">par {e.actor}</span>}
                      <span className="text-[9px] text-slate-600 ml-auto">
                        {new Date(e.at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    {e.comment && (
                      <p className="text-[11px] text-slate-300 mt-1 italic">« {e.comment} »</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Modal création ───────────────────────────────────────

function CreateShareModal({
  defaultTitle, volumeId, html, onClose, onCreated, volumeColor,
}: {
  defaultTitle: string
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  html: string
  onClose: () => void
  onCreated: () => void | Promise<void>
  volumeColor: string
}) {
  const [title, setTitle] = useState(defaultTitle)
  const [channel, setChannel] = useState<ShareChannel>('email')
  const [expiresAtDays, setExpiresAtDays] = useState<number>(30)
  const [recipients, setRecipients] = useState<Array<{ name: string; email: string; role?: string }>>([
    { name: '', email: '' },
  ])
  const [sending, setSending] = useState(false)

  const valid = useMemo(() =>
    title.trim().length > 0 &&
    recipients.some(r => r.name.trim() && r.email.trim()),
    [title, recipients],
  )

  const handleSend = async () => {
    if (!valid) return
    setSending(true)
    try {
      const share = await createReportShare({
        title: title.trim(),
        volumeId,
        recipients: recipients.filter(r => r.name.trim() && r.email.trim()),
        channel,
        html,
        expiresAtDays,
      })
      if (channel === 'email') {
        await sendByEmail(share)
      } else {
        await sendByLink(share)
      }
      await onCreated()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface-0/80 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-surface-0 border border-white/10 overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <h3 className="text-white text-[14px] font-semibold">Nouveau partage de rapport</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Le rapport HTML sera généré avec un token de tracking. Les actions du destinataire remonteront ici en temps réel.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-white/[0.08] text-[12px] text-white" />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">Canal</label>
            <div className="flex gap-2">
              <button onClick={() => setChannel('email')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[12px] ${
                  channel === 'email' ? 'bg-atlas-500/15 border-atlas-500/40 text-atlas-300' : 'bg-surface-1 border-white/[0.06] text-slate-400'
                }`}>
                <Mail size={12} />
                E-mail (mailto)
              </button>
              <button onClick={() => setChannel('link')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[12px] ${
                  channel === 'link' ? 'bg-atlas-500/15 border-atlas-500/40 text-atlas-300' : 'bg-surface-1 border-white/[0.06] text-slate-400'
                }`}>
                <LinkIcon size={12} />
                Lien partageable
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">Destinataires</label>
            <div className="space-y-1.5">
              {recipients.map((r, i) => (
                <div key={i} className="flex gap-1.5">
                  <input value={r.name} onChange={e => {
                    const next = [...recipients]; next[i] = { ...next[i], name: e.target.value }; setRecipients(next)
                  }} placeholder="Nom" className="flex-1 px-2 py-1.5 rounded bg-surface-1 border border-white/[0.06] text-[11px] text-white" />
                  <input value={r.email} onChange={e => {
                    const next = [...recipients]; next[i] = { ...next[i], email: e.target.value }; setRecipients(next)
                  }} placeholder="Email" className="flex-1 px-2 py-1.5 rounded bg-surface-1 border border-white/[0.06] text-[11px] text-white" />
                  <input value={r.role ?? ''} onChange={e => {
                    const next = [...recipients]; next[i] = { ...next[i], role: e.target.value }; setRecipients(next)
                  }} placeholder="Rôle" className="w-24 px-2 py-1.5 rounded bg-surface-1 border border-white/[0.06] text-[11px] text-white" />
                  {recipients.length > 1 && (
                    <button onClick={() => setRecipients(recipients.filter((_, k) => k !== i))}
                      className="p-1.5 text-slate-500 hover:text-red-400"><Trash2 size={11} /></button>
                  )}
                </div>
              ))}
              <button onClick={() => setRecipients([...recipients, { name: '', email: '' }])}
                className="text-[11px] text-sky-400 hover:text-sky-300">+ Ajouter un destinataire</button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Shield size={10} />
              Durée de validité (jours)
            </label>
            <input type="number" min="1" max="365" value={expiresAtDays}
              onChange={e => setExpiresAtDays(parseInt(e.target.value) || 30)}
              className="w-24 px-3 py-2 rounded-lg bg-surface-1 border border-white/[0.08] text-[12px] text-white" />
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[12px] text-slate-400 hover:text-white">
            Annuler
          </button>
          <button onClick={handleSend} disabled={!valid || sending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium disabled:opacity-40"
            style={{ background: `${volumeColor}18`, border: `1px solid ${volumeColor}40`, color: volumeColor }}>
            <Send size={12} />
            {sending ? 'Envoi…' : channel === 'email' ? 'Envoyer par e-mail' : 'Créer le lien'}
          </button>
        </div>
      </div>
    </div>
  )
}
