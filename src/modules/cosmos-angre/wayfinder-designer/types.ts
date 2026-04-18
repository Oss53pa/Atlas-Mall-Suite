// ═══ WAYFINDER DESIGNER — Types ═══
//
// Contrat typé complet du module Wayfinder Designer.
// Référence : Cahier des charges PROPH3T v1.0 sections 03-11.
//
// Conventions :
//   - Tout composant React de template reçoit DesignerConfig en prop unique.
//   - Les exports sont produits à partir de DesignerConfig + TemplateMetadata.
//   - Les dimensions print sont en mm, les digitales en px.
//   - Tous les textes sont résolvables via i18nStrings (pas de littéraux en dur).

// ─── 1. Projet ─────────────────────────────────────

export type LocaleCode =
  | 'fr-FR' | 'fr-CI' | 'en-US' | 'en-GB'
  | 'ar-MA' | 'he-IL'
  | 'ff-CI'     // peul Côte d'Ivoire
  | 'dyu-CI'   // dioula Côte d'Ivoire
  | 'ln-CD'    // lingala
  | 'sw-KE'    // swahili Kenya

export type TextDirection = 'ltr' | 'rtl'

export interface ProjectMeta {
  /** Id projet lié (Supabase projets.id). */
  projetId?: string
  /** Id du Designer project (table designer_projects). */
  designerProjectId?: string
  /** Nom du centre / lieu visible dans tous les exports. */
  siteName: string
  /** Ville, pays. */
  location: string
  /** Description courte (≤ 140 caractères). */
  tagline?: string
  /** Langues supportées (ordre = priorité, [0] = défaut). */
  locales: LocaleCode[]
  /** Langue actuellement active dans le Designer (preview). */
  activeLocale: LocaleCode
  /** Sens d'écriture (dérivé de activeLocale par défaut). */
  dir: TextDirection
  /** URL (blob ou CDN) du logo principal. */
  logoUrl?: string
  /** Version dark du logo (fond sombre). */
  logoDarkUrl?: string
  /** Ratio largeur / hauteur du logo (pour réserver l'espace). */
  logoAspectRatio?: number
  /** Id du graphe de navigation Vol.3 associé (JSON wayfinding v2.0.0-vol4). */
  wayfindingGraphId?: string
  /** Numéro de version sémantique du projet. */
  version: string
  /** Horodatage de la dernière modification. */
  updatedAt: string
}

// ─── 2. Charte graphique (§05 brandEngine) ────────

export type BorderRadiusScale = 'none' | 'sm' | 'md' | 'lg' | 'full'
export type IconStyle = 'outline' | 'filled' | 'duotone'
export type MapStyle = 'default' | 'minimal' | 'satellite' | 'blueprint'

export interface FontDef {
  /** Nom humain (ex: "Inter"). */
  family: string
  /** Source : 'google' | 'local-woff2' | 'system'. */
  source: 'google' | 'local-woff2' | 'system'
  /** Poids disponibles. */
  weights: number[]
  /** URL si local ou Google Fonts URL (CSS stylesheet). */
  url?: string
  /** Fallback CSS (ex: "system-ui, sans-serif"). */
  fallback: string
}

export interface BrandPalette {
  primary: string       // hex #RRGGBB
  secondary: string
  accent: string
  emergency: string     // toujours conforme WCAG AA sur blanc ≥ 4.5:1
  neutral: string
  background: string
  backgroundDark: string
  foreground: string
  foregroundDark: string
}

export interface BrandConfig {
  palette: BrandPalette
  fonts: {
    heading: FontDef
    body: FontDef
    mono?: FontDef
  }
  borderRadius: BorderRadiusScale
  iconStyle: IconStyle
  mapStyle: MapStyle
  /** Mode par défaut (preview peut basculer). */
  themeMode: 'light' | 'dark' | 'auto'
  /** Niveau de contraste cible. */
  wcagLevel: 'AA' | 'AAA'
  /** Adapter Figma / Brandfolder si import tiers. */
  source?: {
    kind: 'manual' | 'figma' | 'brandfolder' | 'generated-from-primary'
    importedAt?: string
    sourceId?: string
  }
}

// ─── 3. Templates (§04) ─────────────────────────────

export type TemplateKind = 'digital-kiosk' | 'digital-web' | 'digital-tablet' | 'print-poster'

export type TemplateFormat =
  // Digital
  | 'kiosk-portrait-1080x1920'
  | 'kiosk-landscape-1920x1080'
  | 'web-responsive'
  | 'tablet-portrait-768x1024'
  // Print
  | 'poster-A0'
  | 'poster-A1'
  | 'poster-A2'

export interface DimensionsPx {
  unit: 'px'
  width: number
  height: number
  dpi?: number
}

export interface DimensionsMm {
  unit: 'mm'
  width: number
  height: number
  /** DPI cible pour le rendu (>= 150 pour impression). */
  dpi: number
}

