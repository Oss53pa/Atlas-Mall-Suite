// ═══ AI REPORT EDITOR — Générateur & éditeur de commentaire IA Proph3t ═══
//
// UI pour paramétrer + générer + réviser le commentaire avant envoi :
//   • Paramètres : audience, ton, longueur, langue, nom du destinataire
//   • Aperçu formaté (HTML préparé)
//   • Édition inline de chaque section (textarea)
//   • Régénération partielle (une section) ou globale (tout)
//   • Export texte brut (copier-coller email)
//
// Utilisé à l'étape "prévisualiser avant envoi" du flow de partage de rapport.

import React, { useCallback, useEffect, useState } from 'react'
import {
  Sparkles, Send, Wand2, Loader2, Copy, Check, User, Languages, Clock,
  Ruler, ChevronDown, Edit3,
} from 'lucide-react'
import {
  generateReportCommentary, commentaryToPlainText, commentaryToHtml,
  type ReportCommentaryInput, type ReportCommentaryOptions, type ReportCommentary,
  type ReportAudience, type ReportTone, type ReportLength, type ReportLang,
  type ReportSection,
} from '../engines/reportCommentaryEngine'

interface Props {
  /** Données source (plan + version précédente + findings). */
  input: ReportCommentaryInput
  /** Callback quand l'utilisateur valide le commentaire final (envoi). */
  onValidated: (finalCommentary: ReportCommentary) => void
  /** Fermeture de l'éditeur sans envoi. */
  onCancel?: () => void
}

const AUDIENCE_META: Record<ReportAudience, { label: string; emoji: string; hint: string }> = {
  director:  { label: 'Directeur général', emoji: '👔', hint: 'ROI, décision, gain compétitif' },
  investor:  { label: 'Investisseur',      emoji: '💼', hint: 'Rentabilité, TRI, exit' },
  operator:  { label: 'Exploitant',        emoji: '🔧', hint: 'Opérationnel, flux, CAPEX' },
  architect: { label: 'Architecte',        emoji: '📐', hint: 'Technique, normes, PMR' },
  tenant:    { label: 'Preneur',           emoji: '🏪', hint: 'Exposition, flux, visibilité' },
  authority: { label: 'Autorité',          emoji: '🏛️', hint: 'Conformité, normes' },
}

const TONE_META: Record<ReportTone, string> = {
  neutral:        'Neutre',
  formal:         'Formel',
  conversational: 'Cordial',
  enthusiastic:   'Enthousiaste',
}

const LENGTH_META: Record<ReportLength, string> = {
  concise:  'Concis',
  standard: 'Standard',
  detailed: 'Détaillé',
}

const LANG_META: Record<ReportLang, string> = {
  fr: 'Français',
  en: 'English',
  dioula: 'Dioula',
}

