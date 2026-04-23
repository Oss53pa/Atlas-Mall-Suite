import type { VerticalConfig } from './types'

export const ERP_PUBLIC_CONFIG: VerticalConfig = {
  id: 'erp-public',
  label: 'ERP public & culture',
  icon: '🏛️',
  description: 'Musée, mairie, médiathèque, centre culturel, salle de spectacle',
  color: '#0ea5e9',
  erpCategory: 'L',
  benchmarks: [
    { source: 'UNESCO Cultural Venues', region: 'International', year: 2024 },
    { source: 'ICOM Musées Afrique', region: 'Afrique', year: 2024 },
  ],
  primaryKpis: [
    { id: 'visitors',       label: 'Visiteurs/jour', unit: '', benchmark: 850, color: '#0ea5e9' },
    { id: 'revenue-visitor',label: 'Revenu/visiteur', unit: 'FCFA', benchmark: 4500 },
    { id: 'dwell-time',     label: 'Durée visite moyenne', unit: 'min', benchmark: 78 },
    { id: 'accessibility',  label: 'Conformité PMR', unit: '%', benchmark: 92, target: 100 },
    { id: 'event-revenue',  label: 'Revenu événementiel', unit: 'FCFA/m²/an', benchmark: 12000 },
    { id: 'repeat-rate',    label: 'Taux fidélisation', unit: '%', benchmark: 28 },
  ],
  norms: [
    { code: 'ERP L',       label: 'ERP type L (salles de spectacle)', reference: 'CI Loi 2013-450 / FR CCH', domain: 'fire' },
    { code: 'ERP Y',       label: 'ERP type Y (musées)', reference: 'CI Loi 2013-450 / FR CCH', domain: 'fire' },
    { code: 'PMR renforcée', label: 'Accessibilité PMR', reference: 'Arr. 8 déc. 2014', domain: 'accessibility' },
    { code: 'ISO 9001',    label: 'Qualité service public', domain: 'labor' },
    { code: 'ISO 7010',    label: 'Pictogrammes sécurité', domain: 'signage' },
    { code: 'NF S 61-938', label: 'Détection incendie', domain: 'fire' },
    { code: 'APSAD R82',   label: 'Vidéosurveillance', domain: 'security' },
  ],
  enabledVolumes: { operations: true, security: true, experience: true, wayfinder: true },
  exampleProjects: [
    { name: 'Musée des Civilisations', location: 'Abidjan Plateau',  areaSqm: 8500 },
    { name: 'Institut Français',        location: 'Abidjan',          areaSqm: 5200 },
    { name: 'Palais de la Culture',     location: 'Treichville',      areaSqm: 18000 },
  ],
}
