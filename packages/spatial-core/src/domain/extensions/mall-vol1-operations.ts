// ═══ MALL VOL.1 — Opérations & Business ═══
// Types spécifiques à la planification merchandising mix, GLA, zoning,
// plan de masse commercial.

export enum MallVol1EntityType {
  BOUTIQUE_BOUNDARY = 'BOUTIQUE_BOUNDARY',     // périmètre boutique (logique, invisible 3D, contribue GLA)
  LEASE_LOT = 'LEASE_LOT',                     // lot locatif
  COMMON_AREA = 'COMMON_AREA',                 // partie commune
  TECHNICAL_ROOM = 'TECHNICAL_ROOM',           // local technique
  RESERVE_STORAGE = 'RESERVE_STORAGE',         // réserve commerciale
  FOOD_COURT_ZONE = 'FOOD_COURT_ZONE',         // zone food court
  RESTROOM_BLOCK = 'RESTROOM_BLOCK',           // bloc sanitaires public
  ATM_LOCATION = 'ATM_LOCATION',               // emplacement DAB
  CASH_DESK = 'CASH_DESK',                     // caisse / point d'encaissement
}

export const MALL_VOL1_TYPES: ReadonlySet<string> = new Set(
  Object.values(MallVol1EntityType),
)
