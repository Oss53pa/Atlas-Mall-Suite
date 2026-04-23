// ═══ Diversité ABM Abidjan — PC-02 ═══
//
// CDC §3.4 :
//   PC-02 — Paramétrer la simulation ABM avec diversité ABM Abidjan
//           (profils, vitesses, comportements)
//
// Personas calibrés sur observations terrain The Mall + benchmarks UEMOA :
//   - Distribution démographique Abidjan (INS Côte d'Ivoire 2020)
//   - Comportement consommation (étude IPSOS Abidjan 2023)
//   - Mobilité contrainte (chaleur tropicale, pluies orageuses)

// ─── Types ────────────────────────────────────

export type AbidjanPersonaId =
  | 'famille-classe-moy'      // famille avec enfants (couple + 2-3 enfants)
  | 'jeune-adulte-pro'        // 25-35 ans actif tertiaire
  | 'etudiant-uni'            // 18-25 étudiant
  | 'senior-aise'             // 55+ classe moyenne haute
  | 'employe-bureau-tour'     // pause déj. bureaux voisins
  | 'touriste-affaires'       // expatrié/voyageur d'affaires
  | 'mere-au-foyer'           // courses + sortie en semaine
  | 'groupe-amis-soir'        // 3-5 jeunes en sortie soir/we
  | 'pmr-mobilite-reduite'    // canne/fauteuil/poussette
  | 'livreur-personnel'       // personnel back-office, livraison

export interface AbidjanPersona {
  id: AbidjanPersonaId
  label: string
  /** Part de la population de visiteurs (0..1, somme = 1). */
  populationShare: number
  /** Vitesse de marche moyenne (m/s). */
  walkSpeedMps: number
  /** Écart-type vitesse. */
  walkSpeedStd: number
  /** Rayon d'interaction sociale (m). */
  socialRadiusM: number
  /** Temps moyen de pause par boutique visitée (s). */
  dwellMeanS: number
  /** Nombre moyen de boutiques visitées par session. */
  boutiquesPerSession: number
  /** Préférences catégories (poids 0..1). */
  preferences: Record<string, number>
  /** Sensibilité à la fatigue (0..1, plus haut = abandonne plus vite). */
  fatigueSensitivity: number
  /** Sensibilité à la foule (0..1, plus haut = évite les zones denses). */
  crowdSensitivity: number
  /** Tranches horaires actives (probabilité par tranche). */
  activityProbBySlot: { opening: number; midday: number; closing: number; evening: number }
  /** Mode de transport entrée/sortie. */
  transportMode: 'parking' | 'taxi' | 'bus' | 'pied' | 'mixte'
  /** Notes contextuelles. */
  notes: string
}

// ─── Catalogue Abidjan (calibré INS CI 2020 + IPSOS 2023) ───

