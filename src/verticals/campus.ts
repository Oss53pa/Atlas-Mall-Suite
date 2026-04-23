import type { VerticalConfig } from './types'

export const CAMPUS_CONFIG: VerticalConfig = {
  id: 'campus',
  label: 'Campus & éducation',
  icon: '🎓',
  description: 'Université, école, grande école, campus mixte',
  color: '#a855f7',
  erpCategory: 'R',
  benchmarks: [
    { source: 'EDUCAUSE Campus Benchmarks', region: 'International', year: 2024 },
    { source: 'CAMES Afrique', region: 'Afrique francophone', year: 2024 },
  ],
  primaryKpis: [
    { id: 'room-occupancy', label: 'Taux occupation salles', unit: '%', benchmark: 54, target: 70, color: '#a855f7' },
    { id: 'student-ratio',  label: 'Étudiants / enseignant', unit: '', benchmark: 22 },
    { id: 'library-use',    label: 'Taux usage bibliothèque', unit: '%', benchmark: 45 },
    { id: 'event-bookings', label: 'Réservations événements/sem', unit: '', benchmark: 28 },
    { id: 'campus-dwell',   label: 'Présence campus/jour', unit: 'h', benchmark: 6.2 },
    { id: 'accessibility',  label: 'Conformité accessibilité', unit: '%', benchmark: 82, target: 100 },
  ],
  norms: [
    { code: 'ERP R',       label: 'ERP type R (enseignement)', reference: 'CI Loi 2013-450 / FR CCH', domain: 'fire' },
    { code: 'CAMES',       label: 'Accréditation enseignement supérieur', domain: 'labor' },
    { code: 'ISO 21001',   label: 'Système de management éducatif', domain: 'labor' },
    { code: 'APSAD R82',   label: 'Vidéosurveillance', domain: 'security' },
    { code: 'PMR',         label: 'Accessibilité PMR', domain: 'accessibility' },
    { code: 'ISO 7010',    label: 'Pictogrammes sécurité', domain: 'signage' },
    { code: 'RGPD étudiants', label: 'Données personnelles étudiants', domain: 'labor' },
  ],
  enabledVolumes: { operations: true, security: true, experience: true, wayfinder: true },
  exampleProjects: [
    { name: 'Université Houphouët-Boigny', location: 'Abidjan Cocody', areaSqm: 120000 },
    { name: 'INP-HB',                        location: 'Yamoussoukro',    areaSqm: 95000 },
    { name: 'Campus INSEEC Africa',          location: 'Abidjan',          areaSqm: 18000 },
  ],
}
