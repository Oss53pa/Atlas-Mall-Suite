// ═══ PROPH3T — Matrice des Risques ═══

import type { Zone, Camera, Door } from './types'

export interface ThreatScenario {
  id: string; name: string; category: string
  probability: 1 | 2 | 3 | 4 | 5; impact: 1 | 2 | 3 | 4 | 5; risk_score: number
  affected_zones: string[]; current_controls: string[]; residual_risk: number; recommended_controls: string[]
}

export interface RiskMatrixResult {
  matrix: number[][]; scenarios: ThreatScenario[]; uncovered_risks: ThreatScenario[]
  priority_actions: { scenario_id: string; action: string; priority: number }[]
  overall_risk_level: 'faible' | 'moyen' | 'élevé' | 'critique'
}

export interface ZoneRiskProfile {
  zone_id: string; zone_label: string; applicable_threats: ThreatScenario[]
  residual_risk_avg: number; priority_actions: string[]; risk_level: 'faible' | 'moyen' | 'élevé' | 'critique'
}

export const THREAT_SCENARIOS: ThreatScenario[] = [
  { id: 'th01', name: 'Intrusion nocturne zones techniques', category: 'intrusion', probability: 3, impact: 4, risk_score: 12, affected_zones: ['technique', 'backoffice', 'financier'], current_controls: ['Caméras PTZ', 'Alarme périmétrique'], residual_risk: 6, recommended_controls: ['SAS biométrique', 'Ronde nocturne toutes les 2h', 'Détecteur vibration'] },
  { id: 'th02', name: 'Vol à l\'étalage galeries', category: 'vol', probability: 5, impact: 2, risk_score: 10, affected_zones: ['commerce'], current_controls: ['Caméras dômes', 'Agents de surface'], residual_risk: 4, recommended_controls: ['Analyse vidéo IA', 'Portiques antivol'] },
  { id: 'th03', name: 'Incendie cuisine food court', category: 'incendie', probability: 2, impact: 5, risk_score: 10, affected_zones: ['restauration'], current_controls: ['Sprinklers', 'Détecteurs fumée', 'SSI catégorie A'], residual_risk: 3, recommended_controls: ['Hotte extinction automatique', 'Formation mensuelle FCS'] },
  { id: 'th04', name: 'Mouvement de foule sortie événement', category: 'foule', probability: 3, impact: 4, risk_score: 12, affected_zones: ['circulation', 'sortie_secours'], current_controls: ['Issues secours balisées', 'Agents flux'], residual_risk: 7, recommended_controls: ['Compteurs flux temps réel', 'Protocole > 500 personnes', 'Barrières canalisation'] },
  { id: 'th05', name: 'Agression zone financière', category: 'agression', probability: 2, impact: 5, risk_score: 10, affected_zones: ['financier'], current_controls: ['SAS biométrique', 'Caméras HD'], residual_risk: 4, recommended_controls: ['Bouton alarme silencieux', 'Liaison commissariat', 'Vitrage anti-intrusion'] },
  { id: 'th06', name: 'Panne électrique générale', category: 'technique', probability: 2, impact: 4, risk_score: 8, affected_zones: ['technique', 'commerce', 'restauration', 'circulation'], current_controls: ['Groupe électrogène', 'Onduleur SSI'], residual_risk: 4, recommended_controls: ['Double alimentation', 'Test mensuel groupe'] },
  { id: 'th07', name: 'Pickpocket zones denses', category: 'vol', probability: 4, impact: 1, risk_score: 4, affected_zones: ['commerce', 'restauration', 'circulation'], current_controls: ['Caméras dômes', 'Agents civil'], residual_risk: 2, recommended_controls: ['Signalétique prévention', 'Patrouilles heures pointe'] },
  { id: 'th08', name: 'Agression parking souterrain', category: 'agression', probability: 3, impact: 3, risk_score: 9, affected_zones: ['parking'], current_controls: ['Caméras IP', 'Éclairage renforcé'], residual_risk: 5, recommended_controls: ['Bornes SOS', 'Ronde continue parking', 'Détection IA'] },
  { id: 'th09', name: 'Inondation parking', category: 'technique', probability: 2, impact: 3, risk_score: 6, affected_zones: ['parking'], current_controls: ['Pompes relevage', 'Capteurs niveau'], residual_risk: 3, recommended_controls: ['Seuil anti-inondation', 'Alarme pompage'] },
  { id: 'th10', name: 'Colis suspect', category: 'intrusion', probability: 1, impact: 5, risk_score: 5, affected_zones: ['commerce', 'circulation', 'restauration'], current_controls: ['Formation personnel', 'Protocole alerte'], residual_risk: 3, recommended_controls: ['Détection explosifs', 'Exercice évacuation trimestriel'] },
  { id: 'th11', name: 'Cyberattaque vidéosurveillance', category: 'cyber', probability: 2, impact: 4, risk_score: 8, affected_zones: ['technique'], current_controls: ['VLAN dédié', 'Firewall'], residual_risk: 5, recommended_controls: ['Segmentation OT/IT', 'Audit semestriel', '802.1X'] },
  { id: 'th12', name: 'Malaise visiteur', category: 'technique', probability: 4, impact: 2, risk_score: 8, affected_zones: ['commerce', 'restauration', 'circulation'], current_controls: ['DAE', 'SST formés'], residual_risk: 3, recommended_controls: ['2 DAE/niveau', 'Convention SAMU'] },
  { id: 'th13', name: 'Vandalisme nocturne', category: 'intrusion', probability: 3, impact: 2, risk_score: 6, affected_zones: ['exterieur'], current_controls: ['Caméras périmètre', 'Éclairage dissuasif'], residual_risk: 3, recommended_controls: ['Détection IR', 'Vidéo analytique'] },
  { id: 'th14', name: 'Défaillance SSI', category: 'incendie', probability: 1, impact: 5, risk_score: 5, affected_zones: ['technique', 'commerce', 'restauration'], current_controls: ['Maintenance préventive', 'Contrat IGH'], residual_risk: 2, recommended_controls: ['Double détection croisée', 'Télésurveillance 24/7'] },
  { id: 'th15', name: 'Effondrement partiel', category: 'technique', probability: 1, impact: 5, risk_score: 5, affected_zones: ['commerce', 'circulation', 'parking'], current_controls: ['Conformité parasismique', 'Contrôle technique'], residual_risk: 2, recommended_controls: ['Monitoring vibratoire IoT', 'Inspection annuelle'] },
]

