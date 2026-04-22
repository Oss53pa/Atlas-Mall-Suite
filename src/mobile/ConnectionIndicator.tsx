// ═══ CONNECTION INDICATOR ═══

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { getPendingSyncCount } from './OfflineSync'

export default function ConnectionIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    const iv = setInterval(async () => setPending(await getPendingSyncCount()), 5000)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(iv) }
  }, [])

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${online ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
      {online ? <Wifi size={12} /> : <WifiOff size={12} />}
      <span>{online ? 'En ligne' : 'Hors ligne'}</span>
      {pending > 0 && <span className="flex items-center gap-0.5 ml-1 text-amber-400"><RefreshCw size={10} />{pending}</span>}
    </div>
  )
}
