// ═══ CANVAS CONSTANTS — Shared scalars for the floor-plan canvas stack ═══
// Extracted from FloorPlanCanvas.tsx to break the
// FloorPlanCanvas ↔ CotationLayer / DimOverlay circular dependency.
// Any child overlay that needs CANVAS_SCALE imports from here.

/** Pixels per metre for the SVG canvas (legacy mock-data coord system). */
export const CANVAS_SCALE = 4
