// ═══ REPORT COMMENTARY ENGINE — Compte-rendu & commentaire IA Proph3t ═══
//
// Prend en entrée les données d'un volume + un profil de destinataire, produit :
//   1. Un compte-rendu structuré (synthèse, modifications, points notables, benchmark)
//   2. Un commentaire contextuel rédigé dans le ton adapté au destinataire
//
// Dépend de narrativeEnricher (Ollama / LLM fallback) pour la rédaction, mais
// possède une branche "algorithmique pure" qui génère un texte satisfaisant
// même sans LLM, à partir des données du volume.
//
// Paramétrable avant envoi :
//   • audience : ton + vocabulaire
//   • tone : neutre / formel / conversationnel / enthousiaste
//   • lang : fr / en / dioula
//   • length : concis / standard / détaillé
//
// Révision : le résultat est éditable — l'utilisateur peut modifier chaque
// section avant l'envoi final (via AIReportEditor.tsx).

import { callStructured, isObject } from '../proph3t/llm/structuredLlm'
import type { ParsedPlan } from '../planReader/planEngineTypes'
import type { PlanVersion } from './planVersioningEngine'

// ─── Types ────────────────────────────────────────────────

export type ReportAudience =
  | 'director'       // DG / PDG → décisions stratégiques, ROI
  | 'investor'       // investisseurs → rentabilité, différenciation
  | 'operator'       // exploitant / directeur de site → opérationnel
  | 'architect'      // architecte → technique, normes
  | 'tenant'         // preneur → expérience client, visibilité
  | 'authority'      // autorité / administration → conformité

export type ReportTone = 'neutral' | 'formal' | 'conversational' | 'enthusiastic'
export type ReportLength = 'concise' | 'standard' | 'detailed'
export type ReportLang = 'fr' | 'en' | 'dioula'

export interface ReportCommentaryInput {
  /** Nom du volume (ex: "Vol.1 Plan Commercial"). */
  volumeName: string
  /** ID du volume (vol1/vol2/vol3/vol4). */
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  /** Nom du projet. */
  projectName: string
  /** Plan courant. */
  currentPlan: ParsedPlan | null
  /** Version précédente (pour diff) — optionnelle. */
  previousVersion?: PlanVersion | null
  /** Chiffres clés spécifiques au volume (pour benchmark et stats). */
  keyFigures?: Record<string, number | string>
  /** Points notables déjà détectés (anomalies, alertes). */
  knownFindings?: Array<{ severity: 'info' | 'warning' | 'critical'; message: string }>
  /** Benchmarks sectoriels (optionnels) à citer. */
  sectorBenchmarks?: Record<string, number | string>
}

export interface ReportCommentaryOptions {
  audience: ReportAudience
  tone: ReportTone
  length: ReportLength
  lang: ReportLang
  /** Nom du destinataire (personnalisation). */
  recipientName?: string
  /** Skip LLM et utiliser uniquement la branche algorithmique. */
  skipLlm?: boolean
}

export interface ReportSection {
  id: string
  heading: string
  body: string
  /** Si true, la section a été générée par le LLM (vs algorithme pur). */
  aiGenerated: boolean
  /** True si l'utilisateur a édité cette section après génération. */
  userEdited?: boolean
}

export interface ReportCommentary {
  /** Titre du compte-rendu. */
  title: string
  /** Salutation personnalisée (ex: "Bonjour Monsieur le Directeur,"). */
  greeting: string
  /** Corps du commentaire (court paragraphe intro). */
  introduction: string
  /** Sections structurées du compte-rendu. */
  sections: ReportSection[]
  /** Recommandations finales (bullet list). */
  recommendations: string[]
  /** Conclusion + call-to-action (Valider / Demander corrections). */
  closing: string
  /** Signature. */
  signature: string
  /** Métadonnées de génération. */
  meta: {
    generatedAt: string
    audience: ReportAudience
    tone: ReportTone
    length: ReportLength
    lang: ReportLang
    llmUsed: boolean
  }
}

// ─── Libellés localisés ───────────────────────────────────

