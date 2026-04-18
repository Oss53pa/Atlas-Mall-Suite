// ═══ SIGNAGE FEEDBACK PAGE (mobile) ═══
// Page publique ouverte quand un agent scanne un QR code sur un panneau
// physique. Formulaire simple : statut / sévérité / note / photo.
//
// POST vers l'Edge Function `signage-feedback-mobile` (endpoint public,
// bypass RLS via service_role côté serveur, validation + rate limit).

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle, XCircle, AlertTriangle, Camera, Loader2, Send, MapPin,
} from 'lucide-react'
import type { FeedbackStatus, FeedbackSeverity } from '../services/signageFeedbackService'

const STATUS_OPTIONS: Array<{
  value: FeedbackStatus
  label: string
  emoji: string
  severity: FeedbackSeverity
  color: string
}> = [
  { value: 'ok',           label: 'OK / visible',        emoji: '✅', severity: 'low',     color: 'bg-emerald-600' },
  { value: 'illisible',    label: 'Illisible / abîmé',   emoji: '🔍', severity: 'medium',  color: 'bg-amber-600' },
  { value: 'mal-oriente',  label: 'Mal orienté',         emoji: '↪️', severity: 'medium',  color: 'bg-orange-600' },
  { value: 'absent',       label: 'Absent / arraché',    emoji: '❌', severity: 'high',    color: 'bg-red-600' },
  { value: 'degrade',      label: 'Dégradé / graffiti',  emoji: '🖌', severity: 'medium',  color: 'bg-purple-600' },
  { value: 'obsolete',     label: 'Info obsolète',       emoji: '⏰', severity: 'low',     color: 'bg-blue-600' },
  { value: 'autre',        label: 'Autre (préciser)',    emoji: '✏', severity: 'medium',   color: 'bg-slate-600' },
]

export default function SignageFeedbackPage() {
  const [params] = useSearchParams()
  const projetId = params.get('p') ?? ''
  const panelRef = params.get('r') ?? ''
  const floorId = params.get('f') ?? ''
  const panelType = params.get('t') ?? ''
  const x = params.get('x')
  const y = params.get('y')

  const [status, setStatus] = useState<FeedbackStatus | null>(null)
  const [note, setNote] = useState('')
  const [agentName, setAgentName] = useState('')
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const valid = projetId && panelRef
  const canSubmit = valid && !!status && !submitting

  // Précharger nom de l'agent depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('atlas-agent-name')
    if (saved) setAgentName(saved)
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5_000_000) {
      setErrorMessage('Photo trop volumineuse (> 5 Mo). Réessayez avec une photo plus petite.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhotoBase64(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setErrorMessage('')
    setResult(null)
    localStorage.setItem('atlas-agent-name', agentName)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string ?? ''
      const endpoint = supabaseUrl && !supabaseUrl.includes('placeholder')
        ? `${supabaseUrl}/functions/v1/signage-feedback-mobile`
        : '/api/signage-feedback-mobile' // fallback local

      const selectedOption = STATUS_OPTIONS.find(o => o.value === status)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projet_id: projetId,
          panel_ref: panelRef,
          status,
          severity: selectedOption?.severity ?? 'medium',
          note: note.trim() || undefined,
          floor_id: floorId || undefined,
          panel_type: panelType || undefined,
          x: x ? Number(x) : undefined,
          y: y ? Number(y) : undefined,
          agent_name: agentName.trim() || undefined,
          photo_base64: photoBase64 ?? undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      setResult('success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau'
      setErrorMessage(msg)
      setResult('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold mb-2">QR code invalide</h1>
          <p className="text-sm text-slate-400">
            Ce lien ne contient pas les informations nécessaires (projet + référence panneau).
            Vérifiez que vous avez scanné un panneau officiel.
          </p>
        </div>
      </div>
    )
  }

  if (result === 'success') {
    return (
      <div className="min-h-screen bg-emerald-950 text-white flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Merci !</h1>
          <p className="text-sm text-emerald-200 mb-4">
            Votre signalement a été enregistré. L'équipe recevra une alerte pour traitement.
          </p>
          <button
            onClick={() => { setResult(null); setStatus(null); setNote(''); setPhotoBase64(null) }}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
          >
            Signaler un autre panneau
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-16">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="mb-5">
          <div className="flex items-center gap-2 text-amber-400 text-[10px] uppercase tracking-wider font-bold mb-1">
            <MapPin className="w-3 h-3" />
            PROPH3T · Feedback terrain
          </div>
          <h1 className="text-lg font-bold">Signaler un panneau</h1>
          <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
            Réf : {panelRef}{floorId && ` · Niveau ${floorId}`}
            {panelType && ` · ${panelType}`}
          </p>
        </header>

        {/* Statut */}
        <section className="mb-5">
          <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Quel est l'état du panneau ?
          </label>
          <div className="space-y-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                  status === opt.value
                    ? `${opt.color} border-white/30 text-white shadow-lg scale-[0.98]`
                    : 'border-white/10 bg-slate-900 text-slate-300 hover:border-white/20'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="flex-1 text-left text-sm font-medium">{opt.label}</span>
                {status === opt.value && <CheckCircle className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </section>

        {/* Note */}
        <section className="mb-5">
          <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Commentaire (optionnel)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Précisez la nature du problème…"
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
          />
          <div className="text-right text-[10px] text-slate-600 mt-1">{note.length}/500</div>
        </section>

        {/* Photo */}
        <section className="mb-5">
          <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Photo (optionnel)
          </label>
          {photoBase64 ? (
            <div className="relative">
              <img src={photoBase64} alt="Preview" className="w-full rounded-lg border border-white/10 max-h-64 object-contain bg-slate-900" />
              <button
                onClick={() => setPhotoBase64(null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed border-white/15 bg-slate-900 text-slate-400 cursor-pointer hover:border-amber-500/40">
              <Camera className="w-6 h-6" />
              <span className="text-sm">Prendre une photo</span>
              <span className="text-[10px] text-slate-600">Max 5 Mo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handlePhotoChange}
              />
            </label>
          )}
        </section>

        {/* Agent name */}
        <section className="mb-5">
          <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Votre nom (optionnel)
          </label>
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="ex: Kouassi Jean"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </section>

        {/* Erreur */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-900/40 border border-red-900/60 text-red-200 text-[12px]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            canSubmit
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:opacity-90'
              : 'bg-slate-800 text-slate-600'
          }`}
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
            : <><Send className="w-4 h-4" /> Envoyer le signalement</>
          }
        </button>

        <p className="text-[10px] text-slate-600 text-center mt-4">
          Vos données sont anonymes (hors nom optionnel) et servent uniquement à l'amélioration de la signalétique.
        </p>
      </div>
    </div>
  )
}
