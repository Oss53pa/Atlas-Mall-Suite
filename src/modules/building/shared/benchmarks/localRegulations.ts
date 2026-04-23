// ═══ LOCAL REGULATIONS — Réglementations ouest-africaines (M22) ═══
// SYSCOHADA (comptabilité), UEMOA (TVA/fiscalité), Code urbanisme CI,
// Règlement zonage Abidjan (RIA), Loi CI Protection Données 2013.

// ─── Fiscalité Côte d'Ivoire retail ────────────────────────

export interface TaxRule {
  id: string
  name: string
  rate: number        // Taux en %
  base: string        // Assiette
  frequency: 'monthly' | 'quarterly' | 'annual'
  reference: string
}

export const CI_TAX_RULES: TaxRule[] = [
  { id: 'TVA-CI', name: 'TVA', rate: 18, base: 'Loyers HT + prestations', frequency: 'monthly',
    reference: 'Code Général des Impôts CI art. 345' },
  { id: 'IRF', name: 'Impôt sur Revenus Fonciers', rate: 20, base: 'Revenus locatifs bruts', frequency: 'monthly',
    reference: 'CGI CI art. 51-59' },
  { id: 'PATENTE', name: 'Patente', rate: 0.5, base: 'Chiffre d\'affaires annuel', frequency: 'annual',
    reference: 'CGI CI art. 263 — minimum 500 000 FCFA' },
  { id: 'TFS', name: 'Taxe Foncière Sur Propriétés Bâties', rate: 3, base: 'Valeur locative cadastrale', frequency: 'annual',
    reference: 'CGI CI art. 136 — local commercial' },
  { id: 'CONT-CC', name: 'Contribution CNI (CC)', rate: 2.5, base: 'Loyers HT', frequency: 'monthly',
    reference: 'CGI CI art. 1131 — Charges Communales' },
  { id: 'BIC-IS', name: 'Impôt sur les Sociétés (IS)', rate: 25, base: 'Bénéfice imposable', frequency: 'annual',
    reference: 'CGI CI art. 61 — taux standard' },
]

// ─── SYSCOHADA — Plan comptable classes retail ─────────────

export interface AccountingClass {
  classNum: string
  name: string
  applies: string
  subAccounts: Array<{ num: string; label: string }>
}

export const SYSCOHADA_CLASSES: AccountingClass[] = [
  {
    classNum: '70',
    name: 'Ventes / Produits',
    applies: 'Loyers bruts perçus',
    subAccounts: [
      { num: '7071', label: 'Loyers des immeubles nus' },
      { num: '7072', label: 'Loyers des immeubles meublés' },
      { num: '7081', label: 'Charges refacturées aux locataires' },
      { num: '7088', label: 'Autres produits accessoires' },
    ],
  },
  {
    classNum: '60',
    name: 'Achats et charges externes',
    applies: 'OPEX centre commercial',
    subAccounts: [
      { num: '6051', label: 'Fournitures d\'entretien' },
      { num: '6061', label: 'Électricité' },
      { num: '6062', label: 'Eau' },
      { num: '6081', label: 'Maintenance et réparations' },
    ],
  },
  {
    classNum: '61',
    name: 'Transports',
    applies: 'Logistique et tournées',
    subAccounts: [{ num: '6181', label: 'Transports sur achats' }],
  },
  {
    classNum: '62',
    name: 'Services extérieurs A',
    applies: 'Gestion, sécurité, assurances',
    subAccounts: [
      { num: '6221', label: 'Locations immobilières (sous-locations)' },
      { num: '6251', label: 'Primes d\'assurance' },
      { num: '6282', label: 'Rémunérations de gérance' },
      { num: '6285', label: 'Frais de surveillance et gardiennage' },
    ],
  },
  {
    classNum: '21',
    name: 'Immobilisations corporelles',
    applies: 'Bâtiment + agencements',
    subAccounts: [
      { num: '2131', label: 'Bâtiments industriels, agricoles, administratifs, commerciaux' },
      { num: '2141', label: 'Installations techniques' },
      { num: '2181', label: 'Agencements et aménagements des bâtiments' },
    ],
  },
  {
    classNum: '283',
    name: 'Amortissements bâtiments',
    applies: 'Dotations aux amortissements',
    subAccounts: [
      { num: '28131', label: 'Amort. bâtiments commerciaux (25-50 ans)' },
      { num: '28141', label: 'Amort. installations techniques (10-20 ans)' },
      { num: '28181', label: 'Amort. agencements (10-15 ans)' },
    ],
  },
]

// ─── Zonage urbain Abidjan ─────────────────────────────────

export interface ZoningRule {
  zone: string
  label: string
  maxCosInternal: number   // Coefficient d'Occupation des Sols
  maxHeight: number        // Hauteur max en mètres
  parkingRatioPerSqm: number // places / 100 m² GLA
  allowedUses: string[]
  restrictions: string[]
}

