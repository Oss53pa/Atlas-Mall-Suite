// ═══ Configuration des secteurs commerciaux — partage Vol.1 / Vol.3 ═══

import type { Sector } from '../../vol1-commercial/store/vol1Types'

export const SECTOR_LABELS: Record<Sector, string> = {
  mode: 'Mode',
  restauration: 'Restauration',
  services: 'Services',
  loisirs: 'Loisirs',
  alimentaire: 'Alimentaire',
  beaute: 'Beauté',
  electronique: 'Electronique',
  bijouterie: 'Bijouterie',
  banque: 'Banque',
  sante: 'Santé',
  enfants: 'Enfants',
  maison: 'Maison',
  sport: 'Sport',
}

export const SECTOR_COLORS: Record<Sector, string> = {
  mode: '#ec4899',
  restauration: '#f59e0b',
  services: '#38bdf8',
  loisirs: '#a77d4c',
  alimentaire: '#22c55e',
  beaute: '#f472b6',
  electronique: '#06b6d4',
  bijouterie: '#fbbf24',
  banque: '#b38a5a',
  sante: '#ef4444',
  enfants: '#a78bfa',
  maison: '#14b8a6',
  sport: '#f97316',
}
