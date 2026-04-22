// ═══ AR QR CODE ANCHOR — Setup screen before entering AR ═══
//
// Displays a QR code that encodes the building/floor coordinate origin.
// The user scans this code with their device to establish the spatial anchor:
//   • Device camera sees the QR → decodes {buildingId, floorId, bearing}
//   • App maps QR-code position to plan coordinate (0, 0)
//   • All floor plan geometry is then offset from that anchor
//
// QR payload (JSON, base64-encoded):
//   { a: "atlas-ar-v1", b: buildingId, f: floorId, bear: bearingDegrees }

import { useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { FloorLevelKey } from '../../proph3t/libraries/spaceTypeLibrary'

// ── Anchor payload ────────────────────────────────────────────────────────

export interface ARanchorData {
  buildingId: string
  floorId: FloorLevelKey
  /** True north bearing of the plan X-axis (degrees, 0 = north). */
  bearing: number
  /** Optional: real-world lat/lng of origin (0,0) */
  lat?: number
  lng?: number
}

function encodeAnchorPayload(data: ARanchorData): string {
  const payload = {
    a: 'atlas-ar-v1',
    b: data.buildingId,
    f: data.floorId,
    bear: Math.round(data.bearing),
    ...(data.lat  !== undefined ? { lat: data.lat }   : {}),
    ...(data.lng  !== undefined ? { lng: data.lng }   : {}),
  }
  return `atlas-ar://${btoa(JSON.stringify(payload))}`
}

// ── Component ─────────────────────────────────────────────────────────────

interface ARQRCodeAnchorProps {
  anchor: ARanchorData
  /** Called when "Enter AR" is tapped. */
  onEnterAR: () => void
  /** Whether device supports WebXR (hide button if false). */
  arSupported: boolean
  /** Show loading spinner (requesting state). */
  loading?: boolean
  /** Error message to display. */
  error?: string | null
  className?: string
}

export default function ARQRCodeAnchor({
  anchor, onEnterAR, arSupported, loading, error, className = '',
}: ARQRCodeAnchorProps) {
  const qrValue = useMemo(() => encodeAnchorPayload(anchor), [anchor])

  return (
    <div className={`flex flex-col items-center justify-center h-full bg-[#060c18] gap-6 px-6 ${className}`}>

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-white font-semibold text-lg">Réalité augmentée</h2>
        <p className="text-white/40 text-xs max-w-xs leading-relaxed">
          Scannez ce code QR avec l'application Atlas AR sur votre téléphone
          pour ancrer le plan dans l'espace réel.
        </p>
      </div>

      {/* QR Code */}
      <div className="rounded-2xl bg-white p-4 shadow-2xl ring-4 ring-white/10">
        <QRCodeSVG
          value={qrValue}
          size={200}
          level="M"
          fgColor="#0f172a"
          bgColor="#ffffff"
          includeMargin={false}
        />
      </div>

      {/* Anchor info */}
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/50 space-y-1 w-full max-w-xs">
        <div className="flex justify-between">
          <span className="text-white/30">Bâtiment</span>
          <span className="text-white/70 font-medium">{anchor.buildingId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/30">Étage</span>
          <span className="text-white/70 font-medium">{anchor.floorId.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/30">Azimuth</span>
          <span className="text-white/70 font-medium">{anchor.bearing}°</span>
        </div>
      </div>

      {/* Enter AR button */}
      {arSupported ? (
        <button
          onClick={onEnterAR}
          disabled={loading}
          className={[
            'w-full max-w-xs py-3 rounded-2xl font-semibold text-sm transition-all',
            loading
              ? 'bg-white/10 text-white/30 cursor-wait'
              : 'bg-cyan-500 text-[#0a0f18] hover:bg-cyan-400 active:scale-95 shadow-lg shadow-cyan-500/30',
          ].join(' ')}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Démarrage…
            </span>
          ) : (
            '→ Démarrer la session AR'
          )}
        </button>
      ) : (
        <div className="w-full max-w-xs py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-white/40 text-xs">
            La session AR nécessite Chrome sur Android ou Safari 16+ sur iOS.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full max-w-xs px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs leading-relaxed">
          {error}
        </div>
      )}

      {/* How it works */}
      <details className="w-full max-w-xs">
        <summary className="text-[10px] uppercase tracking-wider text-white/20 cursor-pointer hover:text-white/40 transition-colors">
          Comment ça marche ?
        </summary>
        <div className="mt-3 text-[11px] text-white/35 leading-relaxed space-y-2">
          <p>1. Imprimez ou affichez ce QR code à l'entrée de l'étage.</p>
          <p>2. Ouvrez Atlas AR sur votre téléphone et pointez la caméra vers le QR.</p>
          <p>3. Le plan numérique s'aligne automatiquement avec le sol réel.</p>
          <p>4. Marchez dans le bâtiment : les zones s'affichent en surimpression.</p>
        </div>
      </details>
    </div>
  )
}
