'use client'

import { useConnect } from 'wagmi'

export default function ConnectWallet() {
  const { connect, connectors, isPending, error } = useConnect()

  const cbWallet = connectors.find(c => c.id === 'coinbaseWalletSDK')
  const injected = connectors.find(c => c.id === 'injected')
  const hasAny   = cbWallet || injected

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '88px 24px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p className="b-label" style={{ marginBottom: 24 }}>FINBANK · COFFRE SOUVERAIN</p>
          <h1 style={{
            fontSize: 22, fontWeight: 500, color: 'var(--text)',
            letterSpacing: '-0.02em', marginBottom: 14,
            fontFamily: 'SF Mono, Menlo, monospace',
          }}>
            Authentification
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Authentifie-toi avec ta clé biométrique pour accéder à ton coffre.
          </p>
        </div>

        {/* Connect options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cbWallet && (
            <button
              onClick={() => connect({ connector: cbWallet })}
              disabled={isPending}
              className="b-btn"
              style={{
                width: '100%', justifyContent: 'space-between',
                padding: '20px 20px', fontSize: 12,
                opacity: isPending ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 14 }}>◉</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em' }}>
                    {isPending ? 'CONNEXION…' : 'PASSKEY · BIOMÉTRIE'}
                  </p>
                  <p className="mono" style={{
                    fontSize: 10, color: 'rgba(10,10,10,0.6)',
                    marginTop: 4, letterSpacing: 0, textTransform: 'none', fontWeight: 400,
                  }}>
                    Face ID · Sans phrase de récupération
                  </p>
                </div>
              </div>
              <span style={{ fontSize: 10, opacity: 0.6 }}>RECOMMANDÉ</span>
            </button>
          )}

          {injected && (
            <button
              onClick={() => connect({ connector: injected })}
              disabled={isPending}
              className="b-btn b-btn-outline"
              style={{
                width: '100%', justifyContent: 'flex-start',
                padding: '20px 20px', fontSize: 12, gap: 14,
                opacity: isPending ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 14 }}>◇</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.08em' }}>
                  PORTEFEUILLE NAVIGATEUR
                </p>
                <p className="mono" style={{
                  fontSize: 10, color: 'var(--text-3)',
                  marginTop: 4, letterSpacing: 0, textTransform: 'none',
                }}>
                  MetaMask · Rabby · Coinbase Wallet
                </p>
              </div>
            </button>
          )}

          {!hasAny && (
            <div className="b-surface" style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                Aucun portefeuille détecté
              </p>
              <a
                href="https://www.coinbase.com/wallet"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, color: 'var(--text)', fontWeight: 500,
                  borderBottom: '1px solid var(--line-strong)',
                  textDecoration: 'none', letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Installer Coinbase Wallet ↗
              </a>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              marginTop: 16, padding: '12px 16px',
              background: 'rgba(229, 72, 77, 0.08)',
              border: '1px solid rgba(229, 72, 77, 0.25)',
              borderRadius: 2,
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--danger)' }}>
              {error.message.includes('rejected') || error.message.includes('4001')
                ? 'Connexion annulée. Réessaie.'
                : 'Connexion impossible. Réessaie.'}
            </p>
          </div>
        )}

        {/* Self-custody reminder */}
        <div style={{
          marginTop: 40,
          padding: '16px 0',
          borderTop: '1px solid var(--line)',
        }}>
          <p style={{
            fontSize: 11, color: 'var(--text-2)', textAlign: 'center',
            lineHeight: 1.7, letterSpacing: '0.02em',
          }}>
            Tu détiens tes clés. Personne ne peut bloquer ton accès.
          </p>
          <p className="mono" style={{
            fontSize: 9, color: 'var(--text-3)', textAlign: 'center',
            marginTop: 8, letterSpacing: '0.1em',
          }}>
            BASE SEPOLIA · RÉSEAU DE TEST
          </p>
        </div>

      </div>
    </div>
  )
}
