// ═══ Mock data guard ═══
// In development: mock data ON by default (unless explicitly disabled)
// In production: mock data OFF by default (unless explicitly enabled)

export function shouldUseMockData(): boolean {
  const env = import.meta.env.VITE_USE_MOCK
  // Explicitly set → respect it
  if (env === 'true' || env === true) return true
  if (env === 'false' || env === false) return false
  // Not set → use mock in dev, not in prod
  return !import.meta.env.PROD
}
