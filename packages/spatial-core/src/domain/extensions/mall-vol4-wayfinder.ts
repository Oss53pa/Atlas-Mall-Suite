// ═══ MALL VOL.4 — Wayfinder ═══
// Signalétique, orientation, navigation indoor, accessibilité PMR.

export enum MallVol4EntityType {
  // Signalétique
  WAYFINDER_TOTEM = 'WAYFINDER_TOTEM',                 // totem directionnel sol (h ~2.4 m)
  WAYFINDER_HANGING_SIGN = 'WAYFINDER_HANGING_SIGN',   // panneau suspendu
  WAYFINDER_WALL_SIGN = 'WAYFINDER_WALL_SIGN',         // panneau mural
  WAYFINDER_FLOOR_MARKER = 'WAYFINDER_FLOOR_MARKER',   // marqueur sol (vinyle, flèche)
  YOU_ARE_HERE_POINT = 'YOU_ARE_HERE_POINT',           // plan d'orientation YAH
  DECISION_POINT = 'DECISION_POINT',                   // point de décision logique (intersection)

  // Transitions verticales
  ELEVATOR = 'ELEVATOR',
  ESCALATOR = 'ESCALATOR',
  STAIRS = 'STAIRS',

  // PMR & accessibilité
  PMR_PATH = 'PMR_PATH',                               // chemin PMR (overlay bleu)
  PMR_RAMP = 'PMR_RAMP',                               // rampe d'accès PMR
  PMR_RESTROOM = 'PMR_RESTROOM',                       // sanitaires PMR
  TACTILE_GUIDE = 'TACTILE_GUIDE',                     // bande de guidage tactile (sol)
  BRAILLE_SIGN = 'BRAILLE_SIGN',                       // signalétique braille
  AUDIO_BEACON = 'AUDIO_BEACON',                       // balise audio non-voyants
}

export const MALL_VOL4_TYPES: ReadonlySet<string> = new Set(
  Object.values(MallVol4EntityType),
)
