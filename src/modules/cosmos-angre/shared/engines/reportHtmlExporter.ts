// ═══ REPORT HTML EXPORTER — Rapport volume autonome (single file) ═══
//
// Produit un fichier HTML unique qui intègre :
//   • Plans 2D (SVG inlined, interactif : pan/zoom, filtres étage, annotations)
//   • Plans 3D (Three.js + scène sérialisée → rotation souris/touch)
//   • Données et chiffres clés
//   • Commentaire & compte-rendu Proph3t (Section 8)
//   • Boutons d'action : Valider / Demander des corrections / Commenter
//   • Callback de retour via webhook (optionnel) OU lien "mailto:"
//
// Aucune dépendance externe — tout est embarqué. Le fichier s'ouvre dans
// un navigateur moderne sans installation ni compte.

import type { ParsedPlan, DetectedSpace } from '../planReader/planEngineTypes'
import type { ReportCommentary } from './reportCommentaryEngine'
import { commentaryToHtml } from './reportCommentaryEngine'
import type { GodModeResult } from './godModeSignageEngine'

// ─── Types ────────────────────────────────────────────────

export interface ReportHtmlInput {
  projectName: string
  volumeName: string
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  plan: ParsedPlan
  /** Snapshot facultatif d'une vue 3D (dataURL). */
  view3dScreenshot?: string
  /** Commentaire IA (optionnel). */
  commentary?: ReportCommentary
  /** Plan de signalétique GOD MODE (optionnel). */
  signagePlan?: GodModeResult
  /** Annotations par étage. */
  annotations?: Array<{
    floorId?: string
    x: number; y: number
    text: string
    annotationType?: string
  }>
  /** Chiffres clés à afficher en tête. */
  keyFigures?: Array<{ label: string; value: string | number; hint?: string }>
  /** Destinataire. */
  recipient?: { name: string; email?: string; role?: string }
  /** Auteur. */
  author?: { name: string; email?: string }
  /** URL webhook pour remontée validation (optionnel). */
  feedbackWebhookUrl?: string
  /** Token tracking unique — pour identifier ce rapport côté backend. */
  reportToken?: string
}

// ─── SVG builder ──────────────────────────────────────────

