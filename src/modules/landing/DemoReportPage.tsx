// ═══ DEMO — Rapport Parcours Client généré par Proph3t ═══
//
// Rapport HTML autonome, professionnel, directement inlined — aucun
// passage par le builder legacy (qui échappait les balises HTML inline
// et produisait un rendu trop plat). Destiné à être envoyé au DG, aux
// investisseurs ou aux opérateurs : mise en page type rapport exécutif,
// typo pro, tableau de bord KPIs, plan 2D SVG annoté, sections
// hiérarchisées, actions cliquables en pied de page.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, Share2, Sparkles } from 'lucide-react'

// ─── Config démo ──────────────────────────────────────────

interface DemoSpace {
  id: string
  label: string
  x: number; y: number; w: number; h: number
  color: string
  icon: string
  type: string
}

const MALL: { widthM: number; heightM: number; spaces: DemoSpace[] } = {
  widthM: 200, heightM: 140,
  spaces: [
    { id: 's-entry-n',   label: 'Entrée Nord',          x: 95,  y: 5,   w: 10, h: 8,  color: '#10b981', icon: '🚪', type: 'Entrée' },
    { id: 's-entry-s',   label: 'Entrée Sud',           x: 95,  y: 127, w: 10, h: 8,  color: '#10b981', icon: '🚪', type: 'Entrée' },
    { id: 's-foodcourt', label: 'Food Court',           x: 140, y: 40,  w: 45, h: 35, color: '#f59e0b', icon: '🍔', type: 'Restauration' },
    { id: 's-anchor-1',  label: 'Hypermarché Carrefour',x: 10,  y: 20,  w: 60, h: 55, color: '#2563eb', icon: '🛒', type: 'Grande surface' },
    { id: 's-mode-hg',   label: 'Galerie Mode',         x: 80,  y: 25,  w: 40, h: 20, color: '#ec4899', icon: '👗', type: 'Commerce' },
    { id: 's-beaute',    label: 'Cluster Beauté',       x: 80,  y: 50,  w: 25, h: 18, color: '#d946ef', icon: '💄', type: 'Commerce' },
    { id: 's-tech',      label: 'Espace Tech',          x: 108, y: 50,  w: 28, h: 18, color: '#6366f1', icon: '💻', type: 'Commerce' },
    { id: 's-enfants',   label: 'Aire de jeux enfants', x: 15,  y: 85,  w: 30, h: 25, color: '#fbbf24', icon: '🎈', type: 'Loisirs' },
    { id: 's-cine',      label: 'Cinéma (5 salles)',    x: 55,  y: 85,  w: 40, h: 40, color: '#8b5cf6', icon: '🎬', type: 'Loisirs' },
    { id: 's-pharma',    label: 'Pharmacie + Santé',    x: 110, y: 90,  w: 18, h: 15, color: '#22c55e', icon: '💊', type: 'Santé' },
    { id: 's-banque',    label: 'Services & Banques',   x: 135, y: 90,  w: 22, h: 15, color: '#14b8a6', icon: '🏦', type: 'Services' },
    { id: 's-wc-1',      label: 'Sanitaires RDC-1',     x: 75,  y: 72,  w: 6,  h: 8,  color: '#64748b', icon: '🚻', type: 'Sanitaire' },
    { id: 's-wc-2',      label: 'Sanitaires RDC-2',     x: 160, y: 110, w: 6,  h: 8,  color: '#64748b', icon: '🚻', type: 'Sanitaire' },
    { id: 's-info',      label: 'Point Information',    x: 96,  y: 70,  w: 8,  h: 6,  color: '#0ea5e9', icon: 'ℹ️', type: 'Services' },
  ],
}

const ANNOTATIONS: Array<{ x: number; y: number; label: string; severity: 'critical' | 'warning' | 'info' }> = [
  { x: 100, y: 78,  label: 'Bottleneck Food Court ↔ couloir central', severity: 'critical' },
  { x: 100, y: 9,   label: 'Entrée Nord saturée sam. 17h-19h (3,1 pax/m²)', severity: 'critical' },
  { x: 78,  y: 76,  label: 'Sanitaires sous-dimensionnés', severity: 'warning' },
  { x: 146, y: 97,  label: 'Zone banque sous-fréquentée (42 pax/h)', severity: 'info' },
]

// ─── SVG plan builder ─────────────────────────────────────

