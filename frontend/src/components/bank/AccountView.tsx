'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi'
import { readContract, waitForTransactionReceipt } from 'wagmi/actions'
import { formatUnits, parseUnits } from 'viem'
import { config } from '@/lib/wagmi'
import {
  CONTRACTS, VAULT_ABI, ERC20_ABI, DISTRIBUTOR_ABI, EAS_CHECKER_ABI, BASESCAN_URL,
} from '@/lib/contracts'

/* ── Types ──────────────────────────────────────────────────── */
type Tab         = 'overview' | 'onchain'
type DepositStep = 'idle' | 'approving' | 'depositing' | 'success' | 'error'
type WithdrawStep= 'idle' | 'withdrawing' | 'success' | 'error'

/* ── Safe input parser ──────────────────────────────────────── */
function safeParseUnits(value: string, decimals: number): bigint | null {
  try {
    if (!value || value.trim() === '') return null
    const num = Number(value)
    if (!isFinite(num) || num <= 0) return null
    // Truncate extra decimals to avoid parseUnits throwing
    const [int, frac = ''] = value.split('.')
    const sanitized = frac.length > 0
      ? `${int}.${frac.slice(0, decimals)}`
      : int
    return parseUnits(sanitized, decimals)
  } catch {
    return null
  }
}

/* ── Error message extractor ────────────────────────────────── */
function extractError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('4001')) {
      return 'Transaction rejected in wallet.'
    }
    if (msg.includes('NotAuthorized') || msg.includes('not authorized') || msg.includes('isAuthorized')) {
      return 'Account not verified. KYC verification is required to deposit.'
    }
    if (msg.includes('insufficient')) return 'Insufficient balance.'
    if (msg.includes('reverted'))     return 'Transaction reverted — check your balance and network.'
  }
  return 'Transaction failed. Please try again.'
}

