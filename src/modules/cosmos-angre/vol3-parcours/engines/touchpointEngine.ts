// ═══ TOUCHPOINT ENGINE — Customer experience touchpoint matrix ═══

// ── Types ────────────────────────────────────────────────────

export type TouchpointChannel = 'physique' | 'digital' | 'humain' | 'sensoriel'
export type TouchpointMoment = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type NPSImpact = 'tres_eleve' | 'eleve' | 'moyen' | 'faible'

export interface Touchpoint {
  id: string
  moment: TouchpointMoment
  channel: TouchpointChannel
  description: string
  currentQuality: 1 | 2 | 3 | 4 | 5
  targetQuality: 1 | 2 | 3 | 4 | 5
  npsImpact: NPSImpact
  action: string
  responsable: string
  deadline: string
  estimatedCostFcfa: number
}

export interface TouchpointMatrixCell {
  moment: TouchpointMoment
  channel: TouchpointChannel
  touchpoints: Touchpoint[]
  avgQuality: number
  avgTarget: number
  gap: number
}

// ── Moment labels ────────────────────────────────────────────

export const MOMENT_LABELS: Record<TouchpointMoment, string> = {
  1: 'Decouverte',
  2: 'Arrivee',
  3: 'Orientation',
  4: 'Experience',
  5: 'Achat',
  6: 'Repos',
  7: 'Depart',
}

export const CHANNEL_LABELS: Record<TouchpointChannel, string> = {
  physique: 'Physique',
  digital: 'Digital',
  humain: 'Humain',
  sensoriel: 'Sensoriel',
}

export const NPS_COLORS: Record<NPSImpact, string> = {
  tres_eleve: '#ef4444',
  eleve: '#f59e0b',
  moyen: '#38bdf8',
  faible: '#6b7280',
}

// ── Generate default touchpoints for a mall ──────────────────

