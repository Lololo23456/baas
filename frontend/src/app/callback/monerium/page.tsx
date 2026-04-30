'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function MoneriumCallback() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    const code        = searchParams.get('code')
    const state       = searchParams.get('state')
    const storedState = sessionStorage.getItem('monerium_state')

    if (!code) {
      setError('Code OAuth manquant.')
      setStatus('error')
      return
    }

    if (state !== storedState) {
      setError('State invalide — tentative de CSRF détectée.')
      setStatus('error')
      return
    }

    const redirectUri = `${window.location.origin}/callback/monerium`

    fetch('/api/monerium/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        sessionStorage.setItem('monerium_profile', JSON.stringify(data.profile))
        sessionStorage.removeItem('monerium_state')
        // Si on est dans une popup, se fermer — la fenêtre parente détecte la fermeture
        if (window.opener) {
          window.close()
        } else {
          router.replace('/app')
        }
      })
      .catch(err => {
        setError(err.message ?? 'Connexion Monerium échouée.')
        setStatus('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#FFFFFF', paddingTop: 64,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        {status === 'loading' ? (
          <>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 8 }}>
              Connexion Monerium en cours…
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>
              Récupération de ton IBAN
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: '#DC2626', marginBottom: 16 }}>{error}</p>
            <button
              onClick={() => router.replace('/app')}
              style={{
                fontSize: 13, color: '#0F172A', background: 'none',
                border: 'none', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Retourner au coffre
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function MoneriumCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 14, color: '#64748B' }}>Chargement…</p>
      </div>
    }>
      <MoneriumCallback />
    </Suspense>
  )
}