const L = {
  fr: {
    greeting: {
      director:       'Monsieur le Directeur Général',
      investor:       'Chers investisseurs',
      operator:       'Monsieur le Directeur de site',
      architect:      'Cher confrère architecte',
      tenant:         'Cher partenaire preneur',
      authority:      'Madame, Monsieur',
    },
    closing: {
      neutral:       "Nous restons à votre disposition pour toute précision.",
      formal:        "Dans l'attente de votre retour, nous vous prions d'agréer l'expression de notre haute considération.",
      conversational:"N'hésitez pas à revenir vers nous pour toute question.",
      enthusiastic:  "Nous avons hâte de voir ce plan se concrétiser — merci pour votre confiance !",
    },
    title: 'Compte-rendu du plan',
    introduction: 'Veuillez trouver ci-dessous la synthèse du volume analysé ainsi que les commentaires PROPH3T associés.',
    sectionHeadings: {
      synthesis:     "Synthèse du volume",
      modifications: 'Modifications depuis la dernière version',
      findings:      'Points notables',
      benchmark:     'Comparaison sectorielle',
      recommendations: "Recommandations PROPH3T",
    },
    recommendationsHeader: 'Recommandations',
    signature: 'L\'équipe PROPH3T · Atlas BIM',
  },
  en: {
    greeting: {
      director:       'Dear Chief Executive',
      investor:       'Dear Investors',
      operator:       'Dear Site Director',
      architect:      'Dear Colleague',
      tenant:         'Dear Tenant Partner',
      authority:      'Dear Madam/Sir',
    },
    closing: {
      neutral:       'We remain at your disposal should you need further information.',
      formal:        'Awaiting your feedback, we remain yours faithfully.',
      conversational:'Feel free to get back to us with any questions.',
      enthusiastic:  "We're excited to see this plan come to life — thank you for your trust!",
    },
    title: 'Plan report',
    introduction: 'Please find below the synthesis of the analysed volume along with PROPH3T insights.',
    sectionHeadings: {
      synthesis:     'Volume synthesis',
      modifications: 'Changes since last version',
      findings:      'Key findings',
      benchmark:     'Sector benchmark',
      recommendations: 'PROPH3T recommendations',
    },
    recommendationsHeader: 'Recommendations',
    signature: 'The PROPH3T team · Atlas BIM',
  },
  dioula: {
    // Traduction simplifiée — reste principalement FR pour compatibilité
    greeting: {
      director:       'Patron ɲɔgɔn',
      investor:       'Wari donyɔrɔla kɛlɛbolo',
      operator:       'Yɔrɔ ɲɛmɔgɔ',
      architect:      'Arshitekti nin',
      tenant:         'Boutique tigi',
      authority:      'Minisiri',
    },
    closing: {
      neutral:       'An bɛ sɛbɛn makɔnɔ.',
      formal:        'Aw ka dɛmɛ, an bɛ aw kunnafoniw makɔnɔ.',
      conversational:'Ni hakili bɛ aw la, aw ka dɔn an ye.',
      enthusiastic:  'An sɛwara i ka baara la — i ni ce !',
    },
    title: 'Plan ka sɛbɛn',
    introduction: 'Aw bɛ se ka sɛbɛn in kalan ka PROPH3T ka hakili sɔrɔ a kɔrɔ.',
    sectionHeadings: {
      synthesis:     'Volume kunafoniw',
      modifications: 'Yɛlɛma minnu kɛra',
      findings:      'Kunafoni baw',
      benchmark:     'Suku kɔnɔna ɲɔgɔndan',
      recommendations: 'PROPH3T ka ladilikanw',
    },
    recommendationsHeader: 'Ladilikanw',
    signature: 'PROPH3T jama · Atlas BIM',
  },
} as const

// ─── Génération algorithmique (pas de LLM) ────────────────

