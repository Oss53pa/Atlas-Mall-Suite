// ═══ Rate limiter partagé pour les Edge Functions ═══
//
// Stratégie : token bucket en mémoire Deno par (IP, endpoint).
// Limite configurable par endpoint. Pour une protection multi-instance,
// remplacer par Upstash Redis (compatible Deno Deploy).

interface Bucket {
  tokens: number
  lastRefillMs: number
}

const BUCKETS = new Map<string, Bucket>()

export interface RateLimitConfig {
  /** Requêtes max par fenêtre. */
  max: number
  /** Durée de la fenêtre en ms. */
  windowMs: number
}

/**
 * Vérifie si la requête est autorisée pour un bucket donné.
 * Retourne { allowed, retryAfterSec } — retryAfterSec > 0 si throttled.
 */
export function checkRateLimit(
  bucketKey: string,
  config: RateLimitConfig,
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now()
  let b = BUCKETS.get(bucketKey)
  const refillRate = config.max / config.windowMs // tokens/ms

  if (!b) {
    b = { tokens: config.max - 1, lastRefillMs: now }
    BUCKETS.set(bucketKey, b)
    return { allowed: true, retryAfterSec: 0, remaining: b.tokens }
  }

  // Refill
  const elapsed = now - b.lastRefillMs
  b.tokens = Math.min(config.max, b.tokens + elapsed * refillRate)
  b.lastRefillMs = now

  if (b.tokens >= 1) {
    b.tokens -= 1
    return { allowed: true, retryAfterSec: 0, remaining: Math.floor(b.tokens) }
  }

  const missing = 1 - b.tokens
  const retryMs = missing / refillRate
  return { allowed: false, retryAfterSec: Math.ceil(retryMs / 1000), remaining: 0 }
}

/**
 * Helper pour extraire l'IP client (Deno Deploy met l'IP réelle dans x-forwarded-for).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}

/**
 * Wrapper convenience : si throttled, retourne directement une Response 429.
 * Sinon retourne null (continuer le handler).
 */
export function rateLimitResponse(
  req: Request,
  endpoint: string,
  config: RateLimitConfig,
  corsHeaders: Record<string, string> = {},
): Response | null {
  const ip = getClientIp(req)
  const key = `${endpoint}:${ip}`
  const r = checkRateLimit(key, config)

  if (!r.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        retry_after_seconds: r.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(r.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    )
  }

  return null
}
