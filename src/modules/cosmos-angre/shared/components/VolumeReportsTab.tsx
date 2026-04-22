// ═══ VOLUME REPORTS TAB — Orchestrateur IA → HTML → Partage ═══
//
// Flow en 3 étapes :
//   1. Composer le commentaire IA (AIReportEditor) → paramètres + révision
//   2. Générer le rapport HTML autonome (reportHtmlExporter)
//   3. Partager (ReportShareManager) → suivi en temps réel
//
// L'utilisateur peut basculer entre les étapes via un stepper.

import React, { useCallback, useMemo, useState } from 'react'
import {
  FileText, Send, Sparkles, Eye, Download, ArrowRight, Check,
} from 'lucide-react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import AIReportEditor from './AIReportEditor'
import ReportShareManager from './ReportShareManager'
import {
  buildReportHtml, downloadReportHtml,
  type ReportHtmlInput,
} from '../engines/reportHtmlExporter'
import type { ReportCommentary, ReportCommentaryInput } from '../engines/reportCommentaryEngine'
import type { GodModeResult } from '../engines/godModeSignageEngine'

interface Props {
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  volumeName: string
  volumeColor?: string
  projectName: string
  /** Chiffres clés à injecter dans le rapport. */
  keyFigures?: ReportHtmlInput['keyFigures']
  /** Alertes / findings déjà détectés par le volume. */
  findings?: ReportCommentaryInput['knownFindings']
  /** Plan de signalétique GOD MODE (Vol.3). */
  signagePlan?: GodModeResult
  /** Benchmarks sectoriels pour Proph3t. */
  sectorBenchmarks?: Record<string, number | string>
}

type Step = 'commentary' | 'preview' | 'share'

export default function VolumeReportsTab({
  volumeId, volumeName, volumeColor = '#c9a068', projectName,
  keyFigures, findings, signagePlan, sectorBenchmarks,
}: Props) {
  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)

  const [step, setStep] = useState<Step>('commentary')
  const [commentary, setCommentary] = useState<ReportCommentary | null>(null)
  const [html, setHtml] = useState<string | null>(null)

  // Input pour l'éditeur IA
  const commentaryInput = useMemo<ReportCommentaryInput>(() => ({
    volumeName,
    volumeId,
    projectName,
    currentPlan: parsedPlan,
    keyFigures: keyFigures?.reduce<Record<string, string | number>>((acc, k) => {
      acc[k.label] = k.value
      return acc
    }, {}),
    knownFindings: findings ?? [],
    sectorBenchmarks,
  }), [volumeName, volumeId, projectName, parsedPlan, keyFigures, findings, sectorBenchmarks])

  const handleCommentaryValidated = useCallback((c: ReportCommentary) => {
    setCommentary(c)
    // Génère aussitôt le HTML
    if (parsedPlan) {
      const generated = buildReportHtml({
        projectName,
        volumeName,
        volumeId,
        plan: parsedPlan,
        commentary: c,
        signagePlan,
        keyFigures,
        reportToken: `rpt_${Date.now()}_${volumeId}`,
      })
      setHtml(generated)
    }
    setStep('preview')
  }, [parsedPlan, projectName, volumeName, volumeId, signagePlan, keyFigures])

  const handleDownload = () => {
    if (!html) return
    downloadReportHtml(html, `${volumeId}-rapport-${Date.now()}.html`)
  }

  const handleSkipCommentary = () => {
    if (!parsedPlan) return
    const generated = buildReportHtml({
      projectName,
      volumeName,
      volumeId,
      plan: parsedPlan,
      signagePlan,
      keyFigures,
      reportToken: `rpt_${Date.now()}_${volumeId}`,
    })
    setHtml(generated)
    setStep('preview')
  }

  if (!parsedPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <FileText size={48} className="text-slate-600 mb-4" />
        <h3 className="text-slate-200 font-semibold mb-1">Aucun plan chargé</h3>
        <p className="text-slate-500 text-sm max-w-md">
          Importez ou chargez un plan pour générer un rapport.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-0 text-slate-200">

      {/* Stepper */}
      <div className="border-b border-white/[0.06] px-5 py-3 bg-surface-1/30">
        <div className="flex items-center gap-2">
          <StepPill
            num={1}
            label="Commentaire IA"
            icon={<Sparkles size={11} />}
            active={step === 'commentary'}
            done={commentary !== null && step !== 'commentary'}
            onClick={() => setStep('commentary')}
            color={volumeColor}
          />
          <ArrowRight size={12} className="text-slate-600" />
          <StepPill
            num={2}
            label="Aperçu & export"
            icon={<Eye size={11} />}
            active={step === 'preview'}
            done={html !== null && step === 'share'}
            disabled={!html}
            onClick={() => html && setStep('preview')}
            color={volumeColor}
          />
          <ArrowRight size={12} className="text-slate-600" />
          <StepPill
            num={3}
            label="Partage & suivi"
            icon={<Send size={11} />}
            active={step === 'share'}
            done={false}
            disabled={!html}
            onClick={() => html && setStep('share')}
            color={volumeColor}
          />

          <div className="flex-1" />

          {step === 'commentary' && (
            <button onClick={handleSkipCommentary}
              className="text-[11px] text-slate-500 hover:text-slate-300">
              Ignorer → rapport sans commentaire
            </button>
          )}
        </div>
      </div>

      {/* Content by step */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {step === 'commentary' && (
          <AIReportEditor
            input={commentaryInput}
            onValidated={handleCommentaryValidated}
            onCancel={() => setStep('preview')}
          />
        )}

        {step === 'preview' && html && (
          <div className="h-full flex flex-col">
            <div className="border-b border-white/[0.06] p-3 flex items-center gap-2 bg-surface-1/30">
              <span className="text-[12px] text-slate-400">
                <strong className="text-slate-200">Aperçu du rapport HTML autonome</strong> — 2D interactif + annotations + boutons Valider/Corriger/Commenter
              </span>
              <div className="flex-1" />
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/[0.06] text-[11px] text-slate-300 hover:bg-slate-700">
                <Download size={11} />
                Télécharger (.html)
              </button>
              <button onClick={() => setStep('share')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={{ background: `${volumeColor}18`, border: `1px solid ${volumeColor}40`, color: volumeColor }}>
                <Send size={11} />
                Passer au partage
              </button>
            </div>
            <iframe
              srcDoc={html}
              title="Aperçu rapport"
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts"
            />
          </div>
        )}

        {step === 'share' && (
          <ReportShareManager
            volumeId={volumeId}
            defaultTitle={`Rapport ${volumeName} — ${projectName}`}
            reportHtml={html}
            onComposeReport={() => setStep('commentary')}
            volumeColor={volumeColor}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step pill ────────────────────────────────────────────

function StepPill({
  num, label, icon, active, done, disabled, onClick, color,
}: {
  num: number
  label: string
  icon: React.ReactNode
  active: boolean
  done: boolean
  disabled?: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition ${
        active
          ? 'text-white'
          : done
          ? 'text-emerald-300'
          : disabled
          ? 'text-slate-600 cursor-not-allowed'
          : 'text-slate-400 hover:text-white'
      }`}
      style={active ? { background: `${color}20`, border: `1px solid ${color}50` } : {}}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
        done ? 'bg-emerald-500/20 text-emerald-300'
        : active ? 'text-white'
        : 'bg-slate-800 text-slate-500'
      }`} style={active ? { background: `${color}40` } : {}}>
        {done ? <Check size={10} /> : num}
      </span>
      {icon}
      {label}
    </button>
  )
}