/* ── Formatters ─────────────────────────────────────────────── */
// Vault shares and EURC both use 6 decimals (FinBankVault.sol: uint8 public decimals = 6)
const fmt6 = (v?: bigint) =>
  v !== undefined
    ? Number(formatUnits(v, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '···'

const fmt18 = (v?: bigint) =>
  v !== undefined
    ? Number(formatUnits(v, 18)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    : '···'

/* ═══════════════════════════════════════════════════════════ */
export default function AccountView() {
  const { address } = useAccount()
  const chainId = useChainId()
  const isTestnet = chainId === 84532 // Base Sepolia

  const [tab,          setTab]          = useState<Tab>('overview')
  const [activeModal,  setActiveModal]  = useState<'deposit' | 'withdraw' | null>(null)

  // Deposit state
  const [depositAmount, setDepositAmount] = useState('')
  const [depositStep,   setDepositStep]   = useState<DepositStep>('idle')
  const [depositError,  setDepositError]  = useState<string | null>(null)

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawStep,   setWithdrawStep]   = useState<WithdrawStep>('idle')
  const [withdrawError,  setWithdrawError]  = useState<string | null>(null)

  // Claim state
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  // Faucet state (testnet only)
  const [minting, setMinting] = useState(false)
  const [mintSuccess, setMintSuccess] = useState(false)

  // Faucet error
  const [mintError, setMintError] = useState<string | null>(null)

  // KYC — testnet self-register flow
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  // KYC verification flow (mainnet — Coinbase)
  const [verifyClicked, setVerifyClicked] = useState(false)

  /* ── On-chain reads ──────────────────────────────────────── */
  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
  })

  const { data: userShares, refetch: refetchShares } = useReadContract({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Fix: userShares !== undefined (not !!userShares) — 0n is valid and falsy
  const { data: userAssets, refetch: refetchAssets } = useReadContract({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    functionName: 'convertToAssets',
    args: userShares !== undefined ? [userShares] : undefined,
    query: { enabled: userShares !== undefined },
  })

  const { data: maxWithdrawable, refetch: refetchMaxWithdraw } = useReadContract({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    functionName: 'maxWithdraw',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: eurcBalance, refetch: refetchEurc } = useReadContract({
    address: CONTRACTS.MOCK_EURC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.MOCK_EURC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.VAULT] : undefined,
    query: { enabled: !!address },
  })

  const { data: pendingFbk, refetch: refetchFbk } = useReadContract({
    address: CONTRACTS.DISTRIBUTOR,
    abi: DISTRIBUTOR_ABI,
    functionName: 'earned',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: isAuthorized, refetch: refetchAuth } = useReadContract({
    address: CONTRACTS.EAS_CHECKER,
    abi: EAS_CHECKER_ABI,
    functionName: 'isAuthorized',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  /* ── Write hook (shared) ─────────────────────────────────── */
  const { writeContractAsync } = useWriteContract()

  /* ── KYC polling — dès que l'user clique "Verify with Coinbase",
        on poll isAuthorized toutes les 5s jusqu'à ce que ça passe ── */
  useEffect(() => {
    if (!verifyClicked || isAuthorized !== false) return
    const interval = setInterval(() => { refetchAuth() }, 5_000)
    return () => clearInterval(interval)
  }, [verifyClicked, isAuthorized, refetchAuth])

  // Reset verifyClicked quand le wallet change
  useEffect(() => { setVerifyClicked(false) }, [address])

  /* ── Close modal on Escape key ───────────────────────────── */
  useEffect(() => {
    if (!activeModal) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal, depositStep, withdrawStep])

  /* ── Refetch all ─────────────────────────────────────────── */
  const refetchAll = useCallback(() => {
    refetchTotalAssets()
    refetchShares()
    refetchAssets()
    refetchEurc()
    refetchAllowance()
    refetchMaxWithdraw()
    refetchFbk()
    refetchAuth()
  }, [refetchTotalAssets, refetchShares, refetchAssets, refetchEurc, refetchAllowance, refetchMaxWithdraw, refetchFbk, refetchAuth])

  /* ── Open modal (resets state) ───────────────────────────── */
  const openModal = (modal: 'deposit' | 'withdraw') => {
    setActiveModal(modal)
    if (modal === 'deposit') {
      setDepositAmount('')
      setDepositStep('idle')
      setDepositError(null)
    } else {
      setWithdrawAmount('')
      setWithdrawStep('idle')
      setWithdrawError(null)
    }
  }

  const closeModal = () => {
    // Don't close mid-transaction
    if (depositStep === 'approving' || depositStep === 'depositing') return
    if (withdrawStep === 'withdrawing') return
    setActiveModal(null)
    setDepositStep('idle')
    setWithdrawStep('idle')
  }

  /* ── Deposit handler: approve (if needed) → deposit ─────── */
  const handleDeposit = async () => {
    if (!address || !depositAmount) return

    const amount = safeParseUnits(depositAmount, 6)
    if (!amount) {
      setDepositError('Invalid amount.')
      return
    }
    if (eurcBalance !== undefined && amount > eurcBalance) {
      setDepositError('Amount exceeds your wallet balance.')
      return
    }

    setDepositError(null)

    try {
      // Skip approve if allowance is already sufficient
      const currentAllowance = allowance ?? 0n
      if (currentAllowance < amount) {
        setDepositStep('approving')
        const approveTx = await writeContractAsync({
          address: CONTRACTS.MOCK_EURC,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.VAULT, amount],
        })
        await waitForTransactionReceipt(config, { hash: approveTx })
      }

      setDepositStep('depositing')
      const depositTx = await writeContractAsync({
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [amount, address],
      })
      await waitForTransactionReceipt(config, { hash: depositTx })

      setDepositStep('success')
      refetchAll()
    } catch (err) {
      setDepositError(extractError(err))
      setDepositStep('error')
    }
  }

  /* ── Withdraw handler: EURC input → convertToShares → redeem */
  const handleWithdraw = async () => {
    if (!address || !withdrawAmount) return

    const amount = safeParseUnits(withdrawAmount, 6)
    if (!amount) {
      setWithdrawError('Invalid amount.')
      return
    }
    if (maxWithdrawable !== undefined && amount > maxWithdrawable) {
      setWithdrawError('Amount exceeds your withdrawable balance.')
      return
    }

    setWithdrawError(null)
    setWithdrawStep('withdrawing')

    try {
      // Convert EURC amount → shares via on-chain view call
      const shares = await readContract(config, {
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: 'convertToShares',
        args: [amount],
      })

      const redeemTx = await writeContractAsync({
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: 'redeem',
        args: [shares, address, address],
      })
      await waitForTransactionReceipt(config, { hash: redeemTx })

      setWithdrawStep('success')
      refetchAll()
    } catch (err) {
      setWithdrawError(extractError(err))
      setWithdrawStep('error')
    }
  }

  /* ── Testnet faucet — mint 1 000 MockEURC ───────────────── */
  const handleMint = async () => {
    if (!address || minting) return
    setMinting(true)
    setMintSuccess(false)
    setMintError(null)
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.MOCK_EURC,
        abi: ERC20_ABI,
        functionName: 'mint',
        args: [address, 1_000_000_000n], // 1 000 EURC (6 decimals)
      })
      await waitForTransactionReceipt(config, { hash })
      setMintSuccess(true)
      refetchEurc()
      // Reset success indicator after 3s
      setTimeout(() => setMintSuccess(false), 3000)
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) {
        return // Silent on user rejection only
      }
      setMintError('Faucet failed. Make sure you have Sepolia ETH for gas.')
    } finally {
      setMinting(false)
    }
  }

  /* ── Claim $FBK ──────────────────────────────────────────── */
  const handleClaim = async () => {
    if (!pendingFbk || pendingFbk === 0n || claiming) return
    setClaiming(true)
    setClaimError(null)
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.DISTRIBUTOR,
        abi: DISTRIBUTOR_ABI,
        functionName: 'claim',
      })
      await waitForTransactionReceipt(config, { hash })
      refetchFbk()
      refetchAll()
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) {
        // User rejected — silent
      } else {
        setClaimError(extractError(err))
      }
    } finally {
      setClaiming(false)
    }
  }

  /* ── Testnet KYC : whitelisting via API (pas de wallet required) ── */
  const handleSelfRegister = async () => {
    if (registering || !address) return
    setRegistering(true)
    setRegisterError(null)
    try {
      const res = await fetch('/api/testnet-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      // Attendre un peu puis refetch
      await new Promise(r => setTimeout(r, 2000))
      refetchAuth()
    } catch (err) {
      setRegisterError(extractError(err))
    } finally {
      setRegistering(false)
    }
  }

  /* ── Derived display values ──────────────────────────────── */
  const TVL       = fmt6(totalAssets)
  const myBalance = fmt6(userAssets)
  const walletEurc= fmt6(eurcBalance)
  const maxOut    = fmt6(maxWithdrawable)
  const fbkPending= fmt18(pendingFbk)
  const shortAddr = address ? `${address.slice(0, 10)}···${address.slice(-6)}` : ''

  /* ── Deposit button label ────────────────────────────────── */
  const depositLabel = () => {
    if (depositStep === 'approving')  return '1/2 — Approving EURC…'
    if (depositStep === 'depositing') return '2/2 — Depositing…'
    if (depositStep === 'success')    return 'Deposited ✓'
    if (depositStep === 'error')      return 'Retry'

    // Check if approve will be skipped
    const amount = safeParseUnits(depositAmount, 6)
    const needsApprove = !amount || (allowance ?? 0n) < amount
    return needsApprove ? 'Approve & Deposit' : 'Deposit'
  }

  const depositDisabled =
    !depositAmount ||
    depositStep === 'approving' ||
    depositStep === 'depositing'

  const withdrawDisabled =
    !withdrawAmount ||
    withdrawStep === 'withdrawing'

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.025em', marginBottom: 4 }}>
          Account
        </h1>
        <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#94A3B8' }}>
          {shortAddr}
        </p>
      </div>

      {/* ── Tab toggle ─────────────────────────────────────── */}
      <div style={{
        display: 'inline-flex',
        background: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 32,
      }}>
        {(['overview', 'onchain'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 13, fontWeight: 500,
              padding: '8px 18px', borderRadius: 9,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: tab === t ? '#FFFFFF' : 'transparent',
              color:      tab === t ? '#0F172A' : '#64748B',
              boxShadow:  tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'overview' ? 'Overview' : 'On-chain'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                          */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div>

          {/* Balance card */}
          <div style={{
            background: '#0F172A', borderRadius: 20,
            padding: '32px 28px', marginBottom: 16, color: '#FFFFFF',
          }}>
            <p style={{ fontSize: 11, color: '#64748B', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              Your balance in vault
            </p>
            <p style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
              € {myBalance}
            </p>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 28 }}>
              Withdrawable: € {maxOut}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => openModal('deposit')}
                disabled={isAuthorized === false}
                title={isAuthorized === false ? 'Complete KYC verification via Coinbase first' : undefined}
                className="btn"
                style={{
                  background: '#FFFFFF', color: '#0F172A', flex: 1, fontSize: 13, padding: '12px 20px',
                  opacity: isAuthorized === false ? 0.4 : 1,
                  cursor: isAuthorized === false ? 'not-allowed' : 'pointer',
                }}
              >
                Deposit
              </button>
              <button
                onClick={() => openModal('withdraw')}
                className="btn"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', flex: 1, fontSize: 13, padding: '12px 20px' }}
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* ── KYC status ────────────────────────────────── */}

          {/* Testnet : selfRegister one-click */}
          {isAuthorized === false && isTestnet && (
            <div style={{
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 15 }}>🧪</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Testnet — get instant access
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, marginBottom: 14 }}>
                On Base Sepolia, KYC is bypassed for testing. One click registers your wallet on-chain.
              </p>
              <button
                onClick={handleSelfRegister}
                disabled={registering}
                className="btn btn-dark"
                style={{ fontSize: 12, padding: '10px 18px', opacity: registering ? 0.6 : 1 }}
              >
                {registering ? 'Registering…' : 'Get testnet access'}
              </button>
              {registerError && (
                <p style={{ fontSize: 11, color: '#EF4444', marginTop: 8 }}>{registerError}</p>
              )}
            </div>
          )}

          {/* Mainnet : Coinbase Verifications flow */}
          {isAuthorized === false && !isTestnet && !verifyClicked && (
            <div style={{
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 15 }}>🔒</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Verify your identity to deposit
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, marginBottom: 14 }}>
                One-time verification via Coinbase. Takes 2 minutes. Withdrawals are always available regardless.
              </p>
              <a
                href="https://coinbase.com/onchain-verify"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setVerifyClicked(true)}
                className="btn btn-dark"
                style={{ fontSize: 12, padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                Verify with Coinbase
                <span style={{ fontSize: 11, opacity: 0.7 }}>↗</span>
              </a>
            </div>
          )}

          {isAuthorized === false && !isTestnet && verifyClicked && (
            <div style={{
              border: '1px solid #DBEAFE',
              background: '#EFF6FF',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>⏳</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>
                  Waiting for verification…
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#3B82F6', lineHeight: 1.6, marginBottom: 14 }}>
                Complete the process on Coinbase, then come back. We check automatically every 5 seconds.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#60A5FA' }}>
                  <span className="live-dot" style={{ background: '#60A5FA' }} />
                  Checking…
                </span>
                <a
                  href="https://coinbase.com/onchain-verify"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#3B82F6', textDecoration: 'underline' }}
                >
                  Open Coinbase again ↗
                </a>
              </div>
            </div>
          )}

          {isAuthorized === true && (
            <div style={{
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              borderRadius: 12, padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 13 }}>✅</span>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
                Account verified — deposits enabled
              </p>
            </div>
          )}

          {/* Stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Wallet EURC', value: `€ ${walletEurc}`, sub: 'Available to deposit' },
              { label: 'Protocol TVL', value: `€ ${TVL}`,  sub: 'Total member deposits' },
              { label: '$FBK Claimable', value: fbkPending, sub: 'Governance tokens earned', action: true },
            ].map(({ label, value, sub, action }) => (
              <div key={label} className="card" style={{ padding: '20px' }}>
                <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {label}
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </p>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{sub}</p>
                {action && pendingFbk !== undefined && pendingFbk > 0n && (
                  <>
                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="btn btn-ghost"
                      style={{ marginTop: 10, fontSize: 11, padding: '6px 12px', width: '100%', opacity: claiming ? 0.5 : 1 }}
                    >
                      {claiming ? 'Claiming…' : 'Claim'}
                    </button>
                    {claimError && (
                      <p style={{ fontSize: 11, color: '#EF4444', marginTop: 6, textAlign: 'center' }}>{claimError}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Withdrawal guarantee */}
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🔒</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 2 }}>
                Withdrawal guarantee
              </p>
              <p style={{ fontSize: 12, color: '#16a34a', lineHeight: 1.5 }}>
                Your funds are technically impossible to block. Withdrawal access is
                hard-coded in the smart contract — no entity, including FinBank, can prevent it.
              </p>
            </div>
          </div>

          {/* ── Testnet faucet ─────────────────────────────── */}
          <div style={{
            border: '1px dashed #E2E8F0',
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#94A3B8',
                  background: '#F1F5F9', borderRadius: 4, padding: '2px 6px',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  Testnet
                </span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
                Get test EURC
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>
                Mint 1,000 MockEURC to your wallet — free on Sepolia
              </p>
            </div>
            <button
              onClick={handleMint}
              disabled={minting}
              className="btn btn-ghost"
              style={{
                fontSize: 13, padding: '10px 20px', whiteSpace: 'nowrap', flexShrink: 0,
                background: mintSuccess ? '#F0FDF4' : undefined,
                color: mintSuccess ? '#16a34a' : undefined,
              }}
            >
              {minting ? 'Minting…' : mintSuccess ? '✓ Minted!' : '+ 1,000 EURC'}
            </button>
          </div>
          {mintError && (
            <p role="alert" aria-live="polite" style={{ fontSize: 12, color: '#EF4444', marginTop: 8, paddingLeft: 4 }}>
              {mintError}
            </p>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ON-CHAIN TAB                                          */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'onchain' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Vault live reads */}
          <div className="card" style={{ padding: '24px', background: '#0F172A', border: 'none' }}>
            <p style={{ fontSize: 11, color: '#475569', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
              FinBankVault.sol
            </p>
            <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B', marginBottom: 16 }}>
              {CONTRACTS.VAULT}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                {
                  fn: 'totalAssets()',
                  value: totalAssets?.toString() ?? '···',
                  note: 'raw EURC (6 decimals)',
                },
                {
                  fn: `balanceOf(${address ? address.slice(0, 6) : '…'}…)`,
                  value: userShares?.toString() ?? '···',
                  note: 'vault shares (6 decimals)',
                },
                {
                  fn: 'convertToAssets(shares)',
                  value: userAssets?.toString() ?? '···',
                  note: 'EURC value of your shares',
                },
                {
                  fn: `maxWithdraw(${address ? address.slice(0, 6) : '…'}…)`,
                  value: maxWithdrawable?.toString() ?? '···',
                  note: 'max EURC withdrawable',
                },
              ].map(({ fn, value, note }) => (
                <div key={fn} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748B', marginBottom: 6 }}>{fn}</p>
                  <p style={{ fontSize: 14, fontFamily: 'monospace', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>
                    {value}
                  </p>
                  <p style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>{note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Other contracts */}
          {[
            { label: 'FBKToken.sol',        addr: CONTRACTS.FBK_TOKEN   },
            { label: 'FBKDistributor.sol',   addr: CONTRACTS.DISTRIBUTOR },
            { label: 'VeFBK.sol',            addr: CONTRACTS.VE_FBK     },
            { label: 'FinBankGovernor.sol',  addr: CONTRACTS.GOVERNOR    },
            { label: 'CoinbaseEASChecker.sol', addr: CONTRACTS.EAS_CHECKER },
          ].map(({ label, addr }) => (
            <div key={label} className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#94A3B8' }}>{addr}</p>
              </div>
              <a
                href={`${BASESCAN_URL}/address/${addr}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#64748B', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 16 }}
              >
                Basescan ↗
              </a>
            </div>
          ))}

          <button
            onClick={refetchAll}
            className="btn btn-ghost"
            style={{ alignSelf: 'flex-start', fontSize: 12, padding: '10px 18px' }}
          >
            ↻ Refresh
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* DEPOSIT MODAL                                         */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeModal === 'deposit' && (
        <Modal title="Deposit EURC" onClose={closeModal}>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
            Deposit EURC into the FinBank Vault. You will receive fbEURC shares
            representing your position, which accrue yield automatically.
          </p>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8 }}>
            Amount (EURC)
          </label>
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%',
              transform: 'translateY(-50%)', fontSize: 15, color: '#94A3B8',
              pointerEvents: 'none',
            }}>€</span>
            <input
              className="input"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={depositAmount}
              onChange={e => {
                setDepositAmount(e.target.value)
                if (depositStep === 'error') setDepositStep('idle')
                setDepositError(null)
              }}
              disabled={depositStep === 'approving' || depositStep === 'depositing'}
              style={{ paddingLeft: 32 }}
            />
          </div>

          {/* Wallet balance + MAX button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: '#94A3B8' }}>
              Wallet: € {walletEurc} EURC
            </p>
            {eurcBalance !== undefined && eurcBalance > 0n && (
              <button
                onClick={() => setDepositAmount(formatUnits(eurcBalance, 6))}
                style={{ fontSize: 11, color: '#64748B', background: '#F1F5F9', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                MAX
              </button>
            )}
          </div>

          {/* Progress indicator */}
          {(depositStep === 'approving' || depositStep === 'depositing' || depositStep === 'success') && (
            <div style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: '1. Approve', done: depositStep === 'depositing' || depositStep === 'success', active: depositStep === 'approving' },
                  { label: '2. Deposit', done: depositStep === 'success',    active: depositStep === 'depositing' },
                ].map(({ label, done, active }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: done ? '#22C55E' : active ? '#0F172A' : '#E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#FFFFFF', flexShrink: 0,
                    }}>
                      {done ? '✓' : active ? '…' : ''}
                    </span>
                    <span style={{ fontSize: 12, color: active ? '#0F172A' : done ? '#22C55E' : '#94A3B8', fontWeight: active ? 600 : 400 }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {depositError && (
            <p
              role="alert"
              aria-live="polite"
              style={{ fontSize: 12, color: '#EF4444', marginBottom: 12, padding: '10px 14px', background: '#FEF2F2', borderRadius: 8 }}
            >
              {depositError}
            </p>
          )}

          <button
            onClick={depositStep === 'success' ? closeModal : handleDeposit}
            disabled={depositDisabled}
            className="btn btn-dark"
            style={{ width: '100%' }}
          >
            {depositStep === 'success' ? 'Done ✓' : depositLabel()}
          </button>

          {depositStep !== 'approving' && depositStep !== 'depositing' && (
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 10, textAlign: 'center' }}>
              {(allowance ?? 0n) >= (safeParseUnits(depositAmount, 6) ?? 0n) && depositAmount
                ? '✓ Already approved — 1 signature required'
                : '2 wallet signatures required (approve + deposit)'}
            </p>
          )}
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* WITHDRAW MODAL                                        */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeModal === 'withdraw' && (
        <Modal title="Withdraw" onClose={closeModal}>
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontSize: 13 }}>🔒</span>
            <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
              Withdrawals cannot be blocked by anyone, including FinBank.
            </p>
          </div>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8 }}>
            Amount to withdraw (EURC)
          </label>
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%',
              transform: 'translateY(-50%)', fontSize: 15, color: '#94A3B8',
              pointerEvents: 'none',
            }}>€</span>
            <input
              className="input"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={withdrawAmount}
              onChange={e => {
                setWithdrawAmount(e.target.value)
                if (withdrawStep === 'error') setWithdrawStep('idle')
                setWithdrawError(null)
              }}
              disabled={withdrawStep === 'withdrawing'}
              style={{ paddingLeft: 32 }}
            />
          </div>

          {/* Available + MAX */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: '#94A3B8' }}>
              Available: € {maxOut} EURC
            </p>
            {maxWithdrawable !== undefined && maxWithdrawable > 0n && (
              <button
                onClick={() => setWithdrawAmount(formatUnits(maxWithdrawable, 6))}
                style={{ fontSize: 11, color: '#64748B', background: '#F1F5F9', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                MAX
              </button>
            )}
          </div>

          {/* Error */}
          {withdrawError && (
            <p
              role="alert"
              aria-live="polite"
              style={{ fontSize: 12, color: '#EF4444', marginBottom: 12, padding: '10px 14px', background: '#FEF2F2', borderRadius: 8 }}
            >
              {withdrawError}
            </p>
          )}

          <button
            onClick={withdrawStep === 'success' ? closeModal : handleWithdraw}
            disabled={withdrawDisabled}
            className="btn btn-dark"
            style={{ width: '100%' }}
          >
            {withdrawStep === 'withdrawing' ? 'Withdrawing…' : withdrawStep === 'success' ? 'Done ✓' : 'Withdraw'}
          </button>
        </Modal>
      )}

    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
/* Modal wrapper                                             */
/* ══════════════════════════════════════════════════════════ */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15,23,42,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 440, padding: '28px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 22, lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
