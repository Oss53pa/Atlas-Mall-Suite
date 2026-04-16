// ═══ GEO-NOTIFICATION PANEL — Zone-based notification management ═══

import React, { useState, useCallback } from 'react'
import { Bell, BellOff, Plus, X, MapPin, Gift, Navigation, Info, Trash2 } from 'lucide-react'

export interface GeoNotification {
  id: string
  zoneId: string
  zoneName: string
  triggerRadius: number  // meters
  message: string
  type: 'promo' | 'info' | 'cosmos_club' | 'navigation'
  cosmosClubPoints?: number
  active: boolean
}

interface GeoNotificationPanelProps {
  notifications: GeoNotification[]
  onAdd: (notif: Omit<GeoNotification, 'id'>) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  zones: { id: string; label: string }[]
}

export default function GeoNotificationPanel({
  notifications, onAdd, onToggle, onDelete, zones,
}: GeoNotificationPanelProps) {
  const TYPE_CONFIG: Record<GeoNotification['type'], { icon: typeof Bell; color: string; label: string }> = {
    promo: { icon: Gift, color: 'text-amber-400', label: 'Promotion' },
    info: { icon: Info, color: 'text-blue-400', label: 'Information' },
    cosmos_club: { icon: MapPin, color: 'text-purple-400', label: 'Cosmos Club' },
    navigation: { icon: Navigation, color: 'text-emerald-400', label: 'Navigation' },
  }

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    zoneId: '',
    message: '',
    type: 'promo' as GeoNotification['type'],
    triggerRadius: 10,
    cosmosClubPoints: 0,
  })

  const handleSubmit = useCallback(() => {
    if (!form.zoneId || !form.message) return
    const zone = zones.find(z => z.id === form.zoneId)
    onAdd({
      zoneId: form.zoneId,
      zoneName: zone?.label ?? form.zoneId,
      triggerRadius: form.triggerRadius,
      message: form.message,
      type: form.type,
      cosmosClubPoints: form.cosmosClubPoints > 0 ? form.cosmosClubPoints : undefined,
      active: true,
    })
    setForm({ zoneId: '', message: '', type: 'promo', triggerRadius: 10, cosmosClubPoints: 0 })
    setShowForm(false)
  }, [form, zones, onAdd])

  const activeCount = notifications.filter(n => n.active).length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-white">Notifications geolocalisees</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-300 border border-amber-500/30">
            {activeCount} actives
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 transition-colors"
        >
          {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showForm ? 'Annuler' : 'Ajouter'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Zone declenchante</label>
            <select
              value={form.zoneId}
              onChange={e => setForm(f => ({ ...f, zoneId: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
            >
              <option value="">Selectionner une zone...</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Type</label>
            <div className="flex gap-1">
              {(Object.keys(TYPE_CONFIG) as GeoNotification['type'][]).map(t => {
                const cfg = TYPE_CONFIG[t]
                return (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                      form.type === t
                        ? `bg-gray-700 ${cfg.color} border border-gray-600`
                        : 'bg-gray-800 text-gray-500 border border-transparent hover:bg-gray-700'
                    }`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Message</label>
            <input
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Ex: -20% sur votre prochain achat!"
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 block mb-1">Rayon (m)</label>
              <input
                type="number"
                value={form.triggerRadius}
                onChange={e => setForm(f => ({ ...f, triggerRadius: Number(e.target.value) }))}
                min={1}
                max={50}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
              />
            </div>
            {form.type === 'cosmos_club' && (
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-1">Points CC</label>
                <input
                  type="number"
                  value={form.cosmosClubPoints}
                  onChange={e => setForm(f => ({ ...f, cosmosClubPoints: Number(e.target.value) }))}
                  min={0}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.zoneId || !form.message}
            className="w-full px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded text-xs font-medium transition-colors"
          >
            Creer la notification
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {notifications.length === 0 && !showForm && (
          <p className="text-[10px] text-gray-600 text-center py-4">
            Aucune notification configuree.
          </p>
        )}
        {notifications.map(notif => {
          const cfg = TYPE_CONFIG[notif.type]
          const Icon = cfg.icon
          return (
            <div
              key={notif.id}
              className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${
                notif.active
                  ? 'bg-gray-800/60 border-gray-700/50'
                  : 'bg-gray-900/40 border-gray-800/30 opacity-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-white truncate">{notif.zoneName}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-gray-700 text-gray-400">{notif.triggerRadius}m</span>
                </div>
                <p className="text-[10px] text-gray-400 truncate">{notif.message}</p>
                {notif.cosmosClubPoints && (
                  <span className="text-[9px] text-purple-400">+{notif.cosmosClubPoints} pts Cosmos Club</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onToggle(notif.id)}
                  className="text-gray-500 hover:text-gray-300"
                  title={notif.active ? 'Desactiver' : 'Activer'}
                >
                  {notif.active ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => onDelete(notif.id)}
                  className="text-gray-500 hover:text-red-400"
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
