// ═══ MALL VOL.3 — Expérience Utilisateur ═══
// Types pour Customer Journey, heatmap, parcours, capteurs.

export enum MallVol3EntityType {
  ATTRACTION_ZONE = 'ATTRACTION_ZONE',         // zone d'attraction (overlay heatmap chaud)
  FRICTION_POINT = 'FRICTION_POINT',           // point de friction observé
  DWELL_ZONE = 'DWELL_ZONE',                   // zone de stationnement client
  CUSTOMER_PATH = 'CUSTOMER_PATH',             // parcours-type (polyline)
  SENSOR_BEACON = 'SENSOR_BEACON',             // beacon BLE / capteur
  COUNTING_GATE = 'COUNTING_GATE',             // portique de comptage
  TOUCHPOINT = 'TOUCHPOINT',                   // point de contact marketing
  REST_AREA = 'REST_AREA',                     // zone de repos / mobilier détente
  PHOTO_SPOT = 'PHOTO_SPOT',                   // emplacement photogenique / instagrammable
}

export const MALL_VOL3_TYPES: ReadonlySet<string> = new Set(
  Object.values(MallVol3EntityType),
)
