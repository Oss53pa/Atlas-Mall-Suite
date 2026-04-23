// ═══ DEMO REPORT — Thème & helpers partagés ═══
// CSS dark premium + builders réutilisables par toutes les démos verticales.

export const REPORT_CSS = `
  :root {
    --bg: #0b0d10; --bg-alt: #0f1115; --card: #15181d; --card-2: #1a1d22;
    --border: rgba(255,255,255,0.08); --border-2: rgba(255,255,255,0.14);
    --ink: #f5f5f4; --muted: #94a3b8; --dim: #64748b;
    --accent: #f59e0b; --accent-2: #f97316;
    --danger: #ef4444; --warn: #fbbf24; --success: #10b981; --info: #38bdf8;
  }
  * { box-sizing: border-box; }
  html, body { background: var(--bg); }
  body { margin: 0; color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.65; font-size: 14px; }
  .page { max-width: 1400px; margin: 0 auto; padding: 40px 48px 80px; }
  .mono { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }

  header.doc { display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: start; padding-bottom: 28px; border-bottom: 1px solid var(--border); }
  .brandline { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .brand-mark { font-family: 'Grand Hotel', cursive; font-size: 34px; color: var(--accent); line-height: 1; }
  .brandline .sep { color: var(--dim); }
  .brandline .crumb { color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; font-family: ui-monospace, monospace; }
  .doc-title { font-size: 26px; font-weight: 700; margin: 20px 0 4px; letter-spacing: -0.012em; }
  .doc-sub { font-size: 13px; color: var(--muted); }
  .doc-meta { text-align: right; font-size: 11px; color: var(--muted); font-family: ui-monospace, monospace; line-height: 1.9; }
  .doc-meta .k { color: var(--dim); } .doc-meta .v { color: var(--ink); }
  .doc-meta .ref .v { color: var(--accent); }

  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
  .chip { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; padding: 6px 12px; border-radius: 4px; border: 1px solid var(--border-2); color: var(--muted); }
  .chip.is-primary { border-color: var(--accent); color: var(--accent); background: rgba(245,158,11,0.08); }

  .ident-strip { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr; gap: 40px; margin-top: 32px; padding: 22px 28px; background: var(--card); border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 4px; }
  .ident-strip .cell .k { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; color: var(--dim); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 6px; }
  .ident-strip .cell .v { font-size: 14px; color: var(--ink); font-weight: 500; }

  .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-top: 18px; }
  .kpi { padding: 20px 22px; background: var(--card); border: 1px solid var(--border); border-radius: 4px; }
  .kpi .k { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; color: var(--dim); letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 10px; }
  .kpi .v { font-size: 28px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
  .kpi .v.ok { color: var(--success); } .kpi .v.warn { color: var(--accent); } .kpi .v.crit { color: var(--danger); }
  .kpi .u { font-family: ui-monospace, monospace; font-size: 10px; color: var(--muted); margin-top: 8px; }
  .kpi .d { font-family: ui-monospace, monospace; font-size: 11px; margin-top: 8px; color: var(--accent); font-weight: 600; }
  .kpi .d.bad { color: var(--danger); }

  section.chapter { margin-top: 60px; }
  .chapter-head { display: grid; grid-template-columns: auto 1fr auto; gap: 18px; align-items: baseline; margin-bottom: 22px; }
  .chapter-head .num { font-family: ui-monospace, monospace; font-size: 13px; color: var(--accent); font-weight: 700; letter-spacing: 0.08em; }
  .chapter-head .title { font-size: 22px; font-weight: 700; letter-spacing: -0.012em; }
  .chapter-head .meta { font-family: ui-monospace, monospace; font-size: 11px; color: var(--dim); letter-spacing: 0.04em; }

  .card { background: var(--card); border: 1px solid var(--border); border-radius: 4px; }
  .card-pad { padding: 24px 28px; }
  .prose p { margin: 0 0 14px; color: var(--ink); font-size: 14.5px; line-height: 1.8; }
  .prose p:last-child { margin-bottom: 0; }
  .prose .hl { color: var(--accent); font-weight: 600; }
  .prose strong { color: var(--ink); font-weight: 600; }
  .prose em { color: var(--accent); font-style: normal; font-weight: 600; }
  .prose a { color: var(--info); text-decoration: underline; text-underline-offset: 3px; }

  table.dt { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.dt th { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim); font-weight: 700; text-align: left; padding: 14px 16px; border-bottom: 1px solid var(--border); }
  table.dt td { padding: 14px 16px; color: var(--ink); border-bottom: 1px solid var(--border); vertical-align: top; }
  table.dt .num { font-family: ui-monospace, monospace; }
  table.dt .pct.neg { color: var(--danger); } .pct.pos { color: var(--success); }
  table.dt .accent { color: var(--accent); }
  .dbl { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .subtitle { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; }

  table.rec { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.rec th { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); font-weight: 700; text-align: left; padding: 14px 18px; border-bottom: 1px solid var(--border); }
  table.rec td { padding: 18px; color: var(--ink); border-bottom: 1px solid var(--border); vertical-align: top; font-size: 13px; }
  table.rec .id { font-family: ui-monospace, monospace; color: var(--accent); font-weight: 700; letter-spacing: 0.06em; }
  .prio { display: inline-block; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 3px; }
  .prio.p0 { background: var(--danger); color: #fff; }
  .prio.p1 { background: var(--accent); color: #0f1115; }
  .prio.p2 { background: var(--border-2); color: var(--ink); }

  .actions-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 40px; padding-top: 28px; border-top: 1px solid var(--border); }
  .btn { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 22px; border-radius: 3px; border: 1px solid var(--border-2); background: transparent; color: var(--ink); cursor: pointer; }
  .btn:hover { border-color: var(--accent); color: var(--accent); }
  .btn.primary { background: var(--accent); color: #0f1115; border-color: var(--accent); }
  footer.doc { margin-top: 50px; padding-top: 24px; border-top: 1px solid var(--border); display: grid; grid-template-columns: 1fr auto; gap: 20px; font-family: ui-monospace, monospace; font-size: 10px; color: var(--dim); }

  @media (max-width: 1100px) {
    .page { padding: 24px; } .kpis { grid-template-columns: repeat(2, 1fr); }
    .ident-strip { grid-template-columns: 1fr; } .dbl { grid-template-columns: 1fr; }
    header.doc { grid-template-columns: 1fr; } .doc-meta { text-align: left; }
  }
`