export function calculateRiskMatrix(scenarios: ThreatScenario[], zones: Zone[], cameras: Camera[], doors: Door[]): RiskMatrixResult {
  const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0))
  for (const s of scenarios) matrix[s.probability - 1][s.impact - 1] += 1

  const updated = scenarios.map(s => {
    let bonus = 0
    for (const zt of s.affected_zones) {
      if (cameras.some(c => zones.some(z => z.type === zt && z.floorId === c.floorId))) bonus += 1
      if (doors.some(d => zones.some(z => z.type === zt && z.floorId === d.floorId && d.hasBadge))) bonus += 1
    }
    return { ...s, residual_risk: Math.max(1, s.risk_score - bonus) }
  })

  const uncovered = updated.filter(s => s.residual_risk > 8)
  const priority_actions = updated.filter(s => s.residual_risk > 4)
    .flatMap(s => s.recommended_controls.map((action, i) => ({ scenario_id: s.id, action, priority: s.residual_risk * 10 - i })))
    .sort((a, b) => b.priority - a.priority)

  const avg = updated.reduce((s, t) => s + t.residual_risk, 0) / updated.length
  const overall_risk_level = avg >= 8 ? 'critique' as const : avg >= 5 ? 'élevé' as const : avg >= 3 ? 'moyen' as const : 'faible' as const

  return { matrix, scenarios: updated, uncovered_risks: uncovered, priority_actions, overall_risk_level }
}

export function getRiskMapForZone(zoneId: string, zones: Zone[], scenarios: ThreatScenario[]): ZoneRiskProfile {
  const zone = zones.find(z => z.id === zoneId)
  if (!zone) return { zone_id: zoneId, zone_label: 'Inconnue', applicable_threats: [], residual_risk_avg: 0, priority_actions: [], risk_level: 'faible' }
  const applicable = scenarios.filter(s => s.affected_zones.includes(zone.type))
  const avg = applicable.length > 0 ? applicable.reduce((s, t) => s + t.residual_risk, 0) / applicable.length : 0
  const risk_level = avg >= 8 ? 'critique' as const : avg >= 5 ? 'élevé' as const : avg >= 3 ? 'moyen' as const : 'faible' as const
  return { zone_id: zoneId, zone_label: zone.label, applicable_threats: applicable, residual_risk_avg: avg, priority_actions: applicable.sort((a, b) => b.residual_risk - a.residual_risk).flatMap(s => s.recommended_controls), risk_level }
}
