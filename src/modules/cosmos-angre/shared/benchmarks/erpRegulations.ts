// ═══ ERP REGULATIONS — Référentiels normatifs centres commerciaux (M21) ═══
// Règles applicables en Côte d'Ivoire (arrêté conjoint sécurité incendie ERP 2019,
// largement aligné sur le Règlement français ERP type M / N / CTS / L / O).
// Références : Journal Officiel CI — arrêté 2019-231; norme NF EN 54; APSAD R82.

export interface ErpRule {
  id: string
  title: string
  scope: 'all' | 'M' | 'N' | 'L' | 'O' | 'CTS'
  /** Gravité du non-respect. */
  severity: 'info' | 'warning' | 'critical'
  /** Description courte. */
  description: string
  /** Article / référence de la norme. */
  reference: string
}

/** Type d'ERP applicable — centre commercial = M (magasins) principalement. */
export type ErpType = 'M' | 'N' | 'L' | 'O' | 'CTS' | 'mixed'

export interface ErpCategory {
  id: '1' | '2' | '3' | '4' | '5'
  label: string
  effectifMin: number
  effectifMax: number
  /** Exigences spécifiques. */
  requires: string[]
}

export const ERP_CATEGORIES: ErpCategory[] = [
  { id: '1', label: 'Catégorie 1', effectifMin: 1501, effectifMax: Infinity, requires: ['SSI A', 'poste sécurité 24/7', 'équipe SSIAP 3'] },
  { id: '2', label: 'Catégorie 2', effectifMin: 701, effectifMax: 1500, requires: ['SSI A', 'équipe SSIAP 2'] },
  { id: '3', label: 'Catégorie 3', effectifMin: 301, effectifMax: 700, requires: ['SSI B', 'équipe SSIAP 1'] },
  { id: '4', label: 'Catégorie 4', effectifMin: 51, effectifMax: 300, requires: ['SSI B', 'personnel formé'] },
  { id: '5', label: 'Catégorie 5', effectifMin: 0, effectifMax: 50, requires: ['consignes affichées'] },
]

