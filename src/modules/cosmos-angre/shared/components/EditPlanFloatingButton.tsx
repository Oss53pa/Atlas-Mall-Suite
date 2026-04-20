// ═══ EditPlanFloatingButton ═══
//
// Bouton flottant draggable dans le workspace projet.
// - Drag sur la "poignée" (icône ✥) pour déplacer
// - Double-clic poignée = reset position
// - Clic sur le bouton principal = navigation vers Atlas Studio

import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Pencil, Layers, GripVertical } from 'lucide-react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { useDraggable } from '../../../../hooks/useDraggable'

export function EditPlanFloatingButton() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()

  const planValidated = usePlanEngineStore(s => s.planValidated)
  const spacesCount = usePlanEngineStore(s => s.parsedPlan?.spaces.length ?? 0)

  // Position draggable persistée
  const { style, handleProps } = useDraggable('edit-plan-btn-pos', {
    defaultBottom: 100, defaultRight: 24,
  })

  // Ne pas afficher dans les éditeurs (doublon)
  if (location.pathname.includes('/studio')) return null
  if (location.pathname.includes('/remodelage')) return null
  if (location.pathname.includes('/scene-editor')) return null
  // Ne pas afficher hors d'un projet
  if (!location.pathname.startsWith('/projects/')) return null

  const pid = projectId ?? 'cosmos-angre'

  return (
    <div style={style} className="flex flex-col gap-2 items-end">
      <div className="flex items-center gap-0 rounded-full shadow-2xl"
        style={{
          background: planValidated
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'linear-gradient(135deg, #f59e0b, #ef4444)',
          boxShadow: planValidated
            ? '0 10px 30px rgba(99,102,241,0.45)'
            : '0 10px 30px rgba(245,158,11,0.45)',
        }}
      >
        {/* Poignée de drag */}
        <div {...handleProps}
          className="px-2 py-2.5 text-white/70 hover:text-white rounded-l-full"
          title="Glisser pour déplacer · double-clic pour réinitialiser"
        >
          <GripVertical size={12} />
        </div>

        {/* Bouton principal */}
        <button
          onClick={() => navigate(`/projects/${pid}/studio`)}
          className="flex items-center gap-2 pr-4 py-2.5 text-white text-[12px] font-semibold transition-transform hover:scale-105 rounded-r-full"
          title={planValidated
            ? 'Éditer le plan (Atlas Studio)'
            : 'Base non verrouillée — aller à Atlas Studio'}
        >
          <Pencil size={14} />
          <span>Éditer le plan</span>
          {!planValidated && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-bold uppercase tracking-wider">À valider</span>}
          {spacesCount > 0 && <span className="text-[10px] opacity-75">· {spacesCount} esp</span>}
        </button>
      </div>

      {planValidated && (
        <button
          onClick={() => navigate(`/projects/${pid}/scene-editor`)}
          className="flex items-center gap-2 px-3 py-2 rounded-full shadow-xl bg-slate-800 border border-white/10 text-slate-200 text-[11px] hover:bg-slate-700"
          title="Ouvrir Scene Editor (2D + 3D + exports SVG/DXF/GLB)"
        >
          <Layers size={12} />
          Scene Editor
        </button>
      )}
    </div>
  )
}
