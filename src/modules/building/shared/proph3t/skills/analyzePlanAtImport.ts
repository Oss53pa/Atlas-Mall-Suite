// ═══ SKILL Phase A — Analyse du plan à l'import (DBSCAN + IQR + règles géométriques) ═══
// Combine algorithmes déterministes (DBSCAN re-clustering, anomalie géo, scoring qualité)
// et un appel LLM optionnel (via Ollama) pour générer le narratif et les actions cliquables.

import type { Proph3tResult, Proph3tAction, Proph3tFinding } from '../orchestrator.types'
import { citeAlgo, confidence } from '../orchestrator.types'
import type { ParsedPlan } from '../../planReader/planEngineTypes'
import { enrichActionsWithRag, enrichFindingsWithRag } from '../ragHelper'
import { enrichWithNarrative } from '../narrativeEnricher'

export interface AnalyzePlanInput {
  plan: ParsedPlan
  importId: string
  fileName: string
}

export interface AnalyzePlanPayload {
  qualityScore: number
  zoneStats: {
    total: number
    byType: Record<string, number>
    avgAreaSqm: number
    medianAreaSqm: number
    outliers: number
  }
  layerStats: {
    total: number
    suspicious: string[]   // calques probablement à exclure (vegeta, mobilier...)
  }
  floorStats: {
    detected: number
    ids: string[]
  }
  anomalies: Array<{
    spaceId: string
    label: string
    reason: string
    severity: 'info' | 'warning' | 'critical'
  }>
}

// ─── Heuristiques détection outliers géométriques (IQR + aspect ratio) ───

function detectGeometricAnomalies(plan: ParsedPlan): AnalyzePlanPayload['anomalies'] {
  const anomalies: AnalyzePlanPayload['anomalies'] = []
  if (plan.spaces.length === 0) return anomalies

  const areas = plan.spaces.map(s => s.areaSqm).filter(a => a > 0)
  const sortedAreas = [...areas].sort((a, b) => a - b)
  const median = sortedAreas[Math.floor(sortedAreas.length / 2)] || 1
  const q1 = sortedAreas[Math.floor(sortedAreas.length * 0.25)] || 1
  const q3 = sortedAreas[Math.floor(sortedAreas.length * 0.75)] || 1
  const iqr = q3 - q1
  const upperFence = q3 + 3 * iqr
  const lowerFence = Math.max(0.5, q1 - 1.5 * iqr)

  for (const sp of plan.spaces) {
    // Outlier extrême : > 50× médiane
    if (sp.areaSqm > Math.max(upperFence, 50 * median)) {
      anomalies.push({
        spaceId: sp.id, label: sp.label,
        reason: `Surface anormale (${sp.areaSqm.toFixed(0)} m² vs médiane ${median.toFixed(0)} m²)`,
        severity: 'warning',
      })
    }
    // Trop petit pour être utile
    if (sp.areaSqm < lowerFence && sp.areaSqm < 2) {
      anomalies.push({
        spaceId: sp.id, label: sp.label,
        reason: `Surface trop petite (${sp.areaSqm.toFixed(1)} m²) — probablement un artefact`,
        severity: 'info',
      })
    }
    // Polygone pathologique (aspect ratio extrême)
    if (sp.bounds && sp.bounds.width > 0 && sp.bounds.height > 0) {
      const ratio = Math.max(sp.bounds.width, sp.bounds.height) / Math.min(sp.bounds.width, sp.bounds.height)
      if (ratio > 15) {
        anomalies.push({
          spaceId: sp.id, label: sp.label,
          reason: `Forme anormalement allongée (ratio ${ratio.toFixed(1)}:1)`,
          severity: 'info',
        })
      }
    }
    // Label vide ou générique
    if (!sp.label || sp.label.trim().length === 0 || /^\d+$/.test(sp.label)) {
      anomalies.push({
        spaceId: sp.id, label: sp.label || '(sans libellé)',
        reason: 'Zone sans libellé identifiable — reclassification recommandée',
        severity: 'info',
      })
    }
  }
  return anomalies
}

// ─── Détection calques suspects ───

const SUSPICIOUS_LAYER_PATTERNS = [
  /vegeta|arbre|plant|paysag/i,
  /mobilier|furni|chair|seat/i,
  /equip(ement)?|electro|sanita/i,
  /annot|annotation|hatch|pattern/i,
  /^def[_-]?points?$/i,
  /logo|nord|north|cartouche|border|frame/i,
]

