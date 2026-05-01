'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

// Message standard Monerium pour prouver la propriété du wallet
const AUTH_MESSAGE = 'I hereby declare that I am the address owner.'

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

type StoredSession = {
  profile: MoneriumProfile
  access_token: string
}

const CHAIN   = process.env.NEXT_PUBLIC_MONERIUM_CHAIN   ?? 'base'
const NETWORK = process.env.NEXT_PUBLIC_MONERIUM_NETWORK ?? 'sepolia'

function getSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem('monerium_session')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(session: StoredSession) {
  sessionStorage.setItem('monerium_session', JSON.stringify(session))
}

function clearSession() {
  sessionStorage.removeItem('monerium_session')
}

export default function MoneriumConnect() {
  const { address }           = useAccount()
  const { signMessageAsync }  = useSignMessage()
  const [session,  setSession] = useState<StoredSession | null>(null)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState<string | null>(null)
  const [copied,   setCopied]  = useState(false)

  useEffect(() => {
    setSession(getSession())
  }, [])

  const baseAccount = session?.profile?.accounts?.find(
    a => a.chain === CHAIN && a.network === NETWORK
  ) ?? session?.profile?.accounts?.[0]

  const handleConnect = async () => {
    if (!address || loading) return
    setError(null)
    setLoading(true)
    try {
      const signature = await signMessageAsync({ message: AUTH_MESSAGE })

      const res = await fetch('/api/monerium/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Connexion échouée')

      const newSession: StoredSession = {
        profile:      data.profile,
        access_token: data.access_token,
      }
      saveSession(newSession)
      setSession(newSession)
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) {
        // Annulé — silencieux
      } else {
        setError('Connexion impossible. Réessaie.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    clearSession()
    setSession(null)
  }

  const handleCopy = () => {
    if (!baseAccount?.iban) return
    navigator.clipboard.writeText(baseAccount.iban)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clientConfigured = !!process.env.NEXT_PUBLIC_MONERIUM_CLIENT_ID

  // ── Pas encore connecté ────────────────────────────────────────────────────
  if (!session || !baseAccount?.iban) {
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
              Connecte Monerium pour obtenir un IBAN personnel.
              Les euros arrivent en EURe dans ton portefeuille.
            </p>
          </div>
        </div>

        {!clientConfigured ? (
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: '#FFF7ED', border: '1px solid #FED7AA',
          }}>
            <p style={{ fontSize: 12, color: '#92400E' }}>
              Intégration Monerium non configurée — ajoute <code>NEXT_PUBLIC_MONERIUM_CLIENT_ID</code> dans les variables d&apos;environnement.
            </p>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading || !address}
            className="b-btn"
            style={{ fontSize: 13, width: '100%' }}
          >
            {loading ? 'Signature en cours…' : 'Connecter Monerium'}
          </button>
        )}

        {error && (
          <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{error}</p>
        )}

        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, lineHeight: 1.6 }}>
          Une signature de wallet — aucune redirection, aucune donnée stockée par FinBank
        </p>
      </div>
    )
  }

  // ── Connecté — IBAN affiché ────────────────────────────────────────────────
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
          <span className="b-dot" />
          <p style={{
            fontSize: 11, fontWeight: 600, color: '#64748B',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            IBAN Actif · Monerium
          </p>
        </div>
        <button
          onClick={handleDisconnect}
          style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Déconnecter
        </button>
      </div>

      {/* IBAN */}
      <div style={{
        background: '#F8FAFC', borderRadius: 8,
        padding: '16px 20px', marginBottom: 12,
      }}>
        <p style={{
          fontSize: 11, color: '#94A3B8', marginBottom: 6,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>IBAN</p>
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

      <button
        onClick={handleCopy}
        className="b-btn-outline"
        style={{ width: '100%', fontSize: 13, marginBottom: 16, padding: '12px 20px' }}
      >
        {copied ? 'Copié ✓' : 'Copier l\'IBAN'}
      </button>

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
