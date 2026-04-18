// ═══ VOL.4 · Section Persona & Préférences ═══
//
// Configure la personnalisation : persona, taille (calibre PDR), mode PMR,
// langue, guidage vocal, mode d'itinéraire par défaut.

import React from 'react'
import { User, Accessibility, Languages, Volume2, Navigation, Ruler } from 'lucide-react'
import { useVol4Store } from '../store/vol4Store'
import { PERSONA_PROFILES, type Persona } from '../engines/proph3tWayfinder'
import type { RouteMode } from '../engines/astarEngine'

const PERSONA_LABELS: Record<Persona, string> = {
  generic: 'Standard',
  shopper: 'Shopper',
  family: 'Famille',
  foodie: 'Foodie',
  business: 'Business',
  tourist: 'Touriste',
  teen: 'Jeune',
  senior: 'Senior',
}

const PERSONA_ICONS: Record<Persona, string> = {
  generic: '👤', shopper: '🛍️', family: '👨‍👩‍👧', foodie: '🍽️',
  business: '💼', tourist: '📷', teen: '🎮', senior: '🧓',
}

export default function PersonaSection() {
  const {
    activePersona, setPersona,
    userHeightM, setUserHeight,
    pmrMode, setPmrMode,
    preferredLang, setLang,
    voiceGuidance, setVoiceGuidance,
    defaultMode, setDefaultMode,
  } = useVol4Store()

  const profile = PERSONA_PROFILES[activePersona]

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-6 gap-6">
      <div>
        <h2 className="text-white text-xl font-semibold">Persona & Préférences</h2>
        <p className="text-[11px] text-slate-500 mt-1">
          Personnalise les itinéraires : PROPH3T ajuste les poids du graphe pour passer devant les enseignes les plus pertinentes.
        </p>
      </div>

      {/* Persona grid */}
      <div>
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <User size={14} className="text-purple-400" />
          Profil visiteur
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(PERSONA_LABELS) as Persona[]).map(p => {
            const active = activePersona === p
            return (
              <button key={p} onClick={() => setPersona(p)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border ${
                  active ? 'bg-purple-600/15 border-purple-500/40' : 'bg-slate-900/30 border-white/[0.04] hover:border-purple-500/20'
                }`}>
                <span className="text-2xl">{PERSONA_ICONS[p]}</span>
                <span className={`text-[11px] font-medium ${active ? 'text-purple-300' : 'text-slate-400'}`}>{PERSONA_LABELS[p]}</span>
              </button>
            )
          })}
        </div>
        {profile && profile.boostedCategories.length > 0 && (
          <div className="mt-3 text-[10px] text-slate-500">
            Boost :{' '}
            {profile.boostedCategories.map(c => (
              <span key={c} className="inline-block mx-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* PMR / Accessibilité */}
      <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <Accessibility size={14} className="text-cyan-400" />
          Accessibilité
        </h3>
        <button onClick={() => setPmrMode(!pmrMode)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
            pmrMode ? 'bg-cyan-600/15 border border-cyan-500/40 text-cyan-300' : 'bg-slate-950/30 border border-white/[0.04] text-slate-300'
          }`}>
          <div className="flex items-center gap-2">
            <Accessibility size={16} />
            <div className="text-left">
              <div className="text-sm font-medium">Mode PMR</div>
              <div className="text-[10px] opacity-70">Ascenseurs & rampes prioritaires · escalators exclus · pentes ≤ 5 %</div>
            </div>
          </div>
          <div className={`w-10 h-5 rounded-full transition relative ${pmrMode ? 'bg-cyan-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${pmrMode ? 'left-5' : 'left-0.5'}`} />
          </div>
        </button>
      </div>

      {/* Taille (PDR) */}
      <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <Ruler size={14} className="text-sky-400" />
          Calibration de pas (PDR)
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">
          La longueur de pas est utilisée par le PDR entre deux beacons. 0.65 × taille ≈ longueur naturelle.
        </p>
        <div className="flex items-center gap-3">
          <input type="range" min="140" max="210" step="1"
            value={Math.round((userHeightM ?? 1.70) * 100)}
            onChange={e => setUserHeight(parseInt(e.target.value) / 100)}
            className="flex-1" />
          <span className="text-sm text-white font-medium min-w-[4ch] text-right">
            {userHeightM ? `${(userHeightM * 100).toFixed(0)} cm` : '—'}
          </span>
          {userHeightM && (
            <span className="text-[10px] text-slate-500">
              Pas ≈ {(userHeightM * 0.65).toFixed(2)} m
            </span>
          )}
        </div>
      </div>

      {/* Langue */}
      <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <Languages size={14} className="text-amber-400" />
          Langue du guidage
        </h3>
        <div className="flex gap-2">
          {(['fr', 'en', 'dioula'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition ${
                preferredLang === l ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                  : 'bg-slate-950/30 border border-white/[0.04] text-slate-400 hover:border-amber-500/20'
              }`}>
              {l === 'fr' ? 'Français' : l === 'en' ? 'English' : 'Dioula'}
            </button>
          ))}
        </div>
      </div>

      {/* Vocal */}
      <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <Volume2 size={14} className="text-emerald-400" />
          Guidage vocal
        </h3>
        <button onClick={() => setVoiceGuidance(!voiceGuidance)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
            voiceGuidance ? 'bg-emerald-600/15 border border-emerald-500/40 text-emerald-300' : 'bg-slate-950/30 border border-white/[0.04] text-slate-300'
          }`}>
          <div className="flex items-center gap-2">
            <Volume2 size={16} />
            <div className="text-left">
              <div className="text-sm font-medium">Instructions vocales</div>
              <div className="text-[10px] opacity-70">Text-to-Speech natif · activé automatiquement avec VoiceOver / TalkBack</div>
            </div>
          </div>
          <div className={`w-10 h-5 rounded-full transition relative ${voiceGuidance ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${voiceGuidance ? 'left-5' : 'left-0.5'}`} />
          </div>
        </button>
      </div>

      {/* Default mode */}
      <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <Navigation size={14} className="text-sky-400" />
          Mode par défaut
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['standard', 'pmr', 'fast', 'discovery'] as RouteMode[]).map(m => (
            <button key={m} onClick={() => setDefaultMode(m)}
              className={`px-3 py-2 rounded-lg text-[11px] font-medium capitalize ${
                defaultMode === m ? 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
                  : 'bg-slate-950/30 border border-white/[0.04] text-slate-400'
              }`}>
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
