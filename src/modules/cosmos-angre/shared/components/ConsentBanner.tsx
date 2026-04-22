// ═══ ConsentBanner — Bannière de consentement RGPD ═══
//
// Affichée une seule fois à la première visite. Catégorise les traceurs :
//   • Essentiels   : obligatoires (auth, préférences) — pas de consentement requis
//   • Analytics    : mesure d'audience — consentement OPT-IN
//   • IA avancée   : envoi de prompts enrichis à Anthropic — consentement OPT-IN
//
// Conforme à :
//   • Loi 2010/012 Cameroun (cybersécurité)
//   • RGPD Art. 6 et 7 (consentement) si applicable
//   • Recommandations CNIL française
//
// Stockage : localStorage pour le choix + expiration 13 mois (CNIL)

import React, { useEffect, useState, useCallback } from 'react'
import { Shield, X, Check, Settings2 } from 'lucide-react'

const STORAGE_KEY = 'atlas-consent-v1'
const CONSENT_EXPIRY_DAYS = 395 // ~13 mois (recommandation CNIL)

export type ConsentCategory = 'essential' | 'analytics' | 'ai-enrichment' | 'marketing'

export interface ConsentState {
  essential: true
  analytics: boolean
  'ai-enrichment': boolean
  marketing: boolean
  /** Version du texte accepté (pour détecter évolution de la politique). */
  version: string
  /** Timestamp d'acceptation. */
  acceptedAt: string
}

// ─── API publique (utilisable depuis n'importe quel module) ─────

export function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentState
    // Check expiration
    if (parsed.acceptedAt) {
      const age = Date.now() - new Date(parsed.acceptedAt).getTime()
      if (age > CONSENT_EXPIRY_DAYS * 86400_000) return null
    }
    return parsed
  } catch {
    return null
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'essential') return true
  const c = getConsent()
  return c ? Boolean(c[category]) : false
}

export function setConsent(partial: Partial<ConsentState>): void {
  const current = getConsent() ?? {
    essential: true, analytics: false, 'ai-enrichment': false, marketing: false,
    version: '1.0', acceptedAt: new Date().toISOString(),
  }
  const next: ConsentState = {
    ...current,
    ...partial,
    essential: true,
    version: '1.0',
    acceptedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  // Notifier les listeners
  window.dispatchEvent(new CustomEvent('atlas-consent-changed', { detail: next }))
}

export function revokeConsent(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('atlas-consent-changed', { detail: null }))
}

// ─── Composant React ─────────────────────────────────────────

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [choices, setChoices] = useState({
    analytics: false,
    'ai-enrichment': false,
    marketing: false,
  })

  useEffect(() => {
    const existing = getConsent()
    if (!existing) setVisible(true)
  }, [])

  const acceptAll = useCallback(() => {
    setConsent({
      analytics: true,
      'ai-enrichment': true,
      marketing: true,
    })
    setVisible(false)
  }, [])

  const rejectAll = useCallback(() => {
    setConsent({
      analytics: false,
      'ai-enrichment': false,
      marketing: false,
    })
    setVisible(false)
  }, [])

  const saveCustom = useCallback(() => {
    setConsent(choices)
    setVisible(false)
  }, [choices])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-xl bg-surface-1/95 backdrop-blur-md border border-white/10 shadow-2xl"
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-atlas-500/15 border border-atlas-500/30 flex items-center justify-center">
            <Shield size={18} className="text-atlas-300" />
          </div>
          <div className="flex-1">
            <h2 id="consent-title" className="text-white text-sm font-semibold">
              Vos préférences de confidentialité
            </h2>
            <p id="consent-desc" className="text-[12px] text-slate-400 mt-1 leading-relaxed">
              Atlas Mall Suite utilise des traceurs essentiels au fonctionnement
              du service et, avec votre accord, des traceurs complémentaires.
              Vous pouvez modifier vos choix à tout moment depuis{' '}
              <strong className="text-slate-200">Paramètres → Confidentialité</strong>.
            </p>
          </div>
          <button
            onClick={rejectAll}
            aria-label="Refuser tout et fermer"
            className="shrink-0 p-1 text-slate-500 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {customizing && (
          <div className="space-y-2 my-4 rounded-lg bg-surface-0/40 border border-white/[0.04] p-3">
            <ConsentRow
              category="essential"
              title="Essentiels"
              description="Authentification, préférences utilisateur, sécurité. Obligatoires."
              checked
              disabled
            />
            <ConsentRow
              category="analytics"
              title="Mesure d'audience"
              description="Statistiques d'usage anonymisées pour améliorer le produit."
              checked={choices.analytics}
              onChange={(v) => setChoices({ ...choices, analytics: v })}
            />
            <ConsentRow
              category="ai-enrichment"
              title="IA avancée (Anthropic Claude)"
              description="Envoi de prompts enrichis à un fournisseur IA tiers (US) pour générer des analyses détaillées. Sans ce consentement, PROPH3T fonctionne en local (Ollama) uniquement."
              checked={choices['ai-enrichment']}
              onChange={(v) => setChoices({ ...choices, 'ai-enrichment': v })}
            />
            <ConsentRow
              category="marketing"
              title="Communication commerciale"
              description="Newsletters produit, enquêtes utilisateur, informations de nouvelles fonctionnalités."
              checked={choices.marketing}
              onChange={(v) => setChoices({ ...choices, marketing: v })}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end mt-4">
          {!customizing && (
            <button
              onClick={() => setCustomizing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/[0.08] text-[12px] text-slate-300"
            >
              <Settings2 size={12} />
              Personnaliser
            </button>
          )}
          <button
            onClick={rejectAll}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/[0.08] text-[12px] text-slate-300"
          >
            Refuser tout
          </button>
          {customizing ? (
            <button
              onClick={saveCustom}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[12px] font-medium text-emerald-200"
            >
              <Check size={12} />
              Enregistrer mes choix
            </button>
          ) : (
            <button
              onClick={acceptAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-atlas-500/20 hover:bg-atlas-500/30 border border-atlas-500/40 text-[12px] font-medium text-atlas-200"
            >
              <Check size={12} />
              Tout accepter
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-600 mt-3 text-center">
          <a href="/legal/PRIVACY" className="hover:text-slate-400 underline">Politique de confidentialité</a>
          {' · '}
          <a href="/legal/CGU" className="hover:text-slate-400 underline">CGU</a>
          {' · '}
          <a href="/legal/MENTIONS-LEGALES" className="hover:text-slate-400 underline">Mentions légales</a>
        </p>
      </div>
    </div>
  )
}

function ConsentRow({
  title, description, checked, disabled, onChange,
}: {
  category: ConsentCategory
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <label className={`flex items-start gap-3 p-2 rounded ${disabled ? 'opacity-70' : 'hover:bg-white/[0.03] cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 accent-atlas-500"
      />
      <div className="flex-1">
        <div className="text-[12px] font-medium text-slate-200">{title}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{description}</div>
      </div>
    </label>
  )
}
