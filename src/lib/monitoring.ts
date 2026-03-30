// ═══ Monitoring — Sentry integration ═══
// Only active in production with @sentry/react installed and VITE_SENTRY_DSN set

export async function initMonitoring() {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  if (!import.meta.env.PROD) return

  try {
    const mod = '@sentry/' + 'react'
    const Sentry = await (Function('m', 'return import(m)')(mod))

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
      beforeSend(event: any) {
        if (window.location.hostname === 'localhost') return null
        return event
      },
    })

    ;(globalThis as any).__sentryModule = Sentry
  } catch {
    // @sentry/react not installed — silently skip
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
  const Sentry = (globalThis as any).__sentryModule
  if (!Sentry) return
  Sentry.withScope((scope: any) => {
    scope.setTag('atlas.module', context.module)
    scope.setTag('atlas.operation', context.operation)
    if (context.projectId) scope.setContext('project', { id: context.projectId })
    if (context.floorId) scope.setContext('floor', { id: context.floorId })
    Sentry.captureException(error)
  })
}

export function measureCascade(durationMs: number, trigger: string) {
  const Sentry = (globalThis as any).__sentryModule
  if (!Sentry) return
  if (durationMs > 200) {
    Sentry.captureMessage(
      `Cascade lente : ${Math.round(durationMs)}ms (trigger: ${trigger})`,
      { level: 'warning' }
    )
  }
}