export default function AIReportEditor({ input, onValidated, onCancel }: Props) {
  const [audience, setAudience]     = useState<ReportAudience>('director')
  const [tone, setTone]             = useState<ReportTone>('formal')
  const [length, setLength]         = useState<ReportLength>('standard')
  const [lang, setLang]             = useState<ReportLang>('fr')
  const [recipient, setRecipient]   = useState<string>('')
  const [useLlm, setUseLlm]         = useState<boolean>(true)

  const [commentary, setCommentary] = useState<ReportCommentary | null>(null)
  const [generating, setGenerating] = useState<boolean>(false)
  const [copied, setCopied]         = useState<boolean>(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)

  const buildOptions = useCallback((): ReportCommentaryOptions => ({
    audience, tone, length, lang,
    recipientName: recipient.trim() || undefined,
    skipLlm: !useLlm,
  }), [audience, tone, length, lang, recipient, useLlm])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      const c = await generateReportCommentary(input, buildOptions())
      setCommentary(c)
    } finally {
      setGenerating(false)
    }
  }, [input, buildOptions])

  // Génération initiale
  useEffect(() => { void handleGenerate() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const handleSectionEdit = (sectionId: string, newBody: string) => {
    if (!commentary) return
    setCommentary({
      ...commentary,
      sections: commentary.sections.map(s =>
        s.id === sectionId ? { ...s, body: newBody, userEdited: true } : s
      ),
    })
  }

  const handleRecommendationsEdit = (newRecs: string[]) => {
    if (!commentary) return
    setCommentary({ ...commentary, recommendations: newRecs })
  }

  const handleRegenerateSection = async (sectionId: string) => {
    // Régénération : pour simplifier, on régénère tout et on ne garde que la section demandée
    setGenerating(true)
    try {
      const fresh = await generateReportCommentary(input, buildOptions())
      if (!commentary) { setCommentary(fresh); return }
      setCommentary({
        ...commentary,
        sections: commentary.sections.map(s => {
          if (s.id !== sectionId) return s
          const freshSection = fresh.sections.find(fs => fs.id === sectionId)
          return freshSection ? { ...freshSection, userEdited: false } : s
        }),
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyPlain = () => {
    if (!commentary) return
    const text = commentaryToPlainText(commentary)
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleValidate = () => {
    if (commentary) onValidated(commentary)
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">

      {/* ─── Barre de paramètres ─── */}
      <div className="border-b border-white/[0.06] bg-slate-900/40 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          <span className="text-[12px] font-semibold text-purple-300 uppercase tracking-wider">Proph3t · Rédacteur IA</span>
        </div>

        <div className="h-5 w-px bg-white/[0.08]" />

        {/* Audience */}
        <Select
          icon={<User size={11} />}
          label="Audience"
          value={audience}
          options={Object.entries(AUDIENCE_META).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}`, title: v.hint }))}
          onChange={v => setAudience(v as ReportAudience)}
        />

        {/* Tone */}
        <Select
          icon={<Edit3 size={11} />}
          label="Ton"
          value={tone}
          options={Object.entries(TONE_META).map(([k, v]) => ({ value: k, label: v }))}
          onChange={v => setTone(v as ReportTone)}
        />

        {/* Length */}
        <Select
          icon={<Ruler size={11} />}
          label="Longueur"
          value={length}
          options={Object.entries(LENGTH_META).map(([k, v]) => ({ value: k, label: v }))}
          onChange={v => setLength(v as ReportLength)}
        />

        {/* Lang */}
        <Select
          icon={<Languages size={11} />}
          label="Langue"
          value={lang}
          options={Object.entries(LANG_META).map(([k, v]) => ({ value: k, label: v }))}
          onChange={v => setLang(v as ReportLang)}
        />

        <input
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder="Nom du destinataire (optionnel)"
          className="px-3 py-1 rounded-lg bg-slate-950/60 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600 w-56"
        />

        <label className="flex items-center gap-1.5 text-[11px] text-slate-400 select-none cursor-pointer">
          <input type="checkbox" checked={useLlm} onChange={e => setUseLlm(e.target.checked)}
            className="accent-purple-500" />
          LLM (Ollama)
        </label>

        <div className="flex-1" />

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] hover:bg-purple-500/25 disabled:opacity-40"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          Régénérer tout
        </button>
      </div>

      {/* ─── Aperçu / édition ─── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!commentary ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <Loader2 size={24} className="animate-spin mr-2" />
            Génération initiale…
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <h1 className="text-white text-xl font-semibold mb-1">{commentary.title}</h1>
            <p className="text-[11px] text-slate-500 mb-5 flex items-center gap-2">
              <Clock size={11} />
              Généré {new Date(commentary.meta.generatedAt).toLocaleString('fr-FR')}
              <span>·</span>
              <span>{commentary.meta.llmUsed ? 'LLM Ollama' : 'Algorithmique pur'}</span>
            </p>

            {/* Greeting */}
            <div className="mb-4">
              <p className="text-[13px] text-slate-100 font-medium">{commentary.greeting}</p>
            </div>

            {/* Introduction */}
            <p className="text-[13px] text-slate-300 leading-relaxed mb-6">
              {commentary.introduction}
            </p>

            {/* Sections */}
            {commentary.sections.map(s => (
              <SectionView
                key={s.id}
                section={s}
                editing={editingSectionId === s.id}
                onEdit={body => handleSectionEdit(s.id, body)}
                onStartEdit={() => setEditingSectionId(s.id)}
                onStopEdit={() => setEditingSectionId(null)}
                onRegenerate={() => handleRegenerateSection(s.id)}
                regenerating={generating}
              />
            ))}

            {/* Recommendations */}
            {commentary.recommendations.length > 0 && (
              <RecommendationsBlock
                recs={commentary.recommendations}
                onChange={handleRecommendationsEdit}
              />
            )}

            {/* Closing */}
            <div className="mt-6 pt-4 border-t border-white/[0.05]">
              <p className="text-[13px] text-slate-300 italic">{commentary.closing}</p>
              <p className="text-[11px] text-slate-500 mt-2">{commentary.signature}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Actions bar ─── */}
      <div className="border-t border-white/[0.06] p-4 flex items-center justify-between bg-slate-900/60">
        {onCancel && (
          <button onClick={onCancel} className="text-[12px] text-slate-500 hover:text-slate-300">
            Annuler
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleCopyPlain}
            disabled={!commentary}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-white/[0.06] text-[11px] text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copié !' : 'Copier (texte)'}
          </button>

          <button
            onClick={handleValidate}
            disabled={!commentary}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[12px] font-medium hover:bg-emerald-500/30 disabled:opacity-40"
          >
            <Send size={12} />
            Valider le commentaire
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section view/edit ────────────────────────────────────

function SectionView({
  section, editing, onEdit, onStartEdit, onStopEdit, onRegenerate, regenerating,
}: {
  section: ReportSection
  editing: boolean
  onEdit: (body: string) => void
  onStartEdit: () => void
  onStopEdit: () => void
  onRegenerate: () => void
  regenerating: boolean
}) {
  return (
    <div className="mb-5 rounded-lg border border-white/[0.05] bg-slate-900/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <h3 className="text-[12px] font-semibold text-slate-100">{section.heading}</h3>
          {section.aiGenerated && (
            <span className="text-[9px] font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">IA</span>
          )}
          {section.userEdited && (
            <span className="text-[9px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">édité</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={editing ? onStopEdit : onStartEdit}
            className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-slate-200"
            title={editing ? 'Terminer l\'édition' : 'Éditer'}>
            {editing ? <Check size={12} /> : <Edit3 size={12} />}
          </button>
          <button onClick={onRegenerate} disabled={regenerating}
            className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-purple-300 disabled:opacity-40"
            title="Régénérer cette section">
            {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          </button>
        </div>
      </div>
      <div className="p-3">
        {editing ? (
          <textarea
            value={section.body}
            onChange={e => onEdit(e.target.value)}
            className="w-full min-h-[100px] p-2 rounded bg-slate-950 border border-white/[0.08] text-[12px] text-slate-200 leading-relaxed focus:outline-none focus:border-purple-500/40 resize-y"
          />
        ) : (
          <p className="text-[12px] text-slate-200 leading-relaxed whitespace-pre-line">{section.body}</p>
        )}
      </div>
    </div>
  )
}

// ─── Recommendations block ───────────────────────────────

function RecommendationsBlock({
  recs, onChange,
}: {
  recs: string[]
  onChange: (next: string[]) => void
}) {
  const updateAt = (i: number, v: string) => {
    const next = [...recs]; next[i] = v; onChange(next)
  }
  const removeAt = (i: number) => onChange(recs.filter((_, k) => k !== i))
  const add = () => onChange([...recs, ''])

  return (
    <div className="mb-6 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.04] p-4">
      <h3 className="text-[12px] font-semibold text-indigo-300 mb-3 flex items-center gap-2">
        <Sparkles size={12} />
        Recommandations PROPH3T
      </h3>
      <ul className="space-y-1.5">
        {recs.map((r, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-indigo-400 mt-1">•</span>
            <input
              value={r} onChange={e => updateAt(i, e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-transparent hover:bg-slate-950/50 focus:bg-slate-950/70 border border-transparent hover:border-white/[0.06] text-[12px] text-slate-200 focus:outline-none focus:border-indigo-500/40"
            />
            <button onClick={() => removeAt(i)}
              className="text-slate-600 hover:text-red-400 text-[10px] p-1">✕</button>
          </li>
        ))}
      </ul>
      <button onClick={add}
        className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-200">
        + Ajouter une recommandation
      </button>
    </div>
  )
}

// ─── Select helper ────────────────────────────────────────

function Select<T extends string>({
  icon, label, value, options, onChange,
}: {
  icon: React.ReactNode
  label: string
  value: T
  options: Array<{ value: string; label: string; title?: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500">{icon}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value as T)}
          className="appearance-none pl-2 pr-6 py-1 rounded bg-slate-950 border border-white/[0.08] text-[11px] text-slate-200 focus:outline-none focus:border-purple-500/40"
        >
          {options.map(o => (
            <option key={o.value} value={o.value} title={o.title}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    </div>
  )
}

// Re-export pour faciliter l'usage depuis l'extérieur
export { commentaryToHtml, commentaryToPlainText } from '../engines/reportCommentaryEngine'
