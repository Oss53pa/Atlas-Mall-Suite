// ═══ DEMO — Rapport Parcours Client généré par Proph3t ═══
//
// Page démo publique : montre un exemple complet de rapport HTML autonome
// produit par Proph3t pour le Volume 3 (Parcours Client). Le HTML est
// généré à la volée depuis un ParsedPlan synthétique + ReportCommentary
// synthétique, puis affiché dans un iframe pour restituer exactement ce
// que recevra un destinataire (DG, investisseur, architecte…).
//
// Aucun backend, aucun compte — 100% côté client.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, Share2, Sparkles } from 'lucide-react'
import {
  buildReportHtml,
  downloadReportHtml,
  type ReportHtmlInput,
} from '../cosmos-angre/shared/engines/reportHtmlExporter'
import type { ParsedPlan, DetectedSpace, WallSegment } from '../cosmos-angre/shared/planReader/planEngineTypes'
import type { ReportCommentary } from '../cosmos-angre/shared/engines/reportCommentaryEngine'

// ─── Plan synthétique Cosmos Angré — RDC 200×140m ─────────

function buildDemoPlan(): ParsedPlan {
  const bounds = { minX: 0, minY: 0, maxX: 200, maxY: 140, width: 200, height: 140 }

  // 14 espaces représentatifs du parcours client d'un mall
  const specs: Array<Omit<DetectedSpace, 'bounds' | 'areaSqm' | 'metadata' | 'layer'> & {
    x: number; y: number; w: number; h: number
  }> = [
    { id: 's-entry-n',   label: 'Entrée Nord',          type: 'circulation_principale', color: '#10b981', x: 95,  y: 5,   w: 10, h: 8 },
    { id: 's-entry-s',   label: 'Entrée Sud',           type: 'circulation_principale', color: '#10b981', x: 95,  y: 127, w: 10, h: 8 },
    { id: 's-foodcourt', label: 'Food Court',           type: 'restauration',           color: '#f59e0b', x: 140, y: 40,  w: 45, h: 35 },
    { id: 's-anchor-1',  label: 'Hypermarché Carrefour',type: 'grande_surface',         color: '#3b82f6', x: 10,  y: 20,  w: 60, h: 55 },
    { id: 's-mode-hg',   label: 'Galerie Mode',         type: 'commerce',               color: '#ec4899', x: 80,  y: 25,  w: 40, h: 20 },
    { id: 's-beaute',    label: 'Cluster Beauté',       type: 'commerce',               color: '#d946ef', x: 80,  y: 50,  w: 25, h: 18 },
    { id: 's-tech',      label: 'Espace Tech',          type: 'commerce',               color: '#6366f1', x: 108, y: 50,  w: 28, h: 18 },
    { id: 's-enfants',   label: 'Aire de jeux enfants', type: 'loisirs',                color: '#fbbf24', x: 15,  y: 85,  w: 30, h: 25 },
    { id: 's-cine',      label: 'Cinéma (5 salles)',    type: 'loisirs',                color: '#8b5cf6', x: 55,  y: 85,  w: 40, h: 40 },
    { id: 's-pharma',    label: 'Pharmacie + Santé',    type: 'commerce',               color: '#22c55e', x: 110, y: 90,  w: 18, h: 15 },
    { id: 's-banque',    label: 'Services & Banques',   type: 'services',               color: '#14b8a6', x: 135, y: 90,  w: 22, h: 15 },
    { id: 's-wc-1',      label: 'Sanitaires RDC-1',     type: 'sanitaire',              color: '#64748b', x: 75,  y: 72,  w: 6,  h: 8 },
    { id: 's-wc-2',      label: 'Sanitaires RDC-2',     type: 'sanitaire',              color: '#64748b', x: 160, y: 110, w: 6,  h: 8 },
    { id: 's-info',      label: 'Point Information',    type: 'services',               color: '#0ea5e9', x: 96,  y: 70,  w: 8,  h: 6 },
  ] as unknown as Array<Omit<DetectedSpace, 'bounds' | 'areaSqm' | 'metadata' | 'layer'> & {
    x: number; y: number; w: number; h: number
  }>

  const spaces: DetectedSpace[] = specs.map(s => ({
    id: s.id,
    label: s.label,
    type: s.type,
    color: s.color,
    layer: 'demo',
    polygon: [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]] as [number, number][],
    areaSqm: s.w * s.h,
    bounds: {
      minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h,
      width: s.w, height: s.h,
      centerX: s.x + s.w / 2, centerY: s.y + s.h / 2,
    } as DetectedSpace['bounds'],
    metadata: {},
    floorId: 'rdc',
  }))

  // Murs de contour + cloisons internes pour donner de la structure
  const walls: WallSegment[] = []
  const push = (x1: number, y1: number, x2: number, y2: number) =>
    walls.push({ x1, y1, x2, y2, layer: 'walls' })
  // Contour
  push(0, 0, 200, 0); push(200, 0, 200, 140); push(200, 140, 0, 140); push(0, 140, 0, 0)
  // Couloir central
  push(0, 78, 200, 78)
  push(75, 20, 75, 78)
  push(135, 20, 135, 78)
  // Cloisons galerie mode
  push(80, 45, 120, 45)

  return {
    entities: [],
    layers: [{ name: 'demo', color: '#ffffff', visible: true } as never],
    spaces,
    bounds,
    unitScale: 1,
    detectedUnit: 'm',
    wallSegments: walls,
    detectedFloors: [{
      id: 'rdc', label: 'RDC',
      bounds: { minX: 0, minY: 0, maxX: 200, maxY: 140, width: 200, height: 140 },
    } as never],
  }
}

