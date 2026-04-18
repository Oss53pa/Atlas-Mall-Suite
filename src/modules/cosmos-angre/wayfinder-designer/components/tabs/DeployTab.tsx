// ═══ Onglet 6 — Déploiement borne ═══
// Upload sur borne, URL borne, QR code, statut live, historique versions (CDC §03)

import { useState } from 'react'
import {
  Server, Plus, Trash2, Monitor, Wifi,
  Copy, History, ExternalLink, QrCode,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useDesignerStore, saveDesignerProject } from '../../store/designerStore'

export function DeployTab() {
  const { currentProject, deployedKioskIds, addKiosk, removeKiosk } = useDesignerStore()
  const [newKioskId, setNewKioskId] = useState('')
  const [publishing, setPublishing] = useState(false)

  const projectId = currentProject?.id ?? '(non sauvegardé)'

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await saveDesignerProject({
        status: 'published',
        incrementVersion: true,
        changelog: `Publication v${currentProject?.version ?? '0.1.0'}`,
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleAddKiosk = () => {
    if (!newKioskId.trim()) return
    addKiosk(newKioskId.trim())
    setNewKioskId('')
  }

  return (
    <div className="overflow-y-auto p-6 max-w-4xl mx-auto space-y-5">

      {/* Statut actuel */}
      <section className="rounded-lg bg-slate-900/40 border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[12px] font-semibold text-white flex items-center gap-2">
              <Server size={14} className="text-indigo-400" />
              Statut de publication
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Projet : <code className="text-slate-300 font-mono">{projectId}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={currentProject?.status ?? 'draft'} />
            <span className="text-[11px] text-slate-400">
              v{currentProject?.version ?? '0.1.0'}
            </span>
          </div>
        </div>

        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {publishing ? 'Publication en cours…' : '🚀 Publier nouvelle version'}
        </button>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          Incrémente le numéro de version (semver patch). Le bundle sera disponible immédiatement aux bornes connectées.
        </p>
      </section>

      {/* Bornes déployées */}
      <section className="rounded-lg bg-slate-900/40 border border-white/5 p-5">
        <h3 className="text-[12px] font-semibold text-white mb-3 flex items-center gap-2">
          <Monitor size={14} className="text-indigo-400" />
          Bornes déployées · {deployedKioskIds.length}
        </h3>

        {/* Form ajout borne */}
        <div className="flex gap-2 mb-3">
          <input
            value={newKioskId}
            onChange={e => setNewKioskId(e.target.value)}
            placeholder="ID de la borne (ex: kiosk-mail-central)"
            className="flex-1 px-3 py-2 rounded bg-slate-950 border border-white/10 text-[12px] text-white outline-none font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleAddKiosk()}
          />
          <button
            onClick={handleAddKiosk}
            disabled={!newKioskId.trim()}
            className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold disabled:opacity-50"
          >
            <Plus size={14} className="inline mr-1" /> Associer
          </button>
        </div>

        {deployedKioskIds.length === 0 && (
          <p className="text-[11px] italic text-slate-500 text-center py-6">
            Aucune borne associée. Ajoutez l'ID de la borne déclarée dans Vol.4 → Bornes interactives.
          </p>
        )}

        <div className="space-y-2">
          {deployedKioskIds.map(kid => (
            <KioskRow key={kid} kioskId={kid} projectId={projectId} onRemove={() => removeKiosk(kid)} />
          ))}
        </div>
      </section>

      {/* Historique versions */}
      <section className="rounded-lg bg-slate-900/40 border border-white/5 p-5">
        <h3 className="text-[12px] font-semibold text-white mb-3 flex items-center gap-2">
          <History size={14} className="text-indigo-400" />
          Historique versions
        </h3>
        {(currentProject?.versionHistory ?? []).length === 0 ? (
          <p className="text-[11px] italic text-slate-500 text-center py-4">
            Aucune publication encore. La 1ère sera enregistrée au prochain « Publier ».
          </p>
        ) : (
          <ul className="space-y-1">
            {(currentProject?.versionHistory ?? []).slice().reverse().map((v, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 rounded bg-slate-950/40 border border-white/5">
                <div>
                  <span className="text-[11px] font-mono text-emerald-400">v{v.version}</span>
                  <span className="text-[10px] text-slate-500 ml-2">{new Date(v.publishedAt).toLocaleString('fr-FR')}</span>
                </div>
                <span className="text-[10px] text-slate-400">{v.changelog ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style = status === 'published'
    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
    : status === 'review'
    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
    : status === 'archived'
    ? 'bg-slate-500/15 border-slate-500/30 text-slate-400'
    : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
  const label = status === 'published' ? '● Publié'
    : status === 'review' ? '○ En revue'
    : status === 'archived' ? '○ Archivé'
    : '○ Brouillon'
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style}`}>
      {label}
    </span>
  )
}

function KioskRow({ kioskId, onRemove }: { kioskId: string; projectId: string; onRemove: () => void }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const kioskUrl = `${baseUrl}/kiosk/${encodeURIComponent(kioskId)}`
  const [showQr, setShowQr] = useState(false)

  return (
    <div className="rounded bg-slate-950/40 border border-white/5">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Wifi size={12} className="text-emerald-400" />
            <span className="text-[12px] font-mono text-white truncate">{kioskId}</span>
          </div>
          <a
            href={kioskUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5"
          >
            <ExternalLink size={10} /> {kioskUrl}
          </a>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigator.clipboard.writeText(kioskUrl)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title="Copier l'URL"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={() => setShowQr(v => !v)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title="Afficher QR"
          >
            <QrCode size={12} />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40"
            title="Retirer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {showQr && (
        <div className="border-t border-white/5 p-3 flex items-center justify-center bg-white">
          <QRCodeSVG value={kioskUrl} size={160} level="M" />
        </div>
      )}
    </div>
  )
}
