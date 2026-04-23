import type { VerticalConfig } from './types'

export const MULTI_SITE_CONFIG: VerticalConfig = {
  id: 'multi-site',
  label: 'Portfolio multi-sites',
  icon: '🏗️',
  description: 'REIT, foncière, portefeuille diversifié de bâtiments',
  color: '#b38a5a',
  benchmarks: [
    { source: 'EPRA sBPR (REITs)', region: 'International', year: 2024 },
    { source: 'GRESB Portfolio',   region: 'International', year: 2024 },
  ],
  primaryKpis: [
    { id: 'gross-yield',    label: 'Rendement brut', unit: '%', benchmark: 7.2, target: 9, color: '#b38a5a' },
    { id: 'noi-margin',     label: 'Marge NOI', unit: '%', benchmark: 62, target: 70 },
    { id: 'occupancy-avg',  label: 'Occupation portefeuille', unit: '%', benchmark: 85, target: 92 },
    { id: 'aum',            label: 'Actifs sous gestion', unit: 'MFCFA', benchmark: 45000 },
    { id: 'esg-score',      label: 'Score ESG GRESB', unit: '/100', benchmark: 72, target: 85 },
    { id: 'nav-per-share',  label: 'NAV / part', unit: 'FCFA' },
  ],
  norms: [
    { code: 'IFRS 16',     label: 'Contrats de location', reference: 'IFRS 16', domain: 'financial' },
    { code: 'IAS 40',      label: 'Immeubles de placement', reference: 'IAS 40', domain: 'financial' },
    { code: 'EPRA sBPR',   label: 'Reporting foncières durables', domain: 'financial' },
    { code: 'GRESB',       label: 'Benchmark durabilité immobilier', domain: 'financial' },
    { code: 'BREEAM In-Use', label: 'Certification environnementale', domain: 'hygiene' },
    { code: 'SYSCOHADA',   label: 'Comptabilité OHADA', domain: 'financial' },
  ],
  enabledVolumes: { operations: true, security: true, experience: true, wayfinder: true },
  exampleProjects: [
    { name: 'Cosmos Group Portfolio',        location: '8 sites Afrique',      areaSqm: 145000 },
    { name: 'Akwaba Real Estate',             location: '5 sites Côte d\'Ivoire', areaSqm: 82000 },
    { name: 'WAEMU Infrastructure Fund',      location: '12 sites UEMOA',       areaSqm: 210000 },
  ],
}