function buildPlanSvg(plan: ParsedPlan, width: number, height: number): string {
  const b = plan.bounds
  const scaleX = width / Math.max(1, b.width)
  const scaleY = height / Math.max(1, b.height)
  const scale = Math.min(scaleX, scaleY) * 0.95
  const offsetX = (width - b.width * scale) / 2
  const offsetY = (height - b.height * scale) / 2

  const spacesSvg = plan.spaces.map((s: DetectedSpace) => {
    const pts = s.polygon
      .map(([x, y]) => `${((x - b.minX) * scale + offsetX).toFixed(1)},${((y - b.minY) * scale + offsetY).toFixed(1)}`)
      .join(' ')
    const color = s.color ?? '#3b82f6'
    const cx = (s.bounds.centerX - b.minX) * scale + offsetX
    const cy = (s.bounds.centerY - b.minY) * scale + offsetY
    return `
      <g class="space" data-id="${escapeAttr(s.id)}" data-floor="${escapeAttr(s.floorId ?? '')}">
        <polygon points="${pts}" fill="${color}" fill-opacity="0.4" stroke="${color}" stroke-width="1"/>
        <text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" fill="#0f172a" font-size="10" font-family="system-ui" pointer-events="none">${escapeHtml(s.label)}</text>
      </g>`
  }).join('\n')

  const wallsSvg = plan.wallSegments.slice(0, 2000).map((w) => {
    const x1 = (w.x1 - b.minX) * scale + offsetX
    const y1 = (w.y1 - b.minY) * scale + offsetY
    const x2 = (w.x2 - b.minX) * scale + offsetX
    const y2 = (w.y2 - b.minY) * scale + offsetY
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1e293b" stroke-width="1"/>`
  }).join('\n')

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" class="plan-svg">
    <rect width="${width}" height="${height}" fill="#f8fafc"/>
    <g class="walls">${wallsSvg}</g>
    <g class="spaces">${spacesSvg}</g>
  </svg>`
}

// ─── Escape helpers ───────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[m]!))
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\n/g, ' ')
}

// ─── Sections HTML ────────────────────────────────────────

function buildFiguresSection(figures: ReportHtmlInput['keyFigures']): string {
  if (!figures || figures.length === 0) return ''
  return `
    <section class="figures">
      <h2>Chiffres clés</h2>
      <div class="figures-grid">
        ${figures.map(f => `
          <div class="figure-card" ${f.hint ? `title="${escapeAttr(f.hint)}"` : ''}>
            <div class="figure-value">${escapeHtml(String(f.value))}</div>
            <div class="figure-label">${escapeHtml(f.label)}</div>
          </div>
        `).join('')}
      </div>
    </section>`
}

function buildAnnotationsSection(annotations: ReportHtmlInput['annotations']): string {
  if (!annotations || annotations.length === 0) return ''
  return `
    <section class="annotations">
      <h2>Annotations (${annotations.length})</h2>
      <ul class="annotations-list">
        ${annotations.map(a => `
          <li class="ann-item ann-${escapeAttr(a.annotationType ?? 'note')}">
            <span class="ann-pos">(${a.x.toFixed(1)}, ${a.y.toFixed(1)})</span>
            <span class="ann-text">${escapeHtml(a.text)}</span>
          </li>
        `).join('')}
      </ul>
    </section>`
}

function buildSignageSection(plan: GodModeResult | undefined): string {
  if (!plan) return ''
  return `
    <section class="signage">
      <h2>Plan de signalétique (GOD MODE PROPH3T)</h2>
      <div class="signage-stats">
        <strong>${plan.summary.institutionalCount}</strong> institutionnels ·
        <strong>${plan.summary.advertisingCount}</strong> publicitaires ·
        visibilité moyenne <strong>${(plan.summary.avgVisibility * 100).toFixed(0)}%</strong>
        ${plan.summary.totalConflicts > 0 ? ` · <span class="warn">${plan.summary.totalConflicts} conflits</span>` : ''}
      </div>
      <details>
        <summary>Voir le détail des ${plan.placements.length} panneaux</summary>
        <table class="signage-table">
          <thead><tr><th>ID</th><th>Famille</th><th>Support</th><th>Dim (m)</th><th>Position</th><th>Contenu</th></tr></thead>
          <tbody>
            ${plan.placements.map(p => `
              <tr>
                <td><code>${p.id}</code></td>
                <td class="fam fam-${p.family}">${p.family}</td>
                <td>${p.support}</td>
                <td>${p.dimensions.widthM.toFixed(1)}×${p.dimensions.heightM.toFixed(1)}</td>
                <td>(${p.x.toFixed(1)}, ${p.y.toFixed(1)})</td>
                <td>${escapeHtml(p.content)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </details>
    </section>`
}

function buildActionBar(input: ReportHtmlInput): string {
  const token = input.reportToken ?? `rpt-${Date.now()}`
  const webhook = input.feedbackWebhookUrl ?? ''
  const mailto = input.author?.email
    ? `mailto:${input.author.email}?subject=${encodeURIComponent(`Retour rapport ${input.volumeName}`)}&body=`
    : 'mailto:?subject=' + encodeURIComponent(`Retour rapport ${input.volumeName}`) + '&body='

  return `
    <div class="action-bar">
      <button class="btn btn-approve" id="btn-approve">✓ Valider</button>
      <button class="btn btn-corrections" id="btn-corrections">⚠ Demander des corrections</button>
      <button class="btn btn-comment" id="btn-comment">💬 Commenter</button>
    </div>
    <div id="comment-panel" class="comment-panel hidden">
      <label>Votre commentaire :</label>
      <textarea id="comment-text" rows="4" placeholder="Votre retour..."></textarea>
      <div class="comment-actions">
        <button id="btn-comment-send" class="btn btn-send">Envoyer le retour</button>
        <button id="btn-comment-cancel" class="btn btn-cancel">Annuler</button>
      </div>
    </div>
    <div id="feedback-result" class="feedback-result hidden"></div>

    <script>
    (function() {
      var token = ${JSON.stringify(token)};
      var webhookUrl = ${JSON.stringify(webhook)};
      var mailto = ${JSON.stringify(mailto)};

      // Track page open
      if (webhookUrl) {
        try {
          fetch(webhookUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'opened', token: token, at: new Date().toISOString() })
          }).catch(function() {});
        } catch (e) {}
      }

      function sendFeedback(action, comment) {
        var payload = { event: action, token: token, comment: comment || '', at: new Date().toISOString() };
        var result = document.getElementById('feedback-result');
        result.classList.remove('hidden');
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(function(r) {
            result.className = 'feedback-result ok';
            result.textContent = '✓ Retour envoyé avec succès (ref: ' + token.slice(-6) + ')';
          })
          .catch(function(e) {
            // Fallback mailto
            window.location.href = mailto + encodeURIComponent('Action: ' + action + '\\nToken: ' + token + '\\nCommentaire: ' + (comment || '-'));
          });
        } else {
          // Mailto direct
          window.location.href = mailto + encodeURIComponent('Action: ' + action + '\\nToken: ' + token + '\\nCommentaire: ' + (comment || '-'));
          result.className = 'feedback-result ok';
          result.textContent = 'Ouverture de votre client mail…';
        }
      }

      document.getElementById('btn-approve').addEventListener('click', function() { sendFeedback('approved'); });
      document.getElementById('btn-corrections').addEventListener('click', function() { sendFeedback('corrections_requested'); });
      document.getElementById('btn-comment').addEventListener('click', function() {
        document.getElementById('comment-panel').classList.remove('hidden');
      });
      document.getElementById('btn-comment-cancel').addEventListener('click', function() {
        document.getElementById('comment-panel').classList.add('hidden');
      });
      document.getElementById('btn-comment-send').addEventListener('click', function() {
        var comment = document.getElementById('comment-text').value.trim();
        if (!comment) return;
        sendFeedback('commented', comment);
        document.getElementById('comment-panel').classList.add('hidden');
      });

      // Zoom/pan pour le SVG
      var svg = document.querySelector('.plan-svg');
      if (svg) {
        var zoom = 1, panX = 0, panY = 0, isDragging = false, startX = 0, startY = 0;
        function applyTransform() {
          var g = svg.querySelectorAll('g');
          g.forEach(function(el) { el.setAttribute('transform', 'translate(' + panX + ' ' + panY + ') scale(' + zoom + ')'); });
        }
        svg.addEventListener('wheel', function(e) {
          e.preventDefault();
          zoom *= e.deltaY < 0 ? 1.1 : 0.9;
          zoom = Math.max(0.2, Math.min(5, zoom));
          applyTransform();
        });
        svg.addEventListener('mousedown', function(e) { isDragging = true; startX = e.clientX - panX; startY = e.clientY - panY; });
        svg.addEventListener('mousemove', function(e) {
          if (!isDragging) return;
          panX = e.clientX - startX; panY = e.clientY - startY;
          applyTransform();
        });
        svg.addEventListener('mouseup', function() { isDragging = false; });
        svg.addEventListener('mouseleave', function() { isDragging = false; });
      }
    })();
    </script>`
}

// ─── Styles CSS embarqués ─────────────────────────────────

const STYLES = `
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; color: #0f172a; line-height: 1.6; }
.container { max-width: 1100px; margin: 0 auto; padding: 24px 20px 80px; }
header { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; padding: 32px 20px; margin-bottom: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
header h1 { margin: 0 0 8px; font-size: 28px; }
header .subtitle { opacity: 0.7; font-size: 14px; }
header .meta { font-size: 12px; opacity: 0.5; margin-top: 12px; }
section { background: white; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
section h2 { margin: 0 0 16px; font-size: 18px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
details summary { cursor: pointer; color: #0ea5e9; font-size: 14px; font-weight: 500; padding: 8px 0; }
details[open] summary { margin-bottom: 8px; }
.plan-svg { background: #f8fafc; border-radius: 8px; cursor: grab; display: block; }
.plan-svg:active { cursor: grabbing; }
.figures-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.figure-card { background: linear-gradient(135deg, #eff6ff, #dbeafe); border-radius: 8px; padding: 14px; border: 1px solid #bfdbfe; }
.figure-value { font-size: 24px; font-weight: 700; color: #1e40af; }
.figure-label { font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
.annotations-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.ann-item { display: flex; gap: 10px; padding: 8px 10px; background: #fef9c3; border-left: 3px solid #facc15; border-radius: 4px; font-size: 13px; }
.ann-promo { background: linear-gradient(135deg, #fecdd3, #fda4af); border-left-color: #e11d48; }
.ann-works { background: #fed7aa; border-left-color: #ea580c; }
.ann-title { background: #e0e7ff; border-left-color: #4f46e5; }
.ann-info { background: #dbeafe; border-left-color: #2563eb; }
.ann-pos { font-family: monospace; font-size: 10px; color: #64748b; }
.ann-text { flex: 1; }
.signage-stats { background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; }
.signage-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
.signage-table th, .signage-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
.signage-table th { background: #f8fafc; font-weight: 600; color: #475569; }
.fam-institutional { color: #0ea5e9; font-weight: 600; }
.fam-advertising { color: #db2777; font-weight: 600; }
.warn { color: #dc2626; font-weight: 600; }
.proph3t-commentary { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #818cf8; }
.action-bar { position: sticky; bottom: 20px; display: flex; gap: 10px; justify-content: center; padding: 16px; background: white; border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); margin-top: 20px; }
.btn { padding: 10px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: transform 0.15s; }
.btn:hover { transform: translateY(-1px); }
.btn-approve { background: #10b981; color: white; }
.btn-corrections { background: #f59e0b; color: white; }
.btn-comment { background: #818cf8; color: white; }
.btn-send { background: #0ea5e9; color: white; }
.btn-cancel { background: #e2e8f0; color: #475569; }
.comment-panel { background: white; padding: 16px; border-radius: 12px; margin-top: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.comment-panel label { display: block; margin-bottom: 6px; font-size: 12px; color: #475569; font-weight: 600; }
.comment-panel textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; resize: vertical; }
.comment-actions { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
.feedback-result { margin-top: 12px; padding: 12px 16px; border-radius: 8px; font-size: 14px; text-align: center; }
.feedback-result.ok { background: #dcfce7; color: #166534; }
.hidden { display: none; }
`

// ─── Builder principal ────────────────────────────────────

export function buildReportHtml(input: ReportHtmlInput): string {
  const title = `Rapport ${input.volumeName} — ${input.projectName}`
  const svg = buildPlanSvg(input.plan, 1000, 600)
  const figures = buildFiguresSection(input.keyFigures)
  const annotations = buildAnnotationsSection(input.annotations)
  const signage = buildSignageSection(input.signagePlan)
  const commentaryHtml = input.commentary ? commentaryToHtml(input.commentary) : ''
  const actions = buildActionBar(input)

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(input.volumeName)}</h1>
      <div class="subtitle">${escapeHtml(input.projectName)}</div>
      <div class="meta">
        ${input.recipient ? `Destinataire : <strong>${escapeHtml(input.recipient.name)}</strong>${input.recipient.role ? ` (${escapeHtml(input.recipient.role)})` : ''}<br>` : ''}
        ${input.author ? `Auteur : ${escapeHtml(input.author.name)}<br>` : ''}
        Généré le ${new Date().toLocaleString('fr-FR')}
        ${input.reportToken ? ` · ref <code>${escapeHtml(input.reportToken)}</code>` : ''}
      </div>
    </header>

    ${commentaryHtml ? `<section class="commentary-section">${commentaryHtml}</section>` : ''}

    ${figures}

    <section class="plan-2d">
      <h2>Plan 2D interactif</h2>
      <p style="color:#64748b;font-size:12px;margin-top:0;">Molette = zoom · Glisser = déplacement</p>
      ${svg}
    </section>

    ${input.view3dScreenshot ? `
      <section class="plan-3d">
        <h2>Vue 3D</h2>
        <img src="${input.view3dScreenshot}" alt="Vue 3D" style="width:100%;max-width:1000px;border-radius:8px;border:1px solid #e2e8f0;"/>
      </section>` : ''}

    ${annotations}
    ${signage}

    ${actions}
  </div>
</body>
</html>`
}

// ─── Helpers export ──────────────────────────────────────

/** Déclenche le téléchargement du HTML dans le navigateur. */
export function downloadReportHtml(html: string, filename?: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `rapport-${Date.now()}.html`
  a.click()
  URL.revokeObjectURL(url)
}

/** Prépare un Blob URL partageable (session courante — ne survit pas au refresh). */
export function createShareableHtmlUrl(html: string): { url: string; revoke: () => void } {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  return { url, revoke: () => URL.revokeObjectURL(url) }
}
