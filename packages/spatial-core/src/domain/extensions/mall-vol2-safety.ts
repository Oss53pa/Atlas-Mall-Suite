// ═══ MALL VOL.2 — Sécurité & Conformité (APSAD R82, ERP) ═══
// Types spécifiques à la conformité incendie, évacuation, surveillance.

export enum MallVol2EntityType {
  // Évacuation & rassemblement
  EMERGENCY_EXIT = 'EMERGENCY_EXIT',
  ASSEMBLY_POINT = 'ASSEMBLY_POINT',
  EVACUATION_PATH = 'EVACUATION_PATH',
  DEGAGEMENT = 'DEGAGEMENT',                   // dégagement réglementaire ERP

  // Lutte contre l'incendie
  RIA = 'RIA',                                 // Robinet Incendie Armé
  EXTINGUISHER = 'EXTINGUISHER',
  FIRE_HYDRANT = 'FIRE_HYDRANT',               // hydrant (poteau ou prise)
  SMOKE_EXTRACTION = 'SMOKE_EXTRACTION',       // exutoire / désenfumage
  FIRE_COMPARTMENT = 'FIRE_COMPARTMENT',       // compartimentage coupe-feu
  FIRE_DOOR = 'FIRE_DOOR',                     // porte coupe-feu

  // Surveillance
  CCTV_CAMERA = 'CCTV_CAMERA',
  CCTV_ZONE = 'CCTV_ZONE',                     // zone couverte par CCTV
  ACCESS_CONTROL = 'ACCESS_CONTROL',           // lecteur badge / tourniquet

  // Alarme & secours
  ALARM_POINT = 'ALARM_POINT',
  DEFIBRILLATOR = 'DEFIBRILLATOR',
  FIRST_AID_KIT = 'FIRST_AID_KIT',
}

export const MALL_VOL2_TYPES: ReadonlySet<string> = new Set(
  Object.values(MallVol2EntityType),
)
