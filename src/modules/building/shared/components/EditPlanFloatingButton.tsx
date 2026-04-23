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

  // Position draggable persistée — tout le bouton est draggable
  const { style, handleProps, wrapClick } = useDraggable('edit-plan-btn-pos', {
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
      {/* Bouton principal — entièrement draggable */}
      <button
        onClick={wrapClick(() => navigate(`/projects/${pid}/studio`))}
        onMouseDown={handleProps.onMouseDown}
        onDoubleClick={handleProps.onDoubleClick}
        title={(planValidated
          ? 'Éditer le plan (Atlas Studio)'
          : 'Base non verrouillée — aller à Atlas Studio') + ' · glisser pour déplacer · double-clic = reset'}
        className="flex items-center gap-2 pl-2.5 pr-4 py-2.5 text-white text-[12px] font-semibold transition-transform hover:scale-105 rounded-full shadow-2xl relative"
        style={{
          background: planValidated
            ? 'linear-gradient(135deg, #b38a5a, #a77d4c)'
            : 'linear-gradient(135deg, #f59e0b, #ef4444)',
          boxShadow: planValidated
            ? '0 10px 30px rgba(179,138,90,0.45)'
            : '0 10px 30px rgba(245,158,11,0.45)',
        }}
      >
        <GripVertical size={12} className="text-white/60" />
        <Pencil size={14} />
        <span>Éditer le plan</span>
        {!planValidated && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-bold uppercase tracking-wider">À valider</span>}
        {spacesCount > 0 && <span className="text-[10px] opacity-75">· {spacesCount} esp</span>}
      </button>

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
