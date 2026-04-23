import { Users, Circle, Clock, Activity } from 'lucide-react'

interface CollabUser {
  id: string
  name: string
  initials: string
  color: string
  lastActive: string
  isOnline: boolean
}

interface CollabActivity {
  id: string
  userId: string
  userName: string
  action: string
  entity: string
  timestamp: string
}

interface CollabSectionProps {
  projectName: string
  users: CollabUser[]
  activities: CollabActivity[]
  sessionStart: string
  isCollabEnabled: boolean
  onToggleCollab: () => void
}

export default function CollabSection({
  projectName, users, activities, sessionStart, isCollabEnabled, onToggleCollab,
}: CollabSectionProps) {
  const onlineUsers = users.filter((u) => u.isOnline)
  const duration = Math.round((Date.now() - new Date(sessionStart).getTime()) / 60000)

  return (
    <div className="flex flex-col h-full bg-surface-0">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-atlas-400 flex items-center gap-2">
            <Users className="w-4 h-4" /> Collaboration
          </h3>
          <button
            onClick={onToggleCollab}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              isCollabEnabled
                ? 'bg-atlas-600/20 text-atlas-300 border border-atlas-500/30'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
            }`}
          >
            {isCollabEnabled ? 'Actif' : 'Desactive'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Session Info */}
        <div className="bg-surface-1/50 border border-gray-800 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Projet</span>
            <span className="text-gray-300">{projectName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Session</span>
            <span className="text-gray-300">{duration} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Collaborateurs</span>
            <span className="text-atlas-400 font-semibold">{onlineUsers.length} en ligne</span>
          </div>
        </div>

        {/* Users */}
        <div>
          <div className="text-[10px] text-gray-500 font-mono mb-2">UTILISATEURS</div>
          <div className="space-y-1.5">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-surface-1/50">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.initials}
                </div>
                <span className="flex-1 text-xs text-gray-300">{user.name}</span>
                <Circle
                  className={`w-2.5 h-2.5 ${user.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-600 fill-gray-600'}`}
                />
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-xs text-gray-600 text-center py-4">
                Aucun collaborateur connecte
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div>
          <div className="text-[10px] text-gray-500 font-mono mb-2 flex items-center gap-1">
            <Activity className="w-3 h-3" /> ACTIVITE RECENTE
          </div>
          <div className="space-y-1">
            {activities.map((act) => (
              <div key={act.id} className="text-[11px] text-gray-400 py-1 border-l-2 border-gray-800 pl-2">
                <span className="text-gray-500">{act.userName}</span>{' '}
                <span>{act.action}</span>{' '}
                <span className="text-atlas-400">{act.entity}</span>
                <div className="text-[9px] text-gray-600 flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(act.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-xs text-gray-600 text-center py-4">Aucune activite</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
