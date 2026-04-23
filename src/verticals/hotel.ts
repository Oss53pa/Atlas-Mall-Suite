import type { VerticalConfig } from './types'

export const HOTEL_CONFIG: VerticalConfig = {
  id: 'hotel',
  label: 'Hôtel & hospitality',
  icon: '🏨',
  description: 'Hôtel, resort, boutique hôtel, residence hôtelière',
  color: '#ec4899',
  erpCategory: 'O',
  benchmarks: [
    { source: 'STR Global (MENA/Afrique)', region: 'MENA/Afrique', year: 2024 },
    { source: 'Deloitte Hospitality', region: 'Afrique subsaharienne', year: 2024 },
  ],
  primaryKpis: [
    { id: 'revpar',        label: 'RevPAR', unit: 'FCFA/chambre/nuit', benchmark: 52000, color: '#ec4899' },
    { id: 'adr',           label: 'ADR', unit: 'FCFA/chambre/nuit', benchmark: 78000 },
    { id: 'occupancy',     label: 'Taux d\'occupation', unit: '%', benchmark: 68, target: 75, color: '#10b981' },
    { id: 'alos',          label: 'ALOS (séjour moyen)', unit: 'nuits', benchmark: 2.4 },
    { id: 'nps',           label: 'NPS clients', unit: 'pts', benchmark: 38, target: 60 },
    { id: 'f-and-b',       label: 'Revenu F&B/chambre', unit: 'FCFA/chambre/jour', benchmark: 18500 },
  ],
  norms: [
    { code: 'ERP O',       label: 'ERP type O (hôtels)', reference: 'CI Loi 2013-450 / FR CCH', domain: 'fire' },
    { code: 'NF EN ISO 22483', label: 'Hospitalité — qualité de service', domain: 'hygiene' },
    { code: 'APSAD R82',   label: 'Vidéosurveillance', reference: 'APSAD R82', domain: 'security' },
    { code: 'HACCP',       label: 'Sécurité alimentaire F&B', domain: 'hygiene' },
    { code: 'ISO 7010',    label: 'Pictogrammes sécurité', reference: 'ISO 7010:2019', domain: 'signage' },
    { code: 'PMR',         label: 'Accessibilité PMR', reference: 'Loi 2005-102 FR / Arr. 2013 CI', domain: 'accessibility' },
  ],
  enabledVolumes: { operations: true, security: true, experience: true, wayfinder: true },
  exampleProjects: [
    { name: 'Sofitel Ivoire',  location: 'Abidjan Plateau', areaSqm: 45000, operator: 'Accor' },
    { name: 'Radisson Blu',    location: 'Dakar',           areaSqm: 32000, operator: 'RHG' },
    { name: 'Mövenpick Lomé',  location: 'Lomé',            areaSqm: 28000 },
  ],
}
