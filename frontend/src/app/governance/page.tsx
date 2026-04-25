'use client'

import Link from 'next/link'

export default function GovernancePage() {
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
        <div style={{ maxWidth: 480 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 22,
            }}>
              🏛️
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.025em', marginBottom: 12 }}>
              DAO Governance
            </h1>
            <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7 }}>
              $FBK holders vote on protocol parameters. Proposals pass with a
              quorum and are executed automatically on-chain — no intermediaries.
            </p>
          </div>

          {/* What DAO controls */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              What the DAO can vote on
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Approve or revoke KYC attestors',
                'Adjust the protocol fee (currently 15% of yield)',
                'Deploy yield to new Morpho Blue markets',
                'Upgrade contracts via timelock',
                'Allocate treasury funds',
              ].map(item => (
                <div key={item} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '12px 16px',
                }}>
                  <span style={{ color: '#22C55E', fontSize: 14, flexShrink: 0 }}>✓</span>
                  <p style={{ fontSize: 13, color: '#0F172A' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What DAO cannot do */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              What the DAO can never do
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Block withdrawals — hard-coded in contract',
                'Confiscate user funds',
                'Change a user\'s balance without deposit/withdraw',
              ].map(item => (
                <div key={item} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#FFF1F2',
                  border: '1px solid #FECDD3',
                  borderRadius: 10,
                  padding: '12px 16px',
                }}>
                  <span style={{ color: '#F43F5E', fontSize: 14, flexShrink: 0 }}>✗</span>
                  <p style={{ fontSize: 13, color: '#0F172A' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
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
              marginBottom: 24,
            }}>
              Voting UI — Coming in V2
            </div>
            <div>
              <Link href="/app" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
                ← Back to account
              </Link>
            </div>
          </div>

        </div>
      </div>
  )
}