// ─── Types ────────────────────────────────────────────────

export interface DemoKpi {
  label: string
  value: string | number
  unit?: string
  delta?: string
  deltaBad?: boolean
  tone?: 'ok' | 'warn' | 'crit' | 'default'
}

export interface DemoSection {
  num: string   // "01"
  title: string
  meta?: string
  /** HTML interne du card body. Peut inclure paragraphes, tables, SVG. */
  body: string
}

export interface DemoRecommendation {
  id: string
  action: string
  reference?: string
  capex?: string
  opex?: string
  delay: string
  impact: string
  priority: 'p0' | 'p1' | 'p2'
}

export interface DemoReportInput {
  productCrumb: string              // ex: "MALL SUITE · VOL.3"
  title: string                     // ex: "Rapport d'analyse du parcours client — The Mall"
  subtitle: string                  // ex: "Centre commercial 30 000 m²"
  destinataire: string
  perimetre: string
  horizon: string
  chips: string[]                   // ex: ["Proph3t v2.4", "ABM Helbing", ...]
  kpis: DemoKpi[]                   // 6 KPIs prioritaires
  sections: DemoSection[]           // N chapitres (plan, synthèse, flux, …)
  recommendations: DemoRecommendation[]
  totalCapex?: string
  totalOpex?: string
  totalImpact?: string
  methodology: Array<{ k: string; v: string }>
  ref: string
  generatedAt: string
  verticalColor?: string            // couleur d'accent verticale (override --accent)
}

// ─── Builder HTML ─────────────────────────────────────────

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}