export type TemplateDimensions = DimensionsPx | DimensionsMm

export interface TemplateMetadata {
  id: string
  format: TemplateFormat
  kind: TemplateKind
  label: string
  description: string
  /** Dimensions natives. */
  dimensions: TemplateDimensions
  /** Pour web-responsive : breakpoints supportés. */
  breakpoints?: number[]
  /** Ratio largeur/hauteur (pour preview scaling). */
  aspectRatio: number
  /** Thumbnail URL (pour la galerie). */
  thumbnailUrl?: string
  /** Marge interne conseillée en mm (print) ou px (digital). */
  safeMargin: number
  /** Bleed en mm pour print (0 pour digital). */
  bleed: number
  /** Tags pour filtrage (portrait, landscape, A4, QR, etc.) */
  tags: string[]
  /** Version schema — protection contre changements incompatibles */
  schemaVersion: string
}

// ─── 4. Canvas / Configuration d'un déploiement ───

export interface MapLayerConfig {
  showWalls: boolean
  showSpaces: boolean
  showPaths: boolean
  showPOIs: boolean
  showSignage: boolean
  showEntrances: boolean
  showGrid: boolean
  /** Étages à afficher (ids). */
  visibleFloorIds: string[]
  /** Opacité 0..1 par calque. */
  opacityBySpaceType?: Partial<Record<string, number>>
}

export interface LegendConfig {
  enabled: boolean
  position: 'left' | 'right' | 'bottom' | 'floating'
  showCategories: boolean
  showLandmarks: boolean
  maxItems?: number
}

export interface HeaderConfig {
  enabled: boolean
  showLogo: boolean
  showSiteName: boolean
  showTagline: boolean
  showLanguageSwitch: boolean
  /** Hauteur en % du canvas (digital) ou mm (print). */
  height: number
}

export interface FooterConfig {
  enabled: boolean
  showQrCode: boolean
  qrUrl?: string
  showVersion: boolean
  showScaleBar: boolean
  showNorthArrow: boolean
  showLegalMentions: boolean
  customText?: string
}

export interface SearchConfig {
  enabled: boolean
  placeholder?: string
  suggestCategories: string[]
  maxResults: number
  showKeyboard: boolean
  keyboardLayout: 'azerty' | 'qwerty' | 'custom'
}

export interface AttractConfig {
  enabled: boolean
  /** Secondes d'inactivité avant attract. */
  inactivitySec: number
  /** Message affiché. */
  message: string
  /** Animation : zoom-loop, pulse, scroll-through. */
  animation: 'zoom-loop' | 'pulse' | 'scroll-through' | 'none'
}

export interface PoiHighlight {
  poiId: string
  category: 'anchor' | 'new' | 'featured' | 'amenity'
  customIcon?: string
}

export interface DesignerConfig {
  project: ProjectMeta
  brand: BrandConfig
  /** Template sélectionné (id). */
  templateId: string
  /** Format de sortie sélectionné. */
  format: TemplateFormat
  /** Config plan / calques. */
  map: MapLayerConfig
  /** Légende. */
  legend: LegendConfig
  /** Header. */
  header: HeaderConfig
  /** Footer. */
  footer: FooterConfig
  /** Recherche (digital uniquement). */
  search: SearchConfig
  /** Attract loop (digital borne uniquement). */
  attract: AttractConfig
  /** POIs mis en avant. */
  highlightedPois: PoiHighlight[]
  /** Overrides texte par locale. */
  i18nStrings: Partial<Record<LocaleCode, Record<string, string>>>
  /** Mode preview courant. */
  previewMode: 'light' | 'dark'
  /** Simulation daltonisme pour preview. */
  colorBlindnessSim?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
}

// ─── 5. Template React interface (§04 contrainte) ─

export interface TemplateProps {
  config: DesignerConfig
  metadata: TemplateMetadata
  /** Données plan injectées depuis Vol.3. */
  planData: InjectedPlanData
  /** Mode rendu : 'live' preview interactive, 'export' rendu headless. */
  renderMode: 'live' | 'export'
}

export interface Template {
  metadata: TemplateMetadata
  render: (props: TemplateProps) => React.ReactNode
  getMetadata: () => TemplateMetadata
  getSupportedFormats: () => TemplateFormat[]
}

// ─── 6. Injection Vol.3 (§09) ──────────────────────

import type { Vol4WayfindingExport } from '../shared/engines/plan-analysis/signageExportEngine'

export interface InjectedPoi {
  id: string
  label: string
  type: string
  x: number
  y: number
  floorId?: string
  icon?: string
  color?: string
}

export interface InjectedFloor {
  id: string
  label: string
  order: number
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>
  spaces: Array<{
    id: string
    label: string
    type: string
    polygon: [number, number][]
  }>
  bounds: { width: number; height: number }
}

