import type { VerticalConfig } from './types'

export const INDUSTRIAL_CONFIG: VerticalConfig = {
  id: 'industrial',
  label: 'Logistique & industrie',
  icon: '🏭',
  description: 'Entrepôt, usine, plateforme logistique, site ATEX',
  color: '#14b8a6',
  benchmarks: [
    { source: 'SITL Logistics Benchmark', region: 'Europe + Afrique', year: 2024 },
    { source: 'GS1 Afrique', region: 'UEMOA/CEMAC', year: 2024 },
  ],
  primaryKpis: [
    { id: 'sku-rotation',   label: 'Rotation stock', unit: 'jours', benchmark: 32, target: 24, color: '#14b8a6' },
    { id: 'pick-per-hour',  label: 'Picks/heure/préparateur', unit: '', benchmark: 85, target: 110 },
    { id: 'order-accuracy', label: 'Précision préparation', unit: '%', benchmark: 98.5, target: 99.5 },
    { id: 'dock-turnaround',label: 'Temps moyen quai', unit: 'min', benchmark: 45, target: 30 },
    { id: 'storage-fillrate', label: 'Taux remplissage', unit: '%', benchmark: 78 },
    { id: 'accident-rate',  label: 'TF (accidents/M heures)', unit: '', benchmark: 12, target: 6 },
  ],
  norms: [
    { code: 'OHSAS 18001', label: 'Santé et sécurité au travail', domain: 'labor' },
    { code: 'ATEX 137',    label: 'Zones explosives', reference: 'Directive 1999/92/CE', domain: 'fire' },
    { code: 'ISO 45001',   label: 'SST managériale', domain: 'labor' },
    { code: 'NFPA 101',    label: 'Code sécurité vie', domain: 'fire' },
    { code: 'ICPE',        label: 'Installation classée', reference: 'Code environnement FR', domain: 'fire' },
    { code: 'GS1',         label: 'Standards logistiques (codes-barres)', domain: 'labor' },
    { code: 'APSAD R82',   label: 'Vidéosurveillance', domain: 'security' },
  ],
  enabledVolumes: { operations: true, security: true, experience: false, wayfinder: true },
  exampleProjects: [
    { name: 'Plateforme CEVA',    location: 'Abidjan Port-Bouët', areaSqm: 28000, operator: 'CEVA Logistics' },
    { name: 'Hub Maersk',          location: 'Tema',               areaSqm: 42000 },
    { name: 'Zone franche VITIB',  location: 'Grand-Bassam',        areaSqm: 65000 },
  ],
}
