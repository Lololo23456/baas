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
      background: '#FFFFFF',
      padding: '88px 24px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>FB</span>
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 600, color: '#0F172A',
            letterSpacing: '-0.02em', marginBottom: 10,
          }}>
            Connecte ton portefeuille
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            Authentifie-toi pour accéder à ton coffre souverain.
          </p>
        </div>

        {/* Connect options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cbWallet && (
            <button
              onClick={() => connect({ connector: cbWallet })}
              disabled={isPending}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 20px',
                background: '#0F172A', color: '#FFFFFF',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                opacity: isPending ? 0.6 : 1,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 18 }}>◉</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
                    {isPending ? 'Connexion…' : 'Passkey · Biométrie'}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                    Face ID · Sans phrase de récupération
                  </p>
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                RECOMMANDÉ
              </span>
            </button>
          )}

          {injected && (
            <button
              onClick={() => connect({ connector: injected })}
              disabled={isPending}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center',
                padding: '18px 20px', gap: 14,
                background: 'transparent', color: '#0F172A',
                border: '1.5px solid #E2E8F0', borderRadius: 12, cursor: 'pointer',
                opacity: isPending ? 0.5 : 1,
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>◇</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
                  Portefeuille navigateur
                </p>
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                  MetaMask · Rabby · Coinbase Wallet
                </p>
              </div>
            </button>
          )}

          {!hasAny && (
            <div style={{
              textAlign: 'center', padding: '24px',
              background: '#F8FAFC', borderRadius: 12,
              border: '1px solid #E2E8F0',
            }}>
              <p style={{ fontSize: 14, color: '#64748B', marginBottom: 12 }}>
                Aucun portefeuille détecté
              </p>
              <a
                href="https://www.coinbase.com/wallet"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13, color: '#0F172A', fontWeight: 600,
                  textDecoration: 'none', borderBottom: '1px solid #0F172A',
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
              background: 'rgba(220, 38, 38, 0.06)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: 10,
            }}
          >
            <p style={{ fontSize: 13, color: '#DC2626' }}>
              {error.message.includes('rejected') || error.message.includes('4001')
                ? 'Connexion annulée. Réessaie.'
                : 'Connexion impossible. Réessaie.'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 36, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.7 }}>
            Tu détiens tes clés. Personne ne peut bloquer ton accès.
          </p>
          <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 6, letterSpacing: '0.06em' }}>
            BASE SEPOLIA · RÉSEAU DE TEST
          </p>
        </div>

      </div>
    </div>
  )
}
