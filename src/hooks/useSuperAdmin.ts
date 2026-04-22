// ═══ useSuperAdmin — Hook pour vérifier le rôle super_admin ═══
//
// Lit `app_metadata.is_super_admin` de la session Supabase courante.
// Utilisable pour conditionner l'affichage de panneaux admin, de boutons
// "force delete", de l'accès aux logs d'audit, etc.
//
// Usage :
//   const isSuperAdmin = useSuperAdmin()
//   if (isSuperAdmin) return <AdminPanel />

import { useEffect, useState } from 'react'
import { supabase, isOfflineMode } from '../lib/supabase'

export function useSuperAdmin(): boolean {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    if (isOfflineMode) return

    // État initial depuis la session active
    void supabase.auth.getSession().then(({ data }) => {
      const flag = data.session?.user?.app_metadata?.is_super_admin === true
      setIsSuperAdmin(flag)
    })

    // Réagit aux changements d'auth (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const flag = session?.user?.app_metadata?.is_super_admin === true
      setIsSuperAdmin(flag)
    })

    return () => { listener.subscription.unsubscribe() }
  }, [])

  return isSuperAdmin
}