function buildPlanSvg(): string {
  const W = 1000, H = 700
  const sx = W / MALL.widthM
  const sy = H / MALL.heightM
  const scale = Math.min(sx, sy) * 0.95
  const ox = (W - MALL.widthM * scale) / 2
  const oy = (H - MALL.heightM * scale) / 2

  const toX = (x: number) => (x * scale + ox).toFixed(1)
  const toY = (y: number) => (y * scale + oy).toFixed(1)

  const spacesSvg = MALL.spaces.map(s => {
    const x = Number(toX(s.x)), y = Number(toY(s.y))
    const w = s.w * scale, h = s.h * scale
    return `
    <g>
      <rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="4"
        fill="${s.color}" fill-opacity="0.22" stroke="${s.color}" stroke-width="1.4"/>
      <text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 - 2).toFixed(1)}" text-anchor="middle"
        fill="#0f172a" font-size="11" font-weight="600" font-family="system-ui">${s.icon} ${s.label}</text>
      <text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + 12).toFixed(1)}" text-anchor="middle"
        fill="#64748b" font-size="9" font-family="system-ui">${s.type}</text>
    </g>`
  }).join('')

  // Murs extérieurs
  const bx = ox, by = oy
  const bw = MALL.widthM * scale, bh = MALL.heightM * scale
  const wallsOuter = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#0f172a" stroke-width="2.5"/>`
  const corridor = `
    <line x1="${bx}" y1="${(by + 78 * scale).toFixed(1)}" x2="${bx + bw}" y2="${(by + 78 * scale).toFixed(1)}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 3"/>
  `

  // Annotations avec pins colorés
  const sevColor = { critical: '#dc2626', warning: '#f59e0b', info: '#0ea5e9' }
  const annotSvg = ANNOTATIONS.map((a, i) => {
    const cx = Number(toX(a.x)), cy = Number(toY(a.y))
    const color = sevColor[a.severity]
    return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="14" fill="${color}" fill-opacity="0.2"/>
      <circle cx="${cx}" cy="${cy}" r="9" fill="${color}" stroke="#fff" stroke-width="2"/>
      <text x="${cx}" y="${(cy + 3).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="10" font-weight="800">${i + 1}</text>
    </g>`
  }).join('')

  // Flux piétons (flèches entrées → couloir)
  const flows = `
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#0ea5e9"/>
      </marker>
    </defs>
    <path d="M ${toX(100)} ${toY(13)} Q ${toX(100)} ${toY(45)}, ${toX(100)} ${toY(76)}"
      stroke="#0ea5e9" stroke-width="2" stroke-dasharray="6 3" fill="none" marker-end="url(#arrow)" opacity="0.7"/>
    <path d="M ${toX(100)} ${toY(127)} Q ${toX(100)} ${toY(100)}, ${toX(100)} ${toY(80)}"
      stroke="#0ea5e9" stroke-width="2" stroke-dasharray="6 3" fill="none" marker-end="url(#arrow)" opacity="0.7"/>
  `

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#f8fafc;border-radius:12px;">
    <rect width="${W}" height="${H}" fill="#f8fafc"/>
    ${wallsOuter}
    ${corridor}
    ${flows}
    ${spacesSvg}
    ${annotSvg}
  </svg>`
}

// ─── SVG 3D isométrique (RDC + R+1 empilés) ───────────────

function buildIsoSvg(): string {
  const W = 1000, H = 640
  // Projection isométrique : angles 30° / 30°
  const cos30 = Math.cos(Math.PI / 6)
  const sin30 = Math.sin(Math.PI / 6)
  const scale = 3.2
  const floorHeightPx = 50 // hauteur visuelle d'un étage en SVG
  // Centre d'origine dans l'écran
  const ox = W / 2 - (MALL.widthM * scale * cos30) / 2
  const oy = 140

  function isoX(x: number, y: number): number { return ox + (x - y) * cos30 * scale }
  function isoY(x: number, y: number, z = 0): number { return oy + (x + y) * sin30 * scale - z }

  function floorPolygon(z: number): string {
    const p1 = `${isoX(0, 0).toFixed(1)},${isoY(0, 0, z).toFixed(1)}`
    const p2 = `${isoX(MALL.widthM, 0).toFixed(1)},${isoY(MALL.widthM, 0, z).toFixed(1)}`
    const p3 = `${isoX(MALL.widthM, MALL.heightM).toFixed(1)},${isoY(MALL.widthM, MALL.heightM, z).toFixed(1)}`
    const p4 = `${isoX(0, MALL.heightM).toFixed(1)},${isoY(0, MALL.heightM, z).toFixed(1)}`
    return `${p1} ${p2} ${p3} ${p4}`
  }

  function extrudeBox(x: number, y: number, w: number, h: number, z: number, zTop: number, color: string, label: string): string {
    const bx1 = isoX(x, y),           by1 = isoY(x, y, z)
    const bx2 = isoX(x + w, y),       by2 = isoY(x + w, y, z)
    const bx3 = isoX(x + w, y + h),   by3 = isoY(x + w, y + h, z)
    const bx4 = isoX(x, y + h),       by4 = isoY(x, y + h, z)
    const ty1 = isoY(x, y, zTop)
    const ty2 = isoY(x + w, y, zTop)
    const ty3 = isoY(x + w, y + h, zTop)
    const ty4 = isoY(x, y + h, zTop)
    return `
    <g>
      <polygon points="${bx4},${by4} ${bx3},${by3} ${bx3},${ty3} ${bx4},${ty4}" fill="${color}" fill-opacity="0.55" stroke="${color}" stroke-width="1"/>
      <polygon points="${bx2},${by2} ${bx3},${by3} ${bx3},${ty3} ${bx2},${ty2}" fill="${color}" fill-opacity="0.75" stroke="${color}" stroke-width="1"/>
      <polygon points="${bx1},${ty1} ${bx2},${ty2} ${bx3},${ty3} ${bx4},${ty4}" fill="${color}" fill-opacity="0.92" stroke="#fff" stroke-width="1.2"/>
      <text x="${((bx1 + bx3) / 2).toFixed(1)}" y="${((ty1 + ty3) / 2).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui">${label}</text>
    </g>`
  }

  // RDC spaces extruded (height = 12 units)
  const rdcBoxes = MALL.spaces.map(s =>
    extrudeBox(s.x, s.y, s.w, s.h, 0, 14, s.color, s.icon),
  ).join('')

  // R+1 spaces (ghost overlay, fewer, positioned slightly differently)
  const r1Spaces: Array<{ x: number; y: number; w: number; h: number; color: string; label: string }> = [
    { x: 10,  y: 20,  w: 60, h: 55, color: '#3b82f6', label: '🏢' }, // Bureaux
    { x: 80,  y: 25,  w: 56, h: 43, color: '#f97316', label: '🏋️' }, // Fitness
    { x: 140, y: 40,  w: 45, h: 35, color: '#06b6d4', label: '☕' }, // Café
    { x: 15,  y: 85,  w: 80, h: 40, color: '#a855f7', label: '🎭' }, // Événement
    { x: 110, y: 90,  w: 47, h: 35, color: '#ef4444', label: '⚕️' }, // Cabinet médical
  ]
  const r1Boxes = r1Spaces.map(s =>
    extrudeBox(s.x, s.y, s.w, s.h, floorHeightPx, floorHeightPx + 14, s.color, s.label),
  ).join('')

  // Floor slabs
  const floorRdc = `<polygon points="${floorPolygon(0)}" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.5"/>`
  const floorR1  = `<polygon points="${floorPolygon(floorHeightPx)}" fill="#f3f4f6" fill-opacity="0.5" stroke="#9ca3af" stroke-width="1" stroke-dasharray="4 2"/>`

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;background:linear-gradient(180deg,#f8fafc 0%,#e2e8f0 100%);border-radius:12px;">
    ${floorRdc}
    ${rdcBoxes}
    ${floorR1}
    ${r1Boxes}
    <text x="30" y="40" fill="#475569" font-size="13" font-weight="700" font-family="system-ui">Vue 3D isométrique — 2 niveaux</text>
    <text x="30" y="58" fill="#64748b" font-size="11" font-family="system-ui">Bas : RDC (14 espaces) — Haut : R+1 (5 espaces projetés, transparents)</text>
    <g transform="translate(${W - 150}, 50)">
      <rect x="0" y="0" width="130" height="72" rx="8" fill="#fff" stroke="#e2e8f0"/>
      <rect x="8" y="12" width="12" height="12" fill="#2563eb" fill-opacity="0.8"/>
      <text x="28" y="22" fill="#334155" font-size="11" font-family="system-ui">Niveau RDC</text>
      <rect x="8" y="34" width="12" height="12" fill="#a855f7" fill-opacity="0.7"/>
      <text x="28" y="44" fill="#334155" font-size="11" font-family="system-ui">Niveau R+1</text>
      <rect x="8" y="56" width="12" height="6" fill="#e5e7eb" stroke="#9ca3af" stroke-dasharray="2 1"/>
      <text x="28" y="62" fill="#334155" font-size="10" font-family="system-ui">Dalles</text>
    </g>
  </svg>`
}

// ─── SVG superposition plans multi-étages ─────────────────

function buildOverlaySvg(): string {
  const W = 1000, H = 480
  const scale = Math.min(W / MALL.widthM, H / MALL.heightM) * 0.92
  const ox = (W - MALL.widthM * scale) / 2
  const oy = (H - MALL.heightM * scale) / 2
  const toX = (x: number) => (x * scale + ox).toFixed(1)
  const toY = (y: number) => (y * scale + oy).toFixed(1)

  const rdcPath = MALL.spaces.map(s => {
    const x = toX(s.x), y = toY(s.y)
    const w = (s.w * scale).toFixed(1), h = (s.h * scale).toFixed(1)
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#2563eb" fill-opacity="0.18" stroke="#2563eb" stroke-width="1"/>`
  }).join('')

  // R+1 overlay — mêmes dimensions extérieures mais disposition différente
  const r1Rooms = [
    [10, 20, 60, 55], [80, 25, 56, 43], [140, 40, 45, 35],
    [15, 85, 80, 40], [110, 90, 47, 35],
  ]
  const r1Path = r1Rooms.map(([x, y, w, h]) =>
    `<rect x="${toX(x)}" y="${toY(y)}" width="${(w * scale).toFixed(1)}" height="${(h * scale).toFixed(1)}" rx="3" fill="#a855f7" fill-opacity="0.18" stroke="#a855f7" stroke-width="1" stroke-dasharray="6 3"/>`,
  ).join('')

  // Extérieur commun
  const outer = `<rect x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${(MALL.widthM * scale).toFixed(1)}" height="${(MALL.heightM * scale).toFixed(1)}" fill="none" stroke="#0f172a" stroke-width="2"/>`

  // Transits verticaux (escaliers / ascenseurs communs aux 2 étages)
  const transits = [[75, 60], [145, 60], [30, 100]].map(([x, y]) => {
    const cx = toX(x), cy = toY(y)
    return `
      <circle cx="${cx}" cy="${cy}" r="11" fill="#ef4444"/>
      <text x="${cx}" y="${(Number(cy) + 4).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="11" font-weight="800">⇅</text>
    `
  }).join('')

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#f8fafc;border-radius:12px;">
    ${outer}
    ${rdcPath}
    ${r1Path}
    ${transits}
    <g transform="translate(24, 24)">
      <rect x="0" y="0" width="200" height="78" rx="10" fill="#fff" stroke="#e2e8f0"/>
      <text x="14" y="22" fill="#0f172a" font-size="12" font-weight="700" font-family="system-ui">Superposition multi-étages</text>
      <g transform="translate(14, 34)">
        <rect width="14" height="14" fill="#2563eb" fill-opacity="0.5"/>
        <text x="22" y="12" fill="#334155" font-size="11" font-family="system-ui">RDC · commerces</text>
      </g>
      <g transform="translate(14, 54)">
        <rect width="14" height="14" fill="#a855f7" fill-opacity="0.5" stroke="#a855f7" stroke-dasharray="2 1"/>
        <text x="22" y="12" fill="#334155" font-size="11" font-family="system-ui">R+1 · bureaux/loisirs</text>
      </g>
    </g>
    <g transform="translate(${W - 220}, 24)">
      <rect x="0" y="0" width="200" height="56" rx="10" fill="#fff" stroke="#e2e8f0"/>
      <text x="14" y="22" fill="#0f172a" font-size="12" font-weight="700" font-family="system-ui">🔴 Transits verticaux</text>
      <text x="14" y="40" fill="#64748b" font-size="11" font-family="system-ui">3 ascenseurs + escaliers</text>
    </g>
  </svg>`
}

// ─── Graphique barres flux piéton (SVG) ───────────────────

function buildFlowChartSvg(): string {
  const data = [
    { label: 'Entrée N',      value: 420, color: '#10b981' },
    { label: 'Carrefour',     value: 612, color: '#2563eb' },
    { label: 'Gal. Mode',     value: 348, color: '#ec4899' },
    { label: 'Beauté',        value: 312, color: '#d946ef' },
    { label: 'Tech',          value: 289, color: '#6366f1' },
    { label: 'Food Court',    value: 534, color: '#f59e0b' },
    { label: 'Cinéma',        value: 198, color: '#8b5cf6' },
    { label: 'Banques',       value: 42,  color: '#14b8a6' },
    { label: 'Entrée S',      value: 287, color: '#10b981' },
  ]
  const W = 960, H = 240
  const pad = { l: 40, r: 16, t: 20, b: 50 }
  const chartW = W - pad.l - pad.r
  const chartH = H - pad.t - pad.b
  const max = Math.max(...data.map(d => d.value))
  const bw = chartW / data.length * 0.7
  const gap = chartW / data.length * 0.3

  const bars = data.map((d, i) => {
    const x = pad.l + i * (bw + gap) + gap / 2
    const h = (d.value / max) * chartH
    const y = pad.t + chartH - h
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${d.color}"/>
      <text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="700">${d.value}</text>
      <text x="${(x + bw / 2).toFixed(1)}" y="${(pad.t + chartH + 18).toFixed(1)}" text-anchor="middle" fill="#475569" font-size="10">${d.label}</text>
    `
  }).join('')

  // Gridlines
  const gridY = [0, 150, 300, 450, 600].map(v => {
    const y = pad.t + chartH - (v / max) * chartH
    return `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${pad.l + chartW}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/><text x="${pad.l - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#94a3b8" font-size="9">${v}</text>`
  }).join('')

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;">
    <rect width="${W}" height="${H}" fill="#fff"/>
    ${gridY}
    ${bars}
    <text x="${pad.l}" y="14" fill="#475569" font-size="10" font-weight="600">Flux piéton (pax/h) · heure de pointe simulée ABM</text>
  </svg>`
}

// ─── Pattern QR visuel (déco — pas scannable) ─────────────

function buildQrPattern(): string {
  // Grille 7x7 aléatoire déterministe — rendu visuel type QR code
  const grid = [
    '0000000','0111110','0100010','0101010','0100010','0111110','0000000',
    '1010010','0001101','1100011','0011100','1101001','0100110','1011010',
    '1111000','0101101','1000011','1100101','0011110','1010001','0110110',
  ]
  let cells = ''
  grid.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '1') cells += `<rect x="${c * 10 + 2}" y="${r * 10 + 2}" width="9" height="9"/>`
    }
  })
  // 3 finder patterns aux coins
  const finder = (x: number, y: number) => `
    <rect x="${x}" y="${y}" width="18" height="18" fill="none" stroke="#0f172a" stroke-width="3"/>
    <rect x="${x + 6}" y="${y + 6}" width="6" height="6" fill="#0f172a"/>`
  return cells + finder(2, 2) + finder(60, 2) + finder(2, 60)
}

// ─── HTML Report builder ──────────────────────────────────

function buildRichHtml(): string {
  const plan = buildPlanSvg()
  const iso = buildIsoSvg()
  const overlay = buildOverlaySvg()
  const chart = buildFlowChartSvg()
  const generatedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
  const ref = 'ATMS-V3-' + Date.now().toString(36).toUpperCase()

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport Parcours Client · Cosmos Angré</title>
<style>
  :root {
    --bronze: #a67c3e;
    --bronze-dark: #7e5e3c;
    --ink: #0f172a;
    --slate: #334155;
    --muted: #64748b;
    --border: #e2e8f0;
    --bg: #f1f5f9;
    --card: #ffffff;
    --ok: #10b981;
    --warn: #f59e0b;
    --crit: #dc2626;
    --info: #0ea5e9;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; font-size: 14px; }
  .page { max-width: 1100px; margin: 0 auto; padding: 48px 32px 80px; }

  /* ── Header ── */
  header.doc { display: grid; grid-template-columns: 1fr auto; gap: 24px; padding-bottom: 28px; margin-bottom: 32px; border-bottom: 3px double var(--bronze); }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand-logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, var(--bronze), var(--bronze-dark)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; box-shadow: 0 4px 16px rgba(166,124,62,0.3); }
  .brand-text h1 { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--bronze-dark); }
  .brand-text p  { margin: 2px 0 0; font-size: 13px; color: var(--muted); }
  .doc-type { text-align: right; }
  .doc-type .label { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--bronze-dark); font-weight: 700; }
  .doc-type .title { font-size: 28px; font-weight: 800; margin-top: 4px; color: var(--ink); letter-spacing: -0.02em; }
  .doc-type .sub   { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; padding: 18px 22px; background: #fff; border: 1px solid var(--border); border-radius: 12px; }
  .meta-grid .cell { font-size: 12px; }
  .meta-grid .cell .k { color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; font-weight: 700; margin-bottom: 3px; }
  .meta-grid .cell .v { color: var(--ink); font-weight: 600; }

  /* ── Executive summary card ── */
  .exec-card { background: linear-gradient(135deg, #fff, #fef9f2); border: 1px solid var(--bronze); border-radius: 16px; padding: 28px 32px; margin-bottom: 40px; box-shadow: 0 4px 24px rgba(166,124,62,0.08); position: relative; overflow: hidden; }
  .exec-card::before { content: ""; position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(rgba(166,124,62,0.12), transparent 70%); }
  .exec-card .greeting { font-size: 15px; font-weight: 700; color: var(--bronze-dark); margin-bottom: 8px; }
  .exec-card h2 { margin: 0 0 14px; font-size: 22px; letter-spacing: -0.015em; }
  .exec-card p { margin: 0; color: var(--slate); font-size: 14.5px; position: relative; z-index: 1; }
  .verdict { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; padding: 8px 14px; border-radius: 999px; background: #fff3cd; color: #854d0e; font-size: 12px; font-weight: 700; border: 1px solid #fcd34d; }

  /* ── KPI dashboard ── */
  .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 44px; }
  .kpi { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; position: relative; overflow: hidden; }
  .kpi .label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
  .kpi .value { font-size: 24px; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; margin-top: 6px; line-height: 1.1; }
  .kpi .sub   { font-size: 11px; color: var(--muted); margin-top: 6px; }
  .kpi .trend { position: absolute; top: 16px; right: 16px; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
  .trend.up   { background: #dcfce7; color: #166534; }
  .trend.dn   { background: #fee2e2; color: #991b1b; }
  .trend.flat { background: #e2e8f0; color: #475569; }

  /* ── Sections ── */
  section.chapter { margin-bottom: 44px; }
  section.chapter h2 { font-size: 22px; letter-spacing: -0.015em; margin: 0 0 6px; display: flex; align-items: center; gap: 12px; }
  section.chapter h2 .num { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: var(--bronze); color: #fff; font-size: 14px; font-weight: 800; }
  section.chapter .lead { color: var(--muted); font-size: 13px; margin: 0 0 18px; padding-left: 44px; }
  .section-body { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 28px 32px; color: var(--slate); }
  .section-body p { margin: 0 0 12px; }
  .section-body p:last-child { margin-bottom: 0; }
  .section-body strong { color: var(--ink); }
  .section-body em { color: var(--bronze-dark); font-style: normal; font-weight: 600; }
  .section-body ul { padding-left: 22px; margin: 10px 0 0; }
  .section-body li { margin-bottom: 8px; }

  /* ── Map & annotations ── */
  .map-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
  .map-legend { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; font-size: 11px; color: var(--slate); }
  .map-legend .item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; }
  .map-legend .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

  .annot-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 18px; }
  .annot { display: flex; gap: 12px; padding: 14px 16px; border-radius: 10px; background: var(--card); border-left: 4px solid var(--info); }
  .annot.critical { border-left-color: var(--crit); background: #fef2f2; }
  .annot.warning  { border-left-color: var(--warn); background: #fffbeb; }
  .annot.info     { border-left-color: var(--info); background: #eff6ff; }
  .annot .badge { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; }
  .annot.critical .badge { background: var(--crit); }
  .annot.warning  .badge { background: var(--warn); }
  .annot.info     .badge { background: var(--info); }
  .annot .text { font-size: 13px; color: var(--slate); }
  .annot .text strong { color: var(--ink); display: block; font-size: 13px; margin-bottom: 2px; }
  .annot .coord { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; color: var(--muted); margin-top: 4px; }

  /* ── Tables ── */
  .table-wrap { overflow-x: auto; margin-top: 14px; }
  table.recommendations { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--card); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
  table.recommendations th { text-align: left; padding: 12px 14px; background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 700; border-bottom: 1px solid var(--border); }
  table.recommendations td { padding: 14px; border-top: 1px solid var(--border); vertical-align: top; }
  table.recommendations tr:first-child td { border-top: none; }
  table.recommendations .prio { display: inline-block; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 999px; letter-spacing: 0.04em; }
  .prio.p1 { background: #fee2e2; color: #991b1b; }
  .prio.p2 { background: #fef3c7; color: #854d0e; }
  .prio.p3 { background: #dbeafe; color: #1e40af; }
  table.recommendations .cost { font-family: ui-monospace, monospace; font-weight: 700; color: var(--ink); white-space: nowrap; }
  table.recommendations .delay { font-size: 11px; color: var(--muted); }

  /* ── ROI callout ── */
  .roi-card { background: linear-gradient(135deg, #064e3b, #065f46); color: #fff; border-radius: 18px; padding: 34px; margin: 20px 0; display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: center; box-shadow: 0 10px 40px rgba(6,78,59,0.3); }
  .roi-card .label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #6ee7b7; font-weight: 700; }
  .roi-card .title { font-size: 24px; margin: 6px 0 10px; font-weight: 800; }
  .roi-card .desc  { color: #d1fae5; font-size: 14px; line-height: 1.5; }
  .roi-card .big   { text-align: right; }
  .roi-card .big .n { font-size: 46px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
  .roi-card .big .u { font-size: 14px; color: #6ee7b7; margin-top: 6px; font-weight: 600; }

  /* ── Closing + actions ── */
  .closing { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 26px 32px; margin-top: 32px; }
  .closing p { margin: 0; color: var(--slate); }
  .sig { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
  .sig-badge { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, var(--bronze), var(--bronze-dark)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
  .sig-txt { font-size: 13px; }
  .sig-txt .n { font-weight: 700; color: var(--ink); }
  .sig-txt .r { color: var(--muted); font-size: 12px; }

  .actions { position: sticky; bottom: 20px; margin-top: 40px; display: flex; gap: 12px; justify-content: center; padding: 20px; background: #fff; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.12); border: 1px solid var(--border); }
  .btn { padding: 12px 22px; border-radius: 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 700; transition: transform 0.12s ease, box-shadow 0.12s ease; font-family: inherit; }
  .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
  .btn-ok   { background: var(--ok); color: #fff; }
  .btn-warn { background: var(--warn); color: #fff; }
  .btn-info { background: var(--info); color: #fff; }
  .btn-ghost{ background: #f1f5f9; color: var(--slate); }

  /* ── Visite guidée timeline ── */
  .tour { position: relative; padding-left: 30px; border-left: 2px solid var(--bronze); margin-top: 14px; }
  .tour-step { position: relative; margin-bottom: 20px; padding: 14px 18px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; }
  .tour-step::before { content: attr(data-n); position: absolute; left: -45px; top: 14px; width: 28px; height: 28px; border-radius: 50%; background: var(--bronze); color: #fff; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(166,124,62,0.3); }
  .tour-step .t { font-weight: 700; color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .tour-step .t .duration { font-size: 11px; font-weight: 600; color: var(--bronze-dark); background: #fef3c7; padding: 2px 8px; border-radius: 999px; }
  .tour-step .d { color: var(--slate); font-size: 13px; }
  .tour-step .kpi-inline { display: inline-block; margin-top: 8px; margin-right: 8px; padding: 2px 8px; background: #f1f5f9; border-radius: 6px; font-size: 11px; color: var(--muted); font-family: ui-monospace, monospace; }

  /* ── AR/VR ── */
  .xr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; }
  .xr-card { position: relative; border-radius: 14px; padding: 24px; overflow: hidden; color: #fff; min-height: 200px; }
  .xr-ar { background: linear-gradient(135deg, #581c87, #6b21a8); }
  .xr-vr { background: linear-gradient(135deg, #0c4a6e, #0369a1); }
  .xr-card::after { content: ""; position: absolute; top: -30px; right: -30px; width: 160px; height: 160px; border-radius: 50%; background: rgba(255,255,255,0.12); pointer-events: none; }
  .xr-card .k { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; opacity: 0.8; }
  .xr-card h3 { margin: 8px 0 10px; font-size: 22px; letter-spacing: -0.01em; position: relative; z-index: 1; }
  .xr-card p { margin: 0 0 14px; font-size: 13px; line-height: 1.55; opacity: 0.95; position: relative; z-index: 1; }
  .xr-card .features { display: flex; flex-wrap: wrap; gap: 6px; position: relative; z-index: 1; }
  .xr-card .chip { font-size: 11px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px; font-weight: 600; }
  .xr-card .qr { position: absolute; bottom: 20px; right: 20px; width: 80px; height: 80px; background: #fff; border-radius: 8px; padding: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }

  /* ── Footer ── */
  footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border); font-size: 11px; color: var(--muted); display: grid; grid-template-columns: 1fr auto; gap: 20px; }
  .badges { display: flex; flex-wrap: wrap; gap: 6px; }
  .badge-n { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #f8fafc; border: 1px solid var(--border); color: var(--slate); }

  @media print {
    body { background: #fff; }
    .actions { display: none; }
    .page { padding: 12px; }
  }
  @media (max-width: 800px) {
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .annot-list, .meta-grid { grid-template-columns: 1fr; }
    .roi-card { grid-template-columns: 1fr; text-align: left; }
    .roi-card .big { text-align: left; }
    header.doc { grid-template-columns: 1fr; }
    .doc-type { text-align: left; }
  }
</style>
</head>
<body>
<div class="page">

  <header class="doc">
    <div class="brand">
      <div class="brand-logo">A</div>
      <div class="brand-text">
        <h1>Atlas Mall Suite · Rapport Proph3t</h1>
        <p>Plateforme SaaS de pilotage de centres commerciaux — Afrique UEMOA/CEMAC</p>
      </div>
    </div>
    <div class="doc-type">
      <div class="label">Volume 3</div>
      <div class="title">Parcours Client</div>
      <div class="sub">Compte-rendu exécutif · Confidentiel</div>
    </div>
  </header>

  <div class="meta-grid">
    <div class="cell"><div class="k">Projet</div><div class="v">Cosmos Angré — RDC 30 000 m²</div></div>
    <div class="cell"><div class="k">Destinataire</div><div class="v">M. Cheick Sanankoua · DG New Heaven SA</div></div>
    <div class="cell"><div class="k">Référence</div><div class="v" style="font-family:ui-monospace,monospace;">${ref}</div></div>
    <div class="cell"><div class="k">Généré le</div><div class="v">${generatedAt}</div></div>
    <div class="cell"><div class="k">Auteur</div><div class="v">Proph3t IA · Moteur Vol.3</div></div>
    <div class="cell"><div class="k">Algorithmes</div><div class="v">ABM Helbing · Monte Carlo · ISO 7010</div></div>
  </div>

  <!-- ═══ Executive ═══ -->
  <div class="exec-card">
    <div class="greeting">Monsieur le Directeur Général,</div>
    <h2>Un parcours structuré, mais 3 points de friction mesurables</h2>
    <p>
      Proph3t a analysé le parcours client de votre centre commercial en croisant l'<strong>Agent-Based Modeling</strong>
      (Helbing Social Force, 2 400 agents sur 3 heures simulées), vos plans DXF, et les benchmarks
      <strong>ICSC Afrique 2024-2025</strong>. Le dwell time moyen est estimé à <strong>47 minutes</strong>
      (benchmark 52 min) et le taux de traversée complète à <strong>34 %</strong> (objectif 45 %).
      Trois points de friction expliquent l'écart — ils sont <strong>tous corrigeables sous 45 jours</strong> pour un
      investissement inférieur à <strong>15 MFCFA</strong>.
    </p>
    <div class="verdict">⚠ Attention requise — action sous 30 jours recommandée</div>
  </div>

  <!-- ═══ KPIs ═══ -->
  <div class="kpis">
    <div class="kpi"><span class="trend flat">—</span><div class="label">Surface analysée</div><div class="value">28 000<span style="font-size:14px;color:var(--muted);"> m²</span></div><div class="sub">RDC uniquement</div></div>
    <div class="kpi"><span class="trend flat">${MALL.spaces.length}</span><div class="label">Espaces détectés</div><div class="value">${MALL.spaces.length}</div><div class="sub">Zones d'intérêt</div></div>
    <div class="kpi"><span class="trend dn">−10 %</span><div class="label">Dwell time</div><div class="value">47<span style="font-size:14px;color:var(--muted);"> min</span></div><div class="sub">vs 52 min benchmark</div></div>
    <div class="kpi"><span class="trend dn">−24 %</span><div class="label">Taux traversée</div><div class="value">34<span style="font-size:14px;color:var(--muted);"> %</span></div><div class="sub">objectif : 45 %</div></div>
    <div class="kpi"><span class="trend dn">7</span><div class="label">Panneaux manquants</div><div class="value" style="color:var(--crit);">7</div><div class="sub">norme ISO 7010</div></div>
    <div class="kpi"><span class="trend up">+7,2 %</span><div class="label">Uplift CA estimé</div><div class="value" style="color:var(--ok);">+142<span style="font-size:14px;color:var(--muted);"> MFCFA/an</span></div><div class="sub">après corrections</div></div>
  </div>

  <!-- ═══ Section 1 — Synthèse & plan ═══ -->
  <section class="chapter">
    <h2><span class="num">1</span> Vue d'ensemble du parcours</h2>
    <p class="lead">Plan 2D du RDC avec annotations géolocalisées des 4 points critiques identifiés par Proph3t.</p>
    <div class="map-wrap">
      ${plan}
      <div class="map-legend">
        <div class="item"><span class="dot" style="background:#10b981"></span> Entrées / sorties</div>
        <div class="item"><span class="dot" style="background:#2563eb"></span> Aimants grande surface</div>
        <div class="item"><span class="dot" style="background:#ec4899"></span> Commerce & galeries</div>
        <div class="item"><span class="dot" style="background:#8b5cf6"></span> Loisirs & services</div>
      </div>
      <div class="annot-list">
        ${ANNOTATIONS.map((a, i) => `
          <div class="annot ${a.severity}">
            <div class="badge">${i + 1}</div>
            <div class="text">
              <strong>${a.severity === 'critical' ? 'Critique' : a.severity === 'warning' ? 'Attention' : 'Info'}</strong>
              ${a.label}
              <div class="coord">coord. RDC (${a.x.toFixed(0)}, ${a.y.toFixed(0)}) m</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- ═══ Section 2 — Vue 3D isométrique ═══ -->
  <section class="chapter">
    <h2><span class="num">2</span> Vue 3D isométrique</h2>
    <p class="lead">Extrusion volumétrique des 14 espaces + projection du R+1. Utile pour appréhender les volumes, les hauteurs sous plafond, et les vues cross-niveaux.</p>
    <div class="map-wrap">
      ${iso}
      <div style="margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:12px;color:var(--slate);">
        <div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #2563eb;"><strong>RDC — 14 zones actives</strong><br>commerces, restauration, entrées, services. Hauteur sous plafond : 4,2 m.</div>
        <div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #a855f7;"><strong>R+1 — 5 zones projetées</strong><br>bureaux, cabinet médical, café, fitness, salle événementielle. Hauteur : 3,6 m.</div>
        <div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #ef4444;"><strong>3 transits verticaux</strong><br>escaliers + ascenseurs + 2 monte-charges logistiques (réservé staff).</div>
      </div>
    </div>
  </section>

  <!-- ═══ Section 3 — Superposition des plans ═══ -->
  <section class="chapter">
    <h2><span class="num">3</span> Superposition des plans multi-étages</h2>
    <p class="lead">Alignement géométrique RDC + R+1 avec identification des transits verticaux. Permet de détecter les désalignements structurels et d'anticiper la cohérence du parcours vertical.</p>
    <div class="map-wrap">
      ${overlay}
      <div style="margin-top:16px;padding:14px 18px;background:#eff6ff;border-left:4px solid #0ea5e9;border-radius:10px;font-size:13px;color:var(--slate);">
        <strong style="color:var(--ink);">Analyse Proph3t :</strong>
        Les 3 transits verticaux sont bien répartis (écart max 75 m, norme recommandée : 100 m). En revanche,
        la zone <em>Services &amp; Banques</em> au R+1 côté Est n'a <strong>aucun transit dans un rayon de 60 m</strong> —
        cela contribue au faible flux observé (42 pax/h). Recommandation : envisager un escalator supplémentaire ou repositionner
        les enseignes à plus fort pouvoir attractif (banque, centre d'affaires) au niveau inférieur.
      </div>
    </div>
  </section>

  <!-- ═══ Section 4 — Visite guidée ═══ -->
  <section class="chapter">
    <h2><span class="num">4</span> Visite guidée suggérée</h2>
    <p class="lead">Parcours type d'un visiteur optimal de 65 min recommandé par Proph3t — à intégrer sur l'app mobile et les bornes interactives comme « itinéraire découverte ».</p>
    <div class="section-body" style="padding:24px;">
      <div class="tour">
        <div class="tour-step" data-n="1">
          <div class="t">🚪 Entrée Nord <span class="duration">0 — 2 min</span></div>
          <div class="d">Accueil + scan QR de l'app mobile. Proph3t propose automatiquement le parcours personnalisé selon le profil visiteur.</div>
          <span class="kpi-inline">flux : 420 pax/h</span>
          <span class="kpi-inline">densité : 2,1</span>
        </div>
        <div class="tour-step" data-n="2">
          <div class="t">🛒 Hypermarché Carrefour <span class="duration">2 — 20 min</span></div>
          <div class="d">Aimant commercial principal — course + épicerie. Dépose panier au point de conservation climatisé à la sortie.</div>
          <span class="kpi-inline">avg basket : 18 k FCFA</span>
          <span class="kpi-inline">conversion : 78 %</span>
        </div>
        <div class="tour-step" data-n="3">
          <div class="t">👗 Galerie Mode &amp; 💄 Cluster Beauté <span class="duration">20 — 38 min</span></div>
          <div class="d">Transit axial vers les enseignes mode haut-de-gamme (ZARA, Promod) puis cluster beauté (Sephora, L'Oréal). Synergie catégorielle détectée.</div>
          <span class="kpi-inline">synergie : +1,3×</span>
          <span class="kpi-inline">conversion : 34 %</span>
        </div>
        <div class="tour-step" data-n="4">
          <div class="t">🍔 Pause Food Court <span class="duration">38 — 55 min</span></div>
          <div class="d">12 enseignes restauration disponibles, table commune 120 couverts. Attention bottleneck 12h-14h identifié en section 5.</div>
          <span class="kpi-inline">ticket moy : 4,5 k FCFA</span>
          <span class="kpi-inline">panier rempli : 91 %</span>
        </div>
        <div class="tour-step" data-n="5">
          <div class="t">🎬 Cinéma ou 🎈 Aire enfants <span class="duration">55 — 65 min (option +2 h)</span></div>
          <div class="d">Embranchement selon composition visiteur. 5 salles cinéma · aire de jeu sécurisée 3-12 ans. Proph3t recommande l'itinéraire retour par l'Entrée Sud pour désengorger la Nord.</div>
          <span class="kpi-inline">cross-sell +12 %</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ Section 5 — AR / VR ═══ -->
  <section class="chapter">
    <h2><span class="num">5</span> Réalité augmentée &amp; virtuelle</h2>
    <p class="lead">Extensions immersives disponibles dans Atlas Mall Suite — accessibles via l'app mobile ou un casque compatible WebXR.</p>
    <div class="section-body">
      <div class="xr-grid">
        <div class="xr-card xr-ar">
          <div class="k">Réalité augmentée</div>
          <h3>Wayfinder AR — app mobile</h3>
          <p>Le visiteur pointe son smartphone et voit s'afficher en surimpression sur la vue caméra : les flèches directionnelles 3D vers sa destination, le nom des enseignes à mesure qu'il avance, les promos actives. Fusion WiFi-fingerprinting + BLE + PDR pour une précision de ±1,3 m.</p>
          <div class="features">
            <span class="chip">WebXR</span>
            <span class="chip">EKF 2D</span>
            <span class="chip">iOS + Android</span>
            <span class="chip">offline-first</span>
          </div>
          <svg class="qr" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <rect width="80" height="80" fill="#fff"/>
            <g fill="#0f172a">
              ${buildQrPattern()}
            </g>
          </svg>
        </div>
        <div class="xr-card xr-vr">
          <div class="k">Réalité virtuelle</div>
          <h3>Tour virtuel immersif — casque VR</h3>
          <p>Pré-visite du mall avant son ouverture physique : formations staff, simulations de foules, tests de signalétique, présentations investisseurs. Scène 3D complète exportée depuis vos plans DXF, compatible Meta Quest / Vision Pro / WebXR navigateur.</p>
          <div class="features">
            <span class="chip">Three.js + R3F</span>
            <span class="chip">React XR</span>
            <span class="chip">Quest / Vision Pro</span>
            <span class="chip">exports .glb</span>
          </div>
          <svg class="qr" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <rect width="80" height="80" fill="#fff"/>
            <g fill="#0f172a">
              ${buildQrPattern()}
            </g>
          </svg>
        </div>
      </div>
      <div style="margin-top:18px;padding:14px 18px;background:#fef9f2;border-left:4px solid var(--bronze);border-radius:10px;font-size:13px;color:var(--slate);">
        <strong style="color:var(--ink);">Atlas Mall Suite propose aussi :</strong> export .glb pour Unreal / Unity, visites filmées 360°
        intégrables dans ce rapport, et un mode <em>co-walking</em> multi-utilisateurs pour que l'architecte et le DG se déplacent dans la même scène VR en temps réel.
      </div>
    </div>
  </section>

  <!-- ═══ Section 6 — Flux piétons ═══ -->
  <section class="chapter">
    <h2><span class="num">6</span> Analyse des flux piétons</h2>
    <p class="lead">Simulation Agent-Based Modeling (Helbing &amp; Molnár, 1995) — 2 400 agents · 3 h · 5 itérations.</p>
    <div class="section-body">
      <p>
        Le modèle Helbing appliqué au plan montre que <strong>68 % des visiteurs</strong> empruntent le couloir central
        sur au moins 80 % de sa longueur — une circulation axiale saine. L'aimant Carrefour capture <strong>60 % du flux d'entrée</strong>
        depuis l'Entrée Nord, fixant le parcours initial pour une majorité des visiteurs.
      </p>
      <p>
        Les zones <em>Cluster Beauté</em> et <em>Espace Tech</em> bénéficient d'un fort transit grâce à leur position
        centrale (respectivement <strong>312 pax/h</strong> et <strong>289 pax/h</strong> en heure de pointe).
        La galerie <em>Services &amp; Banques</em> en arrière-plan ne capte en revanche que <strong>42 pax/h</strong> —
        signal faible d'une signalétique directionnelle insuffisante ou d'un manque d'attracteur de proximité.
      </p>
      <div style="margin-top:22px;padding:20px;background:#f8fafc;border-radius:10px;border:1px solid var(--border);">
        ${chart}
      </div>
    </div>
  </section>

  <!-- ═══ Section 7 — Signalétique ═══ -->
  <section class="chapter">
    <h2><span class="num">7</span> Signalétique & wayfinding</h2>
    <p class="lead">Audit croisé ISO 7010 + NF X 08-003 + observation du parcours réel simulé.</p>
    <div class="section-body">
      <p>
        L'audit identifie <strong>7 panneaux directionnels manquants</strong> aux intersections majeures et
        <strong>2 panneaux contradictoires</strong> (flèche vers sanitaires RDC-2 depuis entrée Nord qui induit un détour de 38 m).
      </p>
      <p>
        Le wayfinding numérique (bornes interactives) couvre <strong>3 des 5 points de décision</strong> — il manque
        notamment une borne au carrefour stratégique Food Court / Cinéma, qui voit passer 534 pax/h en heure de pointe.
        Coût estimé de remise à plat complète : <strong>3,4 MFCFA</strong> (panneaux + borne).
      </p>
      <ul>
        <li><strong>7 panneaux ISO 7010</strong> à installer aux carrefours manquants</li>
        <li><strong>2 flèches contradictoires</strong> à corriger en galerie Nord</li>
        <li><strong>1 borne interactive</strong> supplémentaire au carrefour Food Court / Cinéma</li>
        <li><strong>Cartographie de l'orientation</strong> à repositionner côté entrée Sud (visibilité &lt; 30 %)</li>
      </ul>
    </div>
  </section>

  <!-- ═══ Section 8 — Bottlenecks ═══ -->
  <section class="chapter">
    <h2><span class="num">8</span> Points de congestion prédits</h2>
    <p class="lead">Projection Monte Carlo samedi 14h-20h · densités en pax/m² · seuil ISO 20382 : 2,0 pax/m².</p>
    <div class="section-body">
      <p>Trois zones nécessitent une attention immédiate :</p>
      <ul>
        <li>
          <strong>Entrée Nord (95, 5)</strong> — densité projetée <strong style="color:var(--crit)">3,1 pax/m²</strong> le samedi 17h-19h
          (55 % au-dessus du seuil). Recommandation : élargir le sas de 2 à 4 portes automatiques ou ouvrir symétriquement l'entrée Sud en miroir.
        </li>
        <li>
          <strong>Food Court</strong> — densité <strong style="color:var(--crit)">2,8 pax/m²</strong> au déjeuner (12h-14h).
          Recommandation : flux à sens unique sur 30 min en heures de pointe, complété par 2 ambassadeurs de régulation positionnés
          aux deux extrémités du couloir.
        </li>
        <li>
          <strong>Sanitaires RDC-1</strong> — sous-dimensionnement structurel : 6 × 8 m pour 2 400 visiteurs/jour attendus.
          Norme : <em>1 WC / 150 visiteurs</em> → il manque <strong>4 cabines</strong>.
        </li>
      </ul>
    </div>
  </section>

  <!-- ═══ Section 9 — Impact CA ═══ -->
  <section class="chapter">
    <h2><span class="num">9</span> Impact sur le chiffre d'affaires prévisionnel</h2>
    <p class="lead">Modélisation du gain de conversion lié aux corrections recommandées.</p>
    <div class="section-body">
      <p>
        Les corrections proposées (signalétique + résolution des 3 bottlenecks + ajout d'une borne) produisent un gain estimé
        de <strong>+7,2 % de conversion</strong> sur le temps passé en galerie marchande. Appliqué au benchmark
        de <strong>15 MFCFA/m²/an</strong> des malls UEMOA comparables sur la surface commerciale active (≈ 13 200 m²),
        cela représente un uplift de CA prévisionnel de :
      </p>
      <div class="roi-card">
        <div>
          <div class="label">CA additionnel attendu</div>
          <div class="title">Uplift après corrections</div>
          <div class="desc">Calculé sur la base d'un gain de conversion de +7,2 % pondéré par le benchmark ICSC Afrique 2024 et votre mix de catégories actuelles. ROI estimé à <strong style="color:#fff">4,2× sur 24 mois</strong>.</div>
        </div>
        <div class="big">
          <div class="n">+142</div>
          <div class="u">MFCFA / an</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ Section 10 — Recommandations ═══ -->
  <section class="chapter">
    <h2><span class="num">10</span> Plan d'action chiffré</h2>
    <p class="lead">6 actions priorisées par impact × confidence × effort (ICE) · budget total 12,1 MFCFA.</p>
    <div class="section-body" style="padding:14px;">
      <div class="table-wrap">
        <table class="recommendations">
          <thead>
            <tr>
              <th style="width:60px;">Prio</th>
              <th>Action recommandée</th>
              <th style="width:130px;">Budget</th>
              <th style="width:90px;">Délai</th>
              <th style="width:110px;">Responsable</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><span class="prio p1">P1</span></td><td><strong>Installer 7 panneaux directionnels ISO 7010</strong><br><span style="color:var(--muted);font-size:12px;">Aux 7 intersections identifiées en section 3</span></td><td class="cost">1,8 MFCFA</td><td class="delay">14 j</td><td class="delay">Exploit.</td></tr>
            <tr><td><span class="prio p1">P1</span></td><td><strong>Corriger les 2 panneaux contradictoires</strong><br><span style="color:var(--muted);font-size:12px;">Galerie Nord, flèche sanitaires</span></td><td class="cost">0,2 MFCFA</td><td class="delay">3 j</td><td class="delay">Exploit.</td></tr>
            <tr><td><span class="prio p1">P1</span></td><td><strong>Déployer 3 ambassadeurs de régulation</strong><br><span style="color:var(--muted);font-size:12px;">Samedi/dimanche 14h-20h en pré-ouverture</span></td><td class="cost">240 k/mois</td><td class="delay">Immédiat</td><td class="delay">RH / DG</td></tr>
            <tr><td><span class="prio p2">P2</span></td><td><strong>Borne interactive Food Court / Cinéma</strong><br><span style="color:var(--muted);font-size:12px;">Wayfinding numérique au carrefour le plus fréquenté</span></td><td class="cost">1,4 MFCFA</td><td class="delay">30 j</td><td class="delay">IT + Exploit.</td></tr>
            <tr><td><span class="prio p2">P2</span></td><td><strong>Étendre les sanitaires RDC-1 (+4 cabines)</strong><br><span style="color:var(--muted);font-size:12px;">Conformité norme 1 WC / 150 visiteurs</span></td><td class="cost">8,5 MFCFA</td><td class="delay">45 j</td><td class="delay">Travaux</td></tr>
            <tr><td><span class="prio p3">P3</span></td><td><strong>Réévaluation ABM à 3 mois</strong><br><span style="color:var(--muted);font-size:12px;">Proph3t recalibre les poids avec les données réelles</span></td><td class="cost">—</td><td class="delay">J+90</td><td class="delay">Proph3t</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ═══ Closing ═══ -->
  <div class="closing">
    <p>
      Proph3t reste à votre disposition pour approfondir n'importe lequel de ces points, ajuster les hypothèses,
      ou simuler des scénarios alternatifs (fermeture temporaire d'une entrée, ouverture d'une extension,
      changement de mix enseignes, etc.). Un simple clic sur <strong>« Demander des corrections »</strong> ci-dessous
      permet d'itérer en moins de 24 h.
    </p>
    <div class="sig">
      <div class="sig-badge">P</div>
      <div class="sig-txt">
        <div class="n">Proph3t IA</div>
        <div class="r">Module Atlas Mall Suite · Moteur Vol.3 Parcours Client · Directeur · Ton formel · FR · Algorithmique</div>
      </div>
    </div>
  </div>

  <!-- ═══ Actions ═══ -->
  <div class="actions">
    <button class="btn btn-ok" onclick="alert('Dans l\\'app réelle : enregistrement + notification Proph3t. Démo offline.');">✓ Valider le rapport</button>
    <button class="btn btn-warn" onclick="alert('Dans l\\'app réelle : ouverture éditeur de corrections. Démo offline.');">↺ Demander des corrections</button>
    <button class="btn btn-info" onclick="alert('Dans l\\'app réelle : commentaire envoyé à Proph3t avec contexte. Démo offline.');">💬 Commenter</button>
    <button class="btn btn-ghost" onclick="window.print()">🖨 Imprimer</button>
  </div>

  <footer>
    <div>Rapport généré par Proph3t — ${generatedAt} · Ref <code style="font-family:ui-monospace,monospace;">${ref}</code></div>
    <div class="badges">
      <span class="badge-n">ISO 7010</span>
      <span class="badge-n">NF X 08-003</span>
      <span class="badge-n">ABM Helbing</span>
      <span class="badge-n">ICSC 2024</span>
      <span class="badge-n">Monte Carlo</span>
      <span class="badge-n">SYSCOHADA</span>
    </div>
  </footer>

</div>
</body>
</html>`
}

// ─── Page React ───────────────────────────────────────────

export default function DemoReportPage() {
  const navigate = useNavigate()
  const [showMeta, setShowMeta] = useState(true)

  const html = useMemo(() => buildRichHtml(), [])

  const handleOpenInNewTab = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'atlas-mall-suite-demo-parcours-client.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen" style={{ background: '#1a1d23', color: '#e2e8f0' }}>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(10,15,26,0.85)' }}>
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate('/landing')}
            className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Retour landing
          </button>

          <div className="flex items-center gap-2 ml-4">
            <Sparkles size={14} className="text-atlas-400" />
            <span className="text-sm font-semibold text-white">Démo — Rapport Parcours Client</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-atlas-200 bg-atlas-500/15 border border-atlas-500/30">
              Généré par Proph3t
            </span>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => setShowMeta(v => !v)}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-1"
          >
            {showMeta ? 'Masquer détails' : 'Afficher détails'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-gray-300 hover:text-white hover:bg-white/[0.1]"
          >
            <Download size={13} /> Télécharger .html
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlas-500 hover:bg-atlas-400 text-white text-sm font-medium"
          >
            <ExternalLink size={13} /> Ouvrir en plein écran
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        {showMeta && (
          <div className="rounded-xl p-5 border border-white/[0.06] flex flex-col md:flex-row gap-6"
            style={{ background: '#262a31' }}>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-2">
                Rapport exécutif Proph3t · Parcours Client
              </h2>
              <p className="text-[13px] text-gray-400 leading-relaxed max-w-3xl">
                Modèle réel de rapport généré pour un centre commercial type (30 000 m² · RDC). HTML <strong>autonome</strong>,
                envoyable par email ou hébergeable en intranet. Inclut : en-tête exécutif, tableau de bord 6 KPIs,
                plan 2D SVG annoté (4 points critiques géolocalisés), graphique des flux piétons par zone,
                6 sections structurées (synthèse, flux, signalétique, bottlenecks, impact CA, plan d'action chiffré),
                callout ROI et boutons d'action (Valider / Corriger / Commenter / Imprimer).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['ISO 7010', 'NF X 08-003', 'ABM Helbing', 'Benchmark ICSC', 'Monte Carlo', 'SYSCOHADA'].map(n => (
                  <span key={n} className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-atlas-300/80"
                    style={{ background: 'rgba(126,94,60,0.1)', border: '1px solid rgba(126,94,60,0.2)' }}>{n}</span>
                ))}
              </div>
            </div>
            <div className="md:w-72 grid grid-cols-2 gap-2 text-center">
              {[
                { k: '10', l: 'chapitres' },
                { k: '14', l: 'espaces analysés' },
                { k: '2D + 3D + AR/VR', l: 'vues incluses' },
                { k: '+142 M', l: 'FCFA uplift /an' },
              ].map(s => (
                <div key={s.l} className="rounded-lg px-3 py-2" style={{ background: '#1a1d23' }}>
                  <div className="text-xl font-bold text-atlas-300">{s.k}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl" style={{ background: '#fff' }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200/80" style={{ background: '#f8fafc' }}>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[11px] text-slate-500 font-mono ml-2 flex-1">
              atlas-mall-suite-demo-parcours-client.html
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Share2 size={10} /> partageable hors-ligne
            </span>
          </div>
          <iframe
            title="Rapport Proph3t — Parcours Client (démo)"
            srcDoc={html}
            sandbox="allow-same-origin allow-scripts allow-modals"
            className="w-full"
            style={{ height: '90vh', border: 0 }}
          />
        </div>

        <p className="text-[11px] text-gray-500 text-center">
          Ce rapport est généré intégralement côté client à partir de données de démo — aucune donnée réelle n'est transmise.
          Dans votre projet, Proph3t utilise vos plans importés et vos propres données.
        </p>
      </div>
    </div>
  )
}
