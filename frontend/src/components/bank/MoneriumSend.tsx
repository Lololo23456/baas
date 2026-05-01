'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

const AUTH_MESSAGE = 'I hereby declare that I am the address owner.'

const CHAIN   = process.env.NEXT_PUBLIC_MONERIUM_CHAIN   ?? 'base'
const NETWORK = process.env.NEXT_PUBLIC_MONERIUM_NETWORK ?? 'sepolia'

type StoredSession = {
  profile: { id: string; accounts?: { iban?: string; chain: string; network: string }[] }
  access_token: string
}

function getSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem('monerium_session')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(s: StoredSession) {
  sessionStorage.setItem('monerium_session', JSON.stringify(s))
}

// Message que l'utilisateur signe pour autoriser l'ordre
function buildOrderMessage(amount: string, iban: string): string {
  const date = new Date().toUTCString()
  return `Send EUR ${amount} to ${iban} at ${date}`
}

// Valide un IBAN basiquement (longueur + alphanum)
function isValidIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,}$/.test(clean) && clean.length >= 15 && clean.length <= 34
}

type SendStep = 'idle' | 'authing' | 'signing' | 'submitting' | 'success' | 'error'

type Props = {
  /** Montant max que l'utilisateur peut envoyer (après retrait du coffre) */
  maxAmount?: string
}

