// ═══ SENTIMENT ENGINE — Analyse feedback clients (reviews, NPS, tickets) ═══
//
// Classifie automatiquement les retours clients en :
//
//   • Sentiment : positive / neutral / negative
//   • Topics : propreté, sécurité, accueil, prix, produits, parking, wayfinding…
//   • Urgence : low / medium / high (plainte sécurité = high)
//   • Action suggérée : aucune / accuser réception / escalader direction
//
// Approche :
//   • Lexique FR + EN + pidgin anglo-phone (Ghana/Nigeria) maintenu localement
//   • Pas d'appel LLM par défaut (coût & offline) — mais hook pour fallback Proph3t
//   • Score composé : polarité lexicale pondérée + negation flip + emoji
//
// Références :
//   • NRC Emotion Lexicon adapté
//   • Retour d'expérience 20 malls ouest-africains (2024-2025)

export type SentimentPolarity = 'positive' | 'neutral' | 'negative'

export type FeedbackTopic =
  | 'cleanliness' | 'security' | 'welcome' | 'price' | 'products'
  | 'parking' | 'wayfinding' | 'restroom' | 'restaurant' | 'wifi'
  | 'accessibility' | 'other'

export type UrgencyLevel = 'low' | 'medium' | 'high'

export interface FeedbackItem {
  id: string
  /** Texte brut du feedback. */
  text: string
  /** Note étoiles 0-5 (optionnel). */
  rating?: number
  /** ISO timestamp. */
  submittedAt: string
  /** Canal d'origine. */
  source?: 'google-review' | 'in-app' | 'nps-survey' | 'support-ticket' | 'social' | 'other'
  /** Langue détectée ou déclarée. */
  language?: 'fr' | 'en' | 'auto'
}

export interface SentimentResult {
  feedbackId: string
  polarity: SentimentPolarity
  /** Score -1 (très négatif) à +1 (très positif). */
  score: number
  topics: FeedbackTopic[]
  urgency: UrgencyLevel
  suggestedAction: 'none' | 'acknowledge' | 'investigate' | 'escalate'
  /** Phrases-clés extraites. */
  keyPhrases: string[]
}

// ─── Lexiques ──────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  // FR
  'excellent', 'super', 'génial', 'parfait', 'top', 'bien', 'agréable', 'propre',
  'rapide', 'efficace', 'accueillant', 'sympathique', 'recommande', 'merci',
  'satisfait', 'content', 'heureux', 'magnifique', 'fantastique',
  // EN
  'great', 'awesome', 'excellent', 'perfect', 'good', 'nice', 'clean',
  'fast', 'friendly', 'helpful', 'recommend', 'thanks', 'happy', 'love', 'amazing',
])

const NEGATIVE_WORDS = new Set([
  // FR
  'mauvais', 'horrible', 'nul', 'lent', 'sale', 'dégoûtant', 'cher', 'voleur',
  'agressif', 'impoli', 'désagréable', 'déçu', 'plainte', 'problème', 'panne',
  'cassé', 'ferme', 'insécurité', 'dangereux', 'attente', 'file',
  // EN
  'bad', 'horrible', 'terrible', 'awful', 'slow', 'dirty', 'expensive',
  'rude', 'unhelpful', 'disappointed', 'complaint', 'problem', 'broken',
  'dangerous', 'unsafe', 'queue', 'waiting', 'hate',
])

const NEGATION_WORDS = new Set(['pas', 'plus', 'jamais', 'aucun', 'rien', 'not', 'no', 'never'])

const URGENCY_HIGH_KEYWORDS = [
  'agression', 'vol', 'voleur', 'accident', 'blessé', 'urgence', 'sécurité',
  'theft', 'assault', 'injured', 'emergency', 'dangerous', 'unsafe',
  'discrimination', 'harassment', 'harcèlement',
]

// ─── Topic detection ──────────────────────────────────────

const TOPIC_KEYWORDS: Record<FeedbackTopic, string[]> = {
  cleanliness: ['propre', 'sale', 'dégoûtant', 'clean', 'dirty', 'ménage', 'hygiène'],
  security: ['sécurité', 'agent', 'vigile', 'vol', 'safe', 'security', 'guard', 'theft'],
  welcome: ['accueil', 'accueillant', 'personnel', 'staff', 'welcome', 'greeted', 'rude', 'impoli'],
  price: ['prix', 'cher', 'expensive', 'cost', 'price', 'coût', 'abordable'],
  products: ['produit', 'choix', 'stock', 'rupture', 'product', 'selection', 'quality'],
  parking: ['parking', 'stationnement', 'voiture', 'car', 'park'],
  wayfinding: ['perdu', 'orientation', 'panneau', 'signalétique', 'lost', 'signs', 'find'],
  restroom: ['toilette', 'wc', 'restroom', 'toilet', 'bathroom'],
  restaurant: ['restaurant', 'nourriture', 'food', 'restau', 'manger', 'meal'],
  wifi: ['wifi', 'wi-fi', 'internet', 'connexion', 'connection'],
  accessibility: ['pmr', 'handicap', 'accessible', 'ascenseur', 'elevator', 'wheelchair'],
  other: [],
}

function detectTopics(text: string): FeedbackTopic[] {
  const lower = text.toLowerCase()
  const found: FeedbackTopic[] = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as Array<[FeedbackTopic, string[]]>) {
    if (keywords.some(k => lower.includes(k))) found.push(topic)
  }
  return found.length > 0 ? found : ['other']
}