function generateSynthesisAlgorithmic(
  input: ReportCommentaryInput,
  lang: ReportLang,
): string {
  const p = input.currentPlan
  if (!p) {
    return lang === 'en'
      ? 'No plan is currently loaded.'
      : lang === 'dioula'
      ? 'Plan si ma ye.'
      : 'Aucun plan n\'est actuellement chargé.'
  }
  const n = p.spaces.length
  const totalArea = p.spaces.reduce((s, sp) => s + sp.areaSqm, 0)
  const floors = p.detectedFloors?.length ?? 1

  const parts: string[] = []
  if (lang === 'en') {
    parts.push(`Volume ${input.volumeName} covers ${totalArea.toFixed(0)} m² across ${floors} floor${floors > 1 ? 's' : ''}, organised into ${n} spaces.`)
    parts.push(`The plan bounds are ${p.bounds.width.toFixed(1)} × ${p.bounds.height.toFixed(1)} metres.`)
  } else if (lang === 'dioula') {
    parts.push(`${input.volumeName} ye ${totalArea.toFixed(0)} m² ye, ${floors} etaje la, ${n} yɔrɔ la.`)
  } else {
    parts.push(`Le volume ${input.volumeName} couvre ${totalArea.toFixed(0)} m² répartis sur ${floors} étage${floors > 1 ? 's' : ''}, organisés en ${n} espaces identifiés.`)
    parts.push(`Les bounds du plan sont de ${p.bounds.width.toFixed(1)} × ${p.bounds.height.toFixed(1)} mètres.`)
  }
  if (input.keyFigures) {
    const keys = Object.entries(input.keyFigures).slice(0, 4)
    if (keys.length > 0) {
      parts.push(keys.map(([k, v]) => `${k} : ${v}`).join(' · '))
    }
  }
  return parts.join(' ')
}

function generateModificationsSection(
  input: ReportCommentaryInput,
  lang: ReportLang,
): string {
  if (!input.previousVersion || !input.currentPlan) {
    return lang === 'en'
      ? 'No previous version available for comparison.'
      : lang === 'dioula'
      ? 'Kalan kɔrɔlen tɛ yen ka kɛ ɲɔgɔndan ye.'
      : 'Aucune version précédente disponible pour comparaison.'
  }
  const prev = input.previousVersion.snapshot
  const cur = input.currentPlan
  const added = cur.spaces.length - prev.spaces.length
  const areaDelta = cur.spaces.reduce((s, sp) => s + sp.areaSqm, 0) - prev.spaces.reduce((s, sp) => s + sp.areaSqm, 0)

  if (lang === 'en') {
    return `Since version ${input.previousVersion.versionNumber} (${new Date(input.previousVersion.createdAt).toLocaleDateString()}), ${added >= 0 ? '+' : ''}${added} spaces have been recorded, with a net area variation of ${areaDelta >= 0 ? '+' : ''}${areaDelta.toFixed(1)} m².`
  }
  if (lang === 'dioula') {
    return `Kalan ${input.previousVersion.versionNumber} kɔfɛ, yɔrɔ ${added} fara walima bɔ ka ɲɔgɔndan ta, ${areaDelta.toFixed(1)} m².`
  }
  return `Depuis la version ${input.previousVersion.versionNumber} du ${new Date(input.previousVersion.createdAt).toLocaleDateString('fr-FR')}, ${added >= 0 ? '+' : ''}${added} espace${Math.abs(added) > 1 ? 's' : ''} ${added >= 0 ? 'ajouté' : 'retiré'}${Math.abs(added) > 1 ? 's' : ''}, avec une variation nette de surface de ${areaDelta >= 0 ? '+' : ''}${areaDelta.toFixed(1)} m².`
}

function generateFindingsSection(
  input: ReportCommentaryInput,
  lang: ReportLang,
): string {
  const findings = input.knownFindings ?? []
  if (findings.length === 0) {
    return lang === 'en'
      ? 'No significant issues detected by the automated audit.'
      : lang === 'dioula'
      ? 'Sɛgɛsɛgɛli ma kunafoni baw sɔrɔ.'
      : 'Aucun point bloquant détecté par l\'audit automatisé.'
  }
  const critical = findings.filter(f => f.severity === 'critical')
  const warning = findings.filter(f => f.severity === 'warning')
  const lines: string[] = []
  if (lang === 'en') {
    if (critical.length) lines.push(`${critical.length} critical finding${critical.length > 1 ? 's' : ''} requiring immediate attention.`)
    if (warning.length) lines.push(`${warning.length} warning${warning.length > 1 ? 's' : ''} recommended for review.`)
    lines.push(...findings.slice(0, 5).map(f => `• ${f.message}`))
  } else if (lang === 'dioula') {
    if (critical.length) lines.push(`${critical.length} kuma gɛlɛn minnu ka kan ka ɲini joona.`)
    if (warning.length) lines.push(`${warning.length} kuma siran sibonyalen.`)
    lines.push(...findings.slice(0, 5).map(f => `• ${f.message}`))
  } else {
    if (critical.length) lines.push(`${critical.length} point${critical.length > 1 ? 's' : ''} critique${critical.length > 1 ? 's' : ''} nécessitant une attention immédiate.`)
    if (warning.length) lines.push(`${warning.length} alerte${warning.length > 1 ? 's' : ''} à examiner.`)
    lines.push(...findings.slice(0, 5).map(f => `• ${f.message}`))
  }
  return lines.join('\n')
}

