'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

// Message standard Monerium pour lier un wallet à un compte
const MONERIUM_MESSAGE = 'I hereby declare that I am the address owner.'

// Environnement : sandbox (dev) ou production
const MONERIUM_BASE_URL = process.env.NEXT_PUBLIC_MONERIUM_BASE_URL ?? 'https://api.monerium.dev'
const MONERIUM_CLIENT_ID = process.env.NEXT_PUBLIC_MONERIUM_CLIENT_ID ?? ''
const MONERIUM_CHAIN   = process.env.NEXT_PUBLIC_MONERIUM_CHAIN   ?? 'base'
const MONERIUM_NETWORK = process.env.NEXT_PUBLIC_MONERIUM_NETWORK ?? 'sepolia'

type MoneriumAccount = {
  id: string
  address: string
  chain: string
  network: string
  iban?: string
  bic?: string
  currency: string
}

type MoneriumProfile = {
  id: string
  accounts?: MoneriumAccount[]
}

function getStoredProfile(): MoneriumProfile | null {
  try {
    const raw = sessionStorage.getItem('monerium_profile')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function generateState(): string {
  return crypto.randomUUID()
}

export default function MoneriumConnect() {
  const { address }            = useAccount()
  const { signMessageAsync }   = useSignMessage()
  const [profile,  setProfile] = useState<MoneriumProfile | null>(null)
  const [signing,  setSigning] = useState(false)
  const [error,    setError]   = useState<string | null>(null)

  // Charger le profil depuis sessionStorage si déjà connecté
  useEffect(() => {
    setProfile(getStoredProfile())

    const onStorage = () => setProfile(getStoredProfile())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Trouver le compte Base dans le profil
  const baseAccount = profile?.accounts?.find(
    a => a.chain === MONERIUM_CHAIN && a.network === MONERIUM_NETWORK
  ) ?? profile?.accounts?.[0]

  const handleConnect = async () => {
    if (!address || signing) return
    setError(null)
    setSigning(true)
    try {
      // 1. Signer le message pour prouver la propriété du wallet
      const signature = await signMessageAsync({ message: MONERIUM_MESSAGE })

      // 2. Générer un state aléatoire (protection CSRF)
      const state = generateState()
      sessionStorage.setItem('monerium_state', state)

      // 3. Construire l'URL d'autorisation Monerium
      const redirectUri = `${window.location.origin}/callback/monerium`
      const params = new URLSearchParams({
        client_id:     MONERIUM_CLIENT_ID,
        redirect_uri:  redirectUri,
        response_type: 'code',
        scope:         'openid',
        state,
        address,
        signature,
        chain:         MONERIUM_CHAIN,
        network:       MONERIUM_NETWORK,
      })

      // 4. Rediriger vers Monerium
      window.location.href = `${MONERIUM_BASE_URL}/auth?${params.toString()}`
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) {
        // Annulé par l'utilisateur
      } else {
        setError('Connexion impossible. Réessaie.')
      }
      setSigning(false)
    }
  }

  const handleDisconnect = () => {
    sessionStorage.removeItem('monerium_profile')
    setProfile(null)
  }

  // ── Pas encore connecté à Monerium ──────────────────────────────────────────
  if (!profile || !baseAccount?.iban) {
    return (
      <div style={{
        border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', background: '#F8FAFC',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 14, color: '#FFFFFF' }}>€</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
              Virement bancaire (SEPA)
            </p>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              Connecte Monerium pour recevoir un IBAN personnel.
              Tes euros arrivent sous forme d&apos;EURe dans ton portefeuille.
            </p>
          </div>
        </div>

        {!MONERIUM_CLIENT_ID ? (
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: '#FFF7ED', border: '1px solid #FED7AA',
          }}>
            <p style={{ fontSize: 12, color: '#92400E' }}>
              Intégration Monerium non configurée — ajoute les variables d&apos;environnement MONERIUM_CLIENT_ID.
            </p>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={signing || !address}
            className="b-btn"
            style={{ fontSize: 13, width: '100%' }}
          >
            {signing ? 'Signature en cours…' : 'Connecter Monerium'}
          </button>
        )}

        {error && (
          <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{error}</p>
        )}

        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, lineHeight: 1.6 }}>
          KYC géré par Monerium · Aucune donnée stockée par FinBank
        </p>
      </div>
    )
  }

  // ── Connecté — afficher l'IBAN ──────────────────────────────────────────────
  return (
    <div style={{
      border: '1px solid #E2E8F0', borderRadius: 12,
      padding: '20px 24px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot" />
          <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            IBAN Actif · Monerium
          </p>
        </div>
        <button
          onClick={handleDisconnect}
          style={{
            fontSize: 12, color: '#94A3B8', background: 'none',
            border: 'none', cursor: 'pointer',
          }}
        >
          Déconnecter
        </button>
      </div>

      {/* IBAN principal */}
      <div style={{
        background: '#F8FAFC', borderRadius: 8,
        padding: '16px 20px', marginBottom: 12,
      }}>
        <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          IBAN
        </p>
        <p style={{
          fontFamily: 'SF Mono, Menlo, monospace',
          fontSize: 16, fontWeight: 500, color: '#0F172A',
          letterSpacing: '0.04em', wordSpacing: 4,
        }}>
          {baseAccount.iban}
        </p>
        {baseAccount.bic && (
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
            BIC : {baseAccount.bic}
          </p>
        )}
      </div>

      {/* Copier le RIB */}
      <button
        onClick={() => navigator.clipboard.writeText(baseAccount.iban ?? '')}
        className="b-btn-outline"
        style={{ width: '100%', fontSize: 13, marginBottom: 16, padding: '12px 20px' }}
      >
        Copier l&apos;IBAN
      </button>

      {/* Instructions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { n: '1', t: 'Fais un virement SEPA depuis ta banque vers cet IBAN' },
          { n: '2', t: 'Monerium convertit tes euros en EURe (1:1, sans frais)' },
          { n: '3', t: 'Les EURe arrivent dans ton portefeuille Base sous ~1 jour ouvrable' },
          { n: '4', t: 'Dépose tes EURe dans le coffre et commence à générer du yield' },
        ].map(({ n, t }) => (
          <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: '#F1F5F9', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#64748B',
            }}>{n}</span>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{t}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
