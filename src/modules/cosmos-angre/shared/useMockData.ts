// ═══ Mock data guard — returns true if VITE_USE_MOCK is set, false in production ═══

export function shouldUseMockData(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK === true
}