export function generateDefaultTouchpoints(): Touchpoint[] {
  const tp: Touchpoint[] = [
    // Moment 1 — Decouverte
    { id: 'tp-1-phy', moment: 1, channel: 'physique', description: 'Facade et enseigne exterieures visibles depuis la route', currentQuality: 3, targetQuality: 5, npsImpact: 'eleve', action: 'Ameliorer eclairage facade + totem routier', responsable: 'Archi', deadline: '2026-08-01', estimatedCostFcfa: 15_000_000 },
    { id: 'tp-1-dig', moment: 1, channel: 'digital', description: 'Presence Google Maps, site web, reseaux sociaux', currentQuality: 2, targetQuality: 4, npsImpact: 'eleve', action: 'Creer fiche Google Business + site vitrine', responsable: 'Marketing', deadline: '2026-07-15', estimatedCostFcfa: 3_000_000 },

    // Moment 2 — Arrivee
    { id: 'tp-2-phy', moment: 2, channel: 'physique', description: 'Signaletique parking + acces pieton', currentQuality: 2, targetQuality: 5, npsImpact: 'tres_eleve', action: 'Plan de signaletique exterieure complet', responsable: 'Signaliste', deadline: '2026-09-01', estimatedCostFcfa: 8_000_000 },
    { id: 'tp-2-hum', moment: 2, channel: 'humain', description: 'Agents de securite accueillants a l\'entree', currentQuality: 3, targetQuality: 4, npsImpact: 'moyen', action: 'Formation accueil agents securite', responsable: 'RH Securite', deadline: '2026-09-15', estimatedCostFcfa: 1_500_000 },

    // Moment 3 — Orientation
    { id: 'tp-3-phy', moment: 3, channel: 'physique', description: 'Plans directionnels + totems wayfinding', currentQuality: 1, targetQuality: 5, npsImpact: 'tres_eleve', action: 'Deployer plan de signaletique ISO 7010 complet', responsable: 'Signaliste', deadline: '2026-09-15', estimatedCostFcfa: 12_000_000 },
    { id: 'tp-3-dig', moment: 3, channel: 'digital', description: 'Application mobile wayfinding / QR codes', currentQuality: 1, targetQuality: 4, npsImpact: 'eleve', action: 'Developper app wayfinding + QR par POI', responsable: 'IT', deadline: '2026-10-01', estimatedCostFcfa: 8_000_000 },

    // Moment 4 — Experience
    { id: 'tp-4-sen', moment: 4, channel: 'sensoriel', description: 'Ambiance sonore, temperature, eclairage', currentQuality: 3, targetQuality: 5, npsImpact: 'eleve', action: 'Sonorisation d\'ambiance + gestion temperature par zone', responsable: 'Facility', deadline: '2026-09-01', estimatedCostFcfa: 6_000_000 },
    { id: 'tp-4-phy', moment: 4, channel: 'physique', description: 'Mobilier de repos, espaces enfants, sanitaires', currentQuality: 2, targetQuality: 4, npsImpact: 'moyen', action: 'Installer bancs, aires enfants, rafraichir sanitaires', responsable: 'Archi', deadline: '2026-09-15', estimatedCostFcfa: 10_000_000 },

    // Moment 5 — Achat
    { id: 'tp-5-hum', moment: 5, channel: 'humain', description: 'Personnel enseigne forme et accueillant', currentQuality: 3, targetQuality: 4, npsImpact: 'tres_eleve', action: 'Programme de formation preneurs', responsable: 'Commercial', deadline: '2026-09-15', estimatedCostFcfa: 2_000_000 },
    { id: 'tp-5-dig', moment: 5, channel: 'digital', description: 'Paiement mobile (Orange Money, Wave)', currentQuality: 4, targetQuality: 5, npsImpact: 'eleve', action: 'Verifier equipement mPOS tous preneurs', responsable: 'IT', deadline: '2026-10-01', estimatedCostFcfa: 500_000 },

    // Moment 6 — Repos
    { id: 'tp-6-phy', moment: 6, channel: 'physique', description: 'Food court confortable et propre', currentQuality: 3, targetQuality: 5, npsImpact: 'eleve', action: 'Amenagement food court premium', responsable: 'Archi', deadline: '2026-09-01', estimatedCostFcfa: 20_000_000 },

    // Moment 7 — Depart
    { id: 'tp-7-phy', moment: 7, channel: 'physique', description: 'Sortie fluide, signaletique parking', currentQuality: 2, targetQuality: 4, npsImpact: 'moyen', action: 'Signaletique sortie + fleches parking', responsable: 'Signaliste', deadline: '2026-09-15', estimatedCostFcfa: 3_000_000 },
    { id: 'tp-7-dig', moment: 7, channel: 'digital', description: 'Programme fidelite Cosmos Club (inscription sortie)', currentQuality: 1, targetQuality: 4, npsImpact: 'eleve', action: 'Lancer programme Cosmos Club + borne inscription', responsable: 'Marketing', deadline: '2026-10-15', estimatedCostFcfa: 5_000_000 },
  ]
  return tp
}

// ── Build matrix view ────────────────────────────────────────

export function buildTouchpointMatrix(touchpoints: Touchpoint[]): TouchpointMatrixCell[] {
  const cells: TouchpointMatrixCell[] = []
  const moments: TouchpointMoment[] = [1, 2, 3, 4, 5, 6, 7]
  const channels: TouchpointChannel[] = ['physique', 'digital', 'humain', 'sensoriel']

  for (const m of moments) {
    for (const ch of channels) {
      const tps = touchpoints.filter((t) => t.moment === m && t.channel === ch)
      const avg = tps.length > 0 ? tps.reduce((s, t) => s + t.currentQuality, 0) / tps.length : 0
      const avgTarget = tps.length > 0 ? tps.reduce((s, t) => s + t.targetQuality, 0) / tps.length : 0
      cells.push({
        moment: m,
        channel: ch,
        touchpoints: tps,
        avgQuality: Math.round(avg * 10) / 10,
        avgTarget: Math.round(avgTarget * 10) / 10,
        gap: Math.round((avgTarget - avg) * 10) / 10,
      })
    }
  }
  return cells
}

// ── Compute total action plan cost ───────────────────────────

export function computeTouchpointActionCost(touchpoints: Touchpoint[]): number {
  return touchpoints.reduce((s, t) => s + t.estimatedCostFcfa, 0)
}
