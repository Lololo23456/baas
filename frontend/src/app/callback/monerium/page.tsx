'use client'

// OAuth Monerium abandonné — on utilise désormais la signature de wallet directement.
// Cette page redirige vers l'app si quelqu'un atterrit ici par erreur.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MoneriumCallbackPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/app') }, [router])
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <p style={{ fontSize: 14, color: '#64748B' }}>Redirection…</p>
    </div>
  )
}