export const ABIDJAN_PERSONAS: AbidjanPersona[] = [
  {
    id: 'famille-classe-moy',
    label: 'Famille classe moyenne (Cocody, Marcory)',
    populationShare: 0.22,
    walkSpeedMps: 1.0,        // ralenti par enfants
    walkSpeedStd: 0.2,
    socialRadiusM: 2.5,
    dwellMeanS: 600,          // 10 min/boutique
    boutiquesPerSession: 5,
    preferences: { mode: 0.7, restauration: 0.9, enfants: 1.0, alimentaire: 0.6, loisirs: 0.5 },
    fatigueSensitivity: 0.7,
    crowdSensitivity: 0.6,
    activityProbBySlot: { opening: 0.15, midday: 0.35, closing: 0.30, evening: 0.20 },
    transportMode: 'parking',
    notes: 'Visite week-end principalement, panier moyen élevé, sensible à la chaleur',
  },
  {
    id: 'jeune-adulte-pro',
    label: 'Jeune actif tertiaire (Plateau, Marcory)',
    populationShare: 0.18,
    walkSpeedMps: 1.4,
    walkSpeedStd: 0.15,
    socialRadiusM: 1.8,
    dwellMeanS: 240,          // 4 min/boutique (rapide)
    boutiquesPerSession: 3,
    preferences: { mode: 0.9, restauration: 0.8, services: 0.6, beaute: 0.7, loisirs: 0.4 },
    fatigueSensitivity: 0.3,
    crowdSensitivity: 0.4,
    activityProbBySlot: { opening: 0.10, midday: 0.20, closing: 0.40, evening: 0.30 },
    transportMode: 'taxi',
    notes: 'Achats ciblés, mode rapide, fidèle aux marques',
  },
  {
    id: 'etudiant-uni',
    label: 'Étudiant (UFHB, INPHB, écoles privées)',
    populationShare: 0.12,
    walkSpeedMps: 1.5,
    walkSpeedStd: 0.2,
    socialRadiusM: 1.5,
    dwellMeanS: 300,
    boutiquesPerSession: 4,
    preferences: { mode: 0.8, restauration: 0.9, loisirs: 1.0, beaute: 0.5, services: 0.3 },
    fatigueSensitivity: 0.2,
    crowdSensitivity: 0.3,
    activityProbBySlot: { opening: 0.05, midday: 0.30, closing: 0.35, evening: 0.30 },
    transportMode: 'bus',
    notes: 'Sortie groupes amis 3-5, food court préféré, sensible aux promotions',
  },
  {
    id: 'senior-aise',
    label: 'Senior aisé (Cocody Riviera, Bingerville)',
    populationShare: 0.08,
    walkSpeedMps: 0.8,        // lent
    walkSpeedStd: 0.15,
    socialRadiusM: 3.0,
    dwellMeanS: 720,          // 12 min/boutique
    boutiquesPerSession: 3,
    preferences: { mode: 0.5, restauration: 0.7, services: 0.9, beaute: 0.6, alimentaire: 0.7 },
    fatigueSensitivity: 0.9,
    crowdSensitivity: 0.85,
    activityProbBySlot: { opening: 0.45, midday: 0.30, closing: 0.20, evening: 0.05 },
    transportMode: 'parking',
    notes: 'Préfère matinée, recherche calme, banc/repos importants',
  },
  {
    id: 'employe-bureau-tour',
    label: 'Employé bureau pause déjeuner',
    populationShare: 0.10,
    walkSpeedMps: 1.5,
    walkSpeedStd: 0.1,
    socialRadiusM: 1.5,
    dwellMeanS: 180,          // très rapide
    boutiquesPerSession: 2,
    preferences: { restauration: 1.0, services: 0.5, alimentaire: 0.4 },
    fatigueSensitivity: 0.2,
    crowdSensitivity: 0.5,
    activityProbBySlot: { opening: 0.05, midday: 0.75, closing: 0.15, evening: 0.05 },
    transportMode: 'pied',
    notes: 'Cible food court 12h-14h, panier court mais élevé en valeur',
  },
  {
    id: 'touriste-affaires',
    label: 'Expatrié / voyageur affaires',
    populationShare: 0.04,
    walkSpeedMps: 1.3,
    walkSpeedStd: 0.15,
    socialRadiusM: 2.0,
    dwellMeanS: 420,
    boutiquesPerSession: 4,
    preferences: { mode: 0.7, restauration: 0.8, services: 0.8, loisirs: 0.5 },
    fatigueSensitivity: 0.4,
    crowdSensitivity: 0.6,
    activityProbBySlot: { opening: 0.20, midday: 0.30, closing: 0.30, evening: 0.20 },
    transportMode: 'taxi',
    notes: 'Anglo/franco bilingue, recherche signalétique multilingue',
  },
  {
    id: 'mere-au-foyer',
    label: 'Femme au foyer (semaine)',
    populationShare: 0.15,
    walkSpeedMps: 0.95,
    walkSpeedStd: 0.18,
    socialRadiusM: 2.2,
    dwellMeanS: 540,
    boutiquesPerSession: 6,
    preferences: { alimentaire: 1.0, mode: 0.6, beaute: 0.7, enfants: 0.6, services: 0.5 },
    fatigueSensitivity: 0.6,
    crowdSensitivity: 0.7,
    activityProbBySlot: { opening: 0.30, midday: 0.45, closing: 0.20, evening: 0.05 },
    transportMode: 'parking',
    notes: 'Visite hebdomadaire programmée, panier alimentaire principal',
  },
  {
    id: 'groupe-amis-soir',
    label: 'Groupe amis sortie soir / weekend',
    populationShare: 0.06,
    walkSpeedMps: 1.2,
    walkSpeedStd: 0.25,
    socialRadiusM: 3.5,       // groupe = grand cluster
    dwellMeanS: 480,
    boutiquesPerSession: 3,
    preferences: { restauration: 1.0, loisirs: 0.95, mode: 0.5, beaute: 0.3 },
    fatigueSensitivity: 0.3,
    crowdSensitivity: 0.4,
    activityProbBySlot: { opening: 0.05, midday: 0.10, closing: 0.30, evening: 0.55 },
    transportMode: 'mixte',
    notes: 'Cinéma + restau + bowling, dépense élevée, week-end principalement',
  },
  {
    id: 'pmr-mobilite-reduite',
    label: 'PMR / poussette / mobilité réduite',
    populationShare: 0.03,
    walkSpeedMps: 0.6,        // très lent
    walkSpeedStd: 0.1,
    socialRadiusM: 2.0,
    dwellMeanS: 600,
    boutiquesPerSession: 4,
    preferences: { restauration: 0.7, services: 0.8, mode: 0.6, alimentaire: 0.6 },
    fatigueSensitivity: 0.95,
    crowdSensitivity: 0.95,
    activityProbBySlot: { opening: 0.40, midday: 0.30, closing: 0.25, evening: 0.05 },
    transportMode: 'parking',
    notes: 'Itinéraire PMR strict (asc, rampes), évite escalators',
  },
  {
    id: 'livreur-personnel',
    label: 'Personnel back-office / livreur',
    populationShare: 0.02,
    walkSpeedMps: 1.6,
    walkSpeedStd: 0.1,
    socialRadiusM: 1.0,
    dwellMeanS: 30,           // très rapide
    boutiquesPerSession: 0,
    preferences: { 'service-tech': 1.0 },
    fatigueSensitivity: 0.1,
    crowdSensitivity: 0.2,
    activityProbBySlot: { opening: 0.45, midday: 0.20, closing: 0.20, evening: 0.15 },
    transportMode: 'pied',
    notes: 'Circule via couloirs service uniquement, ne croise pas le public',
  },
]

