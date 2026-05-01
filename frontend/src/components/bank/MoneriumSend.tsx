'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useMoneriumOAuth } from './useMoneriumOAuth'
import { buildOrderMessage, isValidIban, MONERIUM_CHAIN, MONERIUM_NETWORK } from '@/lib/monerium'

type SendStep = 'idle' | 'signing' | 'submitting' | 'success' | 'error'

type Props = {
  maxAmount?: string
}

export default function MoneriumSend({ maxAmount }: Props) {
  const { address }          = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { session, account, ready, loading: oauthLoading, error: oauthError, connect } = useMoneriumOAuth()

  const [iban,   setIban]   = useState('')
  const [name,   setName]   = useState('')
  const [amount, setAmount] = useState('')
  const [step,   setStep]   = useState<SendStep>('idle')
  const [error,  setError]  = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  // ── Monerium non configuré ─────────────────────────────────────────────────
  if (!ready) {
    return (
      <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 28, marginBottom: 12 }}>🏦</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
          Virement SEPA — bientôt disponible
        </p>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
          Ajoute <code style={{ fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>NEXT_PUBLIC_MONERIUM_CLIENT_ID</code> dans Vercel pour activer les virements SEPA.
        </p>
      </div>
    )
  }

  // ── Succès ─────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>✓</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>Virement initié</p>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 8 }}>
          €&nbsp;{parseFloat(amount).toFixed(2)} vers{' '}
          {iban.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim()}
        </p>
        {orderId && (
          <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>Ordre #{orderId}</p>
        )}
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 12, lineHeight: 1.6 }}>
          Arrivée sous 1–2 jours ouvrables via SEPA.
        </p>
      </div>
    )
  }

  // ── Pas connecté à Monerium — demander la connexion OAuth ─────────────────
  if (!session || !account) {
    return (
      <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', background: '#F8FAFC' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 14, color: '#FFFFFF' }}>€</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
              Connexion Monerium requise
            </p>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              Pour envoyer un virement SEPA, connecte d&apos;abord ton compte Monerium. Une popup s&apos;ouvre — tu restes sur FinBank.
            </p>
          </div>
        </div>

        <button
          onClick={() => address && connect(address)}
          disabled={oauthLoading || !address}
          className="b-btn"
          style={{ fontSize: 13, width: '100%' }}
        >
          {oauthLoading ? 'En attente de la popup…' : 'Connecter Monerium'}
        </button>

        {oauthError && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{oauthError}</p>}

        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 12 }}>
          KYC géré par Monerium · Une popup s&apos;ouvre, tu restes sur FinBank
        </p>
      </div>
    )
  }

  // ── Formulaire d'envoi ─────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!address || !session.access_token) return
    setError(null)

    const cleanIban = iban.replace(/\s/g, '').toUpperCase()
    if (!isValidIban(cleanIban)) { setError('IBAN invalide.'); return }

    const num = parseFloat(amount)
    if (!amount || isNaN(num) || num <= 0) { setError('Montant invalide.'); return }
    if (maxAmount && num > parseFloat(maxAmount)) {
      setError(`Maximum disponible : € ${maxAmount}`); return
    }

    const formattedAmount = num.toFixed(2)
    const message = buildOrderMessage(formattedAmount, cleanIban)

    setStep('signing')
    try {
      const signature = await signMessageAsync({ message })

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
          chain:           MONERIUM_CHAIN,
          network:         MONERIUM_NETWORK,
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

  const busy = step === 'signing' || step === 'submitting'

  return (
    <div>
      {/* Compte Monerium connecté */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 20, padding: '10px 14px',
        background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
      }}>
        <span className="b-dot" />
        <p style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>
          Monerium connecté{account.iban ? ` · ${account.iban.slice(0, 8)}…` : ''}
        </p>
      </div>

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
          transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-3)', pointerEvents: 'none',
        }}>€</span>
        <input
          className="b-input"
          type="number" min="0" step="0.01" placeholder="0.00"
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
          <button onClick={() => setAmount(maxAmount)} className="b-btn-ghost" style={{ fontSize: 11 }}>
            MAX
          </button>
        </div>
      )}

      {error && (
        <p role="alert" style={{
          fontSize: 12, color: 'var(--danger)',
          marginBottom: 16, padding: '10px 14px',
          background: 'rgba(229,72,77,0.08)', borderRadius: 2,
        }}>{error}</p>
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

      <p className="mono" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 12, textAlign: 'center', letterSpacing: '0.08em' }}>
        2 SIGNATURES · AUTORISATION + ORDRE DE PAIEMENT
      </p>
    </div>
  )
}
