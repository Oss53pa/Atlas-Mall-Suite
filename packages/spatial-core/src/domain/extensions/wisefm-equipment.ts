// ═══ WISEFM — Cartographie d'équipements (CMMS) ═══
// Pour les 1400+ équipements Cosmos Yopougon. Migration prévue plus tard.

export enum WiseFMEntityType {
  // Équipements
  EQUIPMENT_HVAC = 'EQUIPMENT_HVAC',                   // CVC : clim, ventilation, chauffage
  EQUIPMENT_ELECTRICAL = 'EQUIPMENT_ELECTRICAL',       // électrique générique
  EQUIPMENT_PLUMBING = 'EQUIPMENT_PLUMBING',           // plomberie
  EQUIPMENT_LIFT = 'EQUIPMENT_LIFT',                   // ascenseur (équipement maintenance)
  EQUIPMENT_GENERIC = 'EQUIPMENT_GENERIC',             // équipement non catégorisé

  // Workcenters & maintenance
  WORKCENTER = 'WORKCENTER',                           // poste de travail / atelier
  INSPECTION_POINT = 'INSPECTION_POINT',               // point de vérification ronde
  PATROL_ROUTE = 'PATROL_ROUTE',                       // itinéraire de ronde
  MAINTENANCE_ZONE = 'MAINTENANCE_ZONE',               // zone d'intervention

  // Composants techniques fins
  VALVE = 'VALVE',                                     // vanne
  METER = 'METER',                                     // compteur (eau, électricité, gaz)
  ELECTRICAL_PANEL = 'ELECTRICAL_PANEL',               // tableau / TGBT
}

export const WISEFM_TYPES: ReadonlySet<string> = new Set(
  Object.values(WiseFMEntityType),
)
