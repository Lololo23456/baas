'use client'

import Link from 'next/link'

export default function StakePage() {
  return (
    <div style={{
        paddingTop: 64,
        minHeight: '100vh',
        background: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px',
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 22,
          }}>
            🔒
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.025em', marginBottom: 12 }}>
            $FBK Staking
          </h1>
          <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, marginBottom: 8 }}>
            Lock your $FBK tokens to receive $veFBK — vote-escrowed governance power.
          </p>
          <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, marginBottom: 32 }}>
            Longer locks = more voting weight + higher yield share. Lock periods: 1 week to 4 years.
          </p>
          <div style={{
            display: 'inline-flex',
            background: '#E2E8F0',
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: 12,
            fontWeight: 600,
            color: '#64748B',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 32,
          }}>
            Coming in V2
          </div>
          <div>
            <Link href="/app" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
              ← Back to account
            </Link>
          </div>
        </div>
      </div>
  )
}
