// ═══ Help Floating Ball ═══
//
// Bulle flottante (bottom-right) qui ouvre un guide expliquant
// le fonctionnement de l'application Atlas Mall Suite :
//   - Vue d'ensemble (4 volumes + PROPH3T transversal)
//   - Workflow conseillé
//   - Raccourcis clavier
//   - Liens vers les sections clés

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  HelpCircle, X, ChevronRight, ShoppingBag, ShieldAlert, Footprints,
  Navigation, Sparkles, Upload, Workflow, Brain, Keyboard, BookOpen,
  AlertCircle, MousePointer2, Save, Layers, GripVertical,
} from 'lucide-react'
import { useDraggable } from '../hooks/useDraggable'

const STORAGE_KEY = 'atlas-help-ball-seen'

type SectionId = 'overview' | 'notice' | 'workflow' | 'volumes' | 'proph3t' | 'shortcuts' | 'context'

interface VolumeMeta {
  id: string
  label: string
  color: string
  icon: React.ComponentType<any>
  desc: string
}

const VOLUMES: VolumeMeta[] = [
  { id: 'vol1', label: 'Vol.1 Commercial',   color: '#10b981', icon: ShoppingBag,
    desc: 'Mix enseignes, prévision CA, optimisation merchandising (random forest, multi-scénarios).' },
  { id: 'vol2', label: 'Vol.2 Sécuritaire',  color: '#ef4444', icon: ShieldAlert,
    desc: 'Audit ERP, placement caméras, simulation incidents (Kalman, Monte-Carlo, Hongrois).' },
  { id: 'vol3', label: 'Vol.3 Parcours',     color: '#f59e0b', icon: Footprints,
    desc: 'Flux client, ABM social-force, détection goulots, audit PMR.' },
  { id: 'vol4', label: 'Vol.4 Wayfinder',    color: '#0ea5e9', icon: Navigation,
    desc: 'GPS intérieur, signalétique, bornes, designer print + digital, A* + EKF.' },
]

interface RouteHelp {
  title: string
  hint: string
}

function getContextualHelp(pathname: string): RouteHelp {
  if (pathname.includes('/orchestration')) return {
    title: 'Orchestrateur PROPH3T',
    hint: 'Lance les 4 volumes en chaîne sur le plan importé. Cochez « Web Worker » pour ne pas bloquer l\'UI.',
  }
  if (pathname.includes('/plan_imports') || pathname.includes('plan-import')) return {
    title: 'Import de plan',
    hint: 'Glissez un DXF/DWG/PDF. Calibrez l\'échelle puis validez — le plan est partagé entre tous les volumes.',
  }
  if (pathname.includes('vol4') || pathname.includes('wayfinder')) return {
    title: 'Wayfinder',
    hint: 'Designer = signalétique print/digital. Bornes = runtime kiosque (URL /kiosk/:id).',
  }
  if (pathname.includes('cosmos-angre')) return {
    title: 'Projet Cosmos Angré',
    hint: 'Sélectionnez un volume dans le menu de gauche. Phase 0 « Atlas Studio » est partagée.',
  }
  return {
    title: 'Bienvenue',
    hint: 'Commencez par importer un plan, puis lancez l\'orchestrateur PROPH3T pour pré-remplir les 4 volumes.',
  }
}

