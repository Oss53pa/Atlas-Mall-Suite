// ═══ ATLAS LEASE — Gestion locative (SAP RE-FX parity) ═══
// Lots, parties communes/privatives, surfaces utiles, GLA.

export enum AtlasLeaseEntityType {
  LEASE_LOT_PRIVATE = 'LEASE_LOT_PRIVATE',     // partie privative
  LEASE_LOT_COMMON = 'LEASE_LOT_COMMON',       // partie commune
  USEFUL_AREA = 'USEFUL_AREA',                 // surface utile (SU)
  WEIGHTED_AREA = 'WEIGHTED_AREA',             // surface pondérée (SP)
  GLA_AREA = 'GLA_AREA',                       // Gross Leasable Area
  BUILDING_FOOTPRINT = 'BUILDING_FOOTPRINT',   // emprise au sol bâti
  EASEMENT = 'EASEMENT',                       // servitude
}

export const ATLAS_LEASE_TYPES: ReadonlySet<string> = new Set(
  Object.values(AtlasLeaseEntityType),
)
