// ═══ URL Safety — gardes pour URLs d'images / blobs ═══
//
// Évite les `ERR_FILE_NOT_FOUND` qui apparaissent quand un composant fait
// `<img src={url}>` avec une URL corrompue (UUID brut sans préfixe `blob:`,
// chaîne vide, chaîne avec espace, etc.) OU quand un `blob:` URL vient
// d'une session précédente (déjà révoqué au refresh).
//
// Préfixes valides :
//   • blob:         — blob URL d'une session (peut mourir au refresh)
//   • data:         — data URL (base64 inline, persistant)
//   • http(s)://    — URL absolue (CDN, origin)
//   • /             — chemin absolu sur l'origin
//   • ./ ou ../     — chemin relatif (rare)
//
// Session guarding : tout `blob:` URL créé dans la session courante est
// automatiquement enregistré via le wrap de `URL.createObjectURL` fait dans
// `usePlanHydration`. Un `blob:` non enregistré = blob d'une session
// précédente = MORT → on le rejette pour éviter ERR_FILE_NOT_FOUND.

/** Set en mémoire des blob URLs créés/enregistrés dans cette session. */
const sessionBlobUrls: Set<string> = (() => {
  if (typeof window === 'undefined') return new Set<string>()
  const w = window as unknown as { __atlasSessionBlobUrls?: Set<string> }
  if (!w.__atlasSessionBlobUrls) w.__atlasSessionBlobUrls = new Set<string>()
  return w.__atlasSessionBlobUrls
})()

/** Wrap `URL.createObjectURL` pour tracker tous les blobs créés dans la session.
 *  Idempotent : ne wrap qu'une fois. Appelé au chargement de ce module. */
function installCreateObjectUrlTracker(): void {
  if (typeof URL === 'undefined' || !URL.createObjectURL) return
  const w = URL as unknown as { __atlasWrapped?: boolean }
  if (w.__atlasWrapped) return
  w.__atlasWrapped = true
  const original = URL.createObjectURL.bind(URL)
  URL.createObjectURL = function (obj: Blob | MediaSource): string {
    const url = original(obj)
    sessionBlobUrls.add(url)
    return url
  }
}
installCreateObjectUrlTracker()

/** À appeler explicitement si on reçoit un blob URL d'ailleurs qu'on veut
 *  marquer comme vivant pour la session. */
export function registerSessionBlob(url: string): void {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    sessionBlobUrls.add(url)
  }
}

/** Retourne true si la chaîne est une URL d'image valide (format + vivante). */
export function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0) return false
  // Filtre les UUIDs bruts (erreur fréquente de strip de préfixe `blob:`)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url)) return false
  if (url.startsWith('blob:')) {
    // Blob URL : valide uniquement s'il a été créé/registré dans cette session.
    // Un blob d'une session précédente est garanti mort → ERR_FILE_NOT_FOUND.
    return sessionBlobUrls.has(url)
  }
  return (
    url.startsWith('data:') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/') ||
    url.startsWith('./') ||
    url.startsWith('../')
  )
}

/** Retourne `url` si valide, sinon `undefined`. */
export function safeImageUrl(url: unknown): string | undefined {
  return isValidImageUrl(url) ? url : undefined
}
