// ═══ DEMO — Rapport Parcours Client · Atlas Studio (dark premium) ═══

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, Share2, Sparkles } from 'lucide-react'

// ─── Config démo ──────────────────────────────────────────

interface Zone {
  id: string
  label: string
  sub?: string
  x: number; y: number; w: number; h: number
  color: string
  type: string
  badge?: 'C1' | 'C2' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'S'
}

const MALL: { widthM: number; heightM: number; spaces: Zone[] } = {
  widthM: 200, heightM: 140,
  spaces: [
    { id: 's-entry-n',   label: 'ENTRÉE NORD',           x: 90,  y: 1,   w: 20, h: 10, color: '#10b981', type: 'entrée' },
    { id: 's-entry-s',   label: 'ENTRÉE SUD',            x: 90,  y: 129, w: 20, h: 10, color: '#10b981', type: 'entrée' },
    { id: 's-foodcourt', label: 'FOOD COURT',            sub: '14 restaurants · aimant secondaire', x: 128, y: 30, w: 58, h: 48, color: '#f59e0b', type: 'restauration' },
    { id: 's-anchor-1',  label: 'HYPERMARCHÉ CARREFOUR', sub: '5 200 m² · aimant primaire',           x: 8,   y: 20, w: 70, h: 58, color: '#3b82f6', type: 'grande surface' },
    { id: 's-mode-hg',   label: 'GALERIE MODE',          sub: '22 enseignes',                         x: 80,  y: 20, w: 46, h: 32, color: '#ec4899', type: 'commerce' },
    { id: 's-beaute',    label: 'CLUSTER BEAUTÉ',        sub: '312 pax/h',                            x: 80,  y: 54, w: 22, h: 26, color: '#a855f7', type: 'commerce', badge: 'M1' },
    { id: 's-tech',      label: 'ESPACE TECH',           sub: '289 pax/h',                            x: 104, y: 54, w: 22, h: 26, color: '#6366f1', type: 'commerce', badge: 'M2' },
    { id: 's-enfants',   label: 'AIRE DE JEUX',          x: 10,  y: 90,  w: 32, h: 38, color: '#fbbf24', type: 'loisirs' },
    { id: 's-cine',      label: 'CINÉMA',                sub: '5 salles',                             x: 44,  y: 90,  w: 36, h: 38, color: '#8b5cf6', type: 'loisirs' },
    { id: 's-pharma',    label: 'PHARMA SANTÉ',          x: 82,  y: 90,  w: 20, h: 22, color: '#22c55e', type: 'santé' },
    { id: 's-banque',    label: 'SERVICES & BANQUES',    sub: '42 pax/h',                             x: 104, y: 90, w: 34, h: 22, color: '#14b8a6', type: 'services' },
    { id: 's-wc-1',      label: 'SANITAIRES RDC-1',      sub: 'sous-dim.',                            x: 82,  y: 70, w: 14, h: 14, color: '#64748b', type: 'sanitaire', badge: 'C2' },
    { id: 's-wc-2',      label: 'SANITAIRES RDC-2',      x: 142, y: 90,  w: 18, h: 14, color: '#64748b', type: 'sanitaire' },
    { id: 's-info',      label: 'POINT INFO',            x: 102, y: 72,  w: 16, h: 12, color: '#0ea5e9', type: 'services' },
  ],
}

// ─── SVG Plan 2D architectural réaliste ───────────────────