export interface InjectedPlanData {
  projectName: string
  floors: InjectedFloor[]
  pois: InjectedPoi[]
  entrances: Array<{ id: string; label: string; x: number; y: number; floorId?: string }>
  exits: Array<{ id: string; label: string; x: number; y: number; floorId?: string }>
  /** Graphe wayfinding brut (pour A* runtime borne). */
  wayfindingGraph?: Vol4WayfindingExport
}

// ─── 7. Export ─────────────────────────────────────

export type DigitalExportFormat =
  | 'html-single-file'     // HTML auto-contenu (< 5 Mo cible)
  | 'bundle-zip'           // dossier borne (index.html + assets + sw.js)
  | 'static-site'          // Vite SSG prêt Netlify/Vercel
  | 'qr-svg'               // QR code SVG vectoriel
  | 'qr-png'               // QR code PNG 1024px
  | 'manifest-json'        // config.json borne

export type PrintExportFormat =
  | 'pdf'                  // jsPDF grand format
  | 'svg'                  // SVG vectoriel pur
  | 'png-hd'               // PNG 300 DPI

export type ExportFormat = DigitalExportFormat | PrintExportFormat

export type ColorSpace = 'sRGB' | 'CMYK'

export interface ExportOptions {
  format: ExportFormat
  /** Pour print : CMJN ou sRGB. CMJN nécessite post-processing. */
  colorSpace: ColorSpace
  /** Bleed en mm (print). */
  bleedMm: number
  /** Traits de coupe. */
  cropMarks: boolean
  /** DPI cible (print). */
  dpi: number
  /** URL qui sera encodée dans le QR (digital). */
  qrUrl?: string
  /** Paramètres UTM optionnels. */
  utm?: { source?: string; medium?: string; campaign?: string }
  /** Nom de fichier souhaité (sans extension). */
  filename?: string
  /** Inclure le watermark "version/date" en pied. */
  includeWatermark: boolean
  /** En-tête HTTP / métadonnées PDF. */
  metadata?: {
    title?: string
    author?: string
    keywords?: string[]
  }
}

export interface ExportResult {
  blob: Blob
  filename: string
  mimeType: string
  sizeBytes: number
  durationMs: number
  format: ExportFormat
  warnings: string[]
}

// ─── 8. Runtime borne (§08) ────────────────────────

export interface KioskRuntimeConfig {
  /** Id borne (matche `kiosks[].id` du store Vol4). */
  kioskId: string
  /** URL backend télémétrie. */
  telemetryUrl?: string
  /** Fréquence heartbeat (sec). */
  heartbeatSec: number
  /** Langues disponibles (dérivé de project.locales). */
  locales: LocaleCode[]
  /** Langue par défaut. */
  defaultLocale: LocaleCode
  /** Attract config. */
  attract: AttractConfig
  /** Désactive clic droit + F12. */
  lockBrowser: boolean
  /** Clavier tactile layout. */
  keyboardLayout: 'azerty' | 'qwerty' | 'custom'
  /** Mode accessibilité persistant (sinon remis à zéro par attract). */
  persistA11y: boolean
  /** URL deep link mobile pour QR transfert. */
  mobileDeepLinkBaseUrl?: string
}

export interface KioskTelemetryEvent {
  kioskId: string
  kind: 'search' | 'destination-selected' | 'route-computed' | 'qr-scanned'
    | 'attract-start' | 'session-reset' | 'pmr-toggle' | 'locale-change'
    | 'heartbeat' | 'error'
  payload?: Record<string, unknown>
  locale?: LocaleCode
  sessionHash: string
  timestampMs: number
}

// ─── 9. Designer Project (persistence §10) ────────

export type DesignerProjectStatus = 'draft' | 'review' | 'published' | 'archived'

export interface DesignerProjectRecord {
  id: string
  projetId: string
  name: string
  status: DesignerProjectStatus
  /** Config sérialisable complète. */
  config: DesignerConfig
  /** Version sémantique du projet (bump sur chaque publish). */
  version: string
  /** Historique des versions publiées. */
  versionHistory: Array<{
    version: string
    publishedAt: string
    publishedBy?: string
    changelog?: string
  }>
  /** Id de la borne associée si déployé. */
  deployedKioskIds: string[]
  createdAt: string
  updatedAt: string
  /** Dernier autosave. */
  lastAutosaveAt?: string
}

// ─── 10. Feature flag ──────────────────────────────

/**
 * Clé localStorage activant le Designer.
 * Permet à l'application de fonctionner identiquement si le module est off.
 */
export const WAYFINDER_DESIGNER_FEATURE_FLAG = 'atlas-feature-wayfinder-designer'

export function isDesignerEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(WAYFINDER_DESIGNER_FEATURE_FLAG)
  // Par défaut activé (spec §11). Valeur 'false' désactive.
  return raw !== 'false'
}
