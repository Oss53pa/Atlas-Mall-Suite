// ═══ FLOOR LEVEL — Canonical enum for multi-storey mall plans ═══
// Source unique de vérité pour les niveaux d'étage.
// Utilisé par Vol.1 (Commercial), Vol.2 (Sécurité), Vol.3 (Parcours).

/** Niveaux normalisés (convention française Afrique de l'Ouest). */
export enum FloorLevel {
  /** Sous-sol 2 — parking profond ou techniques. */
  B2 = 'B2',
  /** Sous-sol 1 — parking / logistique. */
  B1 = 'B1',
  /** Rez-de-jardin — niveau intermédiaire bas (terrain en pente). */
  RDJ = 'RDJ',
  /** Rez-de-chaussée — niveau principal d'accès. */
  RDC = 'RDC',
  /** Mezzanine — niveau partiel au-dessus du RDC. */
  MEZZ = 'MEZZ',
  /** 1er étage. */
  R1 = 'R+1',
  /** 2e étage. */
  R2 = 'R+2',
  /** 3e étage. */
  R3 = 'R+3',
  /** Toiture / terrasse accessible. */
  ROOF = 'ROOF',
  /** Parking extérieur (cour). */
  PARKING = 'PARKING',
}

/** Ordre d'empilement vertical (0 = RDC, négatif = sous-sol, positif = étages). */
export const FLOOR_STACK_ORDER: Record<FloorLevel, number> = {
  [FloorLevel.B2]: -2,
  [FloorLevel.B1]: -1,
  [FloorLevel.PARKING]: -1, // même niveau logique que B1 (extérieur)
  [FloorLevel.RDJ]: -0.5,
  [FloorLevel.RDC]: 0,
  [FloorLevel.MEZZ]: 0.5,
  [FloorLevel.R1]: 1,
  [FloorLevel.R2]: 2,
  [FloorLevel.R3]: 3,
  [FloorLevel.ROOF]: 4,
}

/** Hauteur sous-plafond par défaut en mètres. */
export const FLOOR_HEIGHT_M: Record<FloorLevel, number> = {
  [FloorLevel.B2]: 2.8,
  [FloorLevel.B1]: 2.8,
  [FloorLevel.PARKING]: 2.5,
  [FloorLevel.RDJ]: 3.2,
  [FloorLevel.RDC]: 4.0,
  [FloorLevel.MEZZ]: 2.8,
  [FloorLevel.R1]: 3.5,
  [FloorLevel.R2]: 3.5,
  [FloorLevel.R3]: 3.5,
  [FloorLevel.ROOF]: 3.0,
}

/** Libellé affichable (FR). */
export const FLOOR_LABEL_FR: Record<FloorLevel, string> = {
  [FloorLevel.B2]: 'Sous-sol 2',
  [FloorLevel.B1]: 'Sous-sol 1',
  [FloorLevel.PARKING]: 'Parking',
  [FloorLevel.RDJ]: 'Rez-de-jardin',
  [FloorLevel.RDC]: 'Rez-de-chaussée',
  [FloorLevel.MEZZ]: 'Mezzanine',
  [FloorLevel.R1]: '1er étage',
  [FloorLevel.R2]: '2e étage',
  [FloorLevel.R3]: '3e étage',
  [FloorLevel.ROOF]: 'Toiture',
}

/** Parse une chaine libre vers un FloorLevel canonique. */
export function parseFloorLevel(raw: string | undefined | null): FloorLevel | null {
  if (!raw) return null
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, '')

  // Correspondances directes
  if (s in FloorLevel) return FloorLevel[s as keyof typeof FloorLevel]

  // Patrons courants
  if (/^(S|SS|SOUS[-]?SOL)[\s-]?2/i.test(s) || s === 'B2') return FloorLevel.B2
  if (/^(S|SS|SOUS[-]?SOL)[\s-]?1?$/i.test(s) || s === 'B1') return FloorLevel.B1
  if (/PARKING|PARK|COUR/i.test(s)) return FloorLevel.PARKING
  if (/(RDJ|REZ[-]?DE[-]?JARDIN)/i.test(s)) return FloorLevel.RDJ
  if (/(RDC|REZ[-]?DE[-]?CHAUSS|GROUND|GF)/i.test(s)) return FloorLevel.RDC
  if (/(MEZZ|MEZZANINE)/i.test(s)) return FloorLevel.MEZZ
  if (/^R[+]?1$|^1ER$|^ETAGE1$/i.test(s)) return FloorLevel.R1
  if (/^R[+]?2$|^2EME$|^ETAGE2$/i.test(s)) return FloorLevel.R2
  if (/^R[+]?3$|^3EME$|^ETAGE3$/i.test(s)) return FloorLevel.R3
  if (/(ROOF|TOITURE|TERRASSE)/i.test(s)) return FloorLevel.ROOF

  return null
}

/** Déduit un FloorLevel depuis un stackOrder numérique. */
export function floorLevelFromStackOrder(order: number): FloorLevel {
  const rounded = Math.round(order)
  if (rounded <= -2) return FloorLevel.B2
  if (rounded === -1) return FloorLevel.B1
  if (rounded === 0) return FloorLevel.RDC
  if (rounded === 1) return FloorLevel.R1
  if (rounded === 2) return FloorLevel.R2
  if (rounded === 3) return FloorLevel.R3
  if (rounded >= 4) return FloorLevel.ROOF
  return FloorLevel.RDC
}

/** Ordonne une liste d'étages du plus bas au plus haut. */
export function sortByStackOrder<T extends { level: FloorLevel }>(floors: T[]): T[] {
  return [...floors].sort((a, b) => FLOOR_STACK_ORDER[a.level] - FLOOR_STACK_ORDER[b.level])
}