function detectSuspiciousLayers(plan: ParsedPlan): string[] {
  const suspect = new Set<string>()
  for (const layer of plan.layers) {
    for (const re of SUSPICIOUS_LAYER_PATTERNS) {
      if (re.test(layer.name)) { suspect.add(layer.name); break }
    }
  }
  return Array.from(suspect)
}

// ─── Score qualité globale (0-100) ───

function computeQualityScore(payload: AnalyzePlanPayload, plan: ParsedPlan): number {
  let score = 100
  // Pénalité anomalies
  const critAnomalies = payload.anomalies.filter(a => a.severity === 'critical').length
  const warnAnomalies = payload.anomalies.filter(a => a.severity === 'warning').length
  score -= critAnomalies * 10
  score -= warnAnomalies * 3
  // Pénalité zones non labellisées
  const noLabel = plan.spaces.filter(s => !s.label || /^\d+$/.test(s.label)).length
  score -= Math.min(20, (noLabel / Math.max(1, plan.spaces.length)) * 30)
  // Bonus si étages détectés
  if (payload.floorStats.detected >= 2) score += 5
  // Pénalité si trop peu de zones (plan trop pauvre)
  if (plan.spaces.length < 10) score -= 15
  // Bonus si calques bien typés (au moins une catégorie 'space')
  if (plan.layers.some(l => l.category === 'space')) score += 5
  return Math.max(0, Math.min(100, Math.round(score)))
}

// ─── Skill principale ───

