// ═══ Notice d'utilisation — Atlas BIM ═══
//
// Page dédiée accessible via /notice — mode d'emploi complet,
// imprimable, avec sommaire cliquable et pagination latérale.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Printer, Download, ChevronRight, BookOpen,
  Upload, Workflow, ShoppingBag, ShieldAlert, Footprints, Navigation,
  Save, AlertCircle, Brain, Keyboard, Sparkles, Layers,
} from 'lucide-react'

interface Section {
  id: string
  title: string
  icon: React.ComponentType<any>
  color: string
}

const SECTIONS: Section[] = [
  { id: 'intro',        title: '1. Introduction',              icon: BookOpen,     color: '#b38a5a' },
  { id: 'install',      title: '2. Prérequis & installation',  icon: Download,     color: '#64748b' },
  { id: 'session',      title: '3. Démarrer une session',      icon: Sparkles,     color: '#b38a5a' },
  { id: 'import',       title: '4. Importer un plan',          icon: Upload,       color: '#0ea5e9' },
  { id: 'plan',         title: '5. Manipuler le plan',         icon: Layers,       color: '#0ea5e9' },
  { id: 'orchestrate',  title: '6. Orchestrateur PROPH3T',     icon: Workflow,     color: '#b38a5a' },
  { id: 'vol1',         title: '7. Vol.1 — Commercial',        icon: ShoppingBag,  color: '#10b981' },
  { id: 'vol2',         title: '8. Vol.2 — Sécurité (ERP)',    icon: ShieldAlert,  color: '#ef4444' },
  { id: 'vol3',         title: '9. Vol.3 — Parcours client',   icon: Footprints,   color: '#f59e0b' },
  { id: 'vol4',         title: '10. Vol.4 — Wayfinder',        icon: Navigation,   color: '#0ea5e9' },
  { id: 'save',         title: '11. Sauvegardes & exports',    icon: Save,         color: '#64748b' },
  { id: 'learning',     title: '12. Boucle d\'apprentissage',  icon: Brain,        color: '#b38a5a' },
  { id: 'shortcuts',    title: '13. Raccourcis clavier',       icon: Keyboard,     color: '#64748b' },
  { id: 'troubleshoot', title: '14. Dépannage',                icon: AlertCircle,  color: '#ef4444' },
  { id: 'refs',         title: '15. Référentiels',             icon: BookOpen,     color: '#64748b' },
]