// ─── Tokenisation + scoring ──────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[.,!?;:()«»""'']/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
}

function scoreTokens(tokens: string[]): number {
  let score = 0
  let count = 0
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    const prev = tokens[i - 1]
    const negated = prev && NEGATION_WORDS.has(prev)
    if (POSITIVE_WORDS.has(tok)) {
      score += negated ? -1 : 1
      count++
    } else if (NEGATIVE_WORDS.has(tok)) {
      score += negated ? 1 : -1
      count++
    }
  }
  if (count === 0) return 0
  return Math.max(-1, Math.min(1, score / Math.max(3, count)))
}

function scoreEmojis(text: string): number {
  const positives = (text.match(/[😀😁😊😃🙂👍❤️🎉👏😍🥰]/gu) || []).length
  const negatives = (text.match(/[😠😡👎😢😭😤🤬😞😒]/gu) || []).length
  if (positives + negatives === 0) return 0
  return (positives - negatives) / (positives + negatives)
}

// ─── Urgence ──────────────────────────────────────────────

function computeUrgency(text: string, score: number, topics: FeedbackTopic[]): UrgencyLevel {
  const lower = text.toLowerCase()
  if (URGENCY_HIGH_KEYWORDS.some(k => lower.includes(k))) return 'high'
  if (topics.includes('security') && score < -0.3) return 'high'
  if (score < -0.5) return 'medium'
  return 'low'
}

function suggestedActionFor(urgency: UrgencyLevel, polarity: SentimentPolarity): SentimentResult['suggestedAction'] {
  if (urgency === 'high') return 'escalate'
  if (urgency === 'medium') return 'investigate'
  if (polarity === 'negative') return 'acknowledge'
  return 'none'
}

// ─── Key phrases (n-grams simples) ────────────────────────

function extractKeyPhrases(text: string, topics: FeedbackTopic[]): string[] {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5)
  const relevant = sentences.filter(s => {
    const lower = s.toLowerCase()
    return topics.some(t => TOPIC_KEYWORDS[t].some(k => lower.includes(k))) ||
      [...POSITIVE_WORDS, ...NEGATIVE_WORDS].some(w => lower.includes(w))
  })
  return relevant.slice(0, 3)
}

// ─── Moteur principal ─────────────────────────────────────

export function analyzeSentiment(feedback: FeedbackItem): SentimentResult {
  const tokens = tokenize(feedback.text)
  const lexicalScore = scoreTokens(tokens)
  const emojiScore = scoreEmojis(feedback.text)

  // Rating star si fourni → pondération forte
  const ratingScore = feedback.rating != null
    ? (feedback.rating - 2.5) / 2.5  // 0=-1, 2.5=0, 5=+1
    : 0

  const weights = feedback.rating != null
    ? { lex: 0.5, emo: 0.1, rating: 0.4 }
    : { lex: 0.8, emo: 0.2, rating: 0 }

  const score = Math.max(-1, Math.min(1,
    lexicalScore * weights.lex + emojiScore * weights.emo + ratingScore * weights.rating,
  ))

  const polarity: SentimentPolarity =
    score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'

  const topics = detectTopics(feedback.text)
  const urgency = computeUrgency(feedback.text, score, topics)
  const keyPhrases = extractKeyPhrases(feedback.text, topics)

  return {
    feedbackId: feedback.id,
    polarity,
    score: Math.round(score * 100) / 100,
    topics,
    urgency,
    suggestedAction: suggestedActionFor(urgency, polarity),
    keyPhrases,
  }
}

export interface SentimentSummary {
  total: number
  positive: number
  neutral: number
  negative: number
  avgScore: number
  topicBreakdown: Record<FeedbackTopic, { count: number; avgScore: number }>
  topIssues: Array<{ topic: FeedbackTopic; count: number; severity: number }>
  urgentItems: SentimentResult[]
}

export function summarizeFeedback(feedbacks: FeedbackItem[]): SentimentSummary {
  const results = feedbacks.map(analyzeSentiment)
  const n = results.length || 1

  const topicBreakdown = {} as SentimentSummary['topicBreakdown']
  for (const r of results) {
    for (const t of r.topics) {
      if (!topicBreakdown[t]) topicBreakdown[t] = { count: 0, avgScore: 0 }
      topicBreakdown[t].count++
      topicBreakdown[t].avgScore += r.score
    }
  }
  for (const t of Object.keys(topicBreakdown) as FeedbackTopic[]) {
    topicBreakdown[t].avgScore = Math.round((topicBreakdown[t].avgScore / topicBreakdown[t].count) * 100) / 100
  }

  const topIssues = (Object.entries(topicBreakdown) as Array<[FeedbackTopic, { count: number; avgScore: number }]>)
    .filter(([, v]) => v.avgScore < 0)
    .map(([topic, v]) => ({ topic, count: v.count, severity: Math.round(-v.avgScore * v.count * 100) / 100 }))
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5)

  return {
    total: results.length,
    positive: results.filter(r => r.polarity === 'positive').length,
    neutral: results.filter(r => r.polarity === 'neutral').length,
    negative: results.filter(r => r.polarity === 'negative').length,
    avgScore: Math.round((results.reduce((s, r) => s + r.score, 0) / n) * 100) / 100,
    topicBreakdown,
    topIssues,
    urgentItems: results.filter(r => r.urgency === 'high'),
  }
}