function generateBenchmarkSection(
  input: ReportCommentaryInput,
  lang: ReportLang,
): string {
  const bm = input.sectorBenchmarks
  if (!bm || Object.keys(bm).length === 0) {
    return lang === 'en'
      ? 'No sector benchmark provided.'
      : lang === 'dioula'
      ? 'Ɲɔgɔndan si tɛ yen.'
      : 'Aucun benchmark sectoriel fourni.'
  }
  const lines = Object.entries(bm).map(([k, v]) => `• ${k} : ${v}`)
  return lines.join('\n')
}

// ─── Génération complète (algo + LLM optionnel) ───────────

export async function generateReportCommentary(
  input: ReportCommentaryInput,
  options: ReportCommentaryOptions,
): Promise<ReportCommentary> {
  const { audience, tone, length, lang, recipientName, skipLlm } = options
  const dict = L[lang]

  // ─── Introduction et salutation ───
  const greetingBase = dict.greeting[audience]
  const greeting = recipientName ? `${greetingBase} ${recipientName},` : `${greetingBase},`
  const introduction = dict.introduction

  // ─── Sections structurées ───
  const rawSections: ReportSection[] = [
    {
      id: 'synthesis',
      heading: dict.sectionHeadings.synthesis,
      body: generateSynthesisAlgorithmic(input, lang),
      aiGenerated: false,
    },
    {
      id: 'modifications',
      heading: dict.sectionHeadings.modifications,
      body: generateModificationsSection(input, lang),
      aiGenerated: false,
    },
    {
      id: 'findings',
      heading: dict.sectionHeadings.findings,
      body: generateFindingsSection(input, lang),
      aiGenerated: false,
    },
  ]

  // Section benchmark uniquement si données fournies
  if (input.sectorBenchmarks && Object.keys(input.sectorBenchmarks).length > 0) {
    rawSections.push({
      id: 'benchmark',
      heading: dict.sectionHeadings.benchmark,
      body: generateBenchmarkSection(input, lang),
      aiGenerated: false,
    })
  }

  // ─── Recommandations (algorithmique par défaut) ───
  let recommendations = generateAlgorithmicRecommendations(input, lang)

  // ─── Enrichissement LLM optionnel ───
  let llmUsed = false
  if (!skipLlm) {
    try {
      const enriched = await enrichViaLlm(input, options, rawSections, recommendations)
      if (enriched) {
        // Marque les sections enrichies
        for (let i = 0; i < rawSections.length; i++) {
          if (enriched.sections[i]) {
            rawSections[i] = {
              ...rawSections[i],
              body: enriched.sections[i] ?? rawSections[i].body,
              aiGenerated: true,
            }
          }
        }
        if (enriched.recommendations && enriched.recommendations.length > 0) {
          recommendations = enriched.recommendations
        }
        llmUsed = true
      }
    } catch (err) {
      // Fallback silencieux sur la version algorithmique
      console.log('[reportCommentaryEngine] LLM fallback →', err)
    }
  }

  // ─── Tron côté longueur ───
  if (length === 'concise') {
    for (const s of rawSections) {
      const sentences = s.body.split(/(?<=[.!?])\s+/)
      s.body = sentences.slice(0, 2).join(' ')
    }
    recommendations = recommendations.slice(0, 3)
  }

  // ─── Closing ───
  const closing = dict.closing[tone]

  return {
    title: `${dict.title} · ${input.volumeName}`,
    greeting,
    introduction,
    sections: rawSections,
    recommendations,
    closing,
    signature: dict.signature,
    meta: {
      generatedAt: new Date().toISOString(),
      audience, tone, length, lang, llmUsed,
    },
  }
}

// ─── Recommandations algorithmiques ────────────────────────

