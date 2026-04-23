// ═══ PROPH3T PREPARATION MODAL (ex-Import) — SCOPE PHASE A UNIQUEMENT ═══
// Rôle : nettoyer / dépolluer / valider le plan à l'import. PAS d'audit sécurité,
// PAS de parcours, PAS de commercial. L'utilisateur valide puis passe aux volumes.

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles, CheckCircle2, ArrowRight, Camera, RotateCw } from 'lucide-react'
import { Proph3tResultPanel } from './Proph3tResultPanel'
import { getLastResult, onProph3tResult } from '../orchestrator'
import type { Proph3tResult, Proph3tAction } from '../orchestrator.types'

// Helper toast simple (pas de dépendance externe)
function showToast(message: string, duration = 3500): void {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    z-index:100000; background:rgba(15,23,42,0.95); color:#fff;
    padding:12px 20px; border-radius:10px; font-size:13px; font-weight:500;
    border:1px solid rgba(179,138,90,0.5); box-shadow:0 10px 40px rgba(0,0,0,0.4);
    max-width:90vw; text-align:center; font-family:system-ui,sans-serif;
  `
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s'
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, duration)
}

interface Props {
  open: boolean
  onClose: () => void
  projectName: string
  orgName?: string
  /** Callback pour appliquer une action. */
  onApplyAction?: (action: Proph3tAction) => Promise<void> | void
  /** Valide le plan → ferme la modal + met un flag persistant planValidated. */
  onValidatePlan?: () => void
  /** Re-exécute la skill analyzePlanAtImport après corrections. */
  onRefresh?: () => Promise<void>
  /** Capture d'écran optionnelle. */
  captureScreenshot?: () => Promise<string | null>
}

export function Proph3tImportModal({
  open, onClose, projectName: _projectName,
  onApplyAction, onValidatePlan, onRefresh, captureScreenshot,
}: Props) {
  const [results, setResults] = useState<Record<string, Proph3tResult<unknown>>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const r0 = getLastResult('analyzePlanAtImport')
    if (r0) setResults({ analyzePlanAtImport: r0 })
    const unsub = onProph3tResult((skillId, result) => {
      if (skillId === 'analyzePlanAtImport') {
        setResults({ analyzePlanAtImport: result })
      }
    })
    return unsub
  }, [open])

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }

  const handleCapture = async () => {
    if (!captureScreenshot) return
    setCapturing(true)
    try {
      const url = await captureScreenshot()
      if (url) setCapturedScreenshot(url)
    } finally { setCapturing(false) }
  }

  const handleValidate = () => {
    onValidatePlan?.()
    onClose()
    // Navigue vers Vol.1 Commercial pour démarrer le travail manuel
    try {
      const path = window.location.pathname
      // Si on est dans /projects/cosmos-angre/... → aller au vol1
      if (path.includes('/projects/') && !path.includes('/vol1') && !path.includes('/vol2') && !path.includes('/vol3')) {
        const base = path.replace(/\/$/, '')
        window.location.hash = ''
        window.history.pushState({}, '', `${base.split('/').slice(0, 4).join('/')}/vol1`)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    } catch { /* navigation best-effort */ }
    // Toast visuel de confirmation
    showToast('✓ Plan validé — vous pouvez maintenant travailler dans les volumes (panneau PROPH3T à droite)')
  }

  const handleClose = () => {
    onClose()
    showToast('Modal fermée — vous pouvez la rouvrir depuis le bouton PROPH3T', 2000)
  }

  if (!open) return null
  if (typeof document === 'undefined') return null

  const phaseA = results.analyzePlanAtImport
  const actionsRemaining = phaseA ? phaseA.actions.filter(() => true).length : 0
  const qualityScore = phaseA?.qualityScore ?? 0

  return createPortal(
    <div
      className="fixed inset-0 bg-surface-0/85 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-5xl h-[92vh] rounded-xl bg-surface-0 border border-atlas-500/30 flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-gradient-to-r from-purple-950/40 to-surface-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-atlas-600/30 border border-atlas-500/40 flex items-center justify-center">
              <Sparkles size={18} className="text-atlas-300" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white">PROPH3T · Préparation du plan</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Étape 1/3 — Nettoyer et valider le plan avant de passer aux volumes
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/[0.05] rounded-lg text-slate-400 hover:text-white"
            title="Fermer (Échap)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Workflow indicator */}
        <div className="px-5 py-2 border-b border-white/[0.06] bg-surface-1/30 flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5 text-atlas-300">
            <div className="w-5 h-5 rounded-full bg-atlas-600 text-white text-[10px] font-bold flex items-center justify-center">1</div>
            <span className="font-medium">Préparation</span>
          </div>
          <div className="flex-1 h-px bg-slate-700" />
          <div className="flex items-center gap-1.5 text-slate-500">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center">2</div>
            <span>Volumes (Commercial · Sécurité · Parcours)</span>
          </div>
          <div className="flex-1 h-px bg-slate-700" />
          <div className="flex items-center gap-1.5 text-slate-500">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center">3</div>
            <span>Rapport final</span>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="px-5 py-3 border-b border-white/[0.06] bg-surface-1/40 flex items-center gap-2 flex-wrap">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium bg-slate-800 border border-white/[0.06] text-slate-300 hover:bg-slate-700 disabled:opacity-40">
            <RotateCw size={11} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Ré-analyse…' : 'Ré-analyser'}
          </button>
          {captureScreenshot && (
            <button onClick={handleCapture} disabled={capturing}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium border disabled:opacity-40 ${
                capturedScreenshot
                  ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-cyan-600/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30'
              }`}>
              <Camera size={12} />
              {capturing ? 'Capture…' : capturedScreenshot ? 'Plan capturé ✓' : 'Capturer plan'}
            </button>
          )}
          <div className="flex-1" />
          <div className="text-[10px] text-slate-500">
            Qualité : <strong className={qualityScore >= 75 ? 'text-emerald-400' : qualityScore >= 50 ? 'text-amber-400' : 'text-red-400'}>{qualityScore}/100</strong>
          </div>
          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-[11px] font-bold bg-gradient-to-r from-atlas-500 to-atlas-700 text-white hover:opacity-90"
            title="Valider le plan et passer au travail dans les volumes (Commercial / Sécurité / Parcours)"
          >
            <CheckCircle2 size={12} />
            Plan validé · Passer aux volumes
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {!phaseA ? (
            <div className="text-center py-12 text-slate-500">
              <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-[12px]">PROPH3T analyse votre plan…</p>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 rounded-lg bg-blue-950/30 border border-blue-500/30 text-[11px] text-blue-200">
                <strong>Étape 1/3 :</strong> PROPH3T a détecté des calques techniques à exclure et quelques zones à reclasser.
                Appliquez les corrections puis validez le plan pour accéder aux volumes (Commercial, Sécurité, Parcours)
                où vous placerez enseignes, caméras et parcours avec l'aide continue de PROPH3T.
              </div>
              <Proph3tResultPanel result={phaseA} onApplyAction={onApplyAction} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-white/[0.06] text-[10px] text-slate-500 flex items-center justify-between">
          <span>PROPH3T · Ollama priorité · Fallback transparent</span>
          <span>{actionsRemaining} action(s) proposée(s) — appliquez puis validez</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