export default function MoneriumSend({ maxAmount }: Props) {
  const { address }          = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [session,    setSession]    = useState<StoredSession | null>(null)
  const [iban,       setIban]       = useState('')
  const [name,       setName]       = useState('')
  const [amount,     setAmount]     = useState('')
  const [step,       setStep]       = useState<SendStep>('idle')
  const [error,      setError]      = useState<string | null>(null)
  const [orderId,    setOrderId]    = useState<string | null>(null)

  useEffect(() => {
    setSession(getSession())
  }, [])

  const isAuthed = !!session?.access_token
  const clientConfigured = !!process.env.NEXT_PUBLIC_MONERIUM_CLIENT_ID

  const handleAuth = async () => {
    if (!address || step !== 'idle') return
    setError(null)
    setStep('authing')
    try {
      const signature = await signMessageAsync({ message: AUTH_MESSAGE })
      const res = await fetch('/api/monerium/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Authentification échouée')
      const newSession = { profile: data.profile, access_token: data.access_token }
      saveSession(newSession)
      setSession(newSession)
      setStep('idle')
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) {
        setStep('idle')
      } else {
        setError('Authentification impossible. Réessaie.')
        setStep('error')
      }
    }
  }

  const handleSend = async () => {
    if (!address || !session?.access_token) return
    setError(null)

    const cleanIban = iban.replace(/\s/g, '').toUpperCase()
    if (!isValidIban(cleanIban)) {
      setError('IBAN invalide.')
      return
    }

    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Montant invalide.')
      return
    }
    if (maxAmount && numAmount > parseFloat(maxAmount)) {
      setError(`Maximum disponible : € ${maxAmount}`)
      return
    }

    // Format avec 2 décimales, ex: "100.00"
    const formattedAmount = numAmount.toFixed(2)
    const message = buildOrderMessage(formattedAmount, cleanIban)

    setStep('signing')
    try {
      // 1. Signer le message d'ordre (preuve d'autorisation)
      const signature = await signMessageAsync({ message })

      // 2. Soumettre l'ordre à Monerium via notre backend
      setStep('submitting')
      const res = await fetch('/api/monerium/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token:    session.access_token,
          address,
          signature,
          message,
          amount:          formattedAmount,
          iban:            cleanIban,
          beneficiaryName: name || 'Bénéficiaire',
          country:         cleanIban.slice(0, 2),
          chain:           CHAIN,
          network:         NETWORK,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ordre refusé')
      setOrderId(data.order?.id ?? null)
      setStep('success')
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) {
        setStep('idle')
      } else {
        setError(err instanceof Error ? err.message : 'Envoi impossible. Réessaie.')
        setStep('error')
      }
    }
  }

  // ── Succès ─────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{
        border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>✓</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
          Virement initié
        </p>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 8 }}>
          €&nbsp;{parseFloat(amount).toFixed(2)} vers {iban.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim()}
        </p>
        {orderId && (
          <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
            Ordre #{orderId}
          </p>
        )}
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 12, lineHeight: 1.6 }}>
          Arrivée sous 1–2 jours ouvrables. Monerium brûle l&apos;EURe et envoie les euros via SEPA.
        </p>
      </div>
    )
  }

  // ── Pas de client configuré ────────────────────────────────────────────────
  if (!clientConfigured) {
    return (
      <div style={{
        padding: '16px 20px', borderRadius: 10,
        background: '#FFF7ED', border: '1px solid #FED7AA',
      }}>
        <p style={{ fontSize: 12, color: '#92400E' }}>
          Intégration Monerium non configurée — ajoute <code>NEXT_PUBLIC_MONERIUM_CLIENT_ID</code> dans les variables d&apos;environnement.
        </p>
      </div>
    )
  }

  // ── Pas encore authentifié ─────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <div style={{
        border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', background: '#F8FAFC',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
          Connexion Monerium requise
        </p>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 16 }}>
          Une signature de wallet pour prouver la propriété de ton adresse — aucune redirection.
        </p>
        <button
          onClick={handleAuth}
          disabled={step === 'authing' || !address}
          className="b-btn"
          style={{ fontSize: 13, width: '100%' }}
        >
          {step === 'authing' ? 'Signature en cours…' : 'Connecter Monerium'}
        </button>
        {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{error}</p>}
      </div>
    )
  }

  // ── Formulaire d'envoi ─────────────────────────────────────────────────────
  const busy = step === 'signing' || step === 'submitting'

  return (
    <div>
      {/* IBAN destinataire */}
      <p className="b-label" style={{ marginBottom: 6 }}>IBAN DESTINATAIRE</p>
      <input
        className="b-input"
        placeholder="FR76 1234 5678 9012 3456 7890 123"
        value={iban}
        onChange={e => { setIban(e.target.value); setError(null); if (step === 'error') setStep('idle') }}
        disabled={busy}
        style={{ marginBottom: 12, fontFamily: 'monospace', letterSpacing: '0.04em' }}
      />

      {/* Nom bénéficiaire */}
      <p className="b-label" style={{ marginBottom: 6 }}>NOM DU BÉNÉFICIAIRE</p>
      <input
        className="b-input"
        placeholder="Jean Dupont"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={busy}
        style={{ marginBottom: 12 }}
      />

      {/* Montant */}
      <p className="b-label" style={{ marginBottom: 6 }}>MONTANT</p>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <span style={{
          position: 'absolute', left: 18, top: '50%',
          transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-3)',
          pointerEvents: 'none',
        }}>€</span>
        <input
          className="b-input"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => { setAmount(e.target.value); setError(null); if (step === 'error') setStep('idle') }}
          disabled={busy}
          style={{ paddingLeft: 36 }}
        />
      </div>
      {maxAmount && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Maximum disponible · €&nbsp;{parseFloat(maxAmount).toFixed(2)}
          </p>
          <button
            onClick={() => setAmount(maxAmount)}
            className="b-btn-ghost"
            style={{ fontSize: 11 }}
          >
            MAX
          </button>
        </div>
      )}

      {error && (
        <p role="alert" style={{
          fontSize: 12, color: 'var(--danger)',
          marginBottom: 16, padding: '10px 14px',
          background: 'rgba(229, 72, 77, 0.08)', borderRadius: 2,
        }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSend}
        disabled={busy || !iban || !amount}
        className="b-btn"
        style={{ width: '100%' }}
      >
        {step === 'signing'    ? 'SIGNATURE 1/2…'
          : step === 'submitting' ? 'ENVOI 2/2…'
          : 'ENVOYER PAR VIREMENT SEPA'}
      </button>

      <p className="mono" style={{
        fontSize: 10, color: 'var(--text-3)',
        marginTop: 12, textAlign: 'center', letterSpacing: '0.08em',
      }}>
        2 SIGNATURES · AUTORISATION + ORDRE DE PAIEMENT
      </p>
    </div>
  )
}