function generateAlgorithmicRecommendations(
  input: ReportCommentaryInput,
  lang: ReportLang,
): string[] {
  const recs: string[] = []
  const p = input.currentPlan
  if (!p) return recs

  const critical = (input.knownFindings ?? []).filter(f => f.severity === 'critical')
  if (critical.length > 0) {
    recs.push(
      lang === 'en' ? `Address the ${critical.length} critical issue${critical.length > 1 ? 's' : ''} before final validation.`
      : lang === 'dioula' ? `${critical.length} kuma gɛlɛn ka kan ka ɲini sani sɛgɛsɛgɛli lahidu.`
      : `Traiter les ${critical.length} point${critical.length > 1 ? 's' : ''} critique${critical.length > 1 ? 's' : ''} avant validation finale.`
    )
  }

  // Ratio surface / nombre d'espaces — si anormal, recommandation
  const avgArea = p.spaces.length > 0 ? p.spaces.reduce((s, sp) => s + sp.areaSqm, 0) / p.spaces.length : 0
  if (avgArea > 0 && avgArea < 30) {
    recs.push(
      lang === 'en' ? `Average space area is small (${avgArea.toFixed(0)} m²) — consider merging adjacent cells for tenant attractiveness.`
      : lang === 'dioula' ? `Yɔrɔ ninnu ka dɔgɔn — a ka ɲi ka u fara ɲɔgɔn kan.`
      : `Surface moyenne des espaces faible (${avgArea.toFixed(0)} m²) — envisager des fusions pour améliorer l'attractivité preneur.`
    )
  }

  // Fiche sectorielle si benchmark fourni
  if (input.sectorBenchmarks) {
    recs.push(
      lang === 'en' ? 'Cross-check the sector benchmarks to identify positioning opportunities.'
      : lang === 'dioula' ? 'Suku ka ɲɔgɔndan lajɛ k\'a yɛrɛ sa.'
      : 'Recouper les benchmarks sectoriels pour identifier les opportunités de positionnement.'
    )
  }

  if (recs.length === 0) {
    recs.push(
      lang === 'en' ? 'The plan is consistent with PROPH3T quality standards — proceed to validation.'
      : lang === 'dioula' ? 'Plan ka ɲi PROPH3T fɔlɔsira la — aw bɛ se ka lahidu.'
      : 'Le plan est cohérent avec les standards PROPH3T — proposer à la validation.'
    )
  }
  return recs
}

// ─── Enrichissement LLM ───────────────────────────────────

async function enrichViaLlm(
  input: ReportCommentaryInput,
  options: ReportCommentaryOptions,
  sections: ReportSection[],
  recommendations: string[],
): Promise<{ sections: string[]; recommendations: string[] } | null> {
  const { audience, tone, length, lang } = options

  const systemPrompt = buildSystemPrompt(audience, tone, length, lang)
  const userPayload = {
    volume: input.volumeName,
    project: input.projectName,
    stats: {
      spaces: input.currentPlan?.spaces.length ?? 0,
      totalAreaSqm: input.currentPlan?.spaces.reduce((s, sp) => s + sp.areaSqm, 0) ?? 0,
      floors: input.currentPlan?.detectedFloors?.length ?? 1,
    },
    keyFigures: input.keyFigures ?? {},
    modificationsSummary: input.previousVersion
      ? `depuis v${input.previousVersion.versionNumber}`
      : 'première version',
    findings: (input.knownFindings ?? []).slice(0, 8),
    sectionsBrut: sections.map(s => ({ heading: s.heading, body: s.body })),
    recommendationsBrut: recommendations,
  }

  interface EnrichedOutput { sections: string[]; recommendations: string[] }
  const validate = (x: unknown): x is EnrichedOutput => {
    if (!isObject(x)) return false
    const s = x.sections; const r = x.recommendations
    return Array.isArray(s) && s.every(v => typeof v === 'string')
      && Array.isArray(r) && r.every(v => typeof v === 'string')
  }

  try {
    const result = await callStructured<EnrichedOutput>(
      {
        system: systemPrompt,
        user: JSON.stringify(userPayload),
        schemaHint: '{"sections": string[], "recommendations": string[]}',
        temperature: 0.3,
        maxRetries: 2,
      },
      validate,
    )
    return { sections: result.data.sections, recommendations: result.data.recommendations }
  } catch {
    return null
  }
}

