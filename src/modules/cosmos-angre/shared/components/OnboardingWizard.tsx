// ═══ ONBOARDING WIZARD — 4 steps, 90 seconds to operational ═══

import React, { useState, useCallback } from 'react'
import {
  Building2, Upload, Layers, Sparkles,
  ChevronRight, ChevronLeft, Check, MapPin, Calendar,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

type MallTemplate = 'regional' | 'grand' | 'galerie'

interface ProjectIdentity {
  name: string
  address: string
  cityCountry: string
  glaSqm: number
  openingDate: string
  template: MallTemplate
}

interface FloorConfig {
  floorCount: number
  volumes: ('vol1' | 'vol2' | 'vol3')[]
}

export interface OnboardingResult {
  project: ProjectIdentity
  planFile: File | null
  planMode: 'import' | 'demo' | 'manual'
  floors: FloorConfig
}

interface OnboardingWizardProps {
  onComplete: (result: OnboardingResult) => void
  onSkip?: () => void
}

// ── Template presets ─────────────────────────────────────────

const TEMPLATES: Record<MallTemplate, { label: string; desc: string; gla: number }> = {
  regional: { label: 'Mall regional', desc: '20 000 — 50 000 m²', gla: 35000 },
  grand:    { label: 'Grand mall',    desc: '50 000 — 100 000 m²', gla: 65000 },
  galerie:  { label: 'Galerie commerciale', desc: '< 20 000 m²', gla: 12000 },
}

// ── Component ────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)

  // Step 1 — Project identity
  const [project, setProject] = useState<ProjectIdentity>({
    name: '',
    address: '',
    cityCountry: 'Abidjan, Côte d\'Ivoire',
    glaSqm: 45000,
    openingDate: '2026-10',
    template: 'regional',
  })

  // Step 2 — Plan import
  const [planFile, setPlanFile] = useState<File | null>(null)
  const [planMode, setPlanMode] = useState<'import' | 'demo' | 'manual'>('demo')

  // Step 3 — Floor config
  const [floorConfig, setFloorConfig] = useState<FloorConfig>({
    floorCount: 3,
    volumes: ['vol1', 'vol2', 'vol3'],
  })

  const canProceed = step === 0 ? project.name.trim().length > 0 : true

  const handleNext = useCallback(() => {
    if (step < 3) setStep(step + 1)
    else onComplete({ project, planFile, planMode, floors: floorConfig })
  }, [step, project, planFile, planMode, floorConfig, onComplete])

  const handleBack = useCallback(() => {
    if (step > 0) setStep(step - 1)
  }, [step])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      setPlanFile(file)
      setPlanMode('import')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPlanFile(file)
      setPlanMode('import')
    }
  }, [])

  // ── Step renderers ─────────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Nom du centre commercial *</label>
        <input
          type="text"
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          placeholder="Cosmos Angré Shopping Center"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[13px] placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Adresse</label>
          <input
            type="text"
            value={project.address}
            onChange={(e) => setProject({ ...project, address: e.target.value })}
            placeholder="Boulevard Mermoz"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[13px] placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Ville / Pays</label>
          <input
            type="text"
            value={project.cityCountry}
            onChange={(e) => setProject({ ...project, cityCountry: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[13px] placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Surface GLA (m²)</label>
          <input
            type="number"
            value={project.glaSqm}
            onChange={(e) => setProject({ ...project, glaSqm: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[13px] focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
            <Calendar size={11} className="inline mr-1" />
            Ouverture prévue
          </label>
          <input
            type="month"
            value={project.openingDate}
            onChange={(e) => setProject({ ...project, openingDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[13px] focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-slate-400 mb-2">Template</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(TEMPLATES) as [MallTemplate, typeof TEMPLATES[MallTemplate]][]).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setProject({ ...project, template: key, glaSqm: t.gla })}
              className={`p-3 rounded-lg border text-left transition-all ${
                project.template === key
                  ? 'border-purple-500/50 bg-purple-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="text-[12px] font-medium text-white">{t.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          planFile ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-purple-500/30'
        }`}
      >
        <Upload size={32} className={planFile ? 'text-green-400 mx-auto mb-3' : 'text-slate-600 mx-auto mb-3'} />
        {planFile ? (
          <>
            <div className="text-[13px] text-green-400 font-medium">{planFile.name}</div>
            <div className="text-[11px] text-slate-500 mt-1">{(planFile.size / 1024 / 1024).toFixed(1)} MB</div>
          </>
        ) : (
          <>
            <div className="text-[13px] text-slate-300">Glissez votre plan ici</div>
            <div className="text-[10px] text-slate-600 mt-1">DXF, DWG, IFC, PDF, JPG, PNG</div>
          </>
        )}
        <label className="inline-block mt-3 px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 cursor-pointer hover:bg-white/10 transition-colors">
          Parcourir...
          <input type="file" className="hidden" accept=".dxf,.dwg,.ifc,.pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
        </label>
      </div>

      <div className="text-[10px] text-slate-600 text-center">ou</div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setPlanMode('demo'); setPlanFile(null) }}
          className={`p-4 rounded-lg border text-left transition-all ${
            planMode === 'demo' && !planFile
              ? 'border-purple-500/50 bg-purple-500/10'
              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          <Building2 size={18} className="text-purple-400 mb-2" />
          <div className="text-[12px] font-medium text-white">Plan Cosmos Angré (démo)</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Données pré-configurées</div>
        </button>
        <button
          onClick={() => { setPlanMode('manual'); setPlanFile(null) }}
          className={`p-4 rounded-lg border text-left transition-all ${
            planMode === 'manual' && !planFile
              ? 'border-purple-500/50 bg-purple-500/10'
              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          <Layers size={18} className="text-amber-400 mb-2" />
          <div className="text-[12px] font-medium text-white">Créer manuellement</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Plan simple sans fichier</div>
        </button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-[11px] font-medium text-slate-400 mb-3">Nombre d'étages</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={5}
            value={floorConfig.floorCount}
            onChange={(e) => setFloorConfig({ ...floorConfig, floorCount: Number(e.target.value) })}
            className="flex-1 accent-purple-500"
          />
          <span className="text-[20px] font-bold text-white w-8 text-center">{floorConfig.floorCount}</span>
        </div>
        <div className="flex justify-between text-[9px] text-slate-600 mt-1 px-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-400 mb-3">Volumes à utiliser</label>
        <div className="space-y-2">
          {[
            { id: 'vol1' as const, label: 'Vol.1 — Plan Commercial', desc: 'Mix enseigne, occupancy, preneurs', color: '#f59e0b' },
            { id: 'vol2' as const, label: 'Vol.2 — Plan Sécuritaire', desc: 'Caméras, portes, évacuation, APSAD', color: '#38bdf8' },
            { id: 'vol3' as const, label: 'Vol.3 — Parcours Client', desc: 'Wayfinding, signalétique, expérience', color: '#22c55e' },
          ].map((v) => {
            const checked = floorConfig.volumes.includes(v.id)
            return (
              <button
                key={v.id}
                onClick={() => {
                  setFloorConfig({
                    ...floorConfig,
                    volumes: checked
                      ? floorConfig.volumes.filter((x) => x !== v.id)
                      : [...floorConfig.volumes, v.id],
                  })
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  checked ? 'border-white/20 bg-white/[0.04]' : 'border-white/5 bg-white/[0.01]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    checked ? 'bg-purple-500 border-purple-500' : 'border-white/20'
                  }`}
                >
                  {checked && <Check size={12} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-medium" style={{ color: checked ? v.color : '#94a3b8' }}>{v.label}</div>
                  <div className="text-[10px] text-slate-600">{v.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
        <Sparkles size={28} className="text-purple-400" />
      </div>
      <div>
        <h3 className="text-[18px] font-bold text-white mb-2">Je suis Proph3t</h3>
        <p className="text-[13px] text-slate-400 leading-relaxed max-w-md mx-auto">
          Je connais déjà votre projet <strong className="text-white">{project.name || 'votre mall'}</strong>.
          {project.glaSqm > 0 && (
            <> Surface : <strong className="text-white">{project.glaSqm.toLocaleString('fr-FR')} m²</strong>.</>
          )}
          {' '}{floorConfig.floorCount} étages configurés.
        </p>
      </div>
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-left max-w-sm mx-auto space-y-2">
        <div className="text-[10px] font-medium text-purple-400 mb-2">Actions suggérées</div>
        {floorConfig.volumes.includes('vol2') && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Lancer le placement automatique des caméras
          </div>
        )}
        {floorConfig.volumes.includes('vol1') && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Configurer le mix enseigne du RDC
          </div>
        )}
        {floorConfig.volumes.includes('vol3') && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Générer le plan de signalétique automatique
          </div>
        )}
      </div>
    </div>
  )

  const STEPS = [
    { icon: MapPin, label: 'Identité', render: renderStep0 },
    { icon: Upload, label: 'Plan', render: renderStep1 },
    { icon: Layers, label: 'Configuration', render: renderStep2 },
    { icon: Sparkles, label: 'Proph3t', render: renderStep3 },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#080c14' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[22px] font-bold text-white">Atlas Mall Suite</h1>
          <p className="text-[12px] text-slate-500 mt-1">Configuration de votre projet</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            return (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-purple-500 text-white'
                        : isActive
                        ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                        : 'bg-white/5 text-slate-600'
                    }`}
                  >
                    {isDone ? <Check size={13} /> : <Icon size={13} />}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-purple-400' : 'text-slate-600'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${i < step ? 'bg-purple-500/50' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Step content */}
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 mb-6 min-h-[320px]">
          {STEPS[step].render()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div>
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={14} />
                Retour
              </button>
            ) : onSkip ? (
              <button
                onClick={onSkip}
                className="px-4 py-2 text-[12px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                Passer
              </button>
            ) : null}
          </div>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-medium transition-colors"
          >
            {step === 3 ? 'C\'est parti' : 'Suivant'}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