export function HelpFloatingBall() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<SectionId>('overview')
  const [pulse, setPulse] = useState(false)
  const location = useLocation()
  const ballRef = useRef<HTMLButtonElement>(null)

  // Position draggable persistée — tout le bouton est draggable
  const { style: dragStyle, handleProps: dragHandleProps, wrapClick } = useDraggable('help-ball-pos', {
    defaultBottom: 24, defaultRight: 24,
  })

  // Pulse au premier chargement si l'utilisateur ne l'a jamais ouvert
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 6000)
      return () => clearTimeout(t)
    }
  }, [])

  const handleOpen = () => {
    setOpen(true)
    setPulse(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  // Raccourcis : Esc ferme · Shift+? ouvre
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false)
      if (e.shiftKey && (e.key === '?' || e.key === '/')) {
        const target = e.target as HTMLElement
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return
        e.preventDefault()
        setOpen(prev => !prev)
        setPulse(false)
        localStorage.setItem(STORAGE_KEY, '1')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Ne pas afficher sur les pages publiques
  if (location.pathname.startsWith('/feedback') || location.pathname.startsWith('/kiosk/')) {
    return null
  }

  const ctx = getContextualHelp(location.pathname)

  const ball = (
    <div style={dragStyle}>
    <button
      ref={ballRef}
      onClick={wrapClick(handleOpen)}
      onMouseDown={dragHandleProps.onMouseDown}
      onDoubleClick={dragHandleProps.onDoubleClick}
      title="Aide (glisser pour déplacer · double-clic = reset position)"
      aria-label="Ouvrir l'aide"
      className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110 relative ${
        pulse ? 'animate-pulse' : ''
      }`}
      style={{
        background: 'radial-gradient(circle at 30% 30%, #b38a5a, #b38a5a 60%, #4338ca)',
        boxShadow: '0 10px 30px rgba(179,138,90,0.5), inset 0 -4px 10px rgba(0,0,0,0.3)',
      }}
    >
      <HelpCircle size={26} />
      {pulse && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
      )}
      {/* Indicateur visuel de drag (petit GripVertical en coin) */}
      <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
        <GripVertical size={8} className="text-white" />
      </span>
    </button>
    </div>
  )

  if (!open) return createPortal(ball, document.body)

  // ─── Modale d'aide ───
  const modal = (
    <>
      {ball}
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-end bg-surface-0/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
      >
        <div className="w-full sm:w-[640px] max-w-[95vw] h-[88vh] sm:h-[80vh] sm:mr-6 bg-surface-0 border border-purple-900/50 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-purple-950/40 to-indigo-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                   style={{ background: 'radial-gradient(circle at 30% 30%, #b38a5a, #4338ca)' }}>
                <Sparkles className="text-white" size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white m-0">Atlas Mall Suite — Aide</h2>
                <p className="text-[10px] text-slate-400 m-0">Guide rapide d'utilisation · v1.0</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/notice"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold bg-atlas-600 hover:bg-atlas-500 text-white"
                title="Ouvrir la notice complète (imprimable)"
              >
                <BookOpen size={12} />
                Notice complète
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 bg-surface-1/40 overflow-x-auto">
            {([
              { id: 'overview',  label: 'Vue d\'ensemble',     icon: Sparkles },
              { id: 'notice',    label: 'Notice d\'utilisation', icon: BookOpen },
              { id: 'workflow',  label: 'Workflow',            icon: Workflow },
              { id: 'volumes',   label: 'Les 4 volumes',       icon: ChevronRight },
              { id: 'proph3t',   label: 'PROPH3T',             icon: Brain },
              { id: 'shortcuts', label: 'Raccourcis',          icon: Keyboard },
              { id: 'context',   label: 'Cette page',          icon: HelpCircle },
            ] as const).map(t => {
              const Icon = t.icon
              const active = section === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSection(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-atlas-600/30 text-atlas-200 border border-atlas-500/50'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={12} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Contenu */}
          <div className="flex-1 overflow-y-auto p-5 text-slate-300">
            {section === 'overview' && (
              <div className="space-y-3 text-[12px] leading-relaxed">
                <p>
                  <strong className="text-white">Atlas Mall Suite</strong> est une plateforme
                  <strong className="text-emerald-400"> générique de pilotage pour centres commerciaux</strong>
                  : multi-projets, multi-tenant, multi-étages, multi-devises.
                </p>
                <p>
                  L'application combine <strong className="text-white">4 volumes métier</strong> et un
                  <strong className="text-atlas-300"> orchestrateur transversal IA (PROPH3T)</strong> qui
                  les enchaîne automatiquement à partir d'un plan importé (DXF/DWG/PDF).
                </p>
                <p className="text-[11px] text-slate-400">
                  Le projet <strong className="text-emerald-300">Cosmos Angré</strong> (Abidjan, ouverture oct. 2026)
                  est le <em>pilote</em> utilisé pour roder l'outil ; la plateforme est conçue pour accueillir
                  tout autre centre commercial via l'onboarding projet.
                </p>
                <div className="rounded-lg border border-purple-800 bg-purple-950/20 p-3 mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="text-atlas-400" size={14} />
                    <strong className="text-atlas-200 text-[11px]">Comment commencer ?</strong>
                  </div>
                  <ol className="text-[11px] text-slate-300 space-y-0.5 m-0 pl-5 list-decimal">
                    <li>Ouvrez un volume → onglet <em>Plans importés</em></li>
                    <li>Glissez votre plan + calibrez l'échelle</li>
                    <li>Vol.4 → <em>Orchestrateur 4 vol.</em> → <em>Lancer</em></li>
                    <li>Les volumes se pré-remplissent, vous corrigez à la main</li>
                  </ol>
                </div>
              </div>
            )}

            {section === 'notice' && (
              <div className="space-y-5 text-[12px] leading-relaxed">
                <div className="rounded-lg border border-blue-800 bg-blue-950/20 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="text-blue-400" size={14} />
                      <strong className="text-blue-200 text-[11px]">Notice d'utilisation complète</strong>
                    </div>
                    <Link
                      to="/notice"
                      onClick={() => setOpen(false)}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      Ouvrir ↗
                    </Link>
                  </div>
                  <p className="text-[11px] text-slate-300 m-0">
                    Mode d'emploi pas-à-pas pour utiliser Atlas Mall Suite de A à Z.
                    Le résumé ci-dessous reprend les 10 opérations clés.
                    <strong className="text-blue-300"> Cliquez « Ouvrir ↗ »</strong> pour la version complète (15 chapitres,
                    imprimable PDF).
                  </p>
                </div>

                {/* §1 — Démarrer */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-atlas-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    Démarrer une session
                  </h3>
                  <ul className="text-[11px] text-slate-300 m-0 pl-5 list-disc space-y-1">
                    <li>Sélectionnez votre projet dans la liste — ou créez-en un via l'onboarding (Nouveau projet).</li>
                    <li>Le projet pilote <strong>Cosmos Angré</strong> (Abidjan) est ouvert par défaut pour démonstration.</li>
                    <li>Le menu de gauche liste les modules transversaux + les 4 volumes.</li>
                    <li>L'auto-sauvegarde est activée : indicateur en bas à gauche (✓ enregistré).</li>
                    <li>Toutes les données sont persistées (localStorage + IndexedDB en offline, Supabase RLS en prod).</li>
                  </ul>
                </section>

                {/* §2 — Importer un plan */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-atlas-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    Importer un plan (étape obligatoire)
                  </h3>
                  <ol className="text-[11px] text-slate-300 m-0 pl-5 list-decimal space-y-1">
                    <li>Volume → onglet <em className="text-blue-300">Plans importés</em>.</li>
                    <li>Choisissez l'étage cible (B1 / RDC / R+1).</li>
                    <li>Glissez-déposez un fichier <strong>DXF, DWG ou PDF</strong> (max 50 Mo).</li>
                    <li>Le parser détecte automatiquement layers, blocs, textes, polylignes.</li>
                    <li><strong className="text-amber-300">Calibration échelle</strong> : cliquez 2 points dont vous connaissez la distance réelle, saisissez la valeur en mètres.</li>
                    <li>Validez — le plan est partagé entre TOUS les volumes (Vol.1, 2, 3, 4).</li>
                  </ol>
                  <div className="mt-2 px-3 py-2 rounded bg-amber-950/20 border border-amber-900/40 text-[10px] text-amber-200 flex items-start gap-2">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>Si le plan n'est pas calibré, les calculs de surface/distance seront faux. Vérifiez l'échelle après import.</span>
                  </div>
                </section>

                {/* §3 — Manipuler le plan */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-atlas-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    Manipuler le plan interactif
                  </h3>
                  <ul className="text-[11px] text-slate-300 m-0 pl-5 list-disc space-y-1">
                    <li><MousePointer2 size={10} className="inline mr-1" /><strong>Clic gauche</strong> sur un espace : sélection / édition libellé + catégorie.</li>
                    <li><strong>Clic droit</strong> : menu contextuel (exclure, dupliquer, fusionner).</li>
                    <li><strong>Molette</strong> : zoom centré curseur.</li>
                    <li><strong>Espace + glisser</strong> : pan (déplacement).</li>
                    <li><strong>F</strong> : recadrer pour voir tout le plan.</li>
                    <li><Layers size={10} className="inline mr-1" /><strong>Panneau Calques</strong> : afficher/masquer par catégorie.</li>
                  </ul>
                </section>

                {/* §4 — Lancer PROPH3T */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-atlas-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                    Lancer l'orchestrateur PROPH3T
                  </h3>
                  <ol className="text-[11px] text-slate-300 m-0 pl-5 list-decimal space-y-1">
                    <li>Vol.4 → menu <em className="text-atlas-300">PROPH3T → Orchestrateur 4 vol.</em></li>
                    <li>Cochez les volumes à exécuter (par défaut : tous).</li>
                    <li>Laissez <strong>Web Worker</strong> coché (l'UI reste fluide).</li>
                    <li>Cliquez <strong>Lancer orchestration</strong>.</li>
                    <li>Suivez la progress bar + décisions live (✓ vert au fil de l'eau).</li>
                    <li>À la fin → <em>Voir la trace complète</em> → drill-down par décision.</li>
                  </ol>
                  <p className="text-[10px] text-slate-500 mt-2 m-0">
                    Chaque trace est persistée et consultable plus tard dans <em>Historique</em>.
                  </p>
                </section>

                {/* §5 — Vol.1 */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ background: '#10b98125', color: '#10b981' }}>5</span>
                    Vol.1 — Mix commercial
                  </h3>
                  <ul className="text-[11px] text-slate-300 m-0 pl-5 list-disc space-y-1">
                    <li><strong>Classification</strong> : vérifiez les types d'enseignes auto-détectés (31 types).</li>
                    <li><strong>Prévision CA</strong> : Random Forest entraîné sur benchmarks UEMOA.</li>
                    <li><strong>Multi-scénarios</strong> : 4 emphases (revenue / diversité / charter / flagship).</li>
                    <li>Cliquez <strong>Adopter</strong> sur un scénario pour appliquer son mix.</li>
                  </ul>
                </section>

                {/* §6 — Vol.2 */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ background: '#ef444425', color: '#ef4444' }}>6</span>
                    Vol.2 — Sécurité (ERP)
                  </h3>
                  <ul className="text-[11px] text-slate-300 m-0 pl-5 list-disc space-y-1">
                    <li><strong>Audit ERP</strong> : conformité Arrêté 25/06/1980, ISO 7010.</li>
                    <li>Modale d'audit : statut global + filtres criticité/catégorie + coût FCFA.</li>
                    <li><strong>Placement caméras</strong> : algorithme glouton avec couverture optimisée.</li>
                    <li><strong>Simulation incidents</strong> : Monte-Carlo + affectation hongroise des agents.</li>
                    <li><em>Imprimer / PDF</em> en haut de la modale → rapport prêt pour bureau de contrôle.</li>
                  </ul>
                </section>

                {/* §7 — Vol.3 */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ background: '#f59e0b25', color: '#f59e0b' }}>7</span>
                    Vol.3 — Parcours client
                  </h3>
                  <ul className="text-[11px] text-slate-300 m-0 pl-5 list-disc space-y-1">
                    <li><strong>Personas Abidjan</strong> : 6 profils (jeune actif, famille, touriste…).</li>
                    <li><strong>ABM social-force</strong> : simulation foules par créneau horaire.</li>
                    <li><strong>Goulots</strong> : overlay coloré sur le plan (critique / haut / moyen / bas).</li>
                    <li><strong>Audit PMR</strong> : score conformité Loi 2005-102 + recommandations.</li>
                    <li>Clic sur une issue → focus sur le plan, voir l'edge concerné.</li>
                  </ul>
                </section>

                {/* §8 — Vol.4 */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ background: '#0ea5e925', color: '#0ea5e9' }}>8</span>
                    Vol.4 — Wayfinder
                  </h3>
                  <ul className="text-[11px] text-slate-300 m-0 pl-5 list-disc space-y-1">
                    <li><strong>Recherche & itinéraire</strong> : A* bidirectionnel multi-étages.</li>
                    <li><strong>Positionnement</strong> : EKF (WiFi + BLE + PDR) pour test indoor.</li>
                    <li><strong>Persona</strong> : préférences accessibilité, langue, marche/escaliers.</li>
                    <li><strong>Bornes interactives</strong> : configuration kiosques (URL <code className="text-blue-300">/kiosk/:id</code>).</li>
                    <li><strong>Wayfinder Designer</strong> : conception signalétique print + digital.
                      <ul className="pl-5 mt-1 list-[circle] text-[10px] text-slate-400 space-y-0.5">
                        <li>Onglet <em>Brand</em> : palette, typo, daltonisme.</li>
                        <li>Onglet <em>Templates</em> : choix mise en page.</li>
                        <li>Onglet <em>Canvas</em> : édition visuelle WYSIWYG.</li>
                        <li>Onglet <em>Export</em> : PDF / SVG / CMJN (PDF/X-1a via Ghostscript).</li>
                        <li>Onglet <em>Deploy</em> : push vers bornes / impression.</li>
                      </ul>
                    </li>
                  </ul>
                </section>

                {/* §9 — Sauvegardes & exports */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-atlas-600 text-white text-[11px] font-bold flex items-center justify-center">9</span>
                    <Save size={12} /> Sauvegardes & exports
                  </h3>
                  <ul className="text-[11px] text-slate-300 m-0 pl-5 list-disc space-y-1">
                    <li><strong>Auto-save</strong> : déclenché à chaque modification (debounce 1s).</li>
                    <li><strong>Stockage local</strong> : localStorage (corrections, patterns) + IndexedDB (images plans).</li>
                    <li><strong>Export PDF</strong> : disponible sur Audit ERP, PMR, Multi-scénarios.</li>
                    <li><strong>Export DCE</strong> : section transversale → ZIP complet.</li>
                    <li><strong>Mode hors-ligne</strong> : tout fonctionne sans connexion (PWA).</li>
                  </ul>
                </section>

                {/* §10 — Boucle d'apprentissage */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-atlas-600 text-white text-[11px] font-bold flex items-center justify-center">10</span>
                    Boucle d'apprentissage terrain
                  </h3>
                  <ul className="text-[11px] text-slate-300 m-0 pl-5 list-disc space-y-1">
                    <li>Chaque panneau imprimé contient un <strong>QR code</strong> de feedback.</li>
                    <li>Un agent terrain scanne → page mobile <code className="text-blue-300">/feedback</code>.</li>
                    <li>Il signale : OK, illisible, absent, mal-orienté, dégradé, obsolète.</li>
                    <li>Le pipeline LRN-03 consolide les feedbacks → patterns inter-projets.</li>
                    <li>PROPH3T propose ces patterns sur les futurs projets via <em>Mémoire inter-projets</em>.</li>
                  </ul>
                </section>

                {/* §11 — Dépannage */}
                <section>
                  <h3 className="text-white text-[13px] font-bold m-0 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">!</span>
                    Dépannage rapide
                  </h3>
                  <div className="space-y-2">
                    {[
                      { p: 'Le plan ne s\'affiche pas', s: 'Vérifiez la calibration échelle. Recharger la page (les images sont en IndexedDB).' },
                      { p: 'PROPH3T ne répond pas', s: 'Démarrez Ollama en local (port 11434) ou configurez clé Claude dans Paramètres.' },
                      { p: 'Orchestration bloquée', s: 'Décochez « Web Worker » pour debug en thread principal et voir les erreurs.' },
                      { p: 'Données perdues', s: 'Ne videz JAMAIS le localStorage du navigateur. Exportez régulièrement (DCE).' },
                      { p: 'Export CMJN échoue', s: 'Le service Ghostscript doit tourner (Cloud Run ou Docker local sur port 8080).' },
                    ].map((d, i) => (
                      <div key={i} className="px-3 py-2 rounded bg-surface-1/40 border border-white/5">
                        <div className="text-[11px] text-red-300 font-semibold m-0">→ {d.p}</div>
                        <div className="text-[10px] text-slate-400 m-0 mt-0.5">{d.s}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Footer notice */}
                <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-slate-500">
                  <p className="m-0">
                    <strong className="text-slate-400">Référentiels appliqués</strong> :
                    SYSCOHADA Révisé 2017 · TVA 18% (DGI Côte d'Ivoire) · Arrêté 25/06/1980 ERP ·
                    ISO 7010 signalétique · Loi 2005-102 PMR · Décret CI 2009-264 · WCAG 2.1 AA.
                  </p>
                </div>
              </div>
            )}

            {section === 'workflow' && (
              <div className="space-y-3 text-[12px]">
                <h3 className="text-white text-sm font-bold m-0 mb-2">Parcours type d'un projet</h3>
                {[
                  { n: 1, t: 'Importer le plan', d: 'DXF/DWG/PDF → calibration échelle. Le plan est partagé entre tous les volumes.', icon: Upload, color: '#0ea5e9' },
                  { n: 2, t: 'Orchestration PROPH3T', d: 'Vol.4 → Orchestrateur. Pré-remplit classification, audits, suggestions.', icon: Workflow, color: '#b38a5a' },
                  { n: 3, t: 'Vol.1 — Mix commercial', d: 'Vérifier types d\'enseignes, lancer prévisions CA, comparer scénarios.', icon: ShoppingBag, color: '#10b981' },
                  { n: 4, t: 'Vol.2 — Sécurité', d: 'Audit ERP automatique, placer caméras, simuler incidents.', icon: ShieldAlert, color: '#ef4444' },
                  { n: 5, t: 'Vol.3 — Parcours client', d: 'Personas Abidjan, ABM, détection goulots, audit PMR.', icon: Footprints, color: '#f59e0b' },
                  { n: 6, t: 'Vol.4 — Wayfinder', d: 'Designer signalétique (print + digital), bornes interactives.', icon: Navigation, color: '#0ea5e9' },
                ].map(s => {
                  const I = s.icon
                  return (
                    <div key={s.n} className="flex gap-3 p-2.5 rounded-lg bg-surface-1/40 border border-white/5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[11px]"
                           style={{ background: `${s.color}25`, color: s.color }}>
                        {s.n}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <I size={12} style={{ color: s.color }} />
                          <strong className="text-white text-[12px]">{s.t}</strong>
                        </div>
                        <p className="text-[11px] text-slate-400 m-0 mt-0.5">{s.d}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {section === 'volumes' && (
              <div className="space-y-3">
                {VOLUMES.map(v => {
                  const I = v.icon
                  return (
                    <div key={v.id} className="rounded-lg border p-3"
                         style={{ borderColor: `${v.color}40`, background: `${v.color}08` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <I size={16} style={{ color: v.color }} />
                        <strong className="text-white text-[13px]">{v.label}</strong>
                      </div>
                      <p className="text-[11px] text-slate-400 m-0">{v.desc}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {section === 'proph3t' && (
              <div className="space-y-3 text-[12px]">
                <h3 className="text-white text-sm font-bold m-0">Qu'est-ce que PROPH3T ?</h3>
                <p>
                  PROPH3T est l'<strong className="text-atlas-300">IA transversale</strong> d'Atlas.
                  Elle expose une façade unique :
                </p>
                <pre className="text-[10px] bg-surface-0 border border-white/10 rounded p-2 text-slate-300 overflow-auto">
{`proph3t.analyze(plan)             // classification + audit topologique
proph3t.orchestrate(input)        // enchaîne les 4 volumes
proph3t.predict(ctx, type)        // CA / footfall / temps intervention
proph3t.optimize(problem)         // mix, caméras, agents, signalétique
proph3t.learn(pattern, ctx)       // mémoire inter-projets
proph3t.feedback(qrCode, data)    // boucle apprentissage terrain`}
                </pre>
                <div className="rounded-lg border border-emerald-800 bg-emerald-950/20 p-3">
                  <strong className="text-emerald-300 text-[11px]">Auditabilité (CDC §6.2)</strong>
                  <p className="text-[11px] text-slate-300 m-0 mt-1">
                    Chaque décision est tracée (source, confiance, alternatives, output).
                    Voir Vol.4 → Orchestrateur → trace → drill-down.
                  </p>
                </div>
                <div className="rounded-lg border border-blue-800 bg-blue-950/20 p-3">
                  <strong className="text-blue-300 text-[11px]">Modèles locaux</strong>
                  <p className="text-[11px] text-slate-300 m-0 mt-1">
                    Ollama (Mistral/Llama 3.1/Llava) en local — fallback Claude API.
                    Configurez dans <em>Paramètres → Intégrations IA</em>.
                  </p>
                </div>
              </div>
            )}

            {section === 'shortcuts' && (
              <div className="space-y-2 text-[12px]">
                <h3 className="text-white text-sm font-bold m-0 mb-3">Raccourcis clavier</h3>
                {[
                  ['Shift + ?', 'Ouvrir cette aide'],
                  ['Esc',       'Fermer modale active'],
                  ['Ctrl + S',  'Sauvegarder (auto)'],
                  ['Ctrl + Z',  'Annuler dernière action plan'],
                  ['Ctrl + Y',  'Refaire'],
                  ['+/-',       'Zoom plan'],
                  ['F',         'Recadrer plan (fit)'],
                  ['Espace',    'Pan (maintenir)'],
                ].map(([k, d]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-1.5 rounded bg-surface-1/40 border border-white/5">
                    <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-atlas-300 border border-purple-900/40">
                      {k}
                    </kbd>
                    <span className="text-[11px] text-slate-400">{d}</span>
                  </div>
                ))}
              </div>
            )}

            {section === 'context' && (
              <div className="space-y-3 text-[12px]">
                <div className="rounded-lg border border-purple-800 bg-purple-950/20 p-3">
                  <div className="text-[10px] uppercase text-atlas-400 tracking-wider mb-1">
                    Page courante
                  </div>
                  <h3 className="text-white text-sm font-bold m-0">{ctx.title}</h3>
                  <p className="text-[11px] text-slate-300 m-0 mt-1.5">{ctx.hint}</p>
                  <code className="block text-[10px] text-slate-500 mt-2 font-mono truncate">
                    {location.pathname}
                  </code>
                </div>
                <div>
                  <strong className="text-white text-[12px]">Besoin de plus d'aide ?</strong>
                  <ul className="text-[11px] text-slate-400 m-0 mt-1 pl-5 list-disc space-y-0.5">
                    <li>Cahier des charges complet : <code className="text-slate-300">/docs</code></li>
                    <li>Référentiels ERP : Arrêté 25/06/1980, ISO 7010, NF C71-800</li>
                    <li>PMR : Loi 2005-102, Arrêté 8 décembre 2014</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-white/10 bg-surface-1/60 flex items-center justify-between text-[10px] text-slate-500">
            <span>Atlas Mall Suite · plateforme multi-projets · pilote : Cosmos Angré</span>
            <span>Esc pour fermer</span>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}
