// ═══ Onglet 1 — Projet ═══
// Nom du site, langue(s), logo upload, description courte, sélection du
// graphe Vol.3 associé. (CDC §03)

import React, { useRef } from 'react'
import { Building2, Globe, ImagePlus, Link2, Trash2 } from 'lucide-react'
import { useDesignerStore } from '../../store/designerStore'
import type { LocaleCode } from '../../types'
import { dirFromLocale } from '../../engines/brandEngine'

const ALL_LOCALES: Array<{ code: LocaleCode; label: string }> = [
  { code: 'fr-FR',  label: 'Français (France)' },
  { code: 'fr-CI',  label: 'Français (Côte d\'Ivoire)' },
  { code: 'en-US',  label: 'English (US)' },
  { code: 'en-GB',  label: 'English (UK)' },
  { code: 'ar-MA',  label: 'العربية (Maroc) — RTL' },
  { code: 'he-IL',  label: 'עברית — RTL' },
  { code: 'dyu-CI', label: 'Dioula' },
  { code: 'ff-CI',  label: 'Peul' },
  { code: 'ln-CD',  label: 'Lingala' },
  { code: 'sw-KE',  label: 'Swahili' },
]

export function ProjectTab() {
  const { config, patchProject } = useDesignerStore()
  const { project } = config
  const fileRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2_000_000) {
       
      alert('Logo trop volumineux (max 2 Mo).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        patchProject({
          logoUrl: reader.result as string,
          logoAspectRatio: img.width / img.height,
        })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const toggleLocale = (code: LocaleCode) => {
    const set = new Set(project.locales)
    if (set.has(code)) {
      if (set.size === 1) return // au moins 1 langue
      set.delete(code)
    } else {
      set.add(code)
    }
    const arr = Array.from(set)
    patchProject({
      locales: arr,
      activeLocale: arr.includes(project.activeLocale) ? project.activeLocale : arr[0],
    })
  }

  return (
    <div className="overflow-y-auto p-6 max-w-3xl mx-auto space-y-6">
      <Section title="Identification" icon={Building2}>
        <Field label="Nom du site / lieu" required>
          <input
            value={project.siteName}
            onChange={e => patchProject({ siteName: e.target.value })}
            placeholder="Ex: The Mall Shopping Center"
            className="input"
          />
        </Field>
        <Field label="Localisation (ville, pays)">
          <input
            value={project.location}
            onChange={e => patchProject({ location: e.target.value })}
            placeholder="Ex: Abidjan, Côte d'Ivoire"
            className="input"
          />
        </Field>
        <Field label="Description courte" hint="≤ 140 caractères, affichée sous le titre">
          <textarea
            value={project.tagline ?? ''}
            onChange={e => patchProject({ tagline: e.target.value.slice(0, 140) })}
            rows={2}
            className="input resize-none"
            maxLength={140}
          />
          <p className="text-[10px] text-slate-500 mt-1">{project.tagline?.length ?? 0}/140</p>
        </Field>
      </Section>

      <Section title="Logo" icon={ImagePlus}>
        <div className="flex gap-4 items-start">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-32 h-32 rounded-lg border-2 border-dashed border-white/15 flex items-center justify-center cursor-pointer hover:border-indigo-400 bg-surface-1/50 overflow-hidden flex-shrink-0"
          >
            {project.logoUrl ? (
              <img src={project.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImagePlus className="text-slate-600" size={28} />
            )}
          </div>
          <div className="flex-1 text-[11px] text-slate-400 space-y-1.5">
            <p>Format recommandé : SVG ou PNG transparent.</p>
            <p>Dimensions ≥ 512×512 px.</p>
            <p>Taille max : 2 Mo.</p>
            {project.logoUrl && (
              <button
                onClick={() => patchProject({ logoUrl: undefined, logoDarkUrl: undefined })}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 mt-2"
              >
                <Trash2 size={11} /> Retirer
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/svg+xml,image/webp,image/jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
          />
        </div>
      </Section>

      <Section title="Langues" icon={Globe}>
        <div className="grid grid-cols-2 gap-2">
          {ALL_LOCALES.map(loc => {
            const enabled = project.locales.includes(loc.code)
            const isActive = project.activeLocale === loc.code
            return (
              <button
                key={loc.code}
                onClick={() => toggleLocale(loc.code)}
                className={`text-left flex items-center justify-between px-3 py-2 rounded text-[11px] border transition-all ${
                  enabled
                    ? isActive
                      ? 'border-atlas-500 bg-indigo-950/40 text-white'
                      : 'border-white/15 bg-surface-1 text-slate-200'
                    : 'border-white/5 bg-surface-0/40 text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>
                  <code className="text-[9px] text-slate-600 mr-2">{loc.code}</code>
                  {loc.label}
                </span>
                {enabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      patchProject({ activeLocale: loc.code, dir: dirFromLocale(loc.code) })
                    }}
                    className={`text-[9px] px-1.5 py-0.5 rounded ${isActive ? 'bg-atlas-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    {isActive ? 'PREVIEW' : 'preview'}
                  </button>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          La 1ère langue est par défaut. Sens d'écriture appliqué automatiquement (RTL pour ar/he).
        </p>
      </Section>

      <Section title="Graphe de navigation Vol.3" icon={Link2}>
        <Field label="ID du graphe wayfinding" hint="JSON v2.0.0-vol4 produit par Vol.3 → exports">
          <input
            value={project.wayfindingGraphId ?? ''}
            onChange={e => patchProject({ wayfindingGraphId: e.target.value })}
            placeholder="Ex: graph-cosmos-rdc-2026-04"
            className="input font-mono text-[10px]"
          />
        </Field>
        <p className="text-[10px] text-slate-500">
          Si vide, le Designer utilisera le dernier graphe Vol.3 actif du projet.
        </p>
      </Section>
    </div>
  )
}

// ─── Sous-composants ───

function Section({
  title, icon: Icon, children,
}: { title: string; icon: React.ComponentType<any>; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-surface-1/40 border border-white/5 overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-surface-1/50">
        <Icon size={14} className="text-atlas-400" />
        <h3 className="text-[12px] font-semibold text-white">{title}</h3>
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  )
}

function Field({
  label, hint, required, children,
}: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>}
      <style>{`
        .input {
          width: 100%;
          padding: 8px 12px;
          background: #2a2d33;
          border: 1px solid rgba(255,255,255,0.1);
          color: #f1f5f9;
          border-radius: 6px;
          font-size: 12px;
          outline: none;
        }
        .input:focus { border-color: #b38a5a; }
      `}</style>
    </div>
  )
}
