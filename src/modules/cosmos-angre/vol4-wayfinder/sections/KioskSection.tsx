// ═══ VOL.4 · Section Bornes Interactives ═══
//
// Gestion des bornes interactives du mall. Chaque borne a :
//   - une position fixe connue (x, y, étage)  → point de départ automatique
//   - une langue par défaut
//   - un mode d'affichage simplifié 3 étapes max
//
// Depuis cette section, on :
//   • ajoute / supprime des bornes
//   • active l'aperçu kiosque fullscreen
//   • génère un QR code pour transférer l'itinéraire au mobile

import React, { useState } from 'react'
import { Monitor, Plus, Trash2, MapPin, Printer, QrCode, Languages, Palette, ExternalLink } from 'lucide-react'
import { useVol4Store, type KioskLocation } from '../store/vol4Store'
import { isDesignerEnabled } from '../../wayfinder-designer/types'
import { useDesignerStore } from '../../wayfinder-designer/store/designerStore'

export default function KioskSection() {
  const { kiosks, addKiosk, setActiveKiosk, activeKioskId } = useVol4Store()
  const [form, setForm] = useState<Partial<KioskLocation>>({
    defaultLang: 'fr',
  })

  const save = () => {
    if (!form.label || form.x == null || form.y == null || !form.floorId) return
    addKiosk({
      id: form.id ?? `kiosk-${Date.now()}`,
      label: form.label,
      x: form.x, y: form.y,
      floorId: form.floorId,
      defaultLang: form.defaultLang ?? 'fr',
    })
    setForm({ defaultLang: 'fr' })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-6 gap-6">
      <div>
        <h2 className="text-white text-xl font-semibold">Bornes interactives</h2>
        <p className="text-[11px] text-slate-500 mt-1">
          Déployez des bornes tactiles (≥ 32") dans le mall. Interface simplifiée, retour auto après 30 s d'inactivité.
        </p>
      </div>

      {/* Form d'ajout */}
      <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <Plus size={14} className="text-emerald-400" />
          Ajouter une borne
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input placeholder="Libellé (ex: Borne Mail Central)" value={form.label ?? ''}
            onChange={e => setForm({ ...form, label: e.target.value })}
            className="px-3 py-2 rounded-lg bg-slate-950/50 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600 md:col-span-2" />
          <input type="number" placeholder="X (m)" value={form.x ?? ''}
            onChange={e => setForm({ ...form, x: parseFloat(e.target.value) || 0 })}
            className="px-3 py-2 rounded-lg bg-slate-950/50 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600" />
          <input type="number" placeholder="Y (m)" value={form.y ?? ''}
            onChange={e => setForm({ ...form, y: parseFloat(e.target.value) || 0 })}
            className="px-3 py-2 rounded-lg bg-slate-950/50 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600" />
          <input placeholder="Étage (ex: RDC)" value={form.floorId ?? ''}
            onChange={e => setForm({ ...form, floorId: e.target.value })}
            className="px-3 py-2 rounded-lg bg-slate-950/50 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600" />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Languages size={12} className="text-amber-400" />
            <span className="text-[10px] text-slate-500">Langue par défaut :</span>
            {(['fr', 'en', 'dioula'] as const).map(l => (
              <button key={l} onClick={() => setForm({ ...form, defaultLang: l })}
                className={`px-2 py-0.5 rounded text-[10px] ${
                  form.defaultLang === l ? 'bg-amber-500/15 text-amber-300' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={save}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-[11px] text-emerald-300 hover:bg-emerald-500/25">
            Ajouter
          </button>
        </div>
      </div>

      {/* Liste des bornes */}
      <div>
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <Monitor size={14} className="text-sky-400" />
          Bornes déployées · {kiosks.length}
        </h3>
        {kiosks.length === 0 ? (
          <div className="rounded-xl bg-slate-900/30 border border-dashed border-white/[0.06] p-8 text-center">
            <Monitor size={32} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Aucune borne configurée</p>
            <p className="text-slate-600 text-xs mt-1">Ajoutez au moins une borne pour activer le mode kiosk.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {kiosks.map(k => (
              <div key={k.id} className={`rounded-xl p-4 border transition ${
                activeKioskId === k.id ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-900/30 border-white/[0.04]'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white text-sm font-medium flex items-center gap-2">
                      <Monitor size={13} />
                      {k.label}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                      <MapPin size={10} />
                      ({k.x.toFixed(1)}, {k.y.toFixed(1)}) · {k.floorId}
                      <span>·</span>
                      <Languages size={10} />
                      {k.defaultLang}
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono bg-slate-950/40 px-1.5 py-0.5 rounded">{k.id}</span>
                </div>
                <div className="flex gap-1.5 mt-3">
                  <button
                    onClick={() => setActiveKiosk(activeKioskId === k.id ? null : k.id)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] ${
                      activeKioskId === k.id ? 'bg-sky-600/20 text-sky-300 border border-sky-500/30'
                        : 'bg-slate-950/40 text-slate-400 border border-white/[0.04]'
                    }`}
                  >
                    {activeKioskId === k.id ? '● Borne active' : 'Activer cette borne'}
                  </button>

                  {/* CDC §09 — Bouton "Ouvrir dans Designer" */}
                  {isDesignerEnabled() && (
                    <button
                      onClick={() => {
                        // Préinscrit cette borne dans le designerStore puis navigue vers Designer
                        useDesignerStore.getState().addKiosk(k.id)
                        useDesignerStore.getState().setActiveTab('deploy')
                        // L'utilisateur naviguera vers le Designer via le menu Vol.4
                        // (intégration UI à finaliser dans Vol4Module — out of scope strict KioskSection)
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 flex items-center gap-1"
                      title="Charger cette borne dans le Wayfinder Designer"
                    >
                      <Palette size={10} />
                      Designer
                    </button>
                  )}

                  {/* Lien direct route runtime borne */}
                  <a
                    href={`/kiosk/${encodeURIComponent(k.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 flex items-center gap-1"
                    title="Ouvrir le runtime borne en plein écran"
                  >
                    <ExternalLink size={10} />
                    Live
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Infos kiosk */}
      <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
        <h3 className="text-white text-sm font-medium mb-3">Spécifications kiosk</h3>
        <ul className="text-[11px] text-slate-400 space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">•</span>Dalle tactile ≥ 32", orientation portrait ou paysage</li>
          <li className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">•</span>Point de départ automatique (position de la borne connue)</li>
          <li className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">•</span>Instructions simplifiées en 3 étapes max</li>
          <li className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">•</span><QrCode size={11} className="mt-0.5" />QR code affiché pour transfert mobile</li>
          <li className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">•</span><Printer size={11} className="mt-0.5" />Impression optionnelle de l'itinéraire</li>
          <li className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">•</span>Retour auto à l'accueil après 30 s d'inactivité</li>
          <li className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">•</span>Temps moyen d'utilisation cible : ≤ 60 secondes</li>
        </ul>
      </div>
    </div>
  )
}
