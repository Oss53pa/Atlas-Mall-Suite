// ═══ DEMO — Rapport Immeuble de bureaux · Atlas BIM ═══

import { useMemo } from 'react'
import { buildDemoHtml } from './demoReportTheme'
import { DemoReportShell, DEMO_LINKS } from './DemoReportShell'

function buildOfficeHtml(): string {
  const generatedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  const ref = 'AMS-OFF-CFAO-' + new Date().toISOString().slice(0, 10)

  return buildDemoHtml({
    productCrumb: 'Office Suite · Vol.1 Opérations & Vol.3 Expérience',
    title: 'Audit occupation & environnement — Tour CFAO',
    subtitle: 'Immeuble tertiaire 35 000 m² · 12 étages · 1 800 postes · Abidjan Plateau',
    destinataire: 'M. Laurent Dupas — Asset Manager Tour CFAO',
    perimetre: '35 000 m² SHOB · 1 800 postes · 18 locataires · 24 salles réunion',
    horizon: 'Fin d\'exercice 2026 · renouvellement baux 2027',
    chips: ['Proph3t v2.4', 'BOMA Office', 'BREEAM In-Use', 'LEED v4.1', 'ERP W', 'RE 2020'],
    kpis: [
      { label: 'Loyer €/m²/mois',    value: '13 200', unit: 'FCFA', tone: 'warn', delta: '−6 % vs 14k benchmark Plateau',  deltaBad: true },
      { label: 'Taux d\'occupation', value: '74',    unit: '%',    tone: 'warn', delta: '−16 pts vs 90 % cible',           deltaBad: true },
      { label: 'Présence quotidienne', value: '52', unit: '%',    tone: 'crit', delta: 'hybride vs 58 % benchmark',        deltaBad: true },
      { label: 'CO₂ moyen',          value: '820',   unit: 'ppm',  tone: 'crit', delta: 'seuil ASHRAE 800 dépassé',         deltaBad: true },
      { label: 'Résa salles',        value: '48',    unit: '%',    tone: 'warn', delta: 'benchmark 62 %',                    deltaBad: true },
      { label: 'Uplift NOI post-corrections', value: '+68', unit: 'MFCFA/an', tone: 'warn', delta: 'ROI 3,8× / 24 mois' },
    ],
    sections: [
      {
        num: '01',
        title: 'Cartographie de l\'occupation',
        meta: 'Capteurs IoT présence · 90 jours',
        body: `<div class="card card-pad prose">
          <p>Tour CFAO organisée en <strong>12 étages bureaux</strong> (R+1 à R+12) + RDC accueil/commerces + B1 parking. Surface moyenne plateau : 2 400 m². Occupation très hétérogène :</p>
          <ul>
            <li><strong>R+1 à R+4</strong> (bureaux partagés, flex) : occupation moyenne <em>82 %</em></li>
            <li><strong>R+5 à R+8</strong> (locataires entreprises 500-2000 m²) : occupation <em>71 %</em></li>
            <li><strong>R+9 à R+12</strong> (sièges individuels, 2 locataires × 4 étages) : occupation <em>48 %</em> — <span style="color:var(--danger)">sous-performant</span></li>
          </ul>
          <p>Les plateaux R+11 et R+12 (Groupe Holding ABC) présentent une présence physique de <strong>35 % seulement</strong> (modèle full-remote depuis 2024). Loyer facial 15 200 FCFA/m²/mois mais valeur perçue faible → <strong>risque non-renouvellement</strong> échéance mars 2027.</p>
        </div>`,
      },
      {
        num: '02',
        title: 'Synthèse exécutive',
        meta: 'Benchmark BOMA + JLL Tertiaire',
        body: `<div class="card card-pad prose">
          <p><strong>M. Dupas,</strong></p>
          <p>Proph3t a analysé 90 jours de données <em>capteurs IoT</em> (1 200 capteurs présence/CO₂/température) + système de <em>badges d'accès</em> + réservations <em>Outlook/Teams salles</em> de votre tour, croisés avec le <a href="#">benchmark BOMA International 2024</a> et <em>JLL Tertiaire Afrique</em>.</p>
          <p>Trois problématiques majeures se dégagent. <span class="hl">Occupation déséquilibrée :</span> R+9 à R+12 sous-exploités, pression maximale sur R+1 à R+4 (hot-desking débordé). <span class="hl">Qualité air intérieur :</span> 62 % du temps, le CO₂ dépasse le seuil ASHRAE de 800 ppm, atteignant 1 120 ppm sur les plateaux mal ventilés — impact documenté sur productivité (−15 % selon étude Harvard T.H. Chan). <span class="hl">Salles sous-utilisées :</span> 48 % d'occupation des salles réunion, mais 85 % sont réservées (ghost bookings) — besoin de no-show detection.</p>
          <p>Plan proposé : <span class="hl">18,4 MFCFA CAPEX</span> + 6,2 MFCFA/an OPEX pour récupérer <span class="hl">+68 MFCFA de NOI/an</span> (via re-leasing R+9 R+12 + économies énergétiques + fidélisation locataires). ROI 24 mois : <span class="hl">3,8×</span>.</p>
        </div>`,
      },
      {
        num: '03',
        title: 'Analyse environnementale — QAI & énergie',
        meta: 'Capteurs BREEAM In-Use · 90 jours',
        body: `<div class="dbl">
          <div class="card">
            <div style="padding:22px 28px 10px;"><div class="subtitle">Qualité de l'air intérieur par étage</div></div>
            <table class="dt">
              <thead><tr><th>Étage</th><th>CO₂ moyen</th><th>Pic jour</th><th>Conformité</th></tr></thead>
              <tbody>
                <tr><td>R+1</td><td class="num">620</td><td class="num">820</td><td class="pct pos">✓</td></tr>
                <tr><td>R+4</td><td class="num">880</td><td class="num">1 120</td><td class="pct neg">✗</td></tr>
                <tr><td>R+7</td><td class="num">950</td><td class="num">1 240</td><td class="pct neg">✗</td></tr>
                <tr><td>R+11 (vacant)</td><td class="num">420</td><td class="num">480</td><td class="pct pos">✓</td></tr>
              </tbody>
            </table>
          </div>
          <div class="card">
            <div style="padding:22px 28px 10px;"><div class="subtitle">Consommation énergétique (kWh/m²/an)</div></div>
            <table class="dt">
              <thead><tr><th>Poste</th><th>Tour CFAO</th><th>Benchmark</th><th>Écart</th></tr></thead>
              <tbody>
                <tr><td>Climatisation</td><td class="num">148</td><td class="num">120</td><td class="pct neg">+23 %</td></tr>
                <tr><td>Éclairage</td><td class="num">34</td><td class="num">28</td><td class="pct neg">+21 %</td></tr>
                <tr><td>Équipements bureau</td><td class="num">42</td><td class="num">45</td><td class="pct pos">−7 %</td></tr>
                <tr><td>Commun (ascenseurs, ventilation)</td><td class="num">28</td><td class="num">26</td><td class="pct neg">+8 %</td></tr>
                <tr><td><strong>TOTAL</strong></td><td class="num"><strong>252</strong></td><td class="num"><strong>219</strong></td><td class="pct neg"><strong>+15 %</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>`,
      },
      {
        num: '04',
        title: 'Salles de réunion — ghost bookings & utilisation',
        meta: 'Outlook/Teams croisé capteurs',
        body: `<div class="card card-pad prose">
          <p>Analyse croisée <em>réservations Outlook</em> vs <em>occupation réelle capteurs</em> sur 90 jours :</p>
          <ul>
            <li><strong>85 %</strong> des créneaux sont réservés, mais seulement <strong>48 %</strong> sont effectivement occupés → <span style="color:var(--danger)">37 points de ghost bookings</span></li>
            <li>Top 3 salles fantômes : Éole (R+6, 12 pers) 68 % ghost · Atlantique (R+8, 8 pers) 61 % · Médina (R+10, 16 pers) 58 %</li>
            <li>Salles sous-dimensionnées (demande &gt; capacité) : Sahel (R+3, 4 pers) — 94 % occupée, listes d'attente hebdo</li>
          </ul>
          <p>Recommandation : déployer <strong>auto-release après 10 min no-show</strong> via capteurs + optimiser mix tailles salles (diviser 2 grandes, créer 2 petites 4 pers).</p>
        </div>`,
      },
    ],
    recommendations: [
      { id: 'O01', action: 'Repositionner R+11-R+12 en flex haut-standing + co-working premium', capex: '4 800 000', delay: '60 j', impact: '+22 MFCFA loyer', priority: 'p0' },
      { id: 'O02', action: 'Rééquilibrer ventilation R+4 à R+8 (extensions + capteurs CO₂)', capex: '6 200 000', opex: '240 000', delay: '45 j', impact: '+15 % productivité', priority: 'p0' },
      { id: 'O03', action: 'Auto-release salles réunion après 10 min no-show', capex: '1 400 000', delay: '30 j', impact: '+30 pts util.', priority: 'p0' },
      { id: 'O04', action: 'LED + scheduling éclairage commun (−25 % conso)', capex: '3 600 000', opex: '−1 800 000 gain', delay: '45 j', impact: '−34 kWh/m²/an', priority: 'p1' },
      { id: 'O05', action: 'Remix salles : 2 grandes → 4 petites (R+3, R+6)', capex: '2 400 000', delay: '21 j', impact: 'Fin listes attente', priority: 'p1' },
      { id: 'O06', action: 'Certification BREEAM In-Use (valorisation patrimoniale)', opex: '2 800 000', delay: '90 j', impact: '+8 % valo immeuble', priority: 'p2' },
    ],
    totalCapex: '18 400 000',
    totalOpex: '6 200 000',
    totalImpact: '+68 MFCFA/an · ROI 3,8×',
    methodology: [
      { k: 'Capteurs IoT',    v: '1 200 capteurs présence, CO₂, température, lumens · agrégation 15 min · 90 jours' },
      { k: 'Badges d\'accès', v: 'Système HID propriétaire CFAO · 1 800 badges actifs · données 180 jours' },
      { k: 'Réservations',    v: 'Outlook/Teams API Graph · 24 salles · N=12 400 créneaux analysés' },
      { k: 'Benchmarks',      v: 'BOMA Office 2024 (INTL) · JLL Tertiaire Afrique Q4 2024 · Cushman & Wakefield Abidjan' },
      { k: 'Normes',          v: 'ERP W · BREEAM In-Use · LEED v4.1 O+M · RE 2020 · Code travail ergonomie' },
      { k: 'Limites',         v: 'Modèle ne capture pas les mouvements internes (desk-to-desk). T+90j recalibration.' },
    ],
    ref, generatedAt,
    verticalColor: '#6366f1',
  })
}

export default function DemoOfficePage() {
  const html = useMemo(() => buildOfficeHtml(), [])
  return (
    <DemoReportShell
      html={html}
      reportName="Démo — Rapport Bureaux"
      verticalBadge="Office"
      verticalDescription="Audit d'occupation et environnementale d'une tour de bureaux. Focus QAI, desk booking, salles réunion, énergie, certifications BREEAM/LEED. Verticale : Immeubles tertiaires."
      verticalLinks={DEMO_LINKS.map(l => ({ ...l, active: l.path === '/demo/office' }))}
      stats={[
        { k: '35 000', l: 'm² SHOB' },
        { k: '1 800', l: 'postes' },
        { k: '+68 M', l: 'FCFA NOI /an' },
        { k: '3,8×', l: 'ROI 24 mois' },
      ]}
    />
  )
}