export function buildDemoHtml(input: DemoReportInput): string {
  const colorOverride = input.verticalColor ? `:root { --accent: ${input.verticalColor}; }` : ''
  const chipsHtml = input.chips.map((c, i) => `<span class="chip${i === 0 ? ' is-primary' : ''}">${esc(c)}</span>`).join('')

  const kpisHtml = input.kpis.map(k => `
    <div class="kpi">
      <div class="k">${esc(k.label)}</div>
      <div class="v ${k.tone ?? ''}">${esc(String(k.value))}${k.unit ? ` <span style="font-size:14px;color:var(--muted);">${esc(k.unit)}</span>` : ''}</div>
      ${k.delta ? `<div class="d${k.deltaBad ? ' bad' : ''}">${esc(k.delta)}</div>` : ''}
    </div>
  `).join('')

  const sectionsHtml = input.sections.map(s => `
    <section class="chapter">
      <div class="chapter-head">
        <span class="num">${esc(s.num)}</span>
        <span class="title">${esc(s.title)}</span>
        ${s.meta ? `<span class="meta">${esc(s.meta)}</span>` : '<span></span>'}
      </div>
      ${s.body}
    </section>
  `).join('')

  const recHtml = `
    <table class="rec">
      <thead>
        <tr><th>ID</th><th>Action</th><th>Référence</th><th>CAPEX</th><th>OPEX/an</th><th>Délai</th><th>Impact</th><th>Priorité</th></tr>
      </thead>
      <tbody>
        ${input.recommendations.map(r => `
          <tr>
            <td class="id">${esc(r.id)}</td>
            <td>${esc(r.action)}</td>
            <td class="mono" style="color:var(--muted)">${esc(r.reference ?? '—')}</td>
            <td class="mono">${esc(r.capex ?? '—')}</td>
            <td class="mono">${esc(r.opex ?? '—')}</td>
            <td class="mono" style="color:var(--accent)">${esc(r.delay)}</td>
            <td style="color:var(--success);font-family:ui-monospace,monospace;font-size:12px;">${esc(r.impact)}</td>
            <td><span class="prio ${r.priority}">${r.priority.toUpperCase()}</span></td>
          </tr>
        `).join('')}
        ${(input.totalCapex || input.totalOpex || input.totalImpact) ? `
          <tr style="background:rgba(245,158,11,0.04)">
            <td>—</td>
            <td style="color:var(--accent);font-weight:700;">TOTAL</td>
            <td>—</td>
            <td class="mono" style="color:var(--accent);font-weight:700;">${esc(input.totalCapex ?? '—')}</td>
            <td class="mono" style="color:var(--accent);font-weight:700;">${esc(input.totalOpex ?? '—')}</td>
            <td>—</td>
            <td style="color:var(--accent);font-family:ui-monospace,monospace;font-weight:700;">${esc(input.totalImpact ?? '—')}</td>
            <td>—</td>
          </tr>
        ` : ''}
      </tbody>
    </table>
  `

  const methHtml = `
    <div class="card" style="padding:28px 32px;">
      <div class="subtitle">Paramètres de simulation & sources</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px 32px;">
        ${input.methodology.map(m => `
          <div>
            <div style="font-family:ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:0.14em;color:var(--dim);text-transform:uppercase;margin-bottom:6px;">${esc(m.k)}</div>
            <div style="font-size:13px;color:var(--ink);line-height:1.6;">${m.v}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(input.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
<style>${REPORT_CSS}${colorOverride}</style>
</head><body>
<div class="page">
  <header class="doc">
    <div>
      <div class="brandline">
        <span class="brand-mark">Atlas Studio</span>
        <span class="sep">/</span>
        <span class="crumb">${esc(input.productCrumb)}</span>
      </div>
      <div class="doc-title">${esc(input.title)}</div>
      <div class="doc-sub">${esc(input.subtitle)}</div>
      <div class="chips">${chipsHtml}</div>
    </div>
    <div class="doc-meta">
      <div><span class="k">Destinataire</span> · <span class="v">${esc(input.destinataire)}</span></div>
      <div><span class="k">Émetteur</span> · <span class="v">Atlas BIM / Proph3t IA</span></div>
      <div><span class="k">Généré</span> · <span class="v">${esc(input.generatedAt)} UTC</span></div>
      <div class="ref"><span class="k">ref</span> · <span class="v">${esc(input.ref)}</span></div>
    </div>
  </header>

  <div class="ident-strip">
    <div class="cell"><div class="k">Destinataire</div><div class="v">${esc(input.destinataire)}</div></div>
    <div class="cell"><div class="k">Périmètre</div><div class="v">${esc(input.perimetre)}</div></div>
    <div class="cell"><div class="k">Horizon</div><div class="v">${esc(input.horizon)}</div></div>
  </div>

  <div class="kpis">${kpisHtml}</div>

  ${sectionsHtml}

  <section class="chapter">
    <div class="chapter-head">
      <span class="num">${String(input.sections.length + 1).padStart(2, '0')}</span>
      <span class="title">Plan d'action chiffré</span>
      <span class="meta">${input.recommendations.length} recommandations priorisées</span>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">${recHtml}</div>
  </section>

  <section class="chapter">
    <div class="chapter-head">
      <span class="num">${String(input.sections.length + 2).padStart(2, '0')}</span>
      <span class="title">Méthodologie &amp; sources</span>
      <span class="meta">Traçabilité complète</span>
    </div>
    ${methHtml}
    <div class="actions-row">
      <button class="btn primary">✓ Valider le rapport</button>
      <button class="btn">Demander des corrections</button>
      <button class="btn">Commenter une section</button>
      <button class="btn" onclick="window.print()">Exporter .PDF</button>
      <button class="btn">Partager au board</button>
    </div>
    <div style="color:var(--muted);font-size:12px;margin-top:18px;font-family:ui-monospace,monospace;letter-spacing:0.04em;">Proph3t itère en &lt; 24 h sur toute demande de correction ou scénario alternatif.</div>
  </section>

  <footer class="doc">
    <div>Atlas BIM · Proph3t IA v2.4 · ${esc(input.generatedAt)} · ref <span style="color:var(--accent)">${esc(input.ref)}</span></div>
    <div>© 2026 Atlas Studio · Confidentiel</div>
  </footer>
</div>
</body></html>`
}

/** Wrapper React : iframe + toolbar. Utilisé par chaque démo verticale. */
export interface DemoShellProps {
  html: string
  reportName: string
  verticalBadge: string
}
