'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount, useDisconnect } from 'wagmi'

export default function Navbar() {
  const pathname   = usePathname()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const inApp = pathname !== '/'

  // Dark brutalist mode for in-app routes
  const dark = inApp

  const bg     = dark ? 'rgba(10,10,10,0.85)'   : 'rgba(255,255,255,0.85)'
  const border = dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
  const textPrimary = dark ? '#F5F5F5' : '#0F172A'
  const textMuted   = dark ? '#888888' : '#64748B'
  const surface     = dark ? '#1A1A1A' : '#F1F5F9'

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: bg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${border}`,
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
            width: 28, height: 28, borderRadius: 2,
            background: dark ? '#F5F5F5' : '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: dark ? '#0A0A0A' : '#FFFFFF',
              letterSpacing: '-0.02em',
              fontFamily: 'SF Mono, Menlo, monospace',
            }}>FB</span>
          </div>
          <span style={{
            fontSize: dark ? 13 : 15,
            fontWeight: dark ? 500 : 600,
            color: textPrimary,
            letterSpacing: dark ? '0.04em' : '-0.01em',
            textTransform: dark ? 'uppercase' : 'none',
            fontFamily: dark ? 'SF Mono, Menlo, monospace' : 'inherit',
          }}>
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
                    fontSize: 12, fontWeight: 500,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: active ? textPrimary : textMuted,
                    background: active ? surface : 'transparent',
                    padding: '8px 14px', borderRadius: 2,
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
                fontSize: 11, fontFamily: 'SF Mono, Menlo, monospace',
                color: textMuted,
                background: surface,
                padding: '6px 10px', borderRadius: 2,
                letterSpacing: '-0.01em',
              }}>
                {address.slice(0, 6)}···{address.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                style={{
                  fontSize: 11, fontWeight: 500, color: textMuted,
                  background: 'none', border: 'none', cursor: 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  fontFamily: 'inherit',
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = textPrimary }}
                onMouseOut={(e)  => { e.currentTarget.style.color = textMuted }}
              >
                Sortir
              </button>
            </>
          ) : dark ? (
            // Hide CTA when already in app (it would just point to current page)
            null
          ) : (
            <Link href="/app" className="btn btn-dark" style={{ padding: '10px 20px', fontSize: 13 }}>
              Open App
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