// ─── Helpers ──────────────────────────────────

/** Génère une distribution d'agents selon les parts populationnelles. */
export function generateAgentMix(totalAgents: number, slot: keyof AbidjanPersona['activityProbBySlot']): Array<{
  persona: AbidjanPersona
  count: number
}> {
  const out: Array<{ persona: AbidjanPersona; count: number }> = []
  // Pondérer la population share par activityProbBySlot
  const weighted = ABIDJAN_PERSONAS.map(p => ({
    persona: p,
    weight: p.populationShare * p.activityProbBySlot[slot],
  }))
  const sumW = weighted.reduce((s, w) => s + w.weight, 0)
  for (const w of weighted) {
    const count = Math.round(totalAgents * w.weight / sumW)
    if (count > 0) out.push({ persona: w.persona, count })
  }
  return out
}

/** Échantillonne un agent persona avec sa vitesse aléatoire. */
export function sampleAgent(persona: AbidjanPersona): {
  walkSpeedMps: number
  socialRadiusM: number
  dwellSecMean: number
} {
  // Box-Muller pour vitesse normale
  const u = Math.random()
  const v = Math.random()
  const z = Math.sqrt(-2 * Math.log(u || 0.001)) * Math.cos(2 * Math.PI * v)
  const speed = Math.max(0.3, persona.walkSpeedMps + z * persona.walkSpeedStd)
  return {
    walkSpeedMps: speed,
    socialRadiusM: persona.socialRadiusM,
    dwellSecMean: persona.dwellMeanS,
  }
}

/** Trouve la persona par id. */
export function getPersona(id: AbidjanPersonaId): AbidjanPersona | null {
  return ABIDJAN_PERSONAS.find(p => p.id === id) ?? null
}

/** Vérifie que la somme des population shares = 1. */
export function validatePersonaDistribution(): { sum: number; ok: boolean } {
  const sum = ABIDJAN_PERSONAS.reduce((s, p) => s + p.populationShare, 0)
  return { sum, ok: Math.abs(sum - 1) < 0.01 }
}

// ─── Sortie agrégée pour ABM Social Force ─────

export interface AbmInjectionParams {
  agentsCount: number
  /** Vitesse moyenne pondérée. */
  avgWalkSpeed: number
  /** Distribution dwell par persona. */
  dwellDistribution: Array<{ personaId: AbidjanPersonaId; avgDwellS: number; share: number }>
  /** Mix de personas pour la tranche horaire. */
  mix: Array<{ personaId: AbidjanPersonaId; count: number; preferences: Record<string, number> }>
}

export function buildAbmParams(totalAgents: number, slot: 'opening' | 'midday' | 'closing' | 'evening'): AbmInjectionParams {
  const mix = generateAgentMix(totalAgents, slot)
  const totalCount = mix.reduce((s, m) => s + m.count, 0) || 1
  const avgWalkSpeed = mix.reduce((s, m) => s + m.persona.walkSpeedMps * m.count, 0) / totalCount
  return {
    agentsCount: totalAgents,
    avgWalkSpeed,
    dwellDistribution: mix.map(m => ({
      personaId: m.persona.id,
      avgDwellS: m.persona.dwellMeanS,
      share: m.count / totalCount,
    })),
    mix: mix.map(m => ({
      personaId: m.persona.id,
      count: m.count,
      preferences: m.persona.preferences,
    })),
  }
}
