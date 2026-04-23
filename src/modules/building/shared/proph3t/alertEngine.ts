// ═══ PROPH3T — Moteur d'Alertes ═══

import type { Zone, Camera, Door } from './types'
import type { Incident, FrequentationPrediction } from './predictiveEngine'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertType =
  | 'camera_offline' | 'coverage_drop' | 'incident_sla_breach'
  | 'blind_spot_critical' | 'evacuation_capacity' | 'maintenance_due'
  | 'staffing_deficit' | 'compliance_expiry'
  | 'saturation_predicted' | 'nps_drop' | 'action_overdue'
  | 'touchpoint_offline' | 'feedback_spike' | 'opening_risk'
  | 'cosmos_club_churn'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  entity_id?: string
  entity_type?: string
  volume: 'vol2' | 'vol3' | 'both'
  created_at: string
  acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  action_required?: string
  auto_resolved?: boolean
  resolved_at?: string
}

export interface PlanAction {
  id: string
  code: string
  titre: string
  description?: string
  phase?: string
  priorite?: string
  date_cible?: string
  date_debut?: string
  date_fin_reelle?: string
  avancement: number
  statut: 'a_faire' | 'en_cours' | 'termine' | 'en_retard'
  responsables: string[]
  depends_on: string[]
}

export interface CameraWithStatus extends Camera {
  status?: 'online' | 'offline'
  offline_since?: string
}

export interface AlertEngineState {
  cameras: CameraWithStatus[]
  zones: Zone[]
  doors: Door[]
  incidents: Incident[]
  planActions: PlanAction[]
  predictions: FrequentationPrediction[]
  coveragePercent: number
  npsScore: number
  cosmosClubChurnRate: number
}