export default function NoticePage() {
  const [activeId, setActiveId] = useState('intro')

  // Scrollspy : surligne la section visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-surface-0 text-slate-200 print:bg-white print:text-black">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-1/95 backdrop-blur border-b border-white/10 print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/projects/cosmos-angre"
              className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-white"
            >
              <ArrowLeft size={14} />
              Retour à l'application
            </Link>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-atlas-400" />
              <span className="text-sm font-bold text-white">Notice d'utilisation</span>
              <span className="text-[10px] text-slate-500">v1.0</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-atlas-600 hover:bg-atlas-500 text-white"
            >
              <Printer size={12} /> Imprimer / PDF
            </button>
          </div>
        </div>
      </header>

      {/* Impression : page de garde */}
      <div className="hidden print:block p-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold m-0">Atlas BIM</h1>
          <p className="text-xl text-slate-600 m-0 mt-2">Notice d'utilisation — v1.0</p>
          <p className="text-sm text-slate-500 m-0 mt-8">
            Plateforme de pilotage pour centres commerciaux (multi-projets, multi-tenant)
          </p>
          <p className="text-sm text-slate-500 m-0 mt-1">
            Projet pilote : <strong>The Mall Shopping Center</strong> · Abidjan · ouverture octobre 2026
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 print:block print:px-0">
        {/* Sommaire latéral */}
        <aside className="w-64 flex-shrink-0 print:hidden">
          <div className="sticky top-20 space-y-0.5">
            <div className="text-[9px] tracking-widest uppercase text-slate-500 mb-2 px-2">Sommaire</div>
            {SECTIONS.map(s => {
              const Icon = s.icon
              const active = activeId === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[11px] transition ${
                    active ? 'bg-atlas-600/20 text-atlas-200 border-l-2 border-atlas-500' : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                  }`}
                  style={{ paddingLeft: active ? 8 : 10 }}
                >
                  <Icon size={11} style={{ color: active ? s.color : undefined }} />
                  <span className="truncate">{s.title}</span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Contenu */}
        <main className="flex-1 min-w-0 max-w-3xl print:max-w-none">
          {/* Intro */}
          <section id="intro" className="mb-12 scroll-mt-24">
            <SectionHeader icon={BookOpen} color="#b38a5a">1. Introduction</SectionHeader>
            <p className="text-[13px] leading-relaxed">
              <strong className="text-white">Atlas BIM</strong> est une plateforme
              <strong className="text-emerald-400"> générique de pilotage pour centres commerciaux</strong>
              (conception, audit réglementaire, signalétique, exploitation). Elle est multi-projets,
              multi-tenant, multi-étages et multi-devises — adaptable à tout mall où qu'il soit implanté.
            </p>
            <p className="text-[13px] leading-relaxed mt-3">
              L'application combine 4 volumes métier et un orchestrateur IA transversal (PROPH3T) capable
              d'automatiser les analyses à partir d'un simple plan architectural importé. Tous les calculs,
              référentiels et exports sont paramétrables par projet.
            </p>
            <InfoBox variant="info">
              <strong>Projet pilote :</strong> <em>The Mall Shopping Center</em> (Abidjan, ouverture oct. 2026)
              est le premier déploiement utilisé pour roder l'outil et calibrer les benchmarks UEMOA.
              La plateforme est <strong>conçue pour accueillir n'importe quel projet</strong> via l'onboarding
              (nouveaux pays, devises, référentiels réglementaires).
            </InfoBox>
            <InfoBox variant="info">
              <strong>Public visé :</strong> maîtres d'ouvrage, architectes, AMO, exploitants de mall,
              bureaux de contrôle, responsables sécurité et signalétique — pour tout centre commercial
              (neuf ou en rénovation), toutes tailles, toutes zones géographiques.
            </InfoBox>
          </section>

          {/* Install */}
          <section id="install" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Download} color="#64748b">2. Prérequis & installation</SectionHeader>
            <h3 className="text-white text-[14px] font-semibold mt-2 mb-1.5">Côté utilisateur final</h3>
            <ul className="text-[13px] space-y-1.5 pl-5 list-disc">
              <li>Navigateur : Chrome/Edge/Firefox (dernières versions), 8 Go de RAM recommandés.</li>
              <li>Résolution : 1440×900 minimum (1920×1080 recommandé).</li>
              <li>Stockage local : 500 Mo libres (localStorage + IndexedDB).</li>
            </ul>
            <h3 className="text-white text-[14px] font-semibold mt-4 mb-1.5">Côté déploiement (optionnel)</h3>
            <ul className="text-[13px] space-y-1.5 pl-5 list-disc">
              <li><strong>Supabase</strong> : backend multi-tenant (RLS par organisation + projet) pour partage équipe.</li>
              <li><strong>Ollama local</strong> (port 11434) : IA en local et hors-ligne, ou clé API Claude en fallback.</li>
              <li><strong>Service Ghostscript</strong> (Cloud Run / Docker) : exports CMJN PDF/X-1a professionnels.</li>
              <li><strong>LightGBM service</strong> (FastAPI) : prédictions CA avancées côté serveur.</li>
            </ul>
            <InfoBox variant="info">
              L'application fonctionne <strong>100% en local</strong> sans aucun service externe.
              Les services backend sont seulement nécessaires pour le partage d'équipe et certains
              exports professionnels.
            </InfoBox>
          </section>

          {/* Session */}
          <section id="session" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Sparkles} color="#b38a5a">3. Démarrer une session</SectionHeader>
            <ol className="text-[13px] space-y-2 pl-5 list-decimal">
              <li>
                <strong>Nouveau projet</strong> : passez par l'onboarding (nom, pays, devise, surface totale,
                nombre d'étages, référentiels réglementaires à activer).
              </li>
              <li>
                <strong>Projet existant</strong> : sélectionnez-le dans la liste du tableau de bord.
              </li>
              <li>
                Pour la démonstration, le projet pilote <strong>The Mall Shopping Center</strong>
                (Abidjan) est préchargé.
              </li>
              <li>Le menu de gauche liste les modules transversaux et les 4 volumes métier.</li>
              <li>L'auto-sauvegarde est activée : indicateur ✓ en bas à gauche de chaque volume.</li>
              <li>
                Données persistées : localStorage + IndexedDB en offline, Supabase (RLS multi-tenant)
                en production — chaque organisation ne voit que ses projets.
              </li>
            </ol>
          </section>

          {/* Import */}
          <section id="import" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Upload} color="#0ea5e9">4. Importer un plan (étape obligatoire)</SectionHeader>
            <ol className="text-[13px] space-y-2 pl-5 list-decimal">
              <li>Volume → onglet <em className="text-blue-300">Plans importés</em>.</li>
              <li>Choisissez l'étage cible (B1 / RDC / R+1).</li>
              <li>Glissez-déposez un fichier <strong>DXF, DWG ou PDF</strong> (max 50 Mo).</li>
              <li>Le parser détecte automatiquement layers, blocs, textes et polylignes.</li>
              <li>
                <strong className="text-amber-300">Calibration échelle</strong> : cliquez 2 points dont
                vous connaissez la distance réelle, saisissez la valeur en mètres.
              </li>
              <li>Validez — le plan est partagé entre <strong>tous les volumes</strong>.</li>
            </ol>
            <InfoBox variant="warn">
              Si le plan n'est pas calibré, les calculs de surface et de distance seront faux.
              Vérifiez systématiquement l'échelle juste après import.
            </InfoBox>
          </section>

          {/* Plan */}
          <section id="plan" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Layers} color="#0ea5e9">5. Manipuler le plan interactif</SectionHeader>
            <ul className="text-[13px] space-y-1.5 pl-5 list-disc">
              <li><strong>Clic gauche</strong> sur un espace : sélection / édition libellé + catégorie.</li>
              <li><strong>Clic droit</strong> : menu contextuel (exclure, dupliquer, fusionner).</li>
              <li><strong>Molette</strong> : zoom centré sur le curseur.</li>
              <li><strong>Espace + glisser</strong> : pan (déplacement).</li>
              <li><strong>Touche F</strong> : recadrer pour voir tout le plan (fit).</li>
              <li><strong>Panneau Calques</strong> : afficher/masquer par catégorie.</li>
              <li><strong>Ctrl + Z / Ctrl + Y</strong> : annuler / refaire.</li>
            </ul>
          </section>

          {/* Orchestrate */}
          <section id="orchestrate" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Workflow} color="#b38a5a">6. Orchestrateur PROPH3T</SectionHeader>
            <p className="text-[13px] mb-3">
              L'orchestrateur enchaîne automatiquement les 4 volumes sur le plan importé et trace chaque
              décision pour auditabilité complète.
            </p>
            <ol className="text-[13px] space-y-2 pl-5 list-decimal">
              <li>Vol.4 → menu <em className="text-atlas-300">PROPH3T → Orchestrateur 4 vol.</em></li>
              <li>Cochez les volumes à exécuter (par défaut : tous).</li>
              <li>Laissez <strong>Web Worker</strong> coché pour que l'UI reste fluide.</li>
              <li>Cliquez <strong>Lancer orchestration</strong>.</li>
              <li>Suivez la progress bar et les décisions ✓ ajoutées en temps réel.</li>
              <li>À la fin → <em>Voir la trace complète</em> → drill-down par décision.</li>
            </ol>
            <InfoBox variant="info">
              Chaque trace est persistée et consultable ultérieurement via la liste <em>Historique</em>.
              Filtrage par volume ou par type de décision (classification, prédiction, audit…).
            </InfoBox>
          </section>

          {/* Vol1 */}
          <section id="vol1" className="mb-12 scroll-mt-24">
            <SectionHeader icon={ShoppingBag} color="#10b981">7. Vol.1 — Mix commercial</SectionHeader>
            <ul className="text-[13px] space-y-1.5 pl-5 list-disc">
              <li><strong>Classification</strong> des enseignes : 31 types auto-détectés par similarité lexicale.</li>
              <li><strong>Prévision CA</strong> : Gradient-boosted trees (GBDT) calibrés sur benchmarks UEMOA.</li>
              <li><strong>Multi-scénarios</strong> : 4 emphases (revenue / diversité / charter / flagship).</li>
              <li>Cliquez <strong>Adopter</strong> sur un scénario pour appliquer son mix au projet.</li>
              <li>Export : PDF récapitulatif + feuille Excel des revenus prévisionnels.</li>
            </ul>
          </section>

          {/* Vol2 */}
          <section id="vol2" className="mb-12 scroll-mt-24">
            <SectionHeader icon={ShieldAlert} color="#ef4444">8. Vol.2 — Sécurité (ERP)</SectionHeader>
            <ul className="text-[13px] space-y-1.5 pl-5 list-disc">
              <li><strong>Audit ERP</strong> : conformité Arrêté du 25/06/1980, ISO 7010, NF C71-800.</li>
              <li>Modale d'audit : statut global + filtres criticité/catégorie + coût correction FCFA.</li>
              <li><strong>Placement caméras</strong> : algorithme glouton avec couverture optimisée.</li>
              <li><strong>Simulation incidents</strong> : Monte-Carlo + affectation hongroise des agents.</li>
              <li>Filtre Kalman : lissage des flux footfall pour prédictions robustes.</li>
              <li>Cliquez <em>Imprimer / PDF</em> dans la modale → rapport prêt pour bureau de contrôle.</li>
            </ul>
          </section>

          {/* Vol3 */}
          <section id="vol3" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Footprints} color="#f59e0b">9. Vol.3 — Parcours client</SectionHeader>
            <ul className="text-[13px] space-y-1.5 pl-5 list-disc">
              <li><strong>Personas Abidjan</strong> : 6 profils types (jeune actif, famille, touriste…).</li>
              <li><strong>ABM social-force</strong> : simulation de foules par créneau horaire.</li>
              <li><strong>Détection goulots</strong> : overlay coloré (critique / haut / moyen / bas).</li>
              <li><strong>Audit PMR</strong> : score de conformité Loi 2005-102 + recommandations.</li>
              <li>Clic sur une issue → focus automatique sur le plan, edge concerné mis en évidence.</li>
            </ul>
          </section>

          {/* Vol4 */}
          <section id="vol4" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Navigation} color="#0ea5e9">10. Vol.4 — Wayfinder</SectionHeader>
            <ul className="text-[13px] space-y-1.5 pl-5 list-disc">
              <li><strong>Recherche & itinéraire</strong> : A* bidirectionnel multi-étages.</li>
              <li><strong>Positionnement</strong> : EKF (WiFi + BLE + PDR) pour test indoor.</li>
              <li><strong>Persona</strong> : préférences accessibilité, langue, marche/escaliers.</li>
              <li><strong>Bornes interactives</strong> : runtime kiosque à l'URL <code className="text-blue-300">/kiosk/:id</code>.</li>
              <li>
                <strong>Wayfinder Designer</strong> : conception signalétique print + digital.
                <ul className="pl-5 mt-1.5 list-[circle] text-[12px] text-slate-400 space-y-0.5">
                  <li><em>Brand</em> — palette, typographie, simulation daltonisme.</li>
                  <li><em>Templates</em> — choix mise en page (kiosk portrait/landscape, mural, pictogramme).</li>
                  <li><em>Canvas</em> — édition visuelle WYSIWYG (drag & drop).</li>
                  <li><em>Export</em> — PDF / SVG / CMJN PDF/X-1a via Ghostscript.</li>
                  <li><em>Deploy</em> — push vers bornes + bon de commande imprimeur.</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* Save */}
          <section id="save" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Save} color="#64748b">11. Sauvegardes & exports</SectionHeader>
            <ul className="text-[13px] space-y-1.5 pl-5 list-disc">
              <li><strong>Auto-save</strong> : déclenché à chaque modification (debounce 1s).</li>
              <li><strong>Stockage local</strong> : localStorage (corrections, patterns) + IndexedDB (images).</li>
              <li><strong>Export PDF</strong> : disponible sur Audit ERP, PMR, Multi-scénarios.</li>
              <li><strong>Export DCE</strong> : section transversale → ZIP complet pour appel d'offres.</li>
              <li><strong>Mode hors-ligne</strong> : tout fonctionne sans connexion (architecture PWA).</li>
              <li><strong>Export CMJN professionnel</strong> : PDF/X-1a ISOcoated_v2_300 pour imprimeur.</li>
            </ul>
          </section>

          {/* Learning */}
          <section id="learning" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Brain} color="#b38a5a">12. Boucle d'apprentissage terrain</SectionHeader>
            <ol className="text-[13px] space-y-2 pl-5 list-decimal">
              <li>Chaque panneau imprimé contient un <strong>QR code</strong> de feedback.</li>
              <li>L'agent terrain scanne → page mobile <code className="text-blue-300">/feedback</code>.</li>
              <li>Il signale : OK, illisible, absent, mal-orienté, dégradé, obsolète.</li>
              <li>Le pipeline <code>LRN-03</code> consolide les feedbacks → patterns inter-projets.</li>
              <li>PROPH3T propose ces patterns sur les futurs projets via <em>Mémoire inter-projets</em>.</li>
            </ol>
          </section>

          {/* Shortcuts */}
          <section id="shortcuts" className="mb-12 scroll-mt-24">
            <SectionHeader icon={Keyboard} color="#64748b">13. Raccourcis clavier</SectionHeader>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Shift + ?', 'Ouvrir l\'aide flottante'],
                ['Esc',       'Fermer modale active'],
                ['Ctrl + S',  'Sauvegarder (auto)'],
                ['Ctrl + Z',  'Annuler dernière action'],
                ['Ctrl + Y',  'Refaire'],
                ['+ / -',     'Zoom plan'],
                ['F',         'Recadrer plan (fit)'],
                ['Espace',    'Pan (maintenir)'],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center justify-between px-3 py-2 rounded bg-surface-1/40 border border-white/5 print:border-slate-300 print:bg-white">
                  <kbd className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-atlas-300 border border-purple-900/40 print:bg-slate-100 print:text-black print:border-slate-400">
                    {k}
                  </kbd>
                  <span className="text-[11px] text-slate-400 print:text-black">{d}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Troubleshoot */}
          <section id="troubleshoot" className="mb-12 scroll-mt-24">
            <SectionHeader icon={AlertCircle} color="#ef4444">14. Dépannage</SectionHeader>
            <div className="space-y-3">
              {[
                { p: 'Le plan ne s\'affiche pas', s: 'Vérifiez la calibration d\'échelle. Rechargez la page (les images sont en IndexedDB, pas perdues).' },
                { p: 'PROPH3T ne répond pas', s: 'Démarrez Ollama en local (port 11434) OU configurez une clé Claude dans Paramètres → Intégrations IA.' },
                { p: 'Orchestration bloquée', s: 'Décochez « Web Worker » pour déboguer en thread principal et voir les erreurs en console.' },
                { p: 'Données perdues', s: 'Ne videz JAMAIS le localStorage du navigateur. Exportez régulièrement via DCE (ZIP complet).' },
                { p: 'Export CMJN échoue', s: 'Le service Ghostscript doit tourner (Cloud Run, Docker local port 8080, ou Render).' },
                { p: 'Import DXF illisible', s: 'Enregistrez depuis AutoCAD en version DXF R2013 (ASCII). Les versions trop récentes peuvent échouer.' },
                { p: 'Performances dégradées', s: 'Plan > 10 000 entités : activez le mode simplifié dans les options du visualiseur.' },
              ].map((d, i) => (
                <div key={i} className="px-4 py-3 rounded-lg bg-surface-1/40 border border-white/5 print:border-slate-300 print:bg-white">
                  <div className="text-[12px] text-red-300 font-semibold m-0 flex items-center gap-1 print:text-red-700">
                    <ChevronRight size={12} /> {d.p}
                  </div>
                  <div className="text-[12px] text-slate-400 m-0 mt-1 ml-4 print:text-black">{d.s}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Refs */}
          <section id="refs" className="mb-12 scroll-mt-24">
            <SectionHeader icon={BookOpen} color="#64748b">15. Référentiels réglementaires appliqués</SectionHeader>
            <p className="text-[12px] text-slate-400 mb-3">
              Référentiels <strong>activés par défaut pour le pilote The Mall (zone UEMOA)</strong>.
              Chaque projet peut activer/désactiver ses propres référentiels selon sa juridiction
              (France, UE, USA, autres zones Afrique, Moyen-Orient, Asie…).
            </p>
            <ul className="text-[12px] space-y-1.5 pl-5 list-disc">
              <li><strong>Comptabilité</strong> : SYSCOHADA Révisé 2017, TVA 18% (UEMOA) — ou TVA locale selon pays.</li>
              <li><strong>Sécurité ERP</strong> : Arrêté du 25 juin 1980 (FR/UEMOA), Décret CI 2009-264, Loi CI 2014-388 — extensible NFPA (USA), BS (UK), autres.</li>
              <li><strong>Signalétique</strong> : ISO 7010 (pictogrammes — standard international), NF C71-800 (luminance), NF S 61-938.</li>
              <li><strong>Accessibilité PMR</strong> : ISO 21542 (international), Loi 2005-102 + Arrêté 8 déc. 2014 (France), ADA (USA), PWD Act (autres).</li>
              <li><strong>Issues de secours</strong> : EN 1125 (Europe), UL 305 (USA).</li>
              <li><strong>Web & UX</strong> : WCAG 2.1 AA (universel), simulation daltonisme (Brettel 1997).</li>
              <li><strong>Impression</strong> : PDF/X-1a, ISOcoated_v2_300 (ECI — standard européen), GRACoL (USA).</li>
            </ul>

            <div className="mt-6 pt-4 border-t border-white/10 print:border-slate-300 text-[10px] text-slate-500 print:text-slate-700">
              <p className="m-0">
                <strong>Atlas BIM</strong> — Notice v1.0 — {new Date().toLocaleDateString('fr-FR')}
              </p>
              <p className="m-0 mt-1">
                Audit généré automatiquement par PROPH3T. Validation finale par bureau de contrôle agréé requise
                pour tous les livrables réglementaires.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────

function SectionHeader({
  icon: Icon, color, children,
}: { icon: React.ComponentType<any>; color: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[18px] font-bold text-white m-0 mb-4 pb-2 border-b border-white/10 print:text-black print:border-slate-300">
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}25`, color }}
      >
        <Icon size={14} />
      </span>
      {children}
    </h2>
  )
}

function InfoBox({
  variant, children,
}: { variant: 'info' | 'warn'; children: React.ReactNode }) {
  const styles = variant === 'warn'
    ? { border: 'border-amber-700 print:border-amber-600', bg: 'bg-amber-950/20 print:bg-amber-50', icon: 'text-amber-400 print:text-amber-700' }
    : { border: 'border-blue-700 print:border-blue-600',   bg: 'bg-blue-950/20 print:bg-blue-50',     icon: 'text-blue-400 print:text-blue-700' }
  return (
    <div className={`mt-3 px-4 py-3 rounded-lg border ${styles.border} ${styles.bg} flex items-start gap-2`}>
      <AlertCircle size={14} className={`flex-shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="text-[12px] text-slate-300 print:text-black">{children}</div>
    </div>
  )
}