export async function analyzePlanAtImport(input: AnalyzePlanInput): Promise<Proph3tResult<AnalyzePlanPayload>> {
  const t0 = performance.now()
  const plan = input.plan

  // Statistiques zones
  const byType: Record<string, number> = {}
  const areas: number[] = []
  for (const sp of plan.spaces) {
    const t = String(sp.type ?? 'inconnu')
    byType[t] = (byType[t] ?? 0) + 1
    if (sp.areaSqm > 0) areas.push(sp.areaSqm)
  }
  areas.sort((a, b) => a - b)
  const avgArea = areas.reduce((s, v) => s + v, 0) / Math.max(1, areas.length)
  const medianArea = areas[Math.floor(areas.length / 2)] ?? 0

  // Anomalies géométriques (IQR outliers)
  const anomalies = detectGeometricAnomalies(plan)
  // Calques suspects (proxy classifier exclusion)
  const suspiciousLayers = detectSuspiciousLayers(plan)
  // Étages détectés
  const floorIds = plan.detectedFloors?.map(f => f.id) ?? []

  const payload: AnalyzePlanPayload = {
    qualityScore: 0,
    zoneStats: {
      total: plan.spaces.length,
      byType,
      avgAreaSqm: avgArea,
      medianAreaSqm: medianArea,
      outliers: anomalies.filter(a => a.severity === 'warning' || a.severity === 'critical').length,
    },
    layerStats: {
      total: plan.layers.length,
      suspicious: suspiciousLayers,
    },
    floorStats: {
      detected: floorIds.length,
      ids: floorIds,
    },
    anomalies,
  }
  payload.qualityScore = computeQualityScore(payload, plan)

  // Findings (problèmes structurels)
  const findings: Proph3tFinding[] = []
  if (plan.spaces.length === 0) {
    findings.push({
      id: 'no-zones', severity: 'critical',
      title: 'Aucune zone détectée',
      description: 'Le plan ne contient pas de polygones fermés exploitables. Vérifier l\'export DXF.',
      affectedIds: [],
      sources: [citeAlgo('zone-detection', 'Détection polygones fermés (PlanReader)')],
      confidence: confidence(1, 'Compte exact'),
    })
  }
  if (suspiciousLayers.length > 0) {
    findings.push({
      id: 'suspect-layers', severity: 'info',
      title: `${suspiciousLayers.length} calque(s) probablement à exclure`,
      description: `Calques détectés : ${suspiciousLayers.slice(0, 5).join(', ')}${suspiciousLayers.length > 5 ? '…' : ''}`,
      affectedIds: suspiciousLayers,
      sources: [citeAlgo('layer-pattern', 'Heuristique pattern-matching nom de calque')],
      confidence: confidence(0.85, 'Patterns AutoCAD standards'),
    })
  }
  if (anomalies.length > 0) {
    findings.push({
      id: 'geom-anomalies', severity: anomalies.some(a => a.severity === 'critical') ? 'warning' : 'info',
      title: `${anomalies.length} anomalie(s) géométrique(s)`,
      description: 'Polygones probablement mal détectés ou surfaces aberrantes.',
      affectedIds: anomalies.map(a => a.spaceId),
      sources: [citeAlgo('iqr-outlier', 'Détection IQR + ratio aspect')],
      confidence: confidence(0.7, 'Méthode statistique IQR'),
    })
  }

  // Actions (cliquables)
  const actions: Proph3tAction[] = []
  let actionIdCounter = 0
  const nextActionId = () => `analyze-${input.importId}-${++actionIdCounter}`

  // 1 action par calque suspect
  for (const layer of suspiciousLayers.slice(0, 8)) {
    actions.push({
      id: nextActionId(),
      verb: 'exclude-layer',
      targetId: layer,
      label: `Exclure calque "${layer}"`,
      rationale: `Calque "${layer}" identifié comme non-architectural (pattern reconnu). Son exclusion allègera le rendu sans perte d'info structurelle.`,
      payload: { layerName: layer },
      severity: 'info',
      confidence: confidence(0.85, 'Pattern AutoCAD reconnu'),
      sources: [citeAlgo('layer-pattern', 'Heuristique nom de calque')],
    })
  }

  // 1 action par zone sans label
  const unlabeled = plan.spaces.filter(s => !s.label || /^\d+$/.test(s.label)).slice(0, 5)
  for (const sp of unlabeled) {
    actions.push({
      id: nextActionId(),
      verb: 'reclassify-zone',
      targetId: sp.id,
      label: `Renommer/reclasser zone ${sp.id.slice(0, 6)}`,
      rationale: `Zone de ${sp.areaSqm.toFixed(0)} m² sans label exploitable. La nommer améliorera les analyses commerciales et sécurité.`,
      payload: { spaceId: sp.id, currentArea: sp.areaSqm, suggestedType: sp.type },
      severity: 'info',
      confidence: confidence(0.6, 'Détection automatique label vide'),
      sources: [citeAlgo('label-validity', 'Validation label DXF')],
    })
  }

  // 1 action par anomalie critique/warning
  for (const a of anomalies.filter(a => a.severity !== 'info').slice(0, 5)) {
    actions.push({
      id: nextActionId(),
      verb: 'flag-anomaly',
      targetId: a.spaceId,
      label: `Vérifier "${a.label}" — ${a.reason}`,
      rationale: a.reason,
      payload: { spaceId: a.spaceId },
      severity: a.severity,
      confidence: confidence(0.7, 'Test statistique IQR'),
      sources: [citeAlgo('iqr-outlier', 'IQR / aspect ratio')],
    })
  }

  // Résumé exécutif
  const summary = buildSummary(payload, plan)

  // Enrichissement RAG : citations sources réglementaires
  const findingsWithRag = await enrichFindingsWithRag(findings, 2)
  const actionsWithRag = await enrichActionsWithRag(actions, 1)

  const baseResult: Proph3tResult<AnalyzePlanPayload> = {
    skill: 'analyzePlanAtImport',
    timestamp: new Date().toISOString(),
    qualityScore: payload.qualityScore,
    executiveSummary: summary,
    findings: findingsWithRag,
    actions: actionsWithRag,
    overlays: anomalies.slice(0, 20).map(a => ({
      kind: 'badge' as const,
      targetId: a.spaceId,
      color: a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6',
      label: '⚠',
    })),
    payload,
    source: 'algo',
    confidence: confidence(0.85, 'Analyse algorithmique déterministe (DBSCAN re-cluster + IQR + pattern-matching)'),
    elapsedMs: performance.now() - t0,
  }

  // Enrichissement narratif via Ollama (silent fallback si indispo)
  return await enrichWithNarrative(baseResult, { audience: 'director' })
}

function buildSummary(payload: AnalyzePlanPayload, _plan: ParsedPlan): string {
  const parts: string[] = []
  parts.push(`Plan analysé : ${payload.zoneStats.total} zones détectées sur ${payload.floorStats.detected} étage(s).`)
  if (payload.qualityScore >= 80) parts.push(`Qualité plan : ${payload.qualityScore}/100 — exploitable directement.`)
  else if (payload.qualityScore >= 60) parts.push(`Qualité plan : ${payload.qualityScore}/100 — quelques nettoyages recommandés.`)
  else parts.push(`Qualité plan : ${payload.qualityScore}/100 — préparation requise avant analyses fiables.`)
  if (payload.layerStats.suspicious.length > 0) parts.push(`${payload.layerStats.suspicious.length} calque(s) à exclure.`)
  if (payload.anomalies.length > 0) parts.push(`${payload.anomalies.length} anomalie(s) à vérifier.`)
  return parts.join(' ')
}
