// F-004 : helpers extraits de Vol3Module.tsx. Fonctions pures, aucun effet de bord.

/** Abreviation 2-3 caracteres pour une icone de POI (fallback visuel). */
export function iconAbbrev(icon: string): string {
  const map: Record<string, string> = {
    'door-open': 'EN',
    store: 'ST',
    utensils: 'RS',
    crown: 'VIP',
    restroom: 'WC',
    elevator: 'ASC',
    escalator: 'ESC',
    'info-circle': 'i',
    prescription: 'PH',
    'cash-register': 'CA',
    car: 'PK',
  }
  return map[icon] ?? icon.slice(0, 2).toUpperCase()
}

/** Couleur hex pour la pastille d'un panneau selon son type. */
export function signageColor(type: string): string {
  if (type.startsWith('totem')) return '#F59E0B'
  if (type.includes('pmr') || type.includes('pictogramme')) return '#3B82F6'
  if (type.includes('sortie') || type.includes('secours') || type.includes('bloc')) return '#EF4444'
  if (type.includes('dir')) return '#10B981'
  return '#8B5CF6'
}

/** Identifiant unique court pour les messages chat. */
export function uid(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
