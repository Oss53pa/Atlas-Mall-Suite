// ═══ DEMO — Rapport Hôpital · Atlas BIM ═══

import { useMemo } from 'react'
import { buildDemoHtml } from './demoReportTheme'
import { DemoReportShell, DEMO_LINKS } from './DemoReportShell'

function buildHospitalHtml(): string {
  const generatedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  const ref = 'AMS-HOS-CHU-' + new Date().toISOString().slice(0, 10)

  return buildDemoHtml({
    productCrumb: 'Health Suite · Vol.2 Sécurité & Vol.3 Parcours patient',
    title: 'Audit parcours patient & compliance — CHU type',
    subtitle: 'Hôpital universitaire 65 000 m² · 480 lits · 8 blocs op. · Abidjan',
    destinataire: 'Pr. Koffi Aka — Directeur Général CHU',
    perimetre: '480 lits · 8 blocs opératoires · 42 consultations/j · 120 urgences/j',
    horizon: 'Certification HAS V2020 · échéance Q1 2027',
    chips: ['Proph3t v2.4', 'HAS V2020', 'ERP U', 'ISO 14971', 'NF S 90-351', 'RGPD santé'],
    kpis: [
      { label: 'Occupation lits',     value: '87', unit: '%',   tone: 'warn', delta: '+2 pts vs 85 % cible',      deltaBad: false },
      { label: 'DMS (durée séjour)',  value: '5,6', unit: 'j',   tone: 'warn', delta: '+17 % vs benchmark 4,8',   deltaBad: true },
      { label: 'Attente urgences',    value: '68', unit: 'min', tone: 'crit', delta: 'objectif HAS : 30 min',    deltaBad: true },
      { label: 'Utilisation bloc',    value: '58', unit: '%',   tone: 'warn', delta: '−10 pts vs 68 % benchmark', deltaBad: true },
      { label: 'Infections nosocomiales', value: '7,2', unit: '‰', tone: 'crit', delta: 'objectif HAS : 3 ‰',   deltaBad: true },
      { label: 'Uplift activité post-corrections', value: '+1 240', unit: 'actes/an', tone: 'warn', delta: 'certification HAS atteinte' },
    ],
    sections: [
      {
        num: '01',
        title: 'Cartographie des flux patients',
        meta: 'ABM Helbing adapté santé · 2 100 patients/jour',
        body: `<div class="card card-pad prose">
          <p>Le CHU est organisé en <strong>6 pôles fonctionnels</strong> sur 4 bâtiments connectés :
          Urgences (RDC bâtiment A), Ambulatoire (R+1 bâtiment A), Hospitalisation (bâtiments B et C, R+1 à R+6), Blocs opératoires (R+2 bâtiment D), Imagerie (RDC bâtiment D), Consultations externes (RDC bâtiment C).</p>
          <p>Les flux patients observés révèlent <strong>3 parcours cibles</strong> : (1) <em>Urgences → Imagerie → Hospitalisation</em> 42 % des cas, (2) <em>Consultation → Imagerie → Retour</em> 36 %, (3) <em>Admission programmée → Bloc → Post-op</em> 22 %.</p>
          <p>Point critique : le trajet <strong>Urgences → Imagerie</strong> fait <span style="color:var(--danger)">180 m de couloirs</span> avec 2 changements de bâtiment et 1 ascenseur partagé avec la logistique. Temps moyen observé : <em>8 min 30</em> (benchmark : 3 min 30 après restructuration).</p>
        </div>`,
      },
      {
        num: '02',
        title: 'Synthèse exécutive',
        meta: 'Benchmark HAS + OMS Afrique',
        body: `<div class="card card-pad prose">
          <p><strong>Professeur,</strong></p>
          <p>Proph3t a analysé les flux hospitaliers du CHU en croisant 6 mois de données <em>DPI (dossier patient informatisé)</em> avec le benchmark <a href="#">HAS V2020</a> et les référentiels OMS Afrique 2024. Le parcours patient a été modélisé avec <em>ABM Helbing adapté santé</em> (2 100 patients simulés/jour, 5 catégories de mobilité).</p>
          <p><span class="hl">Constat urgences :</span> l'attente moyenne ressort à 68 min, soit <strong>+127 % au-dessus du seuil HAS (30 min)</strong>. 42 % des patients attendent plus de 90 min. Cause principale : triage non-optimisé + sous-effectif infirmier pic 18h-22h.</p>
          <p><span class="hl">Constat bloc opératoire :</span> utilisation 58 % vs benchmark 68 % (−10 pts). Cause : délais chambres post-op (recovery) + nettoyage salle 45 min vs 30 min cible. Capacité théorique : <strong>+14 interventions programmées/semaine</strong>.</p>
          <p><span class="hl">Constat infections :</span> taux 7,2 ‰ vs cible HAS 3 ‰ — <span style="color:var(--danger)">non-conformité majeure</span>. Audit NF S 90-351 sur blocs : filtration HEPA conforme, mais ventilation 4 salles insuffisante. Traçabilité hygiène mains à 62 % seulement.</p>
          <p>Plan proposé : <span class="hl">84 MFCFA CAPEX</span> + 32 MFCFA/an OPEX pour gagner <strong>+1 240 actes/an</strong> (activité) et atteindre la <strong>certification HAS V2020</strong> (condition accréditation 2027).</p>
        </div>`,
      },
      {
        num: '03',
        title: 'Flux urgences & bloc opératoire',
        meta: 'Analyse 6 mois DPI',
        body: `<div class="dbl">
          <div class="card">
            <div style="padding:22px 28px 10px;"><div class="subtitle">Attente urgences par tranche horaire</div></div>
            <table class="dt">
              <thead><tr><th>Tranche</th><th>Arrivées</th><th>Attente moy.</th><th>P90</th></tr></thead>
              <tbody>
                <tr><td>8h-12h</td><td class="num">28</td><td class="num pct neg">54 min</td><td class="num">98 min</td></tr>
                <tr><td>12h-18h</td><td class="num">34</td><td class="num pct neg">62 min</td><td class="num">112 min</td></tr>
                <tr><td>18h-22h</td><td class="num">42</td><td class="num pct neg">92 min</td><td class="num">180 min</td></tr>
                <tr><td>22h-8h</td><td class="num">16</td><td class="num pct pos">38 min</td><td class="num">65 min</td></tr>
              </tbody>
            </table>
          </div>
          <div class="card">
            <div style="padding:22px 28px 10px;"><div class="subtitle">Utilisation 8 blocs opératoires (lundi-vendredi)</div></div>
            <table class="dt">
              <thead><tr><th>Bloc</th><th>Taux util.</th><th>Turnover</th><th>Statut</th></tr></thead>
              <tbody>
                <tr><td>Bloc 1 (polyv.)</td><td class="num pct pos">72 %</td><td class="num">38 min</td><td class="pct pos">OK</td></tr>
                <tr><td>Bloc 2 (urgence)</td><td class="num pct pos">68 %</td><td class="num">32 min</td><td class="pct pos">OK</td></tr>
                <tr><td>Bloc 3 (ortho)</td><td class="num pct neg">48 %</td><td class="num">52 min</td><td class="pct neg">&lt; cible</td></tr>
                <tr><td>Bloc 4 (cardio)</td><td class="num pct neg">42 %</td><td class="num">58 min</td><td class="pct neg">&lt; cible</td></tr>
                <tr><td>Blocs 5-8</td><td class="num pct neg">56 %</td><td class="num">48 min</td><td class="pct neg">Recovery lent</td></tr>
              </tbody>
            </table>
          </div>
        </div>`,
      },
      {
        num: '04',
        title: 'Compliance HAS V2020 — non-conformités identifiées',
        meta: 'Audit 14 critères majeurs',
        body: `<div class="card card-pad prose">
          <p>Proph3t a croisé les <strong>14 critères majeurs HAS V2020</strong> avec les observations terrain et les procédures documentées :</p>
          <ul>
            <li><span style="color:var(--danger)">NC1 — Ventilation blocs 3, 4, 6, 8</span> : NF S 90-351 non respectée (pression différentielle insuffisante)</li>
            <li><span style="color:var(--danger)">NC2 — Traçabilité hygiène mains</span> : 62 % (cible HAS : ≥ 95 %)</li>
            <li><span style="color:var(--warn)">NC3 — Signalétique wayfinding</span> : 14 panneaux manquants ou contradictoires</li>
            <li><span style="color:var(--warn)">NC4 — Confidentialité conversations accueil</span> : accueil urgences trop exposé</li>
            <li><span style="color:var(--warn)">NC5 — Sécurisation dossiers RGPD santé</span> : 3 postes sans verrouillage auto</li>
            <li><span style="color:var(--info)">11 autres critères conformes</span> : accessibilité PMR, gestion médicaments, bio-nettoyage, pharmacie, RH…</li>
          </ul>
          <p>Les 5 non-conformités sont toutes <strong>corrigeables en moins de 6 mois</strong> pour le plan proposé.</p>
        </div>`,
      },
    ],
    recommendations: [
      { id: 'S01', action: 'Reconfigurer triage urgences (5 niveaux) + IPA 18h-22h', capex: '3 200 000', opex: '14 400 000', delay: '60 j', impact: '−55 % attente', priority: 'p0' },
      { id: 'S02', action: 'Rénovation ventilation blocs 3,4,6,8 (NF S 90-351)', capex: '32 000 000', delay: '90 j', impact: 'Conformité HAS', priority: 'p0' },
      { id: 'S03', action: 'Hygiène mains : capteurs SANIfluid + KPI temps réel', capex: '8 400 000', opex: '1 200 000', delay: '45 j', impact: '+33 pts traçabilité', priority: 'p0' },
      { id: 'S04', action: 'Équipe recovery dédiée post-op (3 IDE rotation)', opex: '18 000 000', delay: 'immédiat', impact: '+14 intervent/sem', priority: 'p0' },
      { id: 'S05', action: 'Wayfinder patient/famille (app + bornes) — 14 panneaux', capex: '24 000 000', delay: '90 j', impact: '−38 % patients perdus', priority: 'p1' },
      { id: 'S06', action: 'Ascenseur dédié logistique (sépare flux patients)', capex: '15 000 000', delay: '120 j', impact: '−40 % temps transit', priority: 'p1' },
      { id: 'S07', action: 'Durcissement confidentialité accueil + postes RGPD', capex: '1 800 000', delay: '30 j', impact: 'Conformité RGPD', priority: 'p1' },
    ],
    totalCapex: '84 400 000',
    totalOpex: '33 600 000',
    totalImpact: '+1 240 actes/an · HAS V2020',
    methodology: [
      { k: 'Source DPI',      v: 'Dossier patient informatisé · 6 mois · 12 400 séjours analysés · 8 500 passages urgences' },
      { k: 'ABM santé',       v: 'Helbing Social Force adapté mobilité patients (fauteuil, brancard, valide, pédiatrique)' },
      { k: 'Audit bloc',      v: 'NF S 90-351 salles propres · pression différentielle mesurée · 45 prélèvements microbio' },
      { k: 'Benchmarks',      v: 'HAS V2020 (14 critères) · OMS Afrique 2024 · Health FM Benchmark INTL' },
      { k: 'Normes',          v: 'ERP U · HAS V2020 · ISO 14971 · NF S 90-351 · RGPD + HDS · PMR renforcée' },
      { k: 'Limites',         v: 'Épidémies saisonnières exclues. Calibration trimestrielle recommandée.' },
    ],
    ref, generatedAt,
    verticalColor: '#ef4444',
  })
}

export default function DemoHospitalPage() {
  const html = useMemo(() => buildHospitalHtml(), [])
  return (
    <DemoReportShell
      html={html}
      reportName="Démo — Rapport Hôpital"
      verticalBadge="Hospital"
      verticalDescription="Audit de flux patient et de compliance HAS V2020 pour CHU 480 lits. Parcours urgences, utilisation bloc, infections nosocomiales, certification qualité. Verticale : Santé."
      verticalLinks={DEMO_LINKS.map(l => ({ ...l, active: l.path === '/demo/hospital' }))}
      stats={[
        { k: '480', l: 'lits' },
        { k: '8', l: 'blocs opératoires' },
        { k: '+1 240', l: 'actes /an' },
        { k: 'HAS', l: 'certification atteinte' },
      ]}
    />
  )
}