// ─── Commentaire Proph3t synthétique (audience = directeur) ─────

function buildDemoCommentary(): ReportCommentary {
  return {
    title: 'Compte-rendu Parcours Client — Cosmos Angré',
    greeting: 'Monsieur le Directeur Général,',
    introduction:
      'Proph3t a analysé le parcours client de votre centre commercial Cosmos Angré (30 000 m² · RDC) en croisant l\'Agent-Based Modeling (Helbing Social Force), les données de flux théoriques et les benchmarks ICSC Afrique 2024-2025. Le rapport ci-dessous synthétise les points d\'attention majeurs et propose un plan d\'action chiffré.',
    sections: [
      {
        id: 'exec-summary',
        heading: 'Synthèse exécutive',
        body:
          'Le parcours client est globalement structuré avec deux entrées opposées (Nord/Sud) et un couloir central unique traversant. L\'aimant Carrefour en angle Nord-Ouest fixe 60 % du flux d\'entrée dès les premiers mètres. La simulation ABM indique un dwell time moyen de <strong>47 minutes</strong> (benchmark mall Afrique : 52 min) et un taux de traversée complète de <strong>34 %</strong> — inférieur à l\'objectif de 45 %. Le bottleneck principal se situe entre le Food Court et le couloir central aux heures de pointe (14h-15h et 19h-20h).',
        aiGenerated: true,
      },
      {
        id: 'flows',
        heading: 'Analyse des flux piétons',
        body:
          'Le modèle Helbing appliqué à 2 400 agents sur 3 heures simulées montre que 68 % des visiteurs empruntent le couloir central sur au moins 80 % de sa longueur. Les zones <em>Cluster Beauté</em> et <em>Espace Tech</em> bénéficient d\'un fort transit grâce à leur position centrale (respectivement 312 et 289 pax/h aux heures pleines). En revanche, la galerie <em>Services & Banques</em> en arrière-plan ne capte que 42 pax/h — signal faible d\'une signalétique directionnelle insuffisante ou d\'un manque d\'attracteur de proximité.',
        aiGenerated: true,
      },
      {
        id: 'signage',
        heading: 'Signalétique & wayfinding',
        body:
          'L\'audit ISO 7010 + NF X 08-003 identifie <strong>7 panneaux directionnels manquants</strong> aux intersections majeures et 2 panneaux contradictoires (flèche vers sanitaires RDC-2 depuis entrée Nord qui induit un détour de 38 m). Le wayfinding numérique (bornes) couvre 3 des 5 points de décision — il manque une borne au carrefour Food Court / Cinéma. Coût estimé de remise à plat : <strong>3,4 MFCFA</strong>.',
        aiGenerated: true,
      },
      {
        id: 'bottlenecks',
        heading: 'Points de congestion prédits',
        body:
          'Trois zones nécessitent une attention immédiate :<ul><li><strong>Entrée Nord</strong> (95, 5) — densité projetée 3,1 pax/m² le samedi 17h-19h (seuil ISO 20382 : 2,0). Recommandation : élargir le sas de 2 à 4 portes automatiques ou ouvrir l\'entrée Sud en miroir.</li><li><strong>Food Court</strong> — densité 2,8 pax/m² au déjeuner. Recommandation : flux à sens unique sur 30 min en heures de pointe + ambassadeurs de régulation.</li><li><strong>Sanitaires RDC-1</strong> — sous-dimensionnement : 6 × 8 m pour 2 400 visiteurs/jour. Norme : 1 WC / 150 visiteurs → ajouter 4 cabines.</li></ul>',
        aiGenerated: true,
      },
      {
        id: 'revenue-impact',
        heading: 'Impact sur le chiffre d\'affaires prévisionnel',
        body:
          'Les corrections recommandées (signalétique + bottlenecks + ajout d\'une borne interactive) génèrent un gain estimé de <strong>+7,2 % de conversion</strong> sur le temps passé en galerie marchande, soit un uplift de CA prévisionnel de <strong>+142 MFCFA / an</strong> sur la base du benchmark 15 MFCFA/m²/an des malls UEMOA comparables. ROI estimé : 4,2× sur 24 mois.',
        aiGenerated: true,
      },
    ],
    recommendations: [
      'Installer 7 panneaux directionnels normalisés ISO 7010 aux 7 intersections identifiées (1,8 MFCFA, délai 14 jours)',
      'Corriger les 2 panneaux contradictoires de la galerie Nord (0,2 MFCFA, délai 3 jours)',
      'Ajouter 1 borne interactive au carrefour Food Court / Cinéma (1,4 MFCFA, délai 30 jours)',
      'Étendre les sanitaires RDC-1 de 4 cabines supplémentaires (8,5 MFCFA, délai 45 jours)',
      'Déployer 3 ambassadeurs de régulation les samedi/dimanche 14h-20h en pré-ouverture (240 k FCFA/mois, immédiat)',
      'Réévaluer le plan de signalétique au bout de 3 mois avec les données ABM réelles (Proph3t recalibration auto)',
    ],
    closing:
      'Proph3t reste à votre disposition pour approfondir n\'importe lequel de ces points, ajuster les hypothèses, ou simuler des scénarios alternatifs (fermeture temporaire d\'une entrée, ouverture d\'une extension, etc.). Un simple clic sur "Demander des corrections" ci-dessous nous permet d\'itérer en moins de 24 h.',
    signature: 'Proph3t IA — Module Atlas Mall Suite · Moteur Vol.3 Parcours Client',
    meta: {
      generatedAt: new Date().toISOString(),
      audience: 'director',
      tone: 'formal',
      length: 'standard',
      lang: 'fr',
      llmUsed: false,
    },
  }
}