/** Règles générales centres commerciaux. */
export const ERP_RULES: ErpRule[] = [
  {
    id: 'DEGAG-01',
    title: 'Distance maximale à un dégagement',
    scope: 'M',
    severity: 'critical',
    description: '40 m max. depuis tout point au dégagement le plus proche (ou 30 m si impasse).',
    reference: 'CI Art. CO34 / FR CO43',
  },
  {
    id: 'DEGAG-02',
    title: 'Largeur minimale dégagements',
    scope: 'M',
    severity: 'critical',
    description: 'Largeur calculée par Unités de Passage (UP) : N/100 UP arrondi au supérieur, min 2 UP par dégagement.',
    reference: 'CI Art. CO36',
  },
  {
    id: 'SORTIE-01',
    title: 'Nombre minimal de sorties',
    scope: 'M',
    severity: 'critical',
    description: 'Cat 1-2 : 2 sorties + 1 supplémentaire par tranche de 500 pers. Cat 3-4 : 2 sorties min.',
    reference: 'CI Art. CO38',
  },
  {
    id: 'DAS-01',
    title: 'Désenfumage mall / galeries',
    scope: 'M',
    severity: 'critical',
    description: 'Désenfumage mécanique obligatoire si galerie > 300 m² ou non-accessible à l\'extérieur.',
    reference: 'CI Art. M16 / IT 246',
  },
  {
    id: 'EI-01',
    title: 'Éclairage de sécurité',
    scope: 'all',
    severity: 'critical',
    description: 'Blocs autonomes BAES partout dans les circulations + balisage sorties (NF EN 1838).',
    reference: 'CI Art. EC7 / FR EC7',
  },
  {
    id: 'DI-01',
    title: 'Détection incendie',
    scope: 'M',
    severity: 'critical',
    description: 'SSI catégorie A pour ERP cat 1 et 2. Détecteurs optiques en circulation, réserves, techniques.',
    reference: 'NF EN 54-7 / APSAD R7',
  },
  {
    id: 'EXT-01',
    title: 'Extincteurs portatifs',
    scope: 'all',
    severity: 'warning',
    description: '1 extincteur eau 6L / 200 m² min, 1 par 15 m linéaire de circulation.',
    reference: 'CI Art. MS39 / APSAD R4',
  },
  {
    id: 'RIA-01',
    title: 'Robinets d\'Incendie Armés',
    scope: 'M',
    severity: 'warning',
    description: 'RIA DN 19/6 obligatoires si ERP cat 1-2 ou niveau > 28 m. Rayon d\'action 40 m.',
    reference: 'CI Art. MS14 / FR MS14',
  },
  {
    id: 'ACCESS-PMR-01',
    title: 'Accessibilité PMR — largeur portes',
    scope: 'all',
    severity: 'critical',
    description: 'Largeur utile 0,90 m min (1 vantail) ou 1,40 m (2 vantaux). Seuil ≤ 2 cm.',
    reference: 'CI Décret 2017 PMR / FR Arrêté 8 déc 2014',
  },
  {
    id: 'ACCESS-PMR-02',
    title: 'Accessibilité PMR — circulations',
    scope: 'all',
    severity: 'critical',
    description: 'Largeur 1,40 m min, passage ponctuel 1,20 m. Pente rampe max 5% (8% < 2m).',
    reference: 'CI Décret 2017 PMR',
  },
  {
    id: 'ACCESS-PMR-03',
    title: 'Sanitaires PMR',
    scope: 'all',
    severity: 'warning',
    description: 'Au moins un WC adapté par niveau ouvert au public. Espace rotation Ø 1,50 m.',
    reference: 'CI Décret 2017 PMR',
  },
  {
    id: 'CCTV-01',
    title: 'Vidéosurveillance zones publiques',
    scope: 'M',
    severity: 'warning',
    description: 'Couverture ≥ 80% circulations + 100% entrées / sorties / caisses / parkings.',
    reference: 'APSAD R82 + loi CI cybersécurité 2013',
  },
  {
    id: 'CCTV-02',
    title: 'Conservation enregistrements',
    scope: 'M',
    severity: 'info',
    description: 'Conservation 30 jours max, déclaration CNIC (Commission CI Protection Données Personnelles).',
    reference: 'CI Loi 2013-450 / RGPD',
  },
  {
    id: 'ACCESS-CTRL-01',
    title: 'Contrôle d\'accès zones techniques',
    scope: 'M',
    severity: 'warning',
    description: 'Locaux techniques, réserves, postes sécurité : badge + log. Anti-retour.',
    reference: 'APSAD R81',
  },
  {
    id: 'PARKING-01',
    title: 'Parkings couverts — désenfumage',
    scope: 'M',
    severity: 'critical',
    description: 'Surface > 100 m² et couvert : désenfumage obligatoire + séparation coupe-feu 1h.',
    reference: 'CI Art. PS / IT 247',
  },
  {
    id: 'LIFT-01',
    title: 'Ascenseur PMR',
    scope: 'all',
    severity: 'critical',
    description: 'Obligatoire si niveau > 6 pers accueil + PMR. Cabine 1,10 × 1,40 m min.',
    reference: 'CI Décret PMR',
  },
]

// ─── Helpers ───────────────────────────────────────────────

/** Classe un ERP par effectif. */
export function classifyByEffectif(effectif: number): ErpCategory | null {
  return ERP_CATEGORIES.find(c => effectif >= c.effectifMin && effectif <= c.effectifMax) ?? null
}

/** Effectif théorique d'un centre commercial en fonction de la GLA.
 *  Règle M1 : 2 pers / m² dans les 2/3 des surfaces de vente, 1 pers / 2 m² dans le reste. */
export function theoreticalEffectif(glaSqm: number): number {
  const salesArea = glaSqm * 0.75 // 75% surface vente
  const otherArea = glaSqm * 0.25
  return Math.round((salesArea * 2 / 3) * 2 + (salesArea * 1 / 3) * 0.5 + otherArea * 0.5)
}

/** Règles applicables à un ERP d'une catégorie et d'un type donné. */
export function applicableRules(type: ErpType, category?: ErpCategory['id']): ErpRule[] {
  return ERP_RULES.filter(r => {
    if (r.scope === 'all') return true
    if (r.scope === type) return true
    if (type === 'mixed' && (r.scope === 'M' || r.scope === 'N')) return true
    return false
  })
}