function buildPlan2D(): string {
  const W = 1300, H = 740
  const sx = W / MALL.widthM, sy = H / MALL.heightM
  const scale = Math.min(sx, sy) * 0.92
  const ox = (W - MALL.widthM * scale) / 2
  const oy = (H - MALL.heightM * scale) / 2
  const X = (x: number) => (x * scale + ox)
  const Y = (y: number) => (y * scale + oy)

  // ─── Grille (fond technique) ───
  const grid: string[] = []
  for (let i = 0; i <= MALL.widthM; i += 5) {
    const op = i % 10 === 0 ? 0.06 : 0.03
    grid.push(`<line x1="${X(i).toFixed(1)}" y1="${Y(0).toFixed(1)}" x2="${X(i).toFixed(1)}" y2="${Y(MALL.heightM).toFixed(1)}" stroke="#ffffff" stroke-opacity="${op}" stroke-width="1"/>`)
  }
  for (let j = 0; j <= MALL.heightM; j += 5) {
    const op = j % 10 === 0 ? 0.06 : 0.03
    grid.push(`<line x1="${X(0).toFixed(1)}" y1="${Y(j).toFixed(1)}" x2="${X(MALL.widthM).toFixed(1)}" y2="${Y(j).toFixed(1)}" stroke="#ffffff" stroke-opacity="${op}" stroke-width="1"/>`)
  }

  // ─── Helpers géométriques ───
  const WALL_T = 1.2 // épaisseur murs en unités monde (m)
  const colors = { wall: '#e2e8f0', wallFill: '#3a3f47', glass: '#38bdf8', corridor: '#1f2329', floor: '#15181d' }

  // Mur épais : dessine un rectangle vertical ou horizontal
  const hWall = (x1: number, x2: number, y: number, t = WALL_T) =>
    `<rect x="${X(Math.min(x1, x2)).toFixed(1)}" y="${Y(y - t / 2).toFixed(1)}" width="${(Math.abs(x2 - x1) * scale).toFixed(1)}" height="${(t * scale).toFixed(1)}" fill="${colors.wallFill}" stroke="${colors.wall}" stroke-width="0.8" stroke-opacity="0.5"/>`
  const vWall = (y1: number, y2: number, x: number, t = WALL_T) =>
    `<rect x="${X(x - t / 2).toFixed(1)}" y="${Y(Math.min(y1, y2)).toFixed(1)}" width="${(t * scale).toFixed(1)}" height="${(Math.abs(y2 - y1) * scale).toFixed(1)}" fill="${colors.wallFill}" stroke="${colors.wall}" stroke-width="0.8" stroke-opacity="0.5"/>`

  // Vitrine (verre cyan translucide)
  const hGlass = (x1: number, x2: number, y: number) =>
    `<line x1="${X(Math.min(x1, x2)).toFixed(1)}" y1="${Y(y).toFixed(1)}" x2="${X(Math.max(x1, x2)).toFixed(1)}" y2="${Y(y).toFixed(1)}" stroke="${colors.glass}" stroke-width="2.5" stroke-opacity="0.7"/>`
  const vGlass = (y1: number, y2: number, x: number) =>
    `<line x1="${X(x).toFixed(1)}" y1="${Y(Math.min(y1, y2)).toFixed(1)}" x2="${X(x).toFixed(1)}" y2="${Y(Math.max(y1, y2)).toFixed(1)}" stroke="${colors.glass}" stroke-width="2.5" stroke-opacity="0.7"/>`

  // Porte (arc de cercle + trait)
  const hDoor = (x: number, y: number, w: number, side: 'up' | 'down' = 'down') => {
    const cx = X(x + w / 2), cy = Y(y)
    const r = (w * scale) / 2
    const sweep = side === 'down' ? 1 : 0
    return `<path d="M ${(cx - r).toFixed(1)} ${cy.toFixed(1)} A ${r} ${r} 0 0 ${sweep} ${(cx + r).toFixed(1)} ${cy.toFixed(1)}" fill="none" stroke="${colors.wall}" stroke-width="0.8" stroke-opacity="0.5"/>
      <line x1="${(cx - r).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx - r).toFixed(1)}" y2="${(cy + (side === 'down' ? r : -r)).toFixed(1)}" stroke="${colors.wall}" stroke-width="0.8" stroke-opacity="0.5"/>`
  }

  // ─── Remplissage zones (formes complexes avec entailles) ───
  const zonePaths: string[] = []

  // 1. Hypermarché Carrefour (L-shape avec zone caisses à l'est)
  zonePaths.push(`<path d="
    M ${X(4)} ${Y(16)} L ${X(76)} ${Y(16)} L ${X(76)} ${Y(64)} L ${X(62)} ${Y(64)}
    L ${X(62)} ${Y(82)} L ${X(4)} ${Y(82)} Z
  " fill="#3b82f6" fill-opacity="0.22" stroke="#3b82f6" stroke-opacity="0.65" stroke-width="1.5"/>`)

  // Gondoles intérieures Carrefour (lignes fines pour simulateur rayons)
  const gondoles: string[] = []
  for (let i = 0; i < 6; i++) {
    const gy = 22 + i * 7
    gondoles.push(`<line x1="${X(10)}" y1="${Y(gy)}" x2="${X(58)}" y2="${Y(gy)}" stroke="#3b82f6" stroke-width="0.6" stroke-opacity="0.4" stroke-dasharray="3 2"/>`)
  }
  // Caisses (petits rectangles alignés)
  for (let i = 0; i < 4; i++) {
    const cx = 66, cy = 20 + i * 8
    gondoles.push(`<rect x="${X(cx).toFixed(1)}" y="${Y(cy).toFixed(1)}" width="${(6 * scale).toFixed(1)}" height="${(5 * scale).toFixed(1)}" fill="#3b82f6" fill-opacity="0.4" stroke="#3b82f6" stroke-width="0.7" stroke-opacity="0.7"/>`)
  }
  zonePaths.push(gondoles.join(''))

  // 2. Galerie Mode — 4 boutiques alignées
  const modeBoxes: string[] = []
  const modeW = 11
  for (let i = 0; i < 4; i++) {
    const bx = 82 + i * (modeW + 1)
    modeBoxes.push(`<rect x="${X(bx).toFixed(1)}" y="${Y(18).toFixed(1)}" width="${(modeW * scale).toFixed(1)}" height="${(14 * scale).toFixed(1)}" rx="1" fill="#ec4899" fill-opacity="0.25" stroke="#ec4899" stroke-opacity="0.7" stroke-width="1"/>`)
    // Vitrine côté couloir
    modeBoxes.push(hGlass(bx, bx + modeW, 32))
  }
  zonePaths.push(modeBoxes.join(''))

  // 3. Cluster Beauté — grille de 4 boutiques 2x2
  const beauteBoxes: string[] = []
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const bx = 80 + i * 11, by = 40 + j * 13
      beauteBoxes.push(`<rect x="${X(bx).toFixed(1)}" y="${Y(by).toFixed(1)}" width="${(10 * scale).toFixed(1)}" height="${(12 * scale).toFixed(1)}" rx="1" fill="#a855f7" fill-opacity="0.25" stroke="#a855f7" stroke-opacity="0.7" stroke-width="1"/>`)
    }
  }
  zonePaths.push(beauteBoxes.join(''))

  // 4. Espace Tech — 3 boutiques
  const techBoxes: string[] = []
  for (let i = 0; i < 3; i++) {
    const bx = 104, by = 40 + i * 9
    techBoxes.push(`<rect x="${X(bx).toFixed(1)}" y="${Y(by).toFixed(1)}" width="${(20 * scale).toFixed(1)}" height="${(8 * scale).toFixed(1)}" rx="1" fill="#6366f1" fill-opacity="0.25" stroke="#6366f1" stroke-opacity="0.7" stroke-width="1"/>`)
  }
  zonePaths.push(techBoxes.join(''))

  // 5. Food Court — zone centrale avec kitchenettes le long des murs
  zonePaths.push(`<rect x="${X(128).toFixed(1)}" y="${Y(20).toFixed(1)}" width="${(60 * scale).toFixed(1)}" height="${(60 * scale).toFixed(1)}" rx="2" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b" stroke-opacity="0.7" stroke-width="1.2"/>`)
  // Kitchenettes le long du mur nord et sud
  const kitchenettes: string[] = []
  for (let i = 0; i < 6; i++) {
    const kx = 130 + i * 9.5
    kitchenettes.push(`<rect x="${X(kx).toFixed(1)}" y="${Y(20).toFixed(1)}" width="${(8 * scale).toFixed(1)}" height="${(7 * scale).toFixed(1)}" rx="0.5" fill="#f59e0b" fill-opacity="0.45" stroke="#f59e0b" stroke-width="0.8"/>`)
    kitchenettes.push(`<rect x="${X(kx).toFixed(1)}" y="${Y(73).toFixed(1)}" width="${(8 * scale).toFixed(1)}" height="${(7 * scale).toFixed(1)}" rx="0.5" fill="#f59e0b" fill-opacity="0.45" stroke="#f59e0b" stroke-width="0.8"/>`)
  }
  // Tables centrales (cercles)
  const tables: string[] = []
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const tx = 134 + i * 14, ty = 38 + j * 10
      tables.push(`<circle cx="${X(tx).toFixed(1)}" cy="${Y(ty).toFixed(1)}" r="${(2.5 * scale).toFixed(1)}" fill="#f59e0b" fill-opacity="0.3" stroke="#f59e0b" stroke-width="0.5"/>`)
    }
  }
  zonePaths.push(kitchenettes.join('') + tables.join(''))

  // 6. Cinéma — 5 salles en éventail
  const cineBase = `<path d="
    M ${X(44)} ${Y(88)} L ${X(80)} ${Y(88)} L ${X(80)} ${Y(126)} L ${X(44)} ${Y(126)} Z
  " fill="#8b5cf6" fill-opacity="0.2" stroke="#8b5cf6" stroke-opacity="0.7" stroke-width="1.2"/>`
  // Séparateurs salles (murs internes)
  const cineSalles: string[] = []
  for (let i = 1; i < 5; i++) {
    const sx = 44 + i * 7.2
    cineSalles.push(`<line x1="${X(sx).toFixed(1)}" y1="${Y(96).toFixed(1)}" x2="${X(sx).toFixed(1)}" y2="${Y(126).toFixed(1)}" stroke="#8b5cf6" stroke-width="1" stroke-opacity="0.55"/>`)
    // Gradins en triangles
    cineSalles.push(`<path d="M ${X(sx - 6).toFixed(1)} ${Y(100).toFixed(1)} L ${X(sx - 1).toFixed(1)} ${Y(100).toFixed(1)} L ${X(sx - 3.5).toFixed(1)} ${Y(124).toFixed(1)} Z" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-width="0.5" stroke-opacity="0.5"/>`)
  }
  zonePaths.push(cineBase + cineSalles.join(''))

  // 7. Aire de jeux enfants — forme arrondie + cercles multicolores (espaces de jeu)
  zonePaths.push(`<rect x="${X(8).toFixed(1)}" y="${Y(88).toFixed(1)}" width="${(34 * scale).toFixed(1)}" height="${(38 * scale).toFixed(1)}" rx="${(4 * scale).toFixed(1)}" fill="#fbbf24" fill-opacity="0.18" stroke="#fbbf24" stroke-opacity="0.7" stroke-width="1.2"/>`)
  // Éléments de jeu : 3 aires circulaires
  const playColors = ['#ec4899', '#34d399', '#60a5fa']
  const plays: string[] = []
  const playCoords: Array<[number, number]> = [[17, 97], [32, 97], [24, 115]]
  playCoords.forEach(([px, py], i) => {
    plays.push(`<circle cx="${X(px).toFixed(1)}" cy="${Y(py).toFixed(1)}" r="${(4.5 * scale).toFixed(1)}" fill="${playColors[i]}" fill-opacity="0.35" stroke="${playColors[i]}" stroke-width="0.8"/>`)
  })
  zonePaths.push(plays.join(''))

  // 8. Pharma Santé
  zonePaths.push(`<rect x="${X(82).toFixed(1)}" y="${Y(88).toFixed(1)}" width="${(20 * scale).toFixed(1)}" height="${(22 * scale).toFixed(1)}" rx="1" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e" stroke-opacity="0.7" stroke-width="1"/>`)
  // Comptoir central
  zonePaths.push(`<rect x="${X(86).toFixed(1)}" y="${Y(98).toFixed(1)}" width="${(12 * scale).toFixed(1)}" height="${(3 * scale).toFixed(1)}" fill="#22c55e" fill-opacity="0.5" stroke="#22c55e" stroke-width="0.6"/>`)

  // 9. Services & Banques — 3 guichets
  zonePaths.push(`<rect x="${X(104).toFixed(1)}" y="${Y(88).toFixed(1)}" width="${(34 * scale).toFixed(1)}" height="${(22 * scale).toFixed(1)}" rx="1" fill="#14b8a6" fill-opacity="0.2" stroke="#14b8a6" stroke-opacity="0.7" stroke-width="1"/>`)
  const guichets: string[] = []
  for (let i = 0; i < 3; i++) {
    const gx = 108 + i * 11, gy = 92
    guichets.push(`<rect x="${X(gx).toFixed(1)}" y="${Y(gy).toFixed(1)}" width="${(9 * scale).toFixed(1)}" height="${(6 * scale).toFixed(1)}" rx="0.5" fill="#14b8a6" fill-opacity="0.4" stroke="#14b8a6" stroke-width="0.6"/>`)
  }
  zonePaths.push(guichets.join(''))

  // 10. Sanitaires RDC-1 et RDC-2 (cabines visibles)
  const wcCabines = (bx: number, by: number, bw: number, bh: number) => {
    const wcBox = `<rect x="${X(bx).toFixed(1)}" y="${Y(by).toFixed(1)}" width="${(bw * scale).toFixed(1)}" height="${(bh * scale).toFixed(1)}" rx="0.5" fill="#64748b" fill-opacity="0.25" stroke="#64748b" stroke-opacity="0.65" stroke-width="1"/>`
    const cabs: string[] = []
    const cabW = bw / 4
    for (let i = 0; i < 4; i++) {
      cabs.push(`<rect x="${X(bx + i * cabW + 0.3).toFixed(1)}" y="${Y(by + 0.5).toFixed(1)}" width="${((cabW - 0.6) * scale).toFixed(1)}" height="${((bh - 1) * scale).toFixed(1)}" fill="none" stroke="#94a3b8" stroke-width="0.5" stroke-opacity="0.6"/>`)
    }
    return wcBox + cabs.join('')
  }
  zonePaths.push(wcCabines(82, 68, 14, 14))
  zonePaths.push(wcCabines(142, 88, 18, 14))

  // 11. Point Info (rotonde)
  zonePaths.push(`<circle cx="${X(110).toFixed(1)}" cy="${Y(78).toFixed(1)}" r="${(4 * scale).toFixed(1)}" fill="#0ea5e9" fill-opacity="0.3" stroke="#0ea5e9" stroke-width="1"/>`)

  // 12. Entrées (mall arches)
  const entryArch = (cx: number, cy: number, w: number) => {
    return `<rect x="${X(cx - w / 2).toFixed(1)}" y="${Y(cy - 2).toFixed(1)}" width="${(w * scale).toFixed(1)}" height="${(4 * scale).toFixed(1)}" rx="${(2 * scale).toFixed(1)}" fill="#10b981" fill-opacity="0.35" stroke="#10b981" stroke-width="1.2"/>`
  }
  zonePaths.push(entryArch(100, 3, 18))
  zonePaths.push(entryArch(100, 137, 18))

  // ─── Murs structure ───
  const walls: string[] = []
  // Contour extérieur épais
  walls.push(`<path d="
    M ${X(2)} ${Y(2)}
    L ${X(88)} ${Y(2)}
    M ${X(112)} ${Y(2)} L ${X(198)} ${Y(2)}
    L ${X(198)} ${Y(138)}
    L ${X(112)} ${Y(138)}
    M ${X(88)} ${Y(138)} L ${X(2)} ${Y(138)}
    L ${X(2)} ${Y(2)} Z
  " fill="none" stroke="${colors.wall}" stroke-width="2.5" stroke-opacity="0.75" stroke-linejoin="miter"/>`)

  // Murs intérieurs séparateurs (entre Carrefour/Galerie, couloirs, cinéma/jeux)
  walls.push(hWall(2, 198, 85))   // séparateur principal nord/sud
  walls.push(vWall(2, 85, 78))    // séparateur Carrefour / galerie
  walls.push(vWall(2, 85, 128))   // séparateur galerie / food court
  walls.push(vWall(85, 138, 42))  // séparateur jeux / cinéma
  walls.push(vWall(85, 138, 80))  // séparateur cinéma / pharma
  walls.push(vWall(85, 138, 102)) // séparateur pharma / banques
  walls.push(vWall(85, 138, 140)) // séparateur banques / wc-2

  // Couloir central (largeur 8m, pointillé or)
  walls.push(`<rect x="${X(2).toFixed(1)}" y="${Y(82).toFixed(1)}" width="${(196 * scale).toFixed(1)}" height="${(3 * scale).toFixed(1)}" fill="${colors.corridor}" fill-opacity="0.45" stroke="${colors.floor}" stroke-width="0.5"/>`)
  walls.push(`<line x1="${X(2).toFixed(1)}" y1="${Y(83.5).toFixed(1)}" x2="${X(198).toFixed(1)}" y2="${Y(83.5).toFixed(1)}" stroke="#f59e0b" stroke-width="0.8" stroke-dasharray="10 4" stroke-opacity="0.55"/>`)

  // ─── Portes ouvertes ───
  const doors: string[] = []
  doors.push(hDoor(95, 11, 10, 'down'))   // entrée Nord
  doors.push(hDoor(95, 129, 10, 'up'))    // entrée Sud
  doors.push(hDoor(80, 85, 4, 'up'))      // transit vers cinéma
  doors.push(hDoor(105, 85, 4, 'down'))   // transit vers galerie

  // ─── Labels de zones (au-dessus des polygones) ───
  const labels = MALL.spaces.map(s => {
    const cx = X(s.x + s.w / 2), cy = Y(s.y + s.h / 2)
    const badge = s.badge ? `
      <g>
        <rect x="${(cx - 14).toFixed(1)}" y="${(cy - 24).toFixed(1)}" width="28" height="16" rx="3" fill="#0f1115" stroke="#f59e0b" stroke-width="0.8"/>
        <text x="${cx.toFixed(1)}" y="${(cy - 12).toFixed(1)}" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="700" font-family="ui-monospace,monospace">${s.badge}</text>
      </g>` : ''
    const labelY = cy + (s.sub ? -3 : 4)
    return `
      <g>
        <text x="${cx.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui" letter-spacing="0.04em" style="text-shadow:0 1px 3px rgba(0,0,0,0.9);">${s.label}</text>
        ${s.sub ? `<text x="${cx.toFixed(1)}" y="${(cy + 10).toFixed(1)}" text-anchor="middle" fill="#fff" fill-opacity="0.75" font-size="9" font-family="system-ui" style="text-shadow:0 1px 2px rgba(0,0,0,0.8);">${s.sub}</text>` : ''}
        ${badge}
      </g>`
  }).join('')

  // placeholder zones / corridor : zones == zonePaths (on remplace)
  const zones = zonePaths.join('') + labels
  const corridor = '' // intégré dans walls

  // Flux principaux (flèches pointillées orange)
  const arrow = (x1: number, y1: number, x2: number, y2: number, opacity = 0.75, dashed = true) =>
    `<line x1="${X(x1).toFixed(1)}" y1="${Y(y1).toFixed(1)}" x2="${X(x2).toFixed(1)}" y2="${Y(y2).toFixed(1)}" stroke="#f59e0b" stroke-width="1.5" ${dashed ? 'stroke-dasharray="6 4"' : ''} stroke-opacity="${opacity}" marker-end="url(#arr)"/>`
  const flows = `
    <defs>
      <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <polygon points="0 0, 7 3, 0 6" fill="#f59e0b"/>
      </marker>
    </defs>
    ${arrow(100, 11, 100, 50)}
    ${arrow(100, 50, 60, 48)}
    ${arrow(100, 50, 155, 50)}
    ${arrow(100, 80, 100, 128, 0.6)}
  `

  // Pins annotations (orange cerclés avec numéro)
  const annots = [
    { n: 1, x: 100, y: 11, lx: 140, ly: 18, t1: 'Entrée Nord · 3,1 pax/m² sam. 17-19h', t2: 'seuil ISO 20382 dépassé (2,0)' },
    { n: 2, x: 157, y: 58, lx: 200, ly: 68, t1: 'Bottleneck FC · 2,8 pax/m² · 12-14h', t2: '' },
    { n: 3, x: 89,  y: 78, lx: 25,  ly: 105, t1: 'Sanitaires sous-dimensionnés', t2: '6 cabines / 2 400 visiteurs' },
  ]
  const pinsAndLabels = annots.map(a => {
    const cx = X(a.x), cy = Y(a.y)
    const lx = X(a.lx), ly = Y(a.ly)
    const hasSub = a.t2.length > 0
    return `
      <g>
        <line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3 2" stroke-opacity="0.5"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="18" fill="#f59e0b" fill-opacity="0.18"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="11" fill="#0f1115" stroke="#f59e0b" stroke-width="2"/>
        <text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" fill="#f59e0b" font-size="12" font-weight="800" font-family="system-ui">${a.n}</text>
        <g transform="translate(${lx.toFixed(1)} ${(ly - 18).toFixed(1)})">
          <rect x="0" y="0" width="${a.t1.length * 5.3 + 34}" height="${hasSub ? 34 : 22}" rx="4" fill="#1a1d22" stroke="#f59e0b" stroke-opacity="0.5"/>
          <circle cx="14" cy="${hasSub ? 17 : 11}" r="7" fill="#f59e0b"/>
          <text x="14" y="${hasSub ? 21 : 15}" text-anchor="middle" fill="#0f1115" font-size="10" font-weight="800">${a.n}</text>
          <text x="26" y="${hasSub ? 14 : 15}" fill="#f5f5f4" font-size="10" font-weight="600" font-family="ui-monospace,monospace">${a.t1}</text>
          ${hasSub ? `<text x="26" y="27" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">${a.t2}</text>` : ''}
        </g>
      </g>`
  }).join('')

  // Halo chaud Food Court (indique bottleneck)
  const heat = `
    <defs>
      <radialGradient id="heat" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${X(157).toFixed(1)}" cy="${Y(55).toFixed(1)}" r="${(18 * scale).toFixed(1)}" fill="url(#heat)"/>
  `

  // Panneaux (pictos S + M1-M7 + C1/C2)
  const S = (x: number, y: number, existing = true) => {
    const px = X(x), py = Y(y)
    return `<g>
      <rect x="${(px - 7).toFixed(1)}" y="${(py - 7).toFixed(1)}" width="14" height="14" rx="1" fill="none" stroke="#fbbf24" stroke-width="1.2" ${!existing ? 'stroke-dasharray="2 2"' : ''}/>
      <text x="${px.toFixed(1)}" y="${(py + 4).toFixed(1)}" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="700">S</text>
    </g>`
  }
  const Mlabel = (x: number, y: number, n: number) => {
    const px = X(x), py = Y(y)
    return `<g>
      <rect x="${(px - 9).toFixed(1)}" y="${(py - 7).toFixed(1)}" width="18" height="14" rx="1" fill="none" stroke="#f87171" stroke-width="1.2" stroke-dasharray="3 2"/>
      <text x="${px.toFixed(1)}" y="${(py + 4).toFixed(1)}" text-anchor="middle" fill="#f87171" font-size="9" font-weight="700">M${n}</text>
    </g>`
  }
  const panels = `
    ${S(102, 25)}${S(92, 48)}${S(100, 80)}${S(136, 72)}
    ${Mlabel(38, 65, 3)}${Mlabel(58, 105, 5)}${Mlabel(112, 105, 4)}${Mlabel(130, 12, 6)}${Mlabel(180, 12, 7)}
    <g>
      <rect x="${(X(105) - 9).toFixed(1)}" y="${(Y(85) - 7).toFixed(1)}" width="18" height="14" rx="1" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="${X(105).toFixed(1)}" y="${(Y(85) + 4).toFixed(1)}" text-anchor="middle" fill="#f59e0b" font-size="9" font-weight="700">+</text>
    </g>
  `

  // Compass
  const compass = `
    <g transform="translate(${(W - 55).toFixed(1)} 55)">
      <circle r="18" fill="#0f1115" stroke="#ffffff" stroke-opacity="0.2"/>
      <polygon points="0,-12 3,2 0,0 -3,2" fill="#f59e0b"/>
      <text y="-22" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="700">N</text>
    </g>
  `

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#0f1115;">
    <rect width="${W}" height="${H}" fill="#0f1115"/>
    ${grid.join('')}
    ${zones}
    ${walls.join('')}
    ${doors.join('')}
    ${corridor}
    ${heat}
    ${flows}
    ${panels}
    ${pinsAndLabels}
    ${compass}
    <g transform="translate(30 ${H - 40})">
      <rect x="0" y="0" width="170" height="28" rx="2" fill="#1a1d22" stroke="#f59e0b" stroke-opacity="0.3"/>
      <text x="12" y="12" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace" letter-spacing="0.08em">ÉCHELLE</text>
      <line x1="12" y1="20" x2="112" y2="20" stroke="#f59e0b" stroke-width="1.5"/>
      <line x1="12" y1="16" x2="12" y2="24" stroke="#f59e0b" stroke-width="1.5"/>
      <line x1="62" y1="17" x2="62" y2="23" stroke="#f59e0b" stroke-width="1.2"/>
      <line x1="112" y1="16" x2="112" y2="24" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="120" y="24" fill="#e2e8f0" font-size="10" font-family="ui-monospace,monospace">25 m</text>
    </g>
  </svg>`
}

// ─── SVG Ligne temporelle densité (Section 04) ────────────

function buildDensityChart(): string {
  const W = 1300, H = 400
  const pad = { l: 60, r: 30, t: 30, b: 40 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b
  const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
  // densités par heure
  const series = [
    { name: 'Entrée Nord',     color: '#ef4444', data: [0.2, 0.6, 0.8, 1.0, 1.6, 1.8, 1.9, 2.9, 3.1, 2.9, 2.3, 1.1, 0.7], peakIdx: 8 },
    { name: 'Food Court',      color: '#f59e0b', data: [0.3, 1.2, 2.5, 2.9, 2.7, 2.0, 1.4, 1.7, 2.5, 2.6, 2.4, 1.0, 0.5], peakIdx: 3 },
    { name: 'Sanitaires RDC-1',color: '#a855f7', data: [0.8, 1.2, 2.0, 2.0, 1.7, 1.7, 1.8, 2.2, 2.3, 1.9, 1.4, 0.9, 0.7], peakIdx: -1 },
  ]
  const maxY = 4
  const xAt = (i: number) => pad.l + (i / (hours.length - 1)) * cw
  const yAt = (v: number) => pad.t + ch - (v / maxY) * ch

  // gridlines
  const gy = [0, 1, 2, 3, 4].map(v => {
    const y = yAt(v)
    return `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${pad.l + cw}" y2="${y.toFixed(1)}" stroke="#ffffff" stroke-opacity="${v === 0 ? 0.12 : 0.06}" stroke-width="1"/><text x="${pad.l - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="#94a3b8" font-size="10" font-family="system-ui">${v.toFixed(1)}</text>`
  }).join('')

  const gx = hours.map((h, i) => {
    const x = xAt(i)
    return `<text x="${x.toFixed(1)}" y="${(pad.t + ch + 18).toFixed(1)}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui">${h}h</text>`
  }).join('')

  // seuil ISO 20382 (2.0)
  const ySeuil = yAt(2)
  const seuil = `
    <line x1="${pad.l}" y1="${ySeuil.toFixed(1)}" x2="${pad.l + cw}" y2="${ySeuil.toFixed(1)}" stroke="#ffffff" stroke-opacity="0.3" stroke-dasharray="6 3" stroke-width="1"/>
    <text x="${pad.l + cw - 60}" y="${(ySeuil - 6).toFixed(1)}" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">seuil 2,0</text>
  `

  // courbes
  const lines = series.map(s => {
    const pathD = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ')
    const dots = s.data.map((v, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="3.5" fill="${s.color}"/>`).join('')
    return `<path d="${pathD}" fill="none" stroke="${s.color}" stroke-width="2"/>${dots}`
  }).join('')

  // peak annotations
  const peakLabels = series.filter(s => s.peakIdx >= 0).map(s => {
    const x = xAt(s.peakIdx), y = yAt(s.data[s.peakIdx])
    return `
      <line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(pad.t + 10).toFixed(1)}" stroke="${s.color}" stroke-width="1" stroke-dasharray="2 2" stroke-opacity="0.6"/>
      <text x="${x.toFixed(1)}" y="${(pad.t + 8).toFixed(1)}" text-anchor="middle" fill="${s.color}" font-size="11" font-weight="700" font-family="ui-monospace,monospace">peak ${s.data[s.peakIdx].toFixed(1)}</text>
    `
  }).join('')

  // Legend
  const legend = series.map((s, i) => `
    <g transform="translate(${(W - 430 + i * 140).toFixed(1)} ${pad.t - 18})">
      <circle cx="6" cy="0" r="4" fill="${s.color}"/>
      <text x="14" y="4" fill="#cbd5e1" font-size="11" font-family="system-ui">${s.name}</text>
    </g>
  `).join('') +
    `<g transform="translate(${(W - 170).toFixed(1)} ${pad.t - 18})">
      <circle cx="6" cy="0" r="4" fill="#ffffff" fill-opacity="0.3"/>
      <text x="14" y="4" fill="#cbd5e1" font-size="11" font-family="system-ui">Seuil ISO 20382 (2,0)</text>
    </g>`

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#0f1115;">
    <text x="${pad.l}" y="20" fill="#f59e0b" font-size="10" font-weight="700" letter-spacing="0.12em" font-family="ui-monospace,monospace">DENSITÉ PAX/M² VS. HEURE</text>
    ${legend}
    ${gy}
    ${gx}
    ${seuil}
    ${lines}
    ${peakLabels}
  </svg>`
}

// ─── SVG 3D isométrique (Section 05) ──────────────────────

function buildIsoSvg(): string {
  const W = 1300, H = 560
  const cos30 = Math.cos(Math.PI / 6)
  const sin30 = Math.sin(Math.PI / 6)
  const scale = 3.4
  const floorH = 58
  const ox = W / 2 - (MALL.widthM * scale * cos30) / 2
  const oy = 130
  const X = (x: number, y: number) => ox + (x - y) * cos30 * scale
  const Y = (x: number, y: number, z = 0) => oy + (x + y) * sin30 * scale - z

  function floor(z: number, dashed = false): string {
    const p = [[0, 0], [MALL.widthM, 0], [MALL.widthM, MALL.heightM], [0, MALL.heightM]]
      .map(([x, y]) => `${X(x, y).toFixed(1)},${Y(x, y, z).toFixed(1)}`).join(' ')
    return `<polygon points="${p}" fill="#1a1d22" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1" ${dashed ? 'stroke-dasharray="4 3"' : ''}/>`
  }

  function box(x: number, y: number, w: number, h: number, z: number, dh: number, color: string, label: string): string {
    const zTop = z + dh
    const a1 = [X(x, y), Y(x, y, z)], a2 = [X(x + w, y), Y(x + w, y, z)]
    const a3 = [X(x + w, y + h), Y(x + w, y + h, z)], a4 = [X(x, y + h), Y(x, y + h, z)]
    const t1 = [X(x, y), Y(x, y, zTop)], t2 = [X(x + w, y), Y(x + w, y, zTop)]
    const t3 = [X(x + w, y + h), Y(x + w, y + h, zTop)], t4 = [X(x, y + h), Y(x, y + h, zTop)]
    return `
      <polygon points="${a4[0].toFixed(1)},${a4[1].toFixed(1)} ${a3[0].toFixed(1)},${a3[1].toFixed(1)} ${t3[0].toFixed(1)},${t3[1].toFixed(1)} ${t4[0].toFixed(1)},${t4[1].toFixed(1)}" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-opacity="0.6" stroke-width="0.8"/>
      <polygon points="${a2[0].toFixed(1)},${a2[1].toFixed(1)} ${a3[0].toFixed(1)},${a3[1].toFixed(1)} ${t3[0].toFixed(1)},${t3[1].toFixed(1)} ${t2[0].toFixed(1)},${t2[1].toFixed(1)}" fill="${color}" fill-opacity="0.55" stroke="${color}" stroke-opacity="0.6" stroke-width="0.8"/>
      <polygon points="${t1[0].toFixed(1)},${t1[1].toFixed(1)} ${t2[0].toFixed(1)},${t2[1].toFixed(1)} ${t3[0].toFixed(1)},${t3[1].toFixed(1)} ${t4[0].toFixed(1)},${t4[1].toFixed(1)}" fill="${color}" fill-opacity="0.85" stroke="#fff" stroke-opacity="0.3" stroke-width="0.8"/>
      <text x="${((t1[0] + t3[0]) / 2).toFixed(1)}" y="${((t1[1] + t3[1]) / 2).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui">${label}</text>
    `
  }

  const rdc = MALL.spaces.map(s => box(s.x, s.y, s.w, s.h, 0, 14, s.color, s.label.split(' ')[0])).join('')
  const r1 = [
    { x: 8,   y: 20, w: 70, h: 58, c: '#3b82f6', l: 'Bureaux' },
    { x: 80,  y: 20, w: 46, h: 32, c: '#f97316', l: 'Fitness' },
    { x: 128, y: 30, w: 58, h: 48, c: '#06b6d4', l: 'Café + Lounge' },
    { x: 10,  y: 90, w: 70, h: 38, c: '#a855f7', l: 'Événementiel' },
    { x: 82,  y: 90, w: 56, h: 22, c: '#ef4444', l: 'Centre médical' },
  ].map(s => box(s.x, s.y, s.w, s.h, floorH, 14, s.c, s.l)).join('')

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#0f1115;">
    ${floor(0)}
    ${rdc}
    ${floor(floorH, true)}
    ${r1}
    <text x="30" y="30" fill="#f59e0b" font-size="10" font-weight="700" letter-spacing="0.12em" font-family="ui-monospace,monospace">VUE ISOMÉTRIQUE · RDC + R+1</text>
    <text x="30" y="50" fill="#94a3b8" font-size="11" font-family="system-ui">Extrusion volumique avec hauteurs sous-plafond (RDC 4,2 m · R+1 3,6 m). Cliquable dans l'app.</text>
  </svg>`
}

// ─── SVG Superposition plans (Section 06) ─────────────────

function buildOverlaySvg(): string {
  const W = 1300, H = 480
  const scale = Math.min(W / MALL.widthM, H / MALL.heightM) * 0.88
  const ox = (W - MALL.widthM * scale) / 2
  const oy = (H - MALL.heightM * scale) / 2
  const X = (x: number) => x * scale + ox
  const Y = (y: number) => y * scale + oy

  const outer = `<rect x="${X(0).toFixed(1)}" y="${Y(0).toFixed(1)}" width="${(MALL.widthM * scale).toFixed(1)}" height="${(MALL.heightM * scale).toFixed(1)}" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5"/>`

  const rdc = MALL.spaces.map(s =>
    `<rect x="${X(s.x).toFixed(1)}" y="${Y(s.y).toFixed(1)}" width="${(s.w * scale).toFixed(1)}" height="${(s.h * scale).toFixed(1)}" rx="2" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6" stroke-opacity="0.5" stroke-width="1"/>`,
  ).join('')

  const r1Rooms: Array<[number, number, number, number]> = [
    [8, 20, 70, 58], [80, 20, 46, 32], [128, 30, 58, 48], [10, 90, 70, 38], [82, 90, 56, 22],
  ]
  const r1 = r1Rooms.map(([x, y, w, h]) =>
    `<rect x="${X(x).toFixed(1)}" y="${Y(y).toFixed(1)}" width="${(w * scale).toFixed(1)}" height="${(h * scale).toFixed(1)}" rx="2" fill="#a855f7" fill-opacity="0.18" stroke="#a855f7" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="6 3"/>`,
  ).join('')

  const transits = [[78, 55], [140, 55], [25, 108]].map(([x, y]) => `
    <circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="18" fill="#ef4444" fill-opacity="0.15"/>
    <circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="11" fill="#ef4444"/>
    <text x="${X(x).toFixed(1)}" y="${(Y(y) + 4).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">⇅</text>
  `).join('')

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#0f1115;">
    ${outer}
    ${rdc}
    ${r1}
    ${transits}
    <g transform="translate(30 26)">
      <rect width="14" height="14" fill="#3b82f6" fill-opacity="0.55"/>
      <text x="22" y="11" fill="#cbd5e1" font-size="11" font-family="system-ui">RDC · commerces & restauration</text>
    </g>
    <g transform="translate(30 50)">
      <rect width="14" height="14" fill="#a855f7" fill-opacity="0.55" stroke="#a855f7" stroke-dasharray="3 2"/>
      <text x="22" y="11" fill="#cbd5e1" font-size="11" font-family="system-ui">R+1 · bureaux / loisirs</text>
    </g>
    <g transform="translate(30 74)">
      <circle cx="7" cy="7" r="6" fill="#ef4444"/>
      <text x="22" y="11" fill="#cbd5e1" font-size="11" font-family="system-ui">Transits verticaux (3 × ascenseur + escalator)</text>
    </g>
  </svg>`
}

// ─── QR pattern visuel ────────────────────────────────────

function buildQrPattern(): string {
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
  const finder = (x: number, y: number) => `
    <rect x="${x}" y="${y}" width="18" height="18" fill="none" stroke="#0f172a" stroke-width="3"/>
    <rect x="${x + 6}" y="${y + 6}" width="6" height="6" fill="#0f172a"/>`
  return cells + finder(2, 2) + finder(60, 2) + finder(2, 60)
}

// ─── HTML report builder ──────────────────────────────────

function buildRichHtml(): string {
  const plan = buildPlan2D()
  const density = buildDensityChart()
  const iso = buildIsoSvg()
  const overlay = buildOverlaySvg()
  const generatedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  const ref = 'AMS-V3-PC-COSMOS-' + new Date().toISOString().slice(0, 10) + '-R02'

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport Parcours Client · Cosmos Angré</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:        #0b0d10;
    --bg-alt:    #0f1115;
    --card:      #15181d;
    --card-2:    #1a1d22;
    --border:    rgba(255,255,255,0.08);
    --border-2:  rgba(255,255,255,0.14);
    --ink:       #f5f5f4;
    --muted:     #94a3b8;
    --dim:       #64748b;
    --accent:    #f59e0b;
    --accent-2:  #f97316;
    --danger:    #ef4444;
    --warn:      #fbbf24;
    --success:   #10b981;
    --info:      #38bdf8;
  }
  * { box-sizing: border-box; }
  html, body { background: var(--bg); }
  body { margin: 0; color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.65; font-size: 14px; }
  .page { max-width: 1400px; margin: 0 auto; padding: 40px 48px 80px; }
  .mono { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }

  /* ─── Header ─── */
  header.doc { display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: start; padding-bottom: 28px; border-bottom: 1px solid var(--border); }
  .brandline { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .brand-mark { font-family: 'Grand Hotel', cursive; font-size: 34px; color: var(--accent); line-height: 1; letter-spacing: 0.02em; }
  .brandline .sep { color: var(--dim); }
  .brandline .crumb { color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; font-family: ui-monospace, monospace; }
  .doc-title { font-size: 26px; font-weight: 700; margin: 20px 0 4px; letter-spacing: -0.012em; }
  .doc-sub   { font-size: 13px; color: var(--muted); }
  .doc-meta  { text-align: right; font-size: 11px; color: var(--muted); font-family: ui-monospace, monospace; line-height: 1.9; }
  .doc-meta .k { color: var(--dim); }
  .doc-meta .v { color: var(--ink); }
  .doc-meta .ref .v { color: var(--accent); }

  /* ─── Chips de normes ─── */
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
  .chip { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; padding: 6px 12px; border-radius: 4px; border: 1px solid var(--border-2); color: var(--muted); background: transparent; }
  .chip.is-primary { border-color: var(--accent); color: var(--accent); background: rgba(245,158,11,0.08); }

  /* ─── Bandeau destinataire ─── */
  .ident-strip { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr; gap: 40px; margin-top: 32px; padding: 22px 28px; background: var(--card); border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 4px; }
  .ident-strip .cell .k { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; color: var(--dim); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 6px; }
  .ident-strip .cell .v { font-size: 14px; color: var(--ink); font-weight: 500; }

  /* ─── KPI cards ─── */
  .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-top: 18px; }
  .kpi { padding: 20px 22px; background: var(--card); border: 1px solid var(--border); border-radius: 4px; }
  .kpi .k { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; color: var(--dim); letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 10px; }
  .kpi .v { font-size: 32px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
  .kpi .v.ok    { color: var(--success); }
  .kpi .v.warn  { color: var(--accent); }
  .kpi .v.crit  { color: var(--danger); }
  .kpi .u { font-family: ui-monospace, monospace; font-size: 10px; color: var(--muted); margin-top: 8px; }
  .kpi .d { font-family: ui-monospace, monospace; font-size: 11px; margin-top: 8px; color: var(--accent); font-weight: 600; }
  .kpi .d.bad { color: var(--danger); }

  /* ─── Sections ─── */
  section.chapter { margin-top: 60px; }
  .chapter-head { display: grid; grid-template-columns: auto 1fr auto; gap: 18px; align-items: baseline; margin-bottom: 22px; }
  .chapter-head .num { font-family: ui-monospace, monospace; font-size: 13px; color: var(--accent); font-weight: 700; letter-spacing: 0.08em; }
  .chapter-head .title { font-size: 22px; font-weight: 700; letter-spacing: -0.012em; }
  .chapter-head .meta { font-family: ui-monospace, monospace; font-size: 11px; color: var(--dim); letter-spacing: 0.04em; }

  .card { background: var(--card); border: 1px solid var(--border); border-radius: 4px; }
  .card-pad { padding: 24px 28px; }

  /* ─── Map header avec tabs ─── */
  .map-card { overflow: hidden; }
  .map-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); }
  .map-head .title { font-size: 13px; font-weight: 600; }
  .tabs { display: flex; gap: 6px; }
  .tab { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; padding: 7px 14px; border-radius: 3px; border: 1px solid var(--border-2); color: var(--muted); background: transparent; }
  .tab.on { border-color: var(--accent); color: var(--accent); background: rgba(245,158,11,0.1); }

  .legend-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 32px; padding: 20px 28px; border-top: 1px solid var(--border); font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted); }
  .legend-grid .li { display: flex; align-items: center; gap: 8px; }
  .leg-dash { width: 22px; height: 1px; border-top: 2px dashed var(--accent); }
  .leg-solid { width: 22px; height: 2px; background: var(--muted); }
  .leg-sq { width: 12px; height: 12px; border: 1px solid currentColor; }
  .leg-dot { width: 10px; height: 10px; border-radius: 50%; }

  /* ─── Prose sections ─── */
  .prose p { margin: 0 0 14px; color: var(--ink); font-size: 14.5px; line-height: 1.8; }
  .prose p:last-child { margin-bottom: 0; }
  .prose .hl { color: var(--accent); font-weight: 600; }
  .prose .hl-w { color: var(--ink); font-weight: 600; }
  .prose a { color: var(--info); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  .prose strong { color: var(--ink); font-weight: 600; }

  /* ─── Tables ─── */
  table.dt { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.dt th { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim); font-weight: 700; text-align: left; padding: 14px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  table.dt td { padding: 14px 16px; color: var(--ink); border-bottom: 1px solid var(--border); vertical-align: top; }
  table.dt tr:last-child td { border-bottom: none; }
  table.dt .num  { font-family: ui-monospace, monospace; color: var(--ink); white-space: nowrap; }
  table.dt .pct  { font-family: ui-monospace, monospace; color: var(--muted); }
  table.dt .pct.neg { color: var(--danger); }
  table.dt .pct.pos { color: var(--success); }
  table.dt .accent { color: var(--accent); font-family: ui-monospace, monospace; font-weight: 700; }

  .dbl { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  @media (max-width: 1100px) { .dbl { grid-template-columns: 1fr; } }

  .subtitle { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; }

  /* ─── Recommandations table ─── */
  table.rec { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.rec th { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); font-weight: 700; text-align: left; padding: 14px 18px; border-bottom: 1px solid var(--border); }
  table.rec td { padding: 18px; color: var(--ink); border-bottom: 1px solid var(--border); vertical-align: top; font-size: 13px; }
  table.rec tr:last-child td { border-bottom: none; background: rgba(245,158,11,0.04); }
  table.rec tr:last-child td.accent-tot { color: var(--accent); font-weight: 700; }
  table.rec .id { font-family: ui-monospace, monospace; color: var(--accent); font-weight: 700; letter-spacing: 0.06em; }
  table.rec .capex, table.rec .opex { font-family: ui-monospace, monospace; color: var(--ink); white-space: nowrap; }
  table.rec .delay { font-family: ui-monospace, monospace; color: var(--accent); }
  table.rec .impact { color: var(--success); font-family: ui-monospace, monospace; font-size: 12px; }
  table.rec .impact.bad { color: var(--danger); }
  .prio { display: inline-block; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 3px; }
  .prio.p0 { background: var(--danger); color: #fff; }
  .prio.p1 { background: var(--accent); color: #0f1115; }
  .prio.p2 { background: var(--border-2); color: var(--ink); }

  /* ─── Méthodologie grid ─── */
  .meth-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px 36px; padding: 28px 32px; }
  .meth-grid .block .k { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--dim); text-transform: uppercase; margin-bottom: 8px; }
  .meth-grid .block .v { font-size: 13px; color: var(--ink); line-height: 1.65; }
  .meth-section-title { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--accent); text-transform: uppercase; padding: 24px 32px 0; }
  .meth-divider { height: 1px; background: var(--border); margin: 8px 32px 0; }

  /* ─── Visite guidée ─── */
  .tour { padding: 28px 32px; }
  .tour-step { display: grid; grid-template-columns: 60px 1fr auto; gap: 20px; align-items: start; padding: 22px 0; border-bottom: 1px solid var(--border); }
  .tour-step:last-child { border-bottom: none; padding-bottom: 0; }
  .tour-step:first-child { padding-top: 0; }
  .tour-step .n { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--accent); color: var(--accent); font-family: ui-monospace, monospace; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .tour-step .t { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .tour-step .d { font-size: 13px; color: var(--muted); line-height: 1.6; }
  .tour-step .tags { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .tour-step .tag { font-family: ui-monospace, monospace; font-size: 10px; padding: 3px 9px; border-radius: 3px; border: 1px solid var(--border-2); color: var(--muted); }
  .tour-step .duration { font-family: ui-monospace, monospace; font-size: 11px; color: var(--accent); padding: 5px 12px; border: 1px solid var(--accent); border-radius: 3px; white-space: nowrap; align-self: start; }

  /* ─── XR cards ─── */
  .xr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .xr-card { background: var(--card); border: 1px solid var(--border); border-radius: 4px; padding: 28px; position: relative; overflow: hidden; }
  .xr-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .xr-card.ar::before { background: linear-gradient(90deg, #a855f7, #6366f1); }
  .xr-card.vr::before { background: linear-gradient(90deg, #06b6d4, #3b82f6); }
  .xr-card .k { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
  .xr-card h3 { margin: 10px 0 10px; font-size: 20px; color: var(--ink); letter-spacing: -0.01em; }
  .xr-card p { margin: 0 0 16px; color: var(--muted); font-size: 13px; line-height: 1.65; }
  .xr-card .features { display: flex; flex-wrap: wrap; gap: 6px; }
  .xr-card .feat { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.06em; padding: 5px 10px; border-radius: 3px; border: 1px solid var(--border-2); color: var(--muted); }
  .xr-card .qr { position: absolute; bottom: 24px; right: 24px; width: 80px; height: 80px; background: #fff; border-radius: 4px; padding: 6px; }

  /* ─── Actions bar ─── */
  .actions-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 40px; padding-top: 28px; border-top: 1px solid var(--border); }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn.done { background: #10b981; color: #0f1115; border-color: #10b981; }

  /* Modal overlay */
  .modal-back { position: fixed; inset: 0; background: rgba(0,0,0,0.72); backdrop-filter: blur(3px); display: none; z-index: 9998; align-items: center; justify-content: center; padding: 20px; }
  .modal-back.open { display: flex; }
  .modal { width: min(680px, 100%); max-height: 85vh; overflow-y: auto; background: var(--card); border: 1px solid var(--border-2); border-radius: 6px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); }
  .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid var(--border); }
  .modal-head .t { font-size: 16px; font-weight: 600; color: var(--ink); }
  .modal-head .k { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.14em; color: var(--accent); text-transform: uppercase; margin-bottom: 4px; }
  .modal-head .x { cursor: pointer; color: var(--muted); background: transparent; border: none; font-size: 18px; padding: 4px 8px; }
  .modal-head .x:hover { color: var(--ink); }
  .modal-body { padding: 22px 24px; color: var(--ink); font-size: 13px; line-height: 1.65; }
  .modal-body label { display: block; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted); text-transform: uppercase; margin-bottom: 6px; margin-top: 14px; }
  .modal-body select, .modal-body input[type=text], .modal-body input[type=email], .modal-body textarea {
    width: 100%; background: var(--bg-alt); border: 1px solid var(--border-2); color: var(--ink); font: inherit; padding: 10px 12px; border-radius: 3px; outline: none; font-family: inherit;
  }
  .modal-body textarea { resize: vertical; min-height: 90px; }
  .modal-body select:focus, .modal-body input:focus, .modal-body textarea:focus { border-color: var(--accent); }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border); }
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #10b981; color: #0f1115; padding: 12px 22px; border-radius: 3px; font-weight: 700; font-family: ui-monospace,monospace; font-size: 12px; letter-spacing: 0.08em; box-shadow: 0 12px 30px rgba(16,185,129,0.35); z-index: 10000; opacity: 0; transition: opacity 0.25s, transform 0.25s; pointer-events: none; }
  .toast.show { opacity: 1; transform: translate(-50%, -10px); }
  .share-link { display: flex; gap: 8px; align-items: center; background: var(--bg-alt); border: 1px solid var(--border-2); padding: 10px 12px; border-radius: 3px; }
  .share-link code { flex: 1; color: var(--info); font-size: 12px; overflow-x: auto; white-space: nowrap; }
  .validated-banner { display: none; margin-top: 20px; padding: 14px 18px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.4); border-radius: 3px; color: #6ee7b7; font-size: 13px; }
  .validated-banner.show { display: flex; align-items: center; gap: 10px; }
  .validated-banner .mono { font-family: ui-monospace, monospace; color: #10b981; font-weight: 700; }
  .comment-badge { position: fixed; top: 20px; right: 20px; background: var(--accent); color: #0f1115; padding: 8px 14px; border-radius: 3px; font-family: ui-monospace,monospace; font-size: 11px; font-weight: 700; box-shadow: 0 8px 24px rgba(245,158,11,0.3); z-index: 9997; display: none; }
  .comment-badge.show { display: block; }
  .btn { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 22px; border-radius: 3px; border: 1px solid var(--border-2); background: transparent; color: var(--ink); cursor: pointer; transition: all 0.15s; }
  .btn:hover { border-color: var(--accent); color: var(--accent); }
  .btn.primary { background: var(--accent); color: #0f1115; border-color: var(--accent); }
  .btn.primary:hover { background: #fbbf24; color: #0f1115; }
  .action-hint { color: var(--muted); font-size: 12px; margin-top: 18px; font-family: ui-monospace, monospace; letter-spacing: 0.04em; }

  footer.doc { margin-top: 50px; padding-top: 24px; border-top: 1px solid var(--border); display: grid; grid-template-columns: 1fr auto; gap: 20px; font-family: ui-monospace, monospace; font-size: 10px; color: var(--dim); letter-spacing: 0.04em; }

  /* ─── Responsive ─── */
  @media (max-width: 1100px) {
    .page { padding: 24px; }
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .ident-strip { grid-template-columns: 1fr; gap: 18px; }
    .meth-grid { grid-template-columns: 1fr; }
    .xr-grid { grid-template-columns: 1fr; }
    header.doc { grid-template-columns: 1fr; }
    .doc-meta { text-align: left; }
  }

  @media print {
    body { background: #fff; color: #000; }
    .page { padding: 0; max-width: 100%; }
    .actions-row { display: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- ═══ Header ═══ -->
  <header class="doc">
    <div>
      <div class="brandline">
        <span class="brand-mark">Atlas Studio</span>
        <span class="sep">/</span>
        <span class="crumb">Mall Suite · Vol.3 Parcours Client</span>
      </div>
      <div class="doc-title">Rapport d'analyse du parcours client — Cosmos Angré</div>
      <div class="doc-sub">Centre commercial 30 000 m² · RDC · Abidjan · New Heaven SA</div>
      <div class="chips">
        <span class="chip is-primary">Proph3t v2.4</span>
        <span class="chip">ABM Helbing</span>
        <span class="chip">ISO 7010</span>
        <span class="chip">NF X 08-003</span>
        <span class="chip">ICSC Afrique 2024</span>
        <span class="chip">Monte Carlo 10k</span>
      </div>
    </div>
    <div class="doc-meta">
      <div><span class="k">Destinataire</span> · <span class="v">M. Cheick Sanankoua — DG</span></div>
      <div><span class="k">Émetteur</span> · <span class="v">Atlas Mall Suite / Proph3t IA</span></div>
      <div><span class="k">Généré</span> · <span class="v">${generatedAt} UTC</span></div>
      <div class="ref"><span class="k">ref</span> · <span class="v">${ref}</span></div>
    </div>
  </header>

  <!-- ═══ Ident strip ═══ -->
  <div class="ident-strip">
    <div class="cell"><div class="k">Destinataire</div><div class="v">Monsieur Cheick Sanankoua — Directeur Général, New Heaven SA</div></div>
    <div class="cell"><div class="k">Périmètre</div><div class="v">Cosmos Angré · RDC · 30 000 m² GLA · 80 boutiques</div></div>
    <div class="cell"><div class="k">Horizon</div><div class="v">Soft opening Oct. 2026 · Régime cible T+6 mois</div></div>
  </div>

  <!-- ═══ KPIs ═══ -->
  <div class="kpis">
    <div class="kpi"><div class="k">Surface analysée</div><div class="v">30 000</div><div class="u">m² GLA</div></div>
    <div class="kpi"><div class="k">Dwell time moyen</div><div class="v warn">47</div><div class="u">min · IC95 ±3,2</div><div class="d bad">−5 min vs. benchmark UEMOA (52 min, N=9 malls)</div></div>
    <div class="kpi"><div class="k">Taux de traversée</div><div class="v warn">34 <span style="font-size:16px;color:var(--muted);">%</span></div><div class="u">objectif 45 %</div><div class="d bad">−11 pts vs. objectif</div></div>
    <div class="kpi"><div class="k">Panneaux à corriger</div><div class="v crit">9</div><div class="u">7 manquants · 2 contradictoires</div></div>
    <div class="kpi"><div class="k">Hotspots congestion</div><div class="v crit">3</div><div class="u">densité > 2,5 pax/m²</div></div>
    <div class="kpi"><div class="k">Uplift CA post-corrections</div><div class="v warn">+142</div><div class="u">MFCFA/an · ROI 8,0× (24 mois)</div></div>
  </div>

  <!-- ═══ 01 Plan 2D annoté ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">01</span>
      <span class="title">Plan 2D annoté — Flux, signalétique, congestion</span>
      <span class="meta">Échelle 1:500 · 2 400 agents simulés</span>
    </div>
    <div class="card map-card">
      <div class="map-head">
        <span class="title">Cosmos Angré · RDC · Couches superposées</span>
        <div class="tabs">
          <span class="tab on">Flux</span>
          <span class="tab on">Signalétique</span>
          <span class="tab on">Congestion</span>
          <span class="tab on">Annotations</span>
        </div>
      </div>
      ${plan}
      <div class="legend-grid">
        <div class="li"><span class="leg-dash"></span>Flux principal (&gt;15 %)</div>
        <div class="li"><span class="leg-solid"></span>Flux secondaire (&lt;15 %)</div>
        <div class="li"><span class="leg-dot" style="background:#ef4444"></span>Densité &gt; 2,5 pax/m²</div>
        <div class="li"><span class="leg-dot" style="background:#f59e0b"></span>Densité 2,0 — 2,5 pax/m²</div>
        <div class="li"><span class="leg-sq" style="color:#fbbf24"></span>Panneau existant</div>
        <div class="li"><span class="leg-sq" style="color:#f87171;border-style:dashed"></span>Panneau manquant (M1-M7)</div>
        <div class="li"><span class="leg-sq" style="color:#fbbf24"></span>Panneau contradictoire (C1-C2)</div>
        <div class="li"><span class="leg-dot" style="border:1px solid #f59e0b;background:transparent"></span>Borne interactive proposée</div>
      </div>
    </div>
  </section>

  <!-- ═══ 02 Synthèse exécutive ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">02</span>
      <span class="title">Synthèse exécutive</span>
      <span class="meta">Lecture 90 sec.</span>
    </div>
    <div class="card card-pad prose">
      <p><strong>Monsieur le Directeur Général,</strong></p>
      <p>Proph3t a analysé le parcours client de Cosmos Angré (30 000 m² GLA, RDC) en croisant la simulation Agent-Based Modeling <a href="#">Helbing Social Force</a> (2 400 agents, 3 h simulées, 10 000 runs Monte Carlo) avec le benchmark ICSC Afrique 2024 (panel N = 9 malls UEMOA comparables).</p>
      <p>Trois constats majeurs émergent. <span class="hl">Premier constat :</span> le dwell time moyen ressort à 47 min (IC95 % : 43,8 — 50,2), soit 5 min en deçà du benchmark UEMOA (52 min) — équivalent à un manque à gagner de ~8 % de panier moyen selon l'élasticité ICSC. <span class="hl">Deuxième constat :</span> seuls 34 % des visiteurs traversent intégralement le mall (objectif : 45 %), en raison de trois points de friction identifiés sur le plan ci-dessus. <span class="hl">Troisième constat :</span> 9 défauts de signalétique (7 panneaux manquants, 2 contradictoires) privent la galerie Services &amp; Banques de 60 % de son flux potentiel (42 pax/h observés vs. 105 pax/h attendus).</p>
      <p>Les corrections proposées représentent un investissement total de <span class="hl">17,7 MFCFA</span> (CAPEX 11,9 + OPEX 5,8 sur 24 mois), pour un uplift de CA prévisionnel de <span class="hl">+142 MFCFA/an</span>. ROI consolidé sur 24 mois : <span class="hl">8,0×</span>. Payback théorique : <span class="hl">1,5 mois</span>.</p>
    </div>
  </section>

  <!-- ═══ 03 Analyse des flux piétons ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">03</span>
      <span class="title">Analyse des flux piétons</span>
      <span class="meta">Modèle Helbing · 2 400 agents</span>
    </div>
    <div class="prose" style="margin-bottom:20px;">
      <p>Le modèle Helbing Social Force (v = 1,20 m/s ± 0,18 ; rayon social = 0,60 m ; facteur répulsion k = 2,1·10³ N ; horizon de réaction τ = 0,54 s) reproduit le comportement piéton avec un RMSE de 0,14 pax/m² vs. données captées sur 3 malls africains de référence (Accra Mall, Ikeja City Mall, Sandton City).</p>
      <p>L'aimant <a href="#">Hypermarché Carrefour</a> en angle Nord-Ouest fixe 60 % du flux d'entrée Nord dès les 15 premiers mètres. Les clusters <a href="#">Beauté</a> et <a href="#">Espace Tech</a>, positionnés sur le couloir central, bénéficient du passage (312 et 289 pax/h aux heures pleines). L'entrée Sud, moins empruntée (40 % du flux total), diffuse principalement vers le Cinéma et l'Aire de jeux. Le flux croisé Nord↔Sud ne dépasse pas 18 % des visiteurs — insuffisant pour nourrir la galerie Services &amp; Banques en arrière-plan.</p>
    </div>
    <div class="dbl">
      <div class="card">
        <div style="padding:22px 28px 10px;"><div class="subtitle">Matrice origine → destination (flux principal)</div></div>
        <table class="dt">
          <thead>
            <tr><th>Depuis</th><th>Carrefour</th><th>Galerie</th><th>Food C.</th><th>Cinéma</th><th>Banques</th></tr>
          </thead>
          <tbody>
            <tr><td>Entrée Nord</td><td class="num">60%</td><td class="num">22%</td><td class="num">14%</td><td class="num">3%</td><td class="num">1%</td></tr>
            <tr><td>Entrée Sud</td><td class="num">12%</td><td class="num">8%</td><td class="num">24%</td><td class="num">48%</td><td class="num">8%</td></tr>
            <tr><td>Sortie Carrefour</td><td class="num">—</td><td class="num">38%</td><td class="num">29%</td><td class="num">6%</td><td class="num">4%</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <div style="padding:22px 28px 10px;"><div class="subtitle">Zones sous-performantes vs. attendu</div></div>
        <table class="dt">
          <thead>
            <tr><th>Zone</th><th>Observé</th><th>Attendu</th><th>Écart</th></tr>
          </thead>
          <tbody>
            <tr><td>Services &amp; Banques</td><td class="num">42 pax/h</td><td class="num">105 pax/h</td><td class="pct neg">−60 %</td></tr>
            <tr><td>Pharmacie Santé</td><td class="num">78 pax/h</td><td class="num">95 pax/h</td><td class="pct neg">−18 %</td></tr>
            <tr><td>Sanitaires RDC-2</td><td class="num">34 pax/h</td><td class="num">90 pax/h</td><td class="pct neg">−62 %</td></tr>
            <tr><td>Aire de jeux enfants</td><td class="num">156 pax/h</td><td class="num">140 pax/h</td><td class="pct pos">+11 %</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ═══ 04 Densité temporelle ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">04</span>
      <span class="title">Densité temporelle — 3 hotspots critiques</span>
      <span class="meta">Samedi type · 10h — 22h</span>
    </div>
    <div class="card card-pad">
      ${density}
    </div>
  </section>

  <!-- ═══ 05 Vue 3D isométrique ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">05</span>
      <span class="title">Vue 3D isométrique — RDC + R+1</span>
      <span class="meta">Extrusion volumique</span>
    </div>
    <div class="card">
      ${iso}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:20px 28px;border-top:1px solid var(--border);">
        <div><div class="subtitle" style="color:#3b82f6">RDC · 14 zones actives</div><div style="color:var(--muted);font-size:12px;">commerces, restauration, entrées, services. Hauteur 4,2 m.</div></div>
        <div><div class="subtitle" style="color:#a855f7">R+1 · 5 zones projetées</div><div style="color:var(--muted);font-size:12px;">bureaux, fitness, café lounge, salle événementielle, centre médical. Hauteur 3,6 m.</div></div>
        <div><div class="subtitle" style="color:#ef4444">3 transits verticaux</div><div style="color:var(--muted);font-size:12px;">escaliers + ascenseurs + 2 monte-charges staff.</div></div>
      </div>
    </div>
  </section>

  <!-- ═══ 06 Superposition multi-étages ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">06</span>
      <span class="title">Superposition des plans multi-étages</span>
      <span class="meta">Alignement géométrique RDC + R+1</span>
    </div>
    <div class="card">
      ${overlay}
      <div style="padding:20px 28px;border-top:1px solid var(--border);color:var(--muted);font-size:13px;line-height:1.65;">
        <span style="color:var(--accent);font-weight:600;">Analyse Proph3t :</span>
        les 3 transits verticaux sont bien répartis (écart max 75 m, recommandation : &lt; 100 m).
        La zone <span style="color:var(--ink);font-weight:500;">Services &amp; Banques</span> au R+1 n'a aucun transit dans un rayon de 60 m —
        contribue au faible flux (42 pax/h). Recommandation : envisager un escalator supplémentaire ou repositionner les enseignes à plus fort pouvoir attractif.
      </div>
    </div>
  </section>

  <!-- ═══ 07 Visite guidée ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">07</span>
      <span class="title">Visite guidée recommandée — parcours optimal</span>
      <span class="meta">65 min · app mobile + bornes</span>
    </div>
    <div class="card tour">
      <div class="tour-step">
        <div class="n">01</div>
        <div>
          <div class="t">Entrée Nord — Accueil digital</div>
          <div class="d">Scan QR de l'app mobile. Proph3t propose automatiquement le parcours personnalisé selon le profil visiteur (famille, affaires, jeune, senior).</div>
          <div class="tags"><span class="tag">flux 420 pax/h</span><span class="tag">densité 2,1</span></div>
        </div>
        <div class="duration">0 — 2 min</div>
      </div>
      <div class="tour-step">
        <div class="n">02</div>
        <div>
          <div class="t">Hypermarché Carrefour — Courses + épicerie</div>
          <div class="d">Aimant commercial primaire. Dépose du panier au point de conservation climatisé à la sortie pour libérer le parcours galerie.</div>
          <div class="tags"><span class="tag">panier moyen 18 k FCFA</span><span class="tag">conversion 78 %</span></div>
        </div>
        <div class="duration">2 — 20 min</div>
      </div>
      <div class="tour-step">
        <div class="n">03</div>
        <div>
          <div class="t">Galerie Mode + Cluster Beauté</div>
          <div class="d">Transit axial vers enseignes mode haut-de-gamme puis cluster beauté. Synergie catégorielle détectée (+1,3× conversion).</div>
          <div class="tags"><span class="tag">synergie +1,3×</span><span class="tag">conversion 34 %</span></div>
        </div>
        <div class="duration">20 — 38 min</div>
      </div>
      <div class="tour-step">
        <div class="n">04</div>
        <div>
          <div class="t">Pause Food Court</div>
          <div class="d">12 enseignes restauration · table commune 120 couverts. Attention bottleneck 12h-14h identifié au chapitre 04.</div>
          <div class="tags"><span class="tag">ticket moyen 4,5 k FCFA</span><span class="tag">panier rempli 91 %</span></div>
        </div>
        <div class="duration">38 — 55 min</div>
      </div>
      <div class="tour-step">
        <div class="n">05</div>
        <div>
          <div class="t">Cinéma ou Aire enfants — sortie Sud</div>
          <div class="d">Embranchement selon composition visiteur. Proph3t recommande le retour par l'Entrée Sud pour désengorger la Nord.</div>
          <div class="tags"><span class="tag">cross-sell +12 %</span><span class="tag">rétention J+7 +6 %</span></div>
        </div>
        <div class="duration">55 — 65 min</div>
      </div>
    </div>
  </section>

  <!-- ═══ 08 AR / VR ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">08</span>
      <span class="title">Réalité augmentée &amp; virtuelle</span>
      <span class="meta">Extensions immersives</span>
    </div>
    <div class="xr-grid">
      <div class="xr-card ar">
        <div class="k">Réalité augmentée</div>
        <h3>Wayfinder AR — app mobile</h3>
        <p>Le visiteur pointe son smartphone, voit en surimpression : flèches directionnelles 3D vers sa destination, nom des enseignes, promos actives. Fusion WiFi-fingerprinting + BLE + PDR · précision ±1,3 m.</p>
        <div class="features">
          <span class="feat">WebXR</span><span class="feat">EKF 2D</span><span class="feat">iOS + Android</span><span class="feat">offline-first</span>
        </div>
        <svg class="qr" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="80" fill="#fff"/>
          <g fill="#0f1115">${buildQrPattern()}</g>
        </svg>
      </div>
      <div class="xr-card vr">
        <div class="k">Réalité virtuelle</div>
        <h3>Tour virtuel immersif — casque VR</h3>
        <p>Pré-visite avant ouverture : formations staff, simulations de foules, tests signalétique, présentations investisseurs. Scène 3D exportée depuis vos plans DXF. Compatible Meta Quest / Vision Pro / navigateur WebXR.</p>
        <div class="features">
          <span class="feat">Three.js + R3F</span><span class="feat">React XR</span><span class="feat">Quest / Vision Pro</span><span class="feat">export .glb</span>
        </div>
        <svg class="qr" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="80" fill="#fff"/>
          <g fill="#0f1115">${buildQrPattern()}</g>
        </svg>
      </div>
    </div>
  </section>

  <!-- ═══ 09 Plan d'action ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">09</span>
      <span class="title">Plan d'action chiffré</span>
      <span class="meta">6 recommandations · priorisées</span>
    </div>
    <div class="card">
      <table class="rec">
        <thead>
          <tr><th>ID</th><th>Action</th><th>Référence plan</th><th>CAPEX (FCFA)</th><th>OPEX/an (FCFA)</th><th>Délai</th><th>Impact quantifié</th><th>Priorité</th></tr>
        </thead>
        <tbody>
          <tr><td class="id">R01</td><td>Installer 7 panneaux directionnels normalisés ISO 7010</td><td class="delay">M1 → M7</td><td class="capex">1 800 000</td><td class="opex">—</td><td class="delay">14 j</td><td class="impact">+40 pax/h banques</td><td><span class="prio p0">P0</span></td></tr>
          <tr><td class="id">R02</td><td>Corriger 2 panneaux contradictoires (sanitaires)</td><td class="delay">C1, C2</td><td class="capex">200 000</td><td class="opex">—</td><td class="delay">3 j</td><td class="impact">−38 m détour moyen</td><td><span class="prio p0">P0</span></td></tr>
          <tr><td class="id">R03</td><td>Installer borne interactive carrefour FC / Cinéma</td><td class="delay">cercle amber</td><td class="capex">1 400 000</td><td class="opex">240 000</td><td class="delay">30 j</td><td class="impact">+12 % dwell time</td><td><span class="prio p1">P1</span></td></tr>
          <tr><td class="id">R04</td><td>Étendre sanitaires RDC-1 : +4 cabines (plomberie + cloisons + ventilation + carrelage)</td><td class="delay">annot. 3</td><td class="capex">8 500 000</td><td class="opex">180 000</td><td class="delay">45 j</td><td class="impact">−1,2 pax/m² pic</td><td><span class="prio p1">P1</span></td></tr>
          <tr><td class="id">R05</td><td>Déployer 3 ambassadeurs régulation sam./dim. 14-20h</td><td class="delay">annot. 1,2</td><td class="capex">—</td><td class="opex">2 880 000</td><td class="delay">immédiat</td><td class="impact">−22 % attente FC</td><td><span class="prio p0">P0</span></td></tr>
          <tr><td class="id">R06</td><td>Recalibration ABM Proph3t (T+90j avec données réelles)</td><td class="delay">SaaS</td><td class="capex">—</td><td class="opex">inclus Atlas Mall Suite</td><td class="delay">90 j</td><td class="impact">boucle continue</td><td><span class="prio p2">P2</span></td></tr>
          <tr><td class="id">—</td><td class="accent-tot">TOTAL (24 mois)</td><td class="delay">—</td><td class="capex accent-tot">11 900 000</td><td class="opex accent-tot">5 800 000</td><td class="delay">—</td><td class="impact accent-tot">+142 MFCFA/an · ROI 8,0×</td><td>—</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ═══ 10 Méthodologie ═══ -->
  <section class="chapter">
    <div class="chapter-head">
      <span class="num">10</span>
      <span class="title">Méthodologie &amp; sources</span>
      <span class="meta">Traçabilité complète</span>
    </div>
    <div class="card">
      <div class="meth-section-title" style="padding-top:28px;">Paramètres de simulation</div>
      <div class="meth-grid">
        <div class="block"><div class="k">Modèle</div><div class="v">Helbing Social Force (1995) — implémentation Python (pedpy v0.6)</div></div>
        <div class="block"><div class="k">Agents simulés</div><div class="v">2 400 agents · 10 000 runs Monte Carlo · 3 h simulées</div></div>
        <div class="block"><div class="k">Paramètres physiques</div><div class="v">v₀ = 1,20 m/s (σ=0,18) · r = 0,60 m · τ = 0,54 s · k = 2,1·10³ N</div></div>
        <div class="block"><div class="k">Validation RMSE</div><div class="v">0,14 pax/m² vs. données captées (Accra Mall, Ikeja City Mall, Sandton City)</div></div>
        <div class="block"><div class="k">Benchmark ICSC</div><div class="v">Panel N=9 malls UEMOA (Côte d'Ivoire, Sénégal, Mali) · 2024 · dwell time médian 52 min, CA/m² médian 15 MFCFA/an</div></div>
        <div class="block"><div class="k">Normes appliquées</div><div class="v">ISO 7010 (pictogrammes) · ISO 20382-1 (densité foule) · NF X 08-003 (signalétique informative)</div></div>
      </div>
      <div class="meth-divider"></div>
      <div class="meth-section-title">Hypothèses &amp; limites</div>
      <div class="meth-grid">
        <div class="block"><div class="k">Hypothèse flux d'entrée</div><div class="v">60/40 Nord/Sud · dérivé comptages ADM 3 malls CI + modélisation pondérée par accessibilité TPU</div></div>
        <div class="block"><div class="k">Uplift CA</div><div class="v">Élasticité ICSC : +1 min dwell = +0,8 % panier moyen · bornes : +5,6 % (bas) à +9,1 % (haut)</div></div>
        <div class="block"><div class="k">Limites du modèle</div><div class="v">Ne prend pas en compte effets promotionnels ponctuels, météo extrême, événements tiers. Recalibration T+90j nécessaire.</div></div>
      </div>
      <div style="height:22px"></div>
    </div>

    <div class="actions-row">
      <button id="btn-validate" class="btn primary">✓ Valider le rapport</button>
      <button id="btn-correct" class="btn">Demander des corrections</button>
      <button id="btn-comment" class="btn">Commenter une section</button>
      <button id="btn-pdf" class="btn">Exporter .PDF</button>
      <button id="btn-share" class="btn">Partager au board</button>
    </div>
    <div id="validated-banner" class="validated-banner">
      <span style="font-size:18px;">✓</span>
      <div>
        <strong>Rapport validé</strong>
        — notification envoyée à Proph3t (journal d'audit mis à jour).
        <span class="mono" id="validated-at"></span>
      </div>
    </div>
    <div class="action-hint">Proph3t itère en &lt; 24 h sur toute demande de correction ou scénario alternatif (fermeture d'entrée, extension, reconfig Food Court…).</div>
  </section>

  <!-- ═══ MODAL : Corrections ═══ -->
  <div id="modal-correct" class="modal-back" onclick="if(event.target===this)closeModal(this)">
    <div class="modal">
      <div class="modal-head">
        <div>
          <div class="k">Action · Demander des corrections</div>
          <div class="t">Envoyer une demande d'itération à Proph3t</div>
        </div>
        <button class="x" onclick="closeModal(this.closest('.modal-back'))">✕</button>
      </div>
      <div class="modal-body">
        <label>Section visée</label>
        <select id="correct-section">
          <option value="01">01 · Plan 2D annoté</option>
          <option value="02">02 · Synthèse exécutive</option>
          <option value="03">03 · Analyse flux piétons</option>
          <option value="04">04 · Densité temporelle</option>
          <option value="05">05 · Vue 3D isométrique</option>
          <option value="06">06 · Superposition multi-étages</option>
          <option value="07">07 · Visite guidée</option>
          <option value="08">08 · AR / VR</option>
          <option value="09">09 · Plan d'action chiffré</option>
          <option value="10">10 · Méthodologie</option>
        </select>
        <label>Type de correction</label>
        <select id="correct-type">
          <option>Hypothèse à revoir</option>
          <option>Donnée erronée</option>
          <option>Ajouter un scénario alternatif</option>
          <option>Ajuster le ton / l'audience</option>
          <option>Compléter une analyse</option>
        </select>
        <label>Description détaillée</label>
        <textarea id="correct-body" placeholder="Exemple : Proph3t, simule l'impact d'une fermeture temporaire de l'entrée Nord pendant 2 semaines pour travaux. Adapter les recommandations en conséquence."></textarea>
        <label>Échéance souhaitée</label>
        <select id="correct-deadline">
          <option>Urgent (&lt; 24 h)</option>
          <option selected>Standard (&lt; 72 h)</option>
          <option>Non urgent (&lt; 1 semaine)</option>
        </select>
      </div>
      <div class="modal-foot">
        <button class="btn" onclick="closeModal(this.closest('.modal-back'))">Annuler</button>
        <button class="btn primary" onclick="submitCorrection()">Envoyer à Proph3t</button>
      </div>
    </div>
  </div>

  <!-- ═══ MODAL : Commenter ═══ -->
  <div id="modal-comment" class="modal-back" onclick="if(event.target===this)closeModal(this)">
    <div class="modal">
      <div class="modal-head">
        <div>
          <div class="k">Action · Commenter une section</div>
          <div class="t">Ajouter un commentaire persistant sur le rapport</div>
        </div>
        <button class="x" onclick="closeModal(this.closest('.modal-back'))">✕</button>
      </div>
      <div class="modal-body">
        <label>Votre nom</label>
        <input type="text" id="comment-name" value="Cheick Sanankoua" />
        <label>Section</label>
        <select id="comment-section">
          <option value="02">02 · Synthèse exécutive</option>
          <option value="03">03 · Analyse flux piétons</option>
          <option value="09">09 · Plan d'action chiffré</option>
          <option value="all">Rapport global</option>
        </select>
        <label>Commentaire</label>
        <textarea id="comment-body" placeholder="Exemple : D'accord sur R01 et R02 à lancer immédiatement. Pour R04 (sanitaires), merci de prévoir une phase intermédiaire avec cabines modulaires pendant les travaux."></textarea>
        <label>Destinataires notifiés</label>
        <select id="comment-notify" multiple size="3" style="height:auto">
          <option selected>Proph3t IA</option>
          <option>Aminata Koné (DT)</option>
          <option>Jean-Marc Dupont (Consultant)</option>
          <option>Équipe exploitation</option>
        </select>
      </div>
      <div class="modal-foot">
        <button class="btn" onclick="closeModal(this.closest('.modal-back'))">Annuler</button>
        <button class="btn primary" onclick="submitComment()">Publier le commentaire</button>
      </div>
    </div>
  </div>

  <!-- ═══ MODAL : Partager ═══ -->
  <div id="modal-share" class="modal-back" onclick="if(event.target===this)closeModal(this)">
    <div class="modal">
      <div class="modal-head">
        <div>
          <div class="k">Action · Partager au board</div>
          <div class="t">Diffuser le rapport à l'équipe ou au conseil</div>
        </div>
        <button class="x" onclick="closeModal(this.closest('.modal-back'))">✕</button>
      </div>
      <div class="modal-body">
        <label>Lien de consultation (traçable)</label>
        <div class="share-link">
          <code id="share-link-url">https://app.atlasmallsuite.com/r/${ref}</code>
          <button class="btn" style="padding:6px 10px;" onclick="copyShareLink()">Copier</button>
        </div>
        <label>Destinataires (emails)</label>
        <textarea id="share-emails" placeholder="dg@newheavensa.ci&#10;investors@cosmosgroup.ci&#10;direction.tech@newheavensa.ci" style="min-height:70px">dg@newheavensa.ci
investors@cosmosgroup.ci</textarea>
        <label>Message d'introduction</label>
        <textarea id="share-msg">Bonjour,

Vous trouverez ci-joint le rapport d'analyse du parcours client de Cosmos Angré généré par Proph3t. Merci de valider vos sections d'intérêt avant mercredi.

Cordialement,
New Heaven SA</textarea>
        <label>Options</label>
        <div style="display:flex;flex-direction:column;gap:8px;font-family:inherit;">
          <label style="margin:0;text-transform:none;letter-spacing:normal;font-family:inherit;font-size:13px;color:var(--ink);font-weight:400;"><input type="checkbox" checked /> Tracking lecture + clics</label>
          <label style="margin:0;text-transform:none;letter-spacing:normal;font-family:inherit;font-size:13px;color:var(--ink);font-weight:400;"><input type="checkbox" checked /> Autoriser commentaires</label>
          <label style="margin:0;text-transform:none;letter-spacing:normal;font-family:inherit;font-size:13px;color:var(--ink);font-weight:400;"><input type="checkbox" /> Expiration 30 jours</label>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" onclick="closeModal(this.closest('.modal-back'))">Annuler</button>
        <button class="btn primary" onclick="submitShare()">Envoyer &amp; partager</button>
      </div>
    </div>
  </div>

  <!-- ═══ Toast ═══ -->
  <div id="toast" class="toast"></div>
  <div id="comment-badge" class="comment-badge"></div>

  <script>
    function openModal(id) {
      document.getElementById(id).classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeModal(el) {
      el.classList.remove('open');
      document.body.style.overflow = '';
    }
    function toast(msg) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(function(){ t.classList.remove('show'); }, 2600);
    }
    function submitCorrection() {
      var s = document.getElementById('correct-section').value;
      var t = document.getElementById('correct-type').value;
      var b = document.getElementById('correct-body').value.trim();
      if (!b) { alert('Merci de décrire la correction souhaitée.'); return; }
      closeModal(document.getElementById('modal-correct'));
      toast('✓ Demande envoyée à Proph3t · section ' + s + ' · ' + t);
    }
    function submitComment() {
      var n = document.getElementById('comment-name').value.trim();
      var s = document.getElementById('comment-section').value;
      var b = document.getElementById('comment-body').value.trim();
      if (!b) { alert('Merci de saisir un commentaire.'); return; }
      closeModal(document.getElementById('modal-comment'));
      toast('✓ Commentaire publié · section ' + s + ' · notification envoyée');
      // Badge indicateur en haut à droite
      var badge = document.getElementById('comment-badge');
      var count = (parseInt(badge.dataset.count || '0', 10) + 1);
      badge.dataset.count = count;
      badge.textContent = '💬 ' + count + ' commentaire' + (count > 1 ? 's' : '') + ' — dernier : ' + n;
      badge.classList.add('show');
    }
    function copyShareLink() {
      var url = document.getElementById('share-link-url').textContent;
      try {
        var ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        toast('Lien copié dans le presse-papier');
      } catch(e) {
        toast('Copie impossible — sélectionnez manuellement');
      }
    }
    function submitShare() {
      var emails = document.getElementById('share-emails').value.split(/[\\s,;]+/).filter(Boolean);
      if (emails.length === 0) { alert('Merci de saisir au moins un destinataire.'); return; }
      closeModal(document.getElementById('modal-share'));
      toast('✓ Rapport partagé avec ' + emails.length + ' destinataire' + (emails.length > 1 ? 's' : ''));
    }

    document.getElementById('btn-validate').addEventListener('click', function() {
      if (this.classList.contains('done')) return;
      this.classList.remove('primary');
      this.classList.add('done');
      this.disabled = true;
      this.innerHTML = '✓ Validé';
      var banner = document.getElementById('validated-banner');
      document.getElementById('validated-at').textContent = ' · ' + new Date().toLocaleString('fr-FR');
      banner.classList.add('show');
      toast('✓ Validation enregistrée · Proph3t notifié · journal d\\'audit mis à jour');
    });
    document.getElementById('btn-correct').addEventListener('click', function() { openModal('modal-correct'); });
    document.getElementById('btn-comment').addEventListener('click', function() { openModal('modal-comment'); });
    document.getElementById('btn-share').addEventListener('click', function() { openModal('modal-share'); });
    document.getElementById('btn-pdf').addEventListener('click', function() { toast('Ouverture du dialogue d\\'impression…'); setTimeout(function(){ window.print(); }, 300); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-back.open').forEach(function(m){ closeModal(m); });
      }
    });
  </script>

  <footer class="doc">
    <div>Atlas Mall Suite · Proph3t IA v2.4 · ${generatedAt} · ref <span style="color:var(--accent)">${ref}</span></div>
    <div>© 2026 New Heaven SA · Confidentiel — ne pas diffuser hors comité</div>
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
    <div className="min-h-screen" style={{ background: '#0b0d10', color: '#e2e8f0' }}>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(11,13,16,0.85)' }}>
        <div className="max-w-[1500px] mx-auto px-6 h-14 flex items-center gap-4">
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
              Proph3t v2.4
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

      <div className="max-w-[1500px] mx-auto px-6 py-6 space-y-4">
        {showMeta && (
          <div className="rounded-xl p-5 border border-white/[0.06] flex flex-col md:flex-row gap-6"
            style={{ background: '#15181d' }}>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-2">
                Rapport exécutif Proph3t · dark premium
              </h2>
              <p className="text-[13px] text-gray-400 leading-relaxed max-w-3xl">
                Aperçu du rapport HTML autonome envoyé aux directeurs, investisseurs et opérateurs.
                Design type <em>consulting firm</em> sur fond sombre, typographie Grand Hotel + monospace,
                10 chapitres numérotés : plan 2D annoté (flux / signalétique / congestion), synthèse, analyse flux,
                densité temporelle, vue 3D isométrique, superposition multi-étages, visite guidée, AR/VR, plan d'action
                chiffré (table priorisée avec CAPEX/OPEX/ROI), méthodologie &amp; sources traçables.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Helbing Social Force', 'Monte Carlo 10k', 'ICSC Afrique 2024', 'ISO 7010', 'ISO 20382', 'NF X 08-003'].map(n => (
                  <span key={n} className="rounded px-2.5 py-1 text-[10px] font-semibold text-atlas-300/80 font-mono tracking-wider"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>{n}</span>
                ))}
              </div>
            </div>
            <div className="md:w-72 grid grid-cols-2 gap-2 text-center">
              {[
                { k: '10', l: 'chapitres' },
                { k: '6', l: 'actions P0/P1/P2' },
                { k: '17,7 M', l: 'FCFA investissement' },
                { k: '+142 M', l: 'FCFA uplift /an' },
              ].map(s => (
                <div key={s.l} className="rounded px-3 py-2" style={{ background: '#0b0d10' }}>
                  <div className="text-xl font-bold text-atlas-300">{s.k}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl" style={{ background: '#0b0d10' }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]" style={{ background: '#0f1115' }}>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[11px] text-slate-500 font-mono ml-2 flex-1">
              atlas-mall-suite-demo-parcours-client.html
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Share2 size={10} /> partageable hors-ligne
            </span>
          </div>
          <iframe
            title="Rapport Proph3t — Parcours Client (démo)"
            srcDoc={html}
            sandbox="allow-same-origin allow-scripts allow-modals allow-popups"
            className="w-full"
            style={{ height: '90vh', border: 0 }}
          />
        </div>

        <p className="text-[11px] text-gray-500 text-center">
          Ce rapport est généré intégralement côté client à partir de données de démo — aucune donnée réelle n'est transmise.
        </p>
      </div>
    </div>
  )
}
