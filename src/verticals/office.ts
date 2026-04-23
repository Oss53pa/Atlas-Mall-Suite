import type { VerticalConfig } from './types'

export const OFFICE_CONFIG: VerticalConfig = {
  id: 'office',
  label: 'Immeuble de bureaux',
  icon: '🏢',
  description: 'Tours, bureaux, coworking, sièges sociaux',
  color: '#6366f1',
  erpCategory: 'W',
  benchmarks: [
    { source: 'BOMA Office Benchmarks', region: 'International', year: 2024 },
    { source: 'JLL Tertiaire Afrique', region: 'Afrique subsaharienne', year: 2024 },
  ],
  primaryKpis: [
    { id: 'rent-per-sqm',  label: 'Loyer €/m²/mois', unit: 'FCFA/m²/mois', benchmark: 14000, color: '#6366f1' },
    { id: 'occupancy',     label: 'Taux d\'occupation', unit: '%', benchmark: 78, target: 90 },
    { id: 'desk-ratio',    label: 'Ratio bureaux/employé', unit: '', benchmark: 0.7, target: 0.6 },
    { id: 'daily-presence',label: 'Présence quotidienne', unit: '%', benchmark: 58 },
    { id: 'co2',           label: 'CO2 moyen', unit: 'ppm', benchmark: 620, target: 800 },
    { id: 'booking-rate',  label: 'Taux réservation salles', unit: '%', benchmark: 62 },
  ],
  norms: [
    { code: 'ERP W',       label: 'ERP type W (bureaux)', reference: 'CI Loi 2013-450 / FR CCH', domain: 'fire' },
    { code: 'Code travail',label: 'Code du travail (ergonomie)', reference: 'CI Code Travail / FR R.4213', domain: 'labor' },
    { code: 'BREEAM',      label: 'Certification environnementale', reference: 'BREEAM In-Use', domain: 'hygiene' },
    { code: 'LEED',        label: 'Certification LEED', reference: 'LEED v4.1 O+M', domain: 'hygiene' },
    { code: 'APSAD R82',   label: 'Vidéosurveillance', domain: 'security' },
    { code: 'ISO 7010',    label: 'Pictogrammes sécurité', domain: 'signage' },
    { code: 'PMR',         label: 'Accessibilité PMR', domain: 'accessibility' },
    { code: 'RE 2020',     label: 'Performance énergétique', domain: 'hygiene' },
  ],
  enabledVolumes: { operations: true, security: true, experience: true, wayfinder: true },
  exampleProjects: [
    { name: 'Tour CFAO',        location: 'Abidjan Plateau',  areaSqm: 35000, operator: 'CFAO' },
    { name: 'Immeuble BCEAO',   location: 'Dakar',            areaSqm: 28000, operator: 'BCEAO' },
    { name: 'One Airport Park', location: 'Accra',            areaSqm: 42000 },
  ],
}
