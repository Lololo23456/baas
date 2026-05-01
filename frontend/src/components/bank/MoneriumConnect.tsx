'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useMoneriumOAuth } from './useMoneriumOAuth'

export default function MoneriumConnect() {
  const { address }                              = useAccount()
  const { session, account, ready, loading, error, connect, disconnect } = useMoneriumOAuth()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!account?.iban) return
    navigator.clipboard.writeText(account.iban)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Monerium non configuré ─────────────────────────────────────────────────
  if (!ready) {
    return (
      <div style={{
        border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '28px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 28, marginBottom: 12 }}>🏦</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
          Virement SEPA — bientôt disponible
        </p>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
          Ajoute <code style={{ fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>NEXT_PUBLIC_MONERIUM_CLIENT_ID</code> dans les variables d&apos;environnement Vercel.
        </p>
      </div>
    )
  }

  // ── Connecté — afficher l'IBAN ─────────────────────────────────────────────
  if (session && account?.iban) {
    return (
      <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="b-dot" />
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              IBAN Actif · Monerium
            </p>
          </div>
          <button
            onClick={disconnect}
            style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Déconnecter
          </button>
        </div>

        <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>IBAN</p>
          <p style={{ fontFamily: 'SF Mono, Menlo, monospace', fontSize: 16, fontWeight: 500, color: '#0F172A', letterSpacing: '0.04em', wordSpacing: 4 }}>
            {account.iban}
          </p>
          {account.bic && (
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>BIC : {account.bic}</p>
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
            { n: '4', t: 'Dépose tes EURe dans le coffre pour générer du yield' },
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

  // ── Pas encore connecté ────────────────────────────────────────────────────
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
            Reçois des virements SEPA
          </p>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Connecte Monerium pour obtenir ton IBAN personnel. Tu restes sur FinBank — une popup s&apos;ouvre.
          </p>
        </div>
      </div>

      <button
        onClick={() => address && connect(address)}
        disabled={loading || !address}
        className="b-btn"
        style={{ fontSize: 13, width: '100%' }}
      >
        {loading ? 'En attente de la popup…' : 'Obtenir mon IBAN'}
      </button>

      {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{error}</p>}

      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, lineHeight: 1.6 }}>
        KYC géré par Monerium · Une popup s&apos;ouvre, tu restes sur FinBank
      </p>
    </div>
  )
}
