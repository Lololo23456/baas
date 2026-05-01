'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSignMessage } from 'wagmi'
import {
  MoneriumSession, MoneriumAccount,
  getSession, clearSession,
  saveOAuthState, generatePKCE, savePKCEVerifier,
  MONERIUM_BASE_URL, MONERIUM_CLIENT_ID,
  MONERIUM_CHAIN, MONERIUM_NETWORK, AUTH_MESSAGE,
} from '@/lib/monerium'

// Trouve le compte correspondant au réseau configuré
export function pickAccount(session: MoneriumSession | null): MoneriumAccount | undefined {
  if (!session) return undefined
  return session.profile.accounts?.find(
    a => a.chain === MONERIUM_CHAIN && a.network === MONERIUM_NETWORK
  ) ?? session.profile.accounts?.[0]
}

export type MoneriumOAuthHook = {
  session:   MoneriumSession | null
  account:   MoneriumAccount | undefined
  ready:     boolean           // client_id configuré
  loading:   boolean
  error:     string | null
  connect:   (address: string) => Promise<void>
  disconnect: () => void
}

export function useMoneriumOAuth(): MoneriumOAuthHook {
  const { signMessageAsync }     = useSignMessage()
  const [session,  setSession]   = useState<MoneriumSession | null>(null)
  const [loading,  setLoading]   = useState(false)
  const [error,    setError]     = useState<string | null>(null)

  // Charge la session depuis localStorage au montage
  useEffect(() => {
    setSession(getSession())

    // Écoute les changements localStorage (callback popup → main window)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'monerium_session') {
        setSession(e.newValue ? JSON.parse(e.newValue) : null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const connect = useCallback(async (address: string) => {
    if (!MONERIUM_CLIENT_ID || loading) return
    setError(null)
    setLoading(true)
    try {
      // 1. Signer le message pour lier le wallet au compte Monerium
      const signature = await signMessageAsync({ message: AUTH_MESSAGE })

      // 2. Générer state CSRF + PKCE (pas de client_secret chez Monerium)
      const state = crypto.randomUUID()
      saveOAuthState(state)
      const { verifier, challenge } = await generatePKCE()
      savePKCEVerifier(verifier)

      // 3. Construire l'URL OAuth Monerium
      const redirectUri = `${window.location.origin}/callback/monerium`
      const params = new URLSearchParams({
        client_id:             MONERIUM_CLIENT_ID,
        redirect_uri:          redirectUri,
        response_type:         'code',
        scope:                 'openid',
        state,
        address,
        signature,
        chain:                 MONERIUM_CHAIN,
        network:               MONERIUM_NETWORK,
        code_challenge:        challenge,
        code_challenge_method: 'S256',
      })

      // 4. Ouvrir en popup — l'utilisateur reste sur FinBank
      const w = 520, h = 700
      const left = Math.round(window.screenX + (window.outerWidth  - w) / 2)
      const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
      const popup = window.open(
        `${MONERIUM_BASE_URL}/auth?${params}`,
        'monerium_oauth',
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
      )

      if (!popup) {
        // Popup bloquée — fallback redirect
        window.location.href = `${MONERIUM_BASE_URL}/auth?${params}`
        return
      }

      // 5. Surveiller la fermeture de la popup
      // La callback page écrit en localStorage → l'événement 'storage' met à jour le state
      // On se contente de surveiller la fermeture pour arrêter le loading
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer)
          const s = getSession()
          if (!s) setError('Connexion annulée ou échouée. Réessaie.')
          setLoading(false)
        }
      }, 400)
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) {
        // Annulé par l'utilisateur — silencieux
      } else {
        setError('Connexion impossible. Réessaie.')
      }
      setLoading(false)
    }
  }, [loading, signMessageAsync])

  const disconnect = useCallback(() => {
    clearSession()
    setSession(null)
    setError(null)
  }, [])

  return {
    session,
    account:    pickAccount(session),
    ready:      !!MONERIUM_CLIENT_ID,
    loading,
    error,
    connect,
    disconnect,
  }
}