function buildSystemPrompt(
  audience: ReportAudience, tone: ReportTone, length: ReportLength, lang: ReportLang,
): string {
  const audienceDesc = {
    director: 'un directeur général exigeant : vocabulaire décisionnel, ROI, risques, gain compétitif',
    investor: 'un investisseur : rentabilité, TRI, différenciation, exit strategy',
    operator: 'un exploitant de site : opérationnel, maintenance, flux clients, CAPEX/OPEX',
    architect: 'un architecte : précision technique, normes APSAD/ERP, matériaux, accessibilité PMR',
    tenant: 'un preneur commercial : exposition, flux, pass-through, zones chaudes',
    authority: 'une autorité administrative : conformité, responsabilité, références normatives',
  }[audience]

  const toneDesc = {
    neutral: 'ton neutre professionnel',
    formal: 'ton très formel et institutionnel',
    conversational: 'ton cordial et direct',
    enthusiastic: 'ton enthousiaste et engageant',
  }[tone]

  const lengthDesc = {
    concise: '1 à 2 phrases par section, très dense',
    standard: '2 à 4 phrases par section',
    detailed: '4 à 7 phrases par section avec justification',
  }[length]

  const langName = { fr: 'français', en: 'anglais', dioula: 'dioula (ou français si insuffisant)' }[lang]

  return `Tu es PROPH3T, expert architecture commerciale et rédacteur de rapports directeurs.

CONTEXTE : tu reformules les sections brutes d'un rapport pour ${audienceDesc}.

STYLE :
- Langue : ${langName}
- Ton : ${toneDesc}
- Longueur : ${lengthDesc}
- Aucun jargon inutile
- Cite implicitement les normes pertinentes (APSAD R82, NF EN 16005, ERP CO, SYSCOHADA, Loi CI 2013-450) quand elles renforcent le propos.

RÈGLE STRICTE : réponds UNIQUEMENT en JSON valide, schéma :
{
  "sections": ["section_1_reformulee", "section_2_reformulee", ...],   // même ordre que l'entrée
  "recommendations": ["reco_1", "reco_2", ...]                           // 3 à 5 recommandations
}

AUCUN markdown. AUCUNE explication hors JSON. AUCUN chiffre inventé.`
}

// ─── Utilitaires ──────────────────────────────────────────

/** Rend le commentaire sous forme de texte plat (pour copier/coller email). */
export function commentaryToPlainText(c: ReportCommentary): string {
  const lines: string[] = []
  lines.push(c.greeting, '')
  lines.push(c.introduction, '')
  for (const s of c.sections) {
    lines.push(`── ${s.heading} ──`)
    lines.push(s.body, '')
  }
  if (c.recommendations.length > 0) {
    lines.push(`── ${L[c.meta.lang].recommendationsHeader} ──`)
    for (const r of c.recommendations) lines.push(`• ${r}`)
    lines.push('')
  }
  lines.push(c.closing, '', c.signature)
  return lines.join('\n')
}

/** Rend le commentaire en HTML (pour insertion dans rapport ou email). */
export function commentaryToHtml(c: ReportCommentary): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[m]!))
  return `<div class="proph3t-commentary" style="font-family:system-ui,sans-serif;line-height:1.6;max-width:720px;">
  <h2 style="color:#0f172a;border-bottom:2px solid #c9a068;padding-bottom:8px;">${esc(c.title)}</h2>
  <p><strong>${esc(c.greeting)}</strong></p>
  <p style="color:#475569;">${esc(c.introduction)}</p>
  ${c.sections.map(s => `
    <h3 style="color:#1e293b;margin-top:24px;">${esc(s.heading)}</h3>
    <p style="white-space:pre-line;color:#334155;">${esc(s.body)}</p>
  `).join('')}
  ${c.recommendations.length > 0 ? `
    <h3 style="color:#1e293b;margin-top:24px;">${esc(L[c.meta.lang].recommendationsHeader)}</h3>
    <ul style="color:#334155;">
      ${c.recommendations.map(r => `<li>${esc(r)}</li>`).join('')}
    </ul>
  ` : ''}
  <p style="margin-top:32px;color:#475569;">${esc(c.closing)}</p>
  <p style="color:#64748b;font-style:italic;font-size:13px;">${esc(c.signature)}</p>
  <div style="margin-top:16px;padding:8px;border-radius:4px;background:#f1f5f9;font-size:11px;color:#64748b;">
    Généré par PROPH3T · ${c.meta.audience} · ${c.meta.tone} · ${c.meta.lang}${c.meta.llmUsed ? ' · LLM' : ' · algorithmique'}
  </div>
</div>`
}