function uid(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatDuration(since: string): string {
  const diff = Date.now() - new Date(since).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}j`
}

interface AlertRule {
  id: AlertType
  check: (state: AlertEngineState) => unknown[]
  severity: AlertSeverity
  volume: 'vol2' | 'vol3' | 'both'
  title: (entities: unknown[]) => string
  message: (entities: unknown[]) => string
  action?: string
}

const RULES: AlertRule[] = [
  {
    id: 'camera_offline', severity: 'critical', volume: 'vol2',
    check: (s) => s.cameras.filter(c => c.status === 'offline' && c.offline_since && Date.now() - new Date(c.offline_since).getTime() > 5 * 60_000),
    title: (e) => `${e.length} caméra(s) hors ligne`,
    message: (e) => (e as CameraWithStatus[]).map(c => `${c.label} — hors ligne depuis ${formatDuration(c.offline_since!)}`).join('\n'),
    action: 'Vérifier la connectivité réseau. Contacter la maintenance si > 15 min.',
  },
  {
    id: 'coverage_drop', severity: 'warning', volume: 'vol2',
    check: (s) => s.coveragePercent < 80 ? [{ coverage: s.coveragePercent }] : [],
    title: () => 'Couverture vidéo dégradée',
    message: (e) => `Couverture actuelle : ${(e[0] as { coverage: number })?.coverage}% (seuil : 80%)`,
    action: 'Identifier les zones non couvertes.',
  },
  {
    id: 'incident_sla_breach', severity: 'critical', volume: 'vol2',
    check: (s) => s.incidents.filter(i => i.statut === 'ouvert' && Date.now() - new Date(i.created_at).getTime() > 3 * 60_000),
    title: () => 'SLA intervention dépassé',
    message: (e) => `${e.length} incident(s) ouverts sans intervention depuis > 3 minutes`,
    action: 'Alerter le chef de poste immédiatement.',
  },
  {
    id: 'saturation_predicted', severity: 'warning', volume: 'vol3',
    check: (s) => s.predictions.filter(p => p.saturation_risk),
    title: (e) => `Saturation prévue — ${(e[0] as FrequentationPrediction)?.zone_label ?? 'zone'}`,
    message: (e) => `${(e[0] as FrequentationPrediction)?.zone_label} : ${(e[0] as FrequentationPrediction)?.predicted_visitors} visiteurs prévus`,
    action: 'Ouvrir voie de circulation alternative.',
  },
  {
    id: 'action_overdue', severity: 'warning', volume: 'vol3',
    check: (s) => s.planActions.filter(a => a.statut !== 'termine' && a.date_cible && new Date(a.date_cible) < new Date()),
    title: (e) => `${e.length} action(s) plan en retard`,
    message: (e) => (e as PlanAction[]).map(a => `${a.code} — ${a.titre}`).join('\n'),
    action: 'Revoir le planning. Impact sur ouverture 16 octobre.',
  },
  {
    id: 'nps_drop', severity: 'warning', volume: 'vol3',
    check: (s) => s.npsScore < 40 ? [{ nps: s.npsScore }] : [],
    title: () => 'NPS en dessous du seuil',
    message: (e) => `NPS actuel : ${(e[0] as { nps: number })?.nps} (seuil : 40)`,
    action: 'Analyser les réclamations récentes.',
  },
  {
    id: 'opening_risk', severity: 'critical', volume: 'vol3',
    check: (s) => {
      const now = new Date()
      const critical = s.planActions.filter(a => a.statut !== 'termine' && a.priorite === 'haute' && a.date_cible && new Date(a.date_cible) < now)
      return critical.length >= 3 && now < new Date('2026-10-16') ? [{ count: critical.length }] : []
    },
    title: () => 'RISQUE OUVERTURE 16 OCTOBRE',
    message: (e) => `${(e[0] as { count: number })?.count} actions critiques en retard.`,
    action: 'Réunion de crise. Revoir le chemin critique.',
  },
  {
    id: 'cosmos_club_churn', severity: 'warning', volume: 'vol3',
    check: (s) => s.cosmosClubChurnRate > 0.15 ? [{ churn: s.cosmosClubChurnRate }] : [],
    title: () => 'Taux de churn Cosmos Club élevé',
    message: (e) => `Taux : ${Math.round((e[0] as { churn: number })?.churn * 100)}% (seuil : 15%)`,
    action: 'Activer les campagnes de rétention.',
  },
]

export class AlertEngine {
  private activeAlerts: Map<string, Alert> = new Map()

  evaluate(state: AlertEngineState): Alert[] {
    const newAlerts: Alert[] = []
    for (const rule of RULES) {
      const entities = rule.check(state)
      if (entities.length === 0) continue
      const existing = Array.from(this.activeAlerts.values()).find(a => a.type === rule.id && !a.acknowledged && !a.auto_resolved)
      if (existing) continue
      const alert: Alert = {
        id: uid(), type: rule.id, severity: rule.severity, title: rule.title(entities),
        message: rule.message(entities), volume: rule.volume, created_at: new Date().toISOString(),
        acknowledged: false, action_required: rule.action,
      }
      this.activeAlerts.set(alert.id, alert)
      newAlerts.push(alert)
    }
    return newAlerts
  }

  acknowledge(alertId: string, userId?: string): void {
    const a = this.activeAlerts.get(alertId)
    if (a) { a.acknowledged = true; a.acknowledged_by = userId; a.acknowledged_at = new Date().toISOString() }
  }

  resolve(alertId: string): void {
    const a = this.activeAlerts.get(alertId)
    if (a) { a.auto_resolved = true; a.resolved_at = new Date().toISOString() }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => !a.auto_resolved)
  }

  getAlertsByVolume(volume: 'vol2' | 'vol3'): Alert[] {
    return this.getActiveAlerts().filter(a => a.volume === volume || a.volume === 'both')
  }

  getCriticalCount(): number {
    return this.getActiveAlerts().filter(a => a.severity === 'critical' && !a.acknowledged).length
  }
}

export const alertEngine = new AlertEngine()
