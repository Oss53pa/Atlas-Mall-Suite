import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'atlas-chunk-reload-attempted'

function isStaleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes("Importing a module script failed")
  )
}

export function lazyWithReload<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(() =>
    importer().catch((err) => {
      if (isStaleChunkError(err) && typeof window !== 'undefined') {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1')
          window.location.reload()
          return new Promise<never>(() => {})
        }
        sessionStorage.removeItem(RELOAD_FLAG)
      }
      throw err
    }),
  )
}
