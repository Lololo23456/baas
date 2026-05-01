'use client'

// Page de callback OAuth Monerium.
// S'ouvre dans une popup — échange le code, écrit la session en localStorage, ferme la popup.
// La fenêtre parente (FinBank) détecte le changement via l'événement 'storage'.

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveSession, popOAuthState, popPKCEVerifier } from '@/lib/monerium'

function MoneriumCallback() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code  = searchParams.get('code')
    const state = searchParams.get('state')

    // Vérification CSRF
    const storedState = popOAuthState()
    if (state && storedState && state !== storedState) {
      setError('State invalide — tentative de CSRF détectée.')
      return
    }

    if (!code) {
      setError('Code OAuth manquant.')
      return
    }

    const codeVerifier = popPKCEVerifier()
    const redirectUri  = `${window.location.origin}/callback/monerium`

    fetch('/api/monerium/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri, codeVerifier }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)

        // Stocker en localStorage — accessible par la fenêtre parente via l'événement 'storage'
        saveSession({ profile: data.profile, access_token: data.access_token })

        // Fermer la popup si on y est, sinon retourner à l'app
        if (window.opener) {
          window.close()
        } else {
          router.replace('/app')
        }
      })
      .catch(err => setError(err.message ?? 'Connexion Monerium échouée.'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#FFFFFF',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
        {!error ? (
          <>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 8 }}>
              Connexion Monerium en cours…
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>
              Cette fenêtre se ferme automatiquement.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: '#DC2626', marginBottom: 16 }}>{error}</p>
            <button
              onClick={() => window.opener ? window.close() : router.replace('/app')}
              style={{ fontSize: 13, color: '#0F172A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Fermer
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 14, color: '#64748B' }}>Chargement…</p>
      </div>
    }>
      <MoneriumCallback />
    </Suspense>
  )
}
