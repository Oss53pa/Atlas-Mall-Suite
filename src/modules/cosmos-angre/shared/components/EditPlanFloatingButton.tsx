// ═══ EditPlanFloatingButton ═══
//
// Bouton flottant toujours visible dans le workspace projet.
// Permet de revenir à la phase Remodelage / ouvrir l'éditeur 2D à tout moment,
// depuis n'importe quel volume.

import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Pencil, Layers } from 'lucide-react'
import { usePlanEngineStore } from '../stores/planEngineStore'

export function EditPlanFloatingButton() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()

  const planValidated = usePlanEngineStore(s => s.planValidated)
  const spacesCount = usePlanEngineStore(s => s.parsedPlan?.spaces.length ?? 0)

  // Ne pas afficher sur la phase remodelage elle-même (pour éviter le doublon)
  if (location.pathname.includes('/remodelage')) return null
  if (location.pathname.includes('/scene-editor')) return null
  // Ne pas afficher hors d'un projet
  if (!location.pathname.startsWith('/projects/')) return null

  const pid = projectId ?? 'cosmos-angre'

  return (
    <div className="fixed bottom-24 right-6 z-[50] flex flex-col gap-2 items-end">
      <button
        onClick={() => navigate(`/projects/${pid}/remodelage`)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl text-white text-[12px] font-semibold transition-all hover:scale-105"
        style={{
          background: planValidated
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'linear-gradient(135deg, #f59e0b, #ef4444)',
          boxShadow: planValidated
            ? '0 10px 30px rgba(99,102,241,0.45)'
            : '0 10px 30px rgba(245,158,11,0.45)',
        }}
        title={planValidated
          ? 'Éditer le plan de base (modifier, dessiner, supprimer espaces)'
          : 'Base non verrouillée — cliquez pour terminer la phase Remodelage'}
      >
        <Pencil size={14} />
        <span>Éditer le plan</span>
        {!planValidated && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-bold uppercase tracking-wider">À valider</span>}
        {spacesCount > 0 && <span className="text-[10px] opacity-75">· {spacesCount} espaces</span>}
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