export const ABIDJAN_ZONING: ZoningRule[] = [
  {
    zone: 'UC1',
    label: 'Centre-ville mixte dense',
    maxCosInternal: 3.5,
    maxHeight: 60,
    parkingRatioPerSqm: 1.0,
    allowedUses: ['commerce', 'restauration', 'services', 'bureau', 'habitation'],
    restrictions: ['Logistique lourde interdite', 'Livraisons uniquement 22h-6h'],
  },
  {
    zone: 'UC2',
    label: 'Quartier résidentiel avec commerces',
    maxCosInternal: 2.0,
    maxHeight: 28,
    parkingRatioPerSqm: 1.5,
    allowedUses: ['commerce de proximité', 'restauration', 'services'],
    restrictions: ['GLA commerciale max 5 000 m²', 'Horaires 7h-23h'],
  },
  {
    zone: 'UE',
    label: 'Zone économique et commerciale',
    maxCosInternal: 2.5,
    maxHeight: 40,
    parkingRatioPerSqm: 2.0,
    allowedUses: ['centre commercial', 'retail park', 'showroom', 'logistique légère'],
    restrictions: ['Recul 10m voirie principale', 'Aire livraisons dédiée obligatoire'],
  },
  {
    zone: 'UI',
    label: 'Zone industrielle',
    maxCosInternal: 1.8,
    maxHeight: 25,
    parkingRatioPerSqm: 0.5,
    allowedUses: ['entrepôt', 'usine', 'grossiste'],
    restrictions: ['Retail interdit sauf cash&carry'],
  },
]

// ─── Loi protection données CI 2013 ───────────────────────

export interface DataProtectionRule {
  id: string
  domain: 'cctv' | 'customer-data' | 'employee-data' | 'marketing'
  requirement: string
  reference: string
}

export const CI_DATA_PROTECTION: DataProtectionRule[] = [
  {
    id: 'CNIC-DECL',
    domain: 'cctv',
    requirement: 'Déclaration préalable à la CNIC (Commission Nationale Informatique et Libertés CI) obligatoire avant installation. Formulaire CNIC-F01.',
    reference: 'Loi 2013-450 art. 21',
  },
  {
    id: 'CCTV-SIGN',
    domain: 'cctv',
    requirement: 'Signalétique visible informant les visiteurs de la présence de caméras (texte + pictogramme) à toutes les entrées.',
    reference: 'Loi 2013-450 art. 5',
  },
  {
    id: 'CCTV-RETENTION',
    domain: 'cctv',
    requirement: 'Durée de conservation max 30 jours. Au-delà, destruction sécurisée avec traçabilité.',
    reference: 'Loi 2013-450 art. 32',
  },
  {
    id: 'CCTV-ACCESS',
    domain: 'cctv',
    requirement: 'Droit d\'accès aux enregistrements pour les personnes filmées sur demande écrite, délai 30 jours.',
    reference: 'Loi 2013-450 art. 28',
  },
  {
    id: 'CUSTOMER-CONSENT',
    domain: 'customer-data',
    requirement: 'Consentement explicite pour collecte données clients (fidélité, tracking Wi-Fi, paiement).',
    reference: 'Loi 2013-450 art. 14',
  },
  {
    id: 'BREACH-NOTIF',
    domain: 'customer-data',
    requirement: 'Notification obligatoire à la CNIC en cas de violation de données dans les 72h.',
    reference: 'Loi 2013-450 art. 41',
  },
]

// ─── UEMOA douanes et TVA cross-border ────────────────────

export interface CustomsRule {
  id: string
  product: string
  duty: number          // Droits douane
  vat: number           // TVA
  note?: string
}

export const UEMOA_CUSTOMS_RETAIL: CustomsRule[] = [
  { id: 'TEC-CAT1', product: 'Biens essentiels (hygiène, médicaments)', duty: 0, vat: 9, note: 'TVA réduite UEMOA' },
  { id: 'TEC-CAT2', product: 'Matières premières, biens d\'équipement', duty: 5, vat: 18 },
  { id: 'TEC-CAT3', product: 'Produits intermédiaires, consommation courante', duty: 10, vat: 18 },
  { id: 'TEC-CAT4', product: 'Biens de consommation finale (mode, électro)', duty: 20, vat: 18 },
  { id: 'TEC-CAT5', product: 'Produits de luxe (alcool, tabac, bijoux)', duty: 35, vat: 18, note: 'Accises additionnelles' },
]

// ─── Helpers ──────────────────────────────────────────────

/** Calcule les taxes dues sur un loyer brut mensuel en CI. */
export function computeMonthlyTaxesCI(grossRentFcfa: number): {
  tva: number
  irf: number
  contCc: number
  totalTaxes: number
  netAfterTaxes: number
} {
  const tva = grossRentFcfa * 0.18
  const irf = grossRentFcfa * 0.20
  const contCc = grossRentFcfa * 0.025
  const totalTaxes = tva + irf + contCc
  return { tva, irf, contCc, totalTaxes, netAfterTaxes: grossRentFcfa - totalTaxes }
}

/** Classe un usage dans un type de zonage Abidjan. */
export function findApplicableZoning(requestedUse: string): ZoningRule[] {
  return ABIDJAN_ZONING.filter(z =>
    z.allowedUses.some(u => requestedUse.toLowerCase().includes(u.toLowerCase())),
  )
}
