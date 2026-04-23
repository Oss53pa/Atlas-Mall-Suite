// ═══ DEMO — Rapport Hôtel · Atlas BIM ═══

import { useMemo } from 'react'
import { buildDemoHtml } from './demoReportTheme'
import { DemoReportShell, DEMO_LINKS } from './DemoReportShell'

function buildHotelHtml(): string {
  const generatedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  const ref = 'AMS-HOT-SOFITEL-' + new Date().toISOString().slice(0, 10)

  return buildDemoHtml({
    productCrumb: 'Hospitality Suite · Vol.1 Opérations & Vol.3 Expérience',
    title: 'Audit RevPAR & expérience client — Hôtel 5★ Sofitel-type',
    subtitle: 'Hôtel 180 chambres · 4 F&B · spa · centre affaires · Abidjan Plateau',
    destinataire: 'Mme Nathalie Touré — Directrice Générale',
    perimetre: '180 chambres · 4 restaurants · 12 salles séminaire · spa 600 m²',
    horizon: 'Saison haute Oct. 2026 — Mars 2027',
    chips: ['Proph3t v2.4', 'STR Global', 'ERP O', 'HACCP', 'ISO 22483', 'APSAD R82'],
    kpis: [
      { label: 'RevPAR actuel',    value: '42 800', unit: 'FCFA', tone: 'warn', delta: '−18 % vs STR benchmark 52k', deltaBad: true },
      { label: 'ADR',              value: '68 500', unit: 'FCFA', tone: 'warn', delta: '−12 % vs 78k benchmark', deltaBad: true },
      { label: 'Taux d\'occupation', value: '62',   unit: '%',    tone: 'warn', delta: '−6 pts vs 68 % cible',    deltaBad: true },
      { label: 'ALOS',             value: '2,1',   unit: 'nuits', tone: 'warn', delta: '−12 % vs benchmark 2,4',  deltaBad: true },
      { label: 'NPS clients',      value: '28',    unit: 'pts',   tone: 'crit', delta: 'objectif : 60 pts',       deltaBad: true },
      { label: 'Uplift post-corrections', value: '+94', unit: 'MFCFA/an', tone: 'warn', delta: 'ROI 5,2× / 24 mois' },
    ],
    sections: [
      {
        num: '01',
        title: 'Vue d\'ensemble — Distribution des chambres',
        meta: '4 niveaux · 180 clés',
        body: `<div class="card card-pad prose">
          <p>Hôtel 5★ configuré en <strong>tour verticale</strong> : RDC accueil + F&B + spa, R+1 à R+6 chambres (30 clés/étage), R+7 rooftop + sky bar + salles séminaire VIP.
          Le linéaire de couloir par étage fait <em>92 m</em>, ce qui place la chambre la plus éloignée à <em>46 m de l'ascenseur</em> — limite haute du benchmark Accor (40 m recommandé).</p>
          <p>Mix des chambres : <strong>110 Superior</strong> (22 m²), <strong>50 Deluxe</strong> (32 m²), <strong>15 Junior Suites</strong> (52 m²), <strong>5 Presidential Suites</strong> (120 m²).
          Le ratio 61/28/8/3 % correspond à un positionnement <strong>business</strong> mais la grille tarifaire actuelle ne valorise pas assez les suites (écart ADR Superior/Suite = 2,1× vs 2,8× recommandé STR MENA).</p>
        </div>`,
      },
      {
        num: '02',
        title: 'Synthèse RevPAR & occupation',
        meta: 'Benchmark STR Global · panel N=42',
        body: `<div class="card card-pad prose">
          <p><strong>Mme la Directrice Générale,</strong></p>
          <p>Proph3t a analysé 18 mois de données <em>Opera PMS</em> croisées avec le <a href="#">benchmark STR Afrique 2024</a> (N=42 hôtels comparables) et les tendances <em>Booking/Expedia</em> sur Abidjan.</p>
          <p><span class="hl">Premier constat :</span> le RevPAR ressort à 42 800 FCFA, soit <strong>−18 % sous le benchmark</strong> segment 5★ (52 000 FCFA). L'écart vient pour 60 % du taux d'occupation (−6 pts) et 40 % de l'ADR (−12 %).</p>
          <p><span class="hl">Deuxième constat :</span> le NPS à 28 est critique. Les verbatims négatifs se concentrent sur 3 axes : <em>lenteur check-in</em> (34 %), <em>ménage insuffisant</em> (28 %), <em>F&B petit-déjeuner</em> (22 %).</p>
          <p><span class="hl">Troisième constat :</span> la politique tarifaire ne répond pas à la demande événementielle. 8 weekends majeurs (CAN 2027 test, conférences UEMOA…) partent à ADR standard alors que le benchmark événementiel permet +28 %.</p>
          <p>Les corrections proposées représentent <span class="hl">12,6 MFCFA</span> de CAPEX + 3,4 MFCFA/an d'OPEX, pour un uplift RevPAR de <strong>+18 %</strong> (soit <span class="hl">+94 MFCFA de CA/an</span>). ROI 24 mois : <span class="hl">5,2×</span>.</p>
        </div>`,
      },
      {
        num: '03',
        title: 'Analyse flux clients — parcours hôtelier type',
        meta: 'ABM Helbing · 340 agents/jour',
        body: `<div class="dbl">
          <div class="card">
            <div style="padding:22px 28px 10px;"><div class="subtitle">Temps de check-in observé vs cible</div></div>
            <table class="dt">
              <thead><tr><th>Moment</th><th>Observé</th><th>Cible Accor</th><th>Écart</th></tr></thead>
              <tbody>
                <tr><td>Jour de semaine</td><td class="num">8 min 40</td><td class="num">5 min</td><td class="pct neg">+73 %</td></tr>
                <tr><td>Weekend</td><td class="num">14 min 20</td><td class="num">7 min</td><td class="pct neg">+105 %</td></tr>
                <tr><td>Arrivée groupe (&gt; 20 pax)</td><td class="num">38 min</td><td class="num">15 min</td><td class="pct neg">+153 %</td></tr>
                <tr><td>Check-out express</td><td class="num">3 min</td><td class="num">3 min</td><td class="pct pos">OK</td></tr>
              </tbody>
            </table>
          </div>
          <div class="card">
            <div style="padding:22px 28px 10px;"><div class="subtitle">F&B — Ratios activité</div></div>
            <table class="dt">
              <thead><tr><th>Point F&B</th><th>Capacité</th><th>Taux remplissage</th><th>Ticket</th></tr></thead>
              <tbody>
                <tr><td>Petit-déjeuner</td><td class="num">120 couv.</td><td class="num pct neg">48 %</td><td class="num">15 200</td></tr>
                <tr><td>Restaurant gastro</td><td class="num">80 couv.</td><td class="num pct neg">32 %</td><td class="num">45 000</td></tr>
                <tr><td>Rooftop bar</td><td class="num">60 couv.</td><td class="num pct pos">78 %</td><td class="num">18 500</td></tr>
                <tr><td>Pool bar</td><td class="num">40 couv.</td><td class="num pct pos">62 %</td><td class="num">8 200</td></tr>
              </tbody>
            </table>
          </div>
        </div>`,
      },
      {
        num: '04',
        title: 'Housekeeping & maintenance prédictive',
        meta: 'Proph3t L-02 Weibull MTBF',
        body: `<div class="card card-pad prose">
          <p>La rotation housekeeping actuelle est de <strong>3,2 chambres/heure/agent</strong> — en-dessous du benchmark Accor (4,0/h). Proph3t identifie 3 leviers :</p>
          <ul>
            <li><strong>Re-séquençage rationnel</strong> — passage par étage complet avant changement (vs aléatoire actuel) → +0,4 chambre/h</li>
            <li><strong>Chariots optimisés</strong> — pré-chargement par étage selon besoins réels (fréquence vacance vs re-stay) → +0,3 chambre/h</li>
            <li><strong>Maintenance prédictive Weibull</strong> — 12 équipements (climatiseurs, minibars, chauffe-eau) à remplacer sous 90j selon modèle → évite 18 interventions curatives × 3h immobilisation</li>
          </ul>
          <p>ROI global housekeeping : <span class="hl">−22 % coût/chambre/jour</span> soit 4,2 MFCFA économisés sur 24 mois.</p>
        </div>`,
      },
    ],
    recommendations: [
      { id: 'H01', action: 'Déployer pré-check-in digital (app mobile + QR)', capex: '2 800 000', delay: '45 j', impact: '−50 % temps check-in', priority: 'p0' },
      { id: 'H02', action: 'Ouvrir 2 comptoirs express weekend + groupe', reference: 'accueil RDC', opex: '1 200 000', delay: '14 j', impact: '−40 % attente groupe', priority: 'p0' },
      { id: 'H03', action: 'Revoir grille tarifaire suites (+18 % suite / Superior)', capex: '—', delay: '30 j', impact: '+RevPAR 8 %', priority: 'p0' },
      { id: 'H04', action: 'Relancer offre petit-déjeuner (pain frais, 3 stations)', capex: '1 400 000', opex: '800 000', delay: '60 j', impact: '+30 % remplissage', priority: 'p1' },
      { id: 'H05', action: 'Formation housekeeping rationnel + chariots optim.', capex: '600 000', delay: '21 j', impact: '+22 % productivité', priority: 'p1' },
      { id: 'H06', action: 'Maintenance préventive 12 équipements critiques (Proph3t)', capex: '7 800 000', opex: '1 400 000', delay: '90 j', impact: '−18 pannes/an', priority: 'p1' },
      { id: 'H07', action: 'Campagne NPS ciblée + automation satisfaction J+1', opex: '—', delay: 'immédiat', impact: '+NPS 30 pts', priority: 'p2' },
    ],
    totalCapex: '12 600 000',
    totalOpex: '3 400 000',
    totalImpact: '+94 MFCFA/an · ROI 5,2×',
    methodology: [
      { k: 'Modèle revenus', v: 'STR Global RevPAR 2024 (N=42 hôtels 5★ MENA/Afrique) · élasticité ADR 0,72 · saisonnalité captée' },
      { k: 'ABM housekeeping', v: 'Helbing Social Force adapté intérieur hôtel · 340 agents simulés (clients + staff) · 3 scénarios' },
      { k: 'Weibull équipements', v: 'MTBF benchmark industrie hôtelière · η et β par type (climatiseur, minibar, chauffe-eau…)' },
      { k: 'Normes', v: 'ERP O · ISO 22483 hospitality · HACCP F&B · PMR · APSAD R82 vidéosurveillance' },
      { k: 'Sources', v: 'Opera PMS (18 mois) · Booking/Expedia trends · verbatims Tripadvisor N=2 180' },
      { k: 'Limites', v: 'Ne prend pas en compte événements macro (Coupe d\'Afrique, hauts dignitaires). Recalibration T+90j.' },
    ],
    ref, generatedAt,
    verticalColor: '#ec4899',
  })
}

export default function DemoHotelPage() {
  const html = useMemo(() => buildHotelHtml(), [])
  return (
    <DemoReportShell
      html={html}
      reportName="Démo — Rapport Hôtel"
      verticalBadge="Hotel"
      verticalDescription="Modèle réel d'audit hôtelier 5★ produit par Proph3t. RevPAR, ADR, occupation, housekeeping, F&B, maintenance prédictive — adapté à la verticale Hospitality."
      verticalLinks={DEMO_LINKS.map(l => ({ ...l, active: l.path === '/demo/hotel' }))}
      stats={[
        { k: '180', l: 'chambres simulées' },
        { k: '5★', l: 'positionnement' },
        { k: '+94 M', l: 'FCFA uplift /an' },
        { k: '5,2×', l: 'ROI 24 mois' },
      ]}
    />
  )
}