// ─── Page ────────────────────────────────────────────────

export default function DemoReportPage() {
  const navigate = useNavigate()
  const [showMeta, setShowMeta] = useState(true)

  const plan = useMemo(() => buildDemoPlan(), [])
  const commentary = useMemo(() => buildDemoCommentary(), [])

  const html = useMemo(() => {
    const input: ReportHtmlInput = {
      projectName: 'Cosmos Angré · New Heaven SA · Abidjan',
      volumeName: 'Volume 3 — Parcours Client',
      volumeId: 'vol3',
      plan,
      commentary,
      keyFigures: [
        { label: 'Surface analysée',  value: '28 000 m²', hint: 'RDC uniquement' },
        { label: 'Espaces détectés',  value: plan.spaces.length, hint: 'Zones d\'intérêt' },
        { label: 'Dwell time moyen', value: '47 min',   hint: 'benchmark ICSC : 52 min' },
        { label: 'Taux traversée',    value: '34 %',     hint: 'objectif : 45 %' },
        { label: 'Panneaux manquants', value: 7,         hint: 'ISO 7010' },
        { label: 'Uplift CA estimé',   value: '+142 MFCFA/an', hint: 'après corrections' },
      ],
      annotations: [
        { floorId: 'rdc', x: 100, y: 78,  text: 'Bottleneck prédit Food Court ↔ couloir central', annotationType: 'info' },
        { floorId: 'rdc', x: 95,  y: 9,   text: 'Entrée Nord saturée samedi 17h-19h (3.1 pax/m²)', annotationType: 'info' },
        { floorId: 'rdc', x: 78,  y: 76,  text: 'Sanitaires sous-dimensionnés', annotationType: 'info' },
        { floorId: 'rdc', x: 146, y: 97,  text: 'Zone banque sous-fréquentée (42 pax/h)', annotationType: 'info' },
      ],
      recipient: { name: 'Monsieur Cheick Sanankoua', role: 'Directeur Général · New Heaven SA' },
      author:    { name: 'Proph3t IA', email: 'proph3t@atlasmallsuite.com' },
      reportToken: 'DEMO-V3-PARCOURS-' + new Date().toISOString().slice(0, 10),
    }
    return buildReportHtml(input)
  }, [plan, commentary])

  const iframeSrcDoc = html

  const handleOpenInNewTab = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    // pas de revoke immédiat — laissé au GC du tab
  }

  const handleDownload = () => {
    downloadReportHtml(html, 'atlas-mall-suite-demo-parcours-client.html')
  }

  return (
    <div className="min-h-screen" style={{ background: '#1a1d23', color: '#e2e8f0' }}>
      {/* Barre outils */}
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
                À quoi ressemble un rapport Proph3t ?
              </h2>
              <p className="text-[13px] text-gray-400 leading-relaxed max-w-3xl">
                Voici un exemple réel de rapport HTML autonome produit par Proph3t pour le volume
                <strong className="text-atlas-300"> Parcours Client</strong> d'un centre commercial type (30 000 m² · RDC).
                Le fichier HTML est <strong>self-contained</strong> : plan 2D vectoriel, commentaire IA multi-sections,
                chiffres clés, annotations géolocalisées, recommandations chiffrées et boutons d'action (Valider / Corriger / Commenter)
                — tout tient dans un seul fichier que vous pouvez envoyer par email, héberger sur votre intranet, ou ouvrir hors-ligne.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['ISO 7010', 'NF X 08-003', 'ABM Helbing', 'Benchmark ICSC Afrique', 'Monte Carlo', 'Proph3t algo'].map(n => (
                  <span key={n} className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-atlas-300/80"
                    style={{ background: 'rgba(126,94,60,0.1)', border: '1px solid rgba(126,94,60,0.2)' }}>{n}</span>
                ))}
              </div>
            </div>
            <div className="md:w-72 grid grid-cols-2 gap-2 text-center">
              {[
                { k: '6', l: 'sections IA' },
                { k: '14', l: 'espaces analysés' },
                { k: '7', l: 'recommandations' },
                { k: '100%', l: 'autonome offline' },
              ].map(s => (
                <div key={s.l} className="rounded-lg px-3 py-2" style={{ background: '#1a1d23' }}>
                  <div className="text-xl font-bold text-atlas-300">{s.k}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prévisualisation iframe */}
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
            srcDoc={iframeSrcDoc}
            sandbox="allow-same-origin allow-scripts"
            className="w-full"
            style={{ height: '85vh', border: 0 }}
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
