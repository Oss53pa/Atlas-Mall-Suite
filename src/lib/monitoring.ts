// ═══ Monitoring — Sentry integration ═══
// Only active in production with VITE_SENTRY_DSN set

let sentryModule: typeof import('@sentry/react') | null = null

export async function initMonitoring() {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  if (!import.meta.env.PROD) return

  try {
    const Sentry = await import('@sentry/react')
    sentryModule = Sentry

    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: 'production',
      release: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error exception captured',
        'Network request failed',
      ],
      beforeSend(event) {
        if (window.location.hostname === 'localhost') return null
        return event
      },
    })
  } catch {
    // Sentry not installed — silently skip
  }
}

export function captureAtlasError(
  error: Error,
  context: {
    module: 'vol2' | 'vol3' | 'planReader' | 'cascade' | 'worker'
    operation: string
    projectId?: string
    floorId?: string
  }
) {
  if (!sentryModule) return
  sentryModule.withScope(scope => {
    scope.setTag('atlas.module', context.module)
    scope.setTag('atlas.operation', context.operation)
    if (context.projectId) scope.setContext('project', { id: context.projectId })
    if (context.floorId) scope.setContext('floor', { id: context.floorId })
    sentryModule!.captureException(error)
  })
}

export function measureCascade(durationMs: number, trigger: string) {
  if (!sentryModule) return
  if (durationMs > 200) {
    sentryModule.captureMessage(
      `Cascade lente : ${Math.round(durationMs)}ms (trigger: ${trigger})`,
      { level: 'warning' }
    )
  }
}
