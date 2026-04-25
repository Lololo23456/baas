'use client'

import { useConnect } from 'wagmi'

export default function ConnectWallet() {
  const { connect, connectors, isPending, error } = useConnect()

  const cbWallet = connectors.find(c => c.id === 'coinbaseWalletSDK')
  const injected  = connectors.find(c => c.id === 'injected')
  const hasAny    = cbWallet || injected

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8FAFC',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>FB</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Welcome to FinBank
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            Connect your wallet to access your account
          </p>
        </div>

        {/* Connect options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cbWallet && (
            <button
              onClick={() => connect({ connector: cbWallet })}
              disabled={isPending}
              className="btn btn-dark"
              style={{ width: '100%', justifyContent: 'flex-start', gap: 14, padding: '16px 20px', opacity: isPending ? 0.7 : 1 }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                {isPending ? '⏳' : '🔑'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', lineHeight: 1 }}>
                  {isPending ? 'Connecting…' : 'Base Smart Wallet'}
                </p>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                  Face ID · No seed phrase
                </p>
              </div>
              {!isPending && (
                <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: 12 }}>
                  Recommended
                </span>
              )}
            </button>
          )}

          {injected && (
            <button
              onClick={() => connect({ connector: injected })}
              disabled={isPending}
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'flex-start', gap: 14, padding: '16px 20px', opacity: isPending ? 0.5 : 1 }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                🦊
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>
                  MetaMask / Browser Wallet
                </p>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                  Injected provider
                </p>
              </div>
            </button>
          )}

          {/* No wallet detected */}
          {!hasAny && (
            <div style={{
              textAlign: 'center', padding: '24px',
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14,
            }}>
              <p style={{ fontSize: 14, color: '#64748B', marginBottom: 8 }}>No wallet detected</p>
              <a
                href="https://www.coinbase.com/wallet"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}
              >
                Install Coinbase Wallet ↗
              </a>
            </div>
          )}
        </div>

        {/* Connection error */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              marginTop: 16, padding: '12px 16px',
              background: '#FEF2F2', border: '1px solid #FECDD3',
              borderRadius: 10,
            }}
          >
            <p style={{ fontSize: 13, color: '#EF4444' }}>
              {error.message.includes('rejected') || error.message.includes('4001')
                ? 'Connection rejected. Please try again.'
                : 'Connection failed. Please try again.'}
            </p>
          </div>
        )}

        {/* Fine print */}
        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 28, lineHeight: 1.6 }}>
          By connecting, you agree to interact with smart contracts
          on Base Sepolia (testnet).
        </p>

      </div>
    </div>
  )
}
