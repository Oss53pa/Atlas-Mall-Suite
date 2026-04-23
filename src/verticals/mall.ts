import type { VerticalConfig } from './types'

export const MALL_CONFIG: VerticalConfig = {
  id: 'mall',
  label: 'Centre commercial',
  icon: '🛍️',
  description: 'Galerie marchande, hypermarché, food court, loisirs',
  color: '#f59e0b',
  erpCategory: 'M',
  benchmarks: [
    { source: 'ICSC Afrique', panelSize: 9, region: 'UEMOA', year: 2024 },
    { source: 'Cushman & Wakefield Retail', region: 'MENA/Afrique', year: 2024 },
  ],
  primaryKpis: [
    { id: 'rent-per-sqm',  label: 'Loyer €/m²/mois', unit: 'FCFA/m²/mois', benchmark: 18500, color: '#f59e0b' },
    { id: 'occupancy',     label: 'Taux d\'occupation', unit: '%', benchmark: 92, target: 95, color: '#10b981' },
    { id: 'footfall',      label: 'Fréquentation', unit: 'pax/jour', benchmark: 8500 },
    { id: 'dwell-time',    label: 'Dwell time', unit: 'min', benchmark: 52, target: 60 },
    { id: 'revenue-sqm',   label: 'CA/m²', unit: 'MFCFA/m²/an', benchmark: 15 },
    { id: 'conversion',    label: 'Conversion visiteur→acheteur', unit: '%', benchmark: 42 },
  ],
  norms: [
    { code: 'APSAD R82',  label: 'Vidéosurveillance', reference: 'APSAD R82', domain: 'security' },
    { code: 'ERP M',      label: 'ERP type M (magasins)', reference: 'CI Loi 2013-450 / FR CCH', domain: 'fire' },
    { code: 'ISO 7010',   label: 'Pictogrammes sécurité', reference: 'ISO 7010:2019', domain: 'signage' },
    { code: 'NF X 08-003',label: 'Signalétique informative', reference: 'NF X 08-003', domain: 'signage' },
    { code: 'NF S 61-938',label: 'Détection incendie', reference: 'NF S 61-938', domain: 'fire' },
    { code: 'EN 62676',   label: 'Systèmes vidéosurveillance', reference: 'EN 62676-4', domain: 'security' },
    { code: 'SYSCOHADA',  label: 'Comptabilité', reference: 'SYSCOHADA Révisé 2017', domain: 'financial' },
  ],
  enabledVolumes: { operations: true, security: true, experience: true, wayfinder: true },
  exampleProjects: [
    { name: 'The Mall',       location: 'Abidjan',  areaSqm: 30000, operator: 'New Heaven SA' },
    { name: 'Playce Marcory', location: 'Abidjan',  areaSqm: 22000, operator: 'CFAO Retail' },
    { name: 'Sea Plaza',      location: 'Dakar',    areaSqm: 18000 },
  ],
}
