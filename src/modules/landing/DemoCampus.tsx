// ═══ DEMO — Rapport Campus · Atlas BIM ═══

import { useMemo } from 'react'
import { buildDemoHtml } from './demoReportTheme'
import { DemoReportShell, DEMO_LINKS } from './DemoReportShell'

function buildCampusHtml(): string {
  const generatedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  const ref = 'AMS-EDU-UFHB-' + new Date().toISOString().slice(0, 10)

  return buildDemoHtml({
    productCrumb: 'Campus Suite · Vol.1 Opérations & Vol.3 Expérience étudiant',
    title: 'Audit occupation salles & parcours étudiant — Campus universitaire',
    subtitle: 'Université 120 000 m² · 12 bâtiments · 28 000 étudiants · Abidjan Cocody',
    destinataire: 'Pr. Aminata Diabaté — Doyenne · Université Houphouët-Boigny',
    perimetre: '12 bâtiments · 184 salles · 4 amphis · bibliothèque 5 200 m² · 28 000 étudiants',
    horizon: 'Rentrée 2026-2027 · accréditation CAMES 2027',
    chips: ['Proph3t v2.4', 'CAMES', 'EDUCAUSE', 'ISO 21001', 'ERP R', 'PMR'],
    kpis: [
      { label: 'Taux occupation salles', value: '48', unit: '%',   tone: 'warn', delta: '−22 pts vs 70 % cible EDUCAUSE', deltaBad: true },
      { label: 'Ratio étudiants/enseignant', value: '28', unit: '', tone: 'warn', delta: 'benchmark UEMOA : 22',          deltaBad: true },
      { label: 'Usage bibliothèque',     value: '32', unit: '%',   tone: 'warn', delta: 'benchmark 45 %',                 deltaBad: true },
      { label: 'Résa événements/sem',    value: '42', unit: '',    tone: 'ok',   delta: 'benchmark 28 · +50 %' },
      { label: 'Conformité PMR',         value: '76', unit: '%',   tone: 'warn', delta: 'objectif 100 %',                 deltaBad: true },
      { label: 'Uplift capacité post-corrections', value: '+3 400', unit: 'étudiants/an', tone: 'warn', delta: 'sans construction neuve' },
    ],
    sections: [
      {
        num: '01',
        title: 'Cartographie des 12 bâtiments',
        meta: 'Plan directeur · 120 000 m² pédagogique',
        body: `<div class="card card-pad prose">
          <p>Le campus s'étend sur <strong>120 000 m²</strong> répartis en 12 bâtiments :</p>
          <ul>
            <li><strong>Bâtiments A-B</strong> (UFR Sciences, 28 000 m²) : 54 salles + 2 amphis 300 places</li>
            <li><strong>Bâtiments C-E</strong> (UFR Lettres, 24 000 m²) : 42 salles + 1 amphi 250 places</li>
            <li><strong>Bâtiment F</strong> (UFR Médecine, 18 000 m²) : 28 salles + 1 amphi 200 places + labos</li>
            <li><strong>Bâtiment G</strong> (bibliothèque centrale, 5 200 m²) : 1 800 places assises</li>
            <li><strong>Bâtiments H-I</strong> (logements étudiants, 22 000 m²) : 850 lits</li>
            <li><strong>Bâtiments J-L</strong> (administration, restauration, sport, 22 800 m²)</li>
          </ul>
          <p>Les bâtiments ont été construits entre 1964 (A-B) et 2018 (F, G) — disparité importante d'accessibilité et de réseau informatique. 4 bâtiments sur 12 présentent des <strong>non-conformités PMR</strong>.</p>
        </div>`,
      },
      {
        num: '02',
        title: 'Synthèse exécutive',
        meta: 'Benchmark EDUCAUSE + CAMES',
        body: `<div class="card card-pad prose">
          <p><strong>Madame la Doyenne,</strong></p>
          <p>Proph3t a analysé un semestre de données <em>ADE Campus</em> (planification salles) + <em>badges étudiants</em> + <em>WiFi campus</em> (heatmap présence), croisés avec les <a href="#">benchmarks EDUCAUSE 2024</a> et les critères d'accréditation <em>CAMES</em>.</p>
          <p><span class="hl">Paradoxe majeur :</span> l'université est perçue comme <em>saturée</em> par les étudiants (listes d'attente, couloirs bondés), pourtant les salles ne sont occupées qu'à <strong>48 %</strong>. L'explication : 62 % des créneaux sont concentrés sur 3 plages horaires (8h-10h, 10h-12h, 14h-16h), laissant 15h-18h et le vendredi quasi-vides.</p>
          <p><span class="hl">Usage bibliothèque décevant :</span> 32 % vs 45 % benchmark. Causes identifiées : WiFi défaillant (débit &lt; 10 Mbps 40 % du temps), prises électriques insuffisantes (1 pour 4 places vs 1 pour 2 recommandé), bruit (climatisation + flux passant).</p>
          <p><span class="hl">Conformité PMR :</span> 4 bâtiments sur 12 présentent des non-conformités majeures. Obstacle pour l'accréditation CAMES 2027 qui impose 100 %.</p>
          <p>Plan proposé : <span class="hl">185 MFCFA CAPEX</span> + 28 MFCFA/an OPEX pour <strong>lisser la charge horaire</strong> (lissage 10 créneaux), <strong>moderniser la bibliothèque</strong>, et <strong>atteindre 100 % PMR</strong>. Capacité étudiante augmentée de <strong>+3 400/an</strong> sans construire de nouveaux bâtiments.</p>
        </div>`,
      },
      {
        num: '03',
        title: 'Occupation horaire des salles',
        meta: 'ADE Campus · 12 200 créneaux/semaine',
        body: `<div class="dbl">
          <div class="card">
            <div style="padding:22px 28px 10px;"><div class="subtitle">Répartition des créneaux par plage horaire</div></div>
            <table class="dt">
              <thead><tr><th>Plage</th><th>Créneaux</th><th>Occupation</th><th>Potentiel</th></tr></thead>
              <tbody>
                <tr><td>8h-10h</td><td class="num">2 860</td><td class="num pct neg">92 %</td><td class="num pct pos">saturé</td></tr>
                <tr><td>10h-12h</td><td class="num">3 120</td><td class="num pct neg">88 %</td><td class="num pct pos">saturé</td></tr>
                <tr><td>12h-14h</td><td class="num">480</td><td class="num pct pos">18 %</td><td class="num pct neg">+82 % capacité</td></tr>
                <tr><td>14h-16h</td><td class="num">2 940</td><td class="num pct neg">78 %</td><td class="num pct pos">fort</td></tr>
                <tr><td>16h-18h</td><td class="num">1 840</td><td class="num pct neg">42 %</td><td class="num pct neg">+58 %</td></tr>
                <tr><td>18h-20h</td><td class="num">620</td><td class="num pct pos">12 %</td><td class="num pct neg">+88 %</td></tr>
                <tr><td>Vendredi journée</td><td class="num">340</td><td class="num pct neg">24 %</td><td class="num pct neg">+76 %</td></tr>
              </tbody>
            </table>
          </div>
          <div class="card">
            <div style="padding:22px 28px 10px;"><div class="subtitle">Salles sous-exploitées (&lt; 30 % occup.)</div></div>
            <table class="dt">
              <thead><tr><th>Bâtiment</th><th>Nb salles</th><th>Occ. moy.</th><th>Action</th></tr></thead>
              <tbody>
                <tr><td>A (R+3 sciences)</td><td class="num">8</td><td class="num pct neg">24 %</td><td class="accent">Redistribuer</td></tr>
                <tr><td>C (lettres R+2)</td><td class="num">6</td><td class="num pct neg">28 %</td><td class="accent">Redistribuer</td></tr>
                <tr><td>E (RDC)</td><td class="num">4</td><td class="num pct neg">22 %</td><td class="accent">Affecter</td></tr>
                <tr><td>F (annexe médecine)</td><td class="num">3</td><td class="num pct neg">18 %</td><td class="accent">Affecter</td></tr>
              </tbody>
            </table>
          </div>
        </div>`,
      },
      {
        num: '04',
        title: 'Parcours étudiant & flux piétons',
        meta: 'WiFi heatmap · 28 000 étudiants',
        body: `<div class="card card-pad prose">
          <p>L'analyse WiFi agrégée anonymisée (RGPD étudiants) sur 90 jours révèle les <strong>routes critiques</strong> :</p>
          <ul>
            <li><strong>Bâtiment A → Bâtiment G (bibliothèque)</strong> — 4 800 trajets/jour, distance 420 m en extérieur → risque pluie/chaleur en saison</li>
            <li><strong>Bâtiments C-E → restaurant universitaire (J)</strong> — pic 12h45-13h15, congestion allée centrale 3,8 pax/m² (seuil ISO 20382 dépassé)</li>
            <li><strong>Ascenseur bâtiment F (médecine)</strong> — attente moyenne 4 min à 9h-10h → impact significatif retards cours</li>
            <li><strong>Zones mortes</strong> : bâtiments H-I (logements) peu connectés au cœur académique, 87 % des étudiants logés n'y reviennent jamais entre 8h et 18h</li>
          </ul>
          <p>Proph3t recommande un <strong>plan de circulation couvert</strong> (auvent allée A→G) et un <strong>resto-relais</strong> côté bâtiments C-E pour désengorger le RU central.</p>
        </div>`,
      },
    ],
    recommendations: [
      { id: 'C01', action: 'Lissage charge : cours 12h-14h, 18h-20h, vendredi (bonus créneau)', capex: '—', opex: '8 400 000', delay: 'rentrée', impact: '+3 400 étudiants', priority: 'p0' },
      { id: 'C02', action: 'Modernisation bibliothèque : WiFi + prises + acoustique', capex: '32 000 000', opex: '1 800 000', delay: '120 j', impact: '+13 pts usage', priority: 'p0' },
      { id: 'C03', action: 'Mise aux normes PMR 4 bâtiments (rampes, ascenseurs, sanitaires)', capex: '68 000 000', delay: '180 j', impact: 'Accréditation CAMES', priority: 'p0' },
      { id: 'C04', action: 'Auvent allée couverte bâtiment A → G (420 m)', capex: '42 000 000', opex: '—', delay: '150 j', impact: 'Confort 4 800 trajets/j', priority: 'p1' },
      { id: 'C05', action: 'Resto-relais côté bâtiments C-E (200 couverts)', capex: '28 000 000', opex: '14 400 000', delay: '180 j', impact: '−45 % congestion RU', priority: 'p1' },
      { id: 'C06', action: 'Wayfinder campus (app mobile + signalétique ISO 7010)', capex: '15 000 000', opex: '3 200 000', delay: '90 j', impact: '+NPS étudiant 25 pts', priority: 'p2' },
    ],
    totalCapex: '185 000 000',
    totalOpex: '27 800 000',
    totalImpact: '+3 400 étudiants/an · CAMES 2027',
    methodology: [
      { k: 'Source ADE',      v: 'Système de planification ADE Campus · 12 200 créneaux/semaine · 1 semestre' },
      { k: 'WiFi heatmap',    v: 'Agrégation anonymisée 28 000 appareils · 90 jours · cartographie flux/bâtiment' },
      { k: 'Badges étudiants', v: 'Système contrôle d\'accès · N=28 000 · données horaires 6 mois' },
      { k: 'Benchmarks',      v: 'EDUCAUSE Campus 2024 (N=184 universités) · CAMES (critères accréditation)' },
      { k: 'Normes',          v: 'ERP R · CAMES · ISO 21001 · PMR renforcée · RGPD étudiants · ISO 7010' },
      { k: 'Limites',         v: 'Modèle WiFi imprécis aux frontières de bâtiments. Ne capture pas les cours hors-site.' },
    ],
    ref, generatedAt,
    verticalColor: '#a855f7',
  })
}

export default function DemoCampusPage() {
  const html = useMemo(() => buildCampusHtml(), [])
  return (
    <DemoReportShell
      html={html}
      reportName="Démo — Rapport Campus universitaire"
      verticalBadge="Campus"
      verticalDescription="Audit d'occupation des salles et de parcours étudiant pour une université. Lissage horaire, bibliothèque, PMR, flux piétons. Verticale : Éducation supérieure."
      verticalLinks={DEMO_LINKS.map(l => ({ ...l, active: l.path === '/demo/campus' }))}
      stats={[
        { k: '28 000', l: 'étudiants' },
        { k: '184', l: 'salles' },
        { k: '+3 400', l: 'étudiants /an' },
        { k: 'CAMES', l: 'accréditation' },
      ]}
    />
  )
}
