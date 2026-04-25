'use client'

import { useReadContract, useBlockNumber } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, VAULT_ABI, BASESCAN_URL } from '@/lib/contracts'

export default function LiveProofCard() {
  const { data: totalAssets } = useReadContract({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
  })

  // Poll every 12s (≈1 Base block) — avoids hammering the public RPC on every block event
  const { data: blockNumber } = useBlockNumber({
    watch: true,
    query: { refetchInterval: 12_000 },
  })

  const tvl = totalAssets !== undefined
    ? Number(formatUnits(totalAssets, 6)).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })
    : '···'

  return (
    <div style={{
      background: '#0F172A',
      borderRadius: 20,
      padding: '28px 28px',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot" />
          <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Live · Base Sepolia
          </span>
        </div>
        <a
          href={`${BASESCAN_URL}/address/${CONTRACTS.VAULT}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: '#475569', textDecoration: 'none' }}
        >
          Basescan ↗
        </a>
      </div>

      {/* Contract */}
      <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          FinBankVault.sol
        </p>
        <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>
          {CONTRACTS.VAULT}
        </p>
      </div>

      {/* totalAssets() call */}
      <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 11, color: '#475569', marginBottom: 6, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          totalAssets()
        </p>
        <p style={{
          fontSize: 32, fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '-0.025em',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          € {tvl}
        </p>
        <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
          Total member deposits
        </p>
      </div>

      {/* Protocol rules */}
      <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Protocol fee</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0' }}>15% of yield</span>
        </div>
        <p style={{ fontSize: 11, color: '#475569' }}>Fixed in code. Immutable. Cannot be raised without DAO vote.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748B' }}>Block</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>
          #{blockNumber?.toLocaleString() ?? '···'}
        </span>
      </div>
    </div>
  )
}
