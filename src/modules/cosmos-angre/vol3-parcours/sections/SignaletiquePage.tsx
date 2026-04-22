
interface SignageType {
  quantity: number
  title: string
  description: string
  localisation: string
  specs: string
  color: string
}

const signageTypes: SignageType[] = [
  { quantity: 2, title: 'Totem entrée principale', description: 'Totem lumineux double face, identité gold/navy, logo Cosmos rétro-éclairé LED. Visible 150m boulevard.', localisation: 'Entrée parking sous-sol + entrée piétonne principale', specs: 'H: 4m · L: 1.2m · Aluminium anodisé gold · LED 6500K', color: '#f59e0b' },
  { quantity: 12, title: 'Panneaux directionnels axes', description: 'Fléchage « Cosmos Angré → » sur 3 axes principaux. Éclairage solaire nocturne.', localisation: 'Bd Latrille (×4), Bd Mitterrand (×4), Carrefours Angré (×4)', specs: '4×3m · Vinyle HD · Éclairage solaire · Résistant UV', color: '#34d399' },
  { quantity: 32, title: 'Signalétique parking zones', description: 'Panneaux zones colorées A (bleu) B (vert) C (orange) D (violet) avec pictogrammes universels.', localisation: 'Sous-sol -1 et -2 · Rampes · Ascenseurs · Surface', specs: 'Alu dibond · Lettrage découpé · Rétro-éclairé · Code couleur Pantone', color: '#38bdf8' },
  { quantity: 8, title: 'Plans du centre rétro-éclairés', description: 'Plan général 3 niveaux avec position « Vous êtes ici ». Mise à jour semestrielle enseignes.', localisation: 'Entrées principales (×2) · Jonctions galeries (×4) · Ascenseurs (×2)', specs: '120×80cm · Plexiglas rétro-éclairé · Impression UV · FR/EN', color: '#8b5cf6' },
  { quantity: 4, title: 'Bornes wayfinding tactiles', description: 'Écrans 55" tactiles : recherche boutique, itinéraire 3D, événements du jour, inscription Cosmos Club.', localisation: 'Hall central RDC · Entrées secondaires · R+2 food court', specs: '55" tactile capacitif · Android · API Cosmos · FR/EN · Accessibilité PMR', color: '#06b6d4' },
  { quantity: 48, title: 'Fléchage galeries par univers', description: 'Signalétique suspendue par univers : Mode · Beauté · Tech · Maison · Services · Food.', localisation: 'Intersections galeries (×24) · Escalators (×12) · Ascenseurs (×12)', specs: 'Alu brossé · Pictogrammes ISO · Polices Inter 600 / Cormorant 400', color: '#ef4444' },
  { quantity: 24, title: 'Signalétique services & PMR', description: 'Pictogrammes : toilettes, nurserie, PMR, conciergerie, urgence, prière. Braille intégré.', localisation: 'Chaque niveau · Proximité services · Ascenseurs', specs: 'Alu anodisé · Pictogrammes ISO 7001 · Relief tactile + Braille', color: '#22c55e' },
  { quantity: 1, title: 'Bâche façade pré-ouverture', description: '« Cosmos Angré — Un monde à part — Ouverture Octobre 2026 ». Visible depuis Bd Latrille à 300m.', localisation: 'Façade principale boulevard Latrille', specs: '600m² · Impression HD 720 dpi · Vinyle résistant UV 6 mois · Œillets inox', color: '#f59e0b' },
]

const totalElements = signageTypes.reduce((sum, s) => sum + s.quantity, 0)

export default function SignaletiquePage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#22c55e' }}>VOL. 3 — M6 SIGNALÉTIQUE</p>
        <h1 className="text-[28px] font-light text-white mb-3">Signalétique directionnelle</h1>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <span><strong className="text-white">{totalElements}</strong> <span style={{ color: '#4a5568' }}>ÉLÉMENTS TOTAL</span></span>
        <span style={{ color: '#1e2a3a' }}>·</span>
        <span><strong className="text-white">{signageTypes.length}</strong> <span style={{ color: '#4a5568' }}>TYPES DE SIGNALÉTIQUE</span></span>
        <span style={{ color: '#1e2a3a' }}>·</span>
        <span><strong className="text-white">3</strong> <span style={{ color: '#4a5568' }}>ZONES COUVERTES</span></span>
        <span style={{ color: '#1e2a3a' }}>·</span>
        <span><strong className="text-white">100%</strong> <span style={{ color: '#4a5568' }}>ACCESSIBILITÉ PMR</span></span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {signageTypes.map((s) => (
          <div key={s.title} className="rounded-[10px] p-5 relative" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            {/* Quantity badge */}
            <span
              className="absolute -top-2 -left-2 flex items-center justify-center h-8 min-w-[32px] px-2 rounded-full text-sm font-bold"
              style={{ background: `${s.color}20`, color: s.color, border: `2px solid ${s.color}40` }}
            >
              ×{s.quantity}
            </span>

            <h3 className="text-[14px] font-semibold text-white mb-2 ml-6">{s.title}</h3>
            <p className="text-[12px] leading-[1.7] mb-3" style={{ color: '#94a3b8' }}>{s.description}</p>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#4a5568' }}>LOCALISATION</span>
                <p className="text-[12px]" style={{ color: '#64748b' }}>{s.localisation}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#4a5568' }}>SPECS</span>
                <p className="text-[12px] font-mono" style={{ color: '#64748b' }}>{s.specs}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
