import type { VerticalConfig } from './types'

export const HOSPITAL_CONFIG: VerticalConfig = {
  id: 'hospital',
  label: 'Hôpital & santé',
  icon: '🏥',
  description: 'Hôpital, clinique, polyclinique, centre médical',
  color: '#ef4444',
  erpCategory: 'U',
  benchmarks: [
    { source: 'HAS / OMS Afrique', region: 'Afrique subsaharienne', year: 2024 },
    { source: 'Health FM Benchmark', region: 'International', year: 2024 },
  ],
  primaryKpis: [
    { id: 'bed-occupancy', label: 'Taux occupation lits', unit: '%', benchmark: 82, target: 85, color: '#ef4444' },
    { id: 'alos',          label: 'Durée moyenne séjour', unit: 'jours', benchmark: 4.8 },
    { id: 'ed-wait',       label: 'Attente urgences', unit: 'min', benchmark: 45, target: 30 },
    { id: 'or-utilization',label: 'Utilisation bloc opératoire', unit: '%', benchmark: 68, target: 80 },
    { id: 'readmission',   label: 'Taux réadmission 30j', unit: '%', benchmark: 12, target: 8 },
    { id: 'hais',          label: 'Infections nosocomiales', unit: '‰', benchmark: 5.2, target: 3 },
  ],
  norms: [
    { code: 'ERP U',       label: 'ERP type U (soins)', reference: 'CI Loi 2013-450 / FR CCH', domain: 'fire' },
    { code: 'HAS V2020',   label: 'Certification qualité HAS', reference: 'HAS Certification V2020', domain: 'hygiene' },
    { code: 'ISO 14971',   label: 'Gestion des risques dispositifs médicaux', domain: 'security' },
    { code: 'ISO 15189',   label: 'Qualité biologie médicale', domain: 'hygiene' },
    { code: 'NF S 90-351', label: 'Salles propres (bloc op)', reference: 'NF S 90-351', domain: 'hygiene' },
    { code: 'RGPD santé',  label: 'Données de santé', reference: 'RGPD + HDS', domain: 'labor' },
    { code: 'PMR',         label: 'Accessibilité PMR renforcée', domain: 'accessibility' },
    { code: 'ISO 7010',    label: 'Pictogrammes', domain: 'signage' },
  ],
  enabledVolumes: { operations: true, security: true, experience: true, wayfinder: true },
  exampleProjects: [
    { name: 'CHU Treichville',  location: 'Abidjan', areaSqm: 65000, operator: 'Ministère de la Santé CI' },
    { name: 'Polyclinique Internationale Ste Anne-Marie', location: 'Abidjan', areaSqm: 22000 },
    { name: 'Hôpital Principal', location: 'Dakar',  areaSqm: 48000 },
  ],
}
