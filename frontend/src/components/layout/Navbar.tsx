'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount, useDisconnect } from 'wagmi'

export default function Navbar() {
  const pathname          = usePathname()
  const { address, isConnected } = useAccount()
  const { disconnect }    = useDisconnect()
  const inApp             = pathname !== '/'

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <nav
        aria-label="Main navigation"
        style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 24px', height: 64,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>FB</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>
            FinBank
          </span>
        </Link>

        {/* Center nav — only inside app */}
        {inApp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[
              { href: '/app',        label: 'Coffre' },
              { href: '/stake',      label: 'Stake' },
              { href: '/governance', label: 'Vote' },
            ].map(({ href, label }) => {
              const active = pathname === href || (href !== '/app' && pathname?.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontSize: 14, fontWeight: active ? 600 : 400,
                    color: active ? '#0F172A' : '#64748B',
                    background: active ? '#F1F5F9' : 'transparent',
                    padding: '8px 14px', borderRadius: 8,
                    textDecoration: 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        )}

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isConnected && address ? (
            <>
              <span style={{
                fontSize: 12, fontFamily: 'SF Mono, Menlo, monospace',
                color: '#64748B',
                background: '#F1F5F9',
                padding: '6px 10px', borderRadius: 8,
              }}>
                {address.slice(0, 6)}···{address.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                style={{
                  fontSize: 13, fontWeight: 500, color: '#64748B',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#0F172A' }}
                onMouseOut={(e)  => { e.currentTarget.style.color = '#64748B' }}
              >
                Déconnexion
              </button>
            </>
          ) : !inApp ? (
            <Link href="/app" className="btn btn-dark" style={{ padding: '10px 20px', fontSize: 13 }}>
              Open App
            </Link>
          ) : null}
        </div>
      </nav>
    </header>
  )
}
