'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract, useChainId, usePublicClient, useSignMessage } from 'wagmi'
import { readContract, waitForTransactionReceipt } from 'wagmi/actions'
import { formatUnits, parseUnits } from 'viem'
import { config } from '@/lib/wagmi'
import {
  CONTRACTS, VAULT_ABI, ERC20_ABI, DISTRIBUTOR_ABI, EAS_CHECKER_ABI, BASESCAN_URL,
} from '@/lib/contracts'
import MoneriumConnect from './MoneriumConnect'
import MoneriumSend    from './MoneriumSend'

/* ═══════════════════════════════════════════════════════════════
   FinBank — Coffre Souverain
   ═══════════════════════════════════════════════════════════════ */

type ActionModal  = 'recevoir' | 'envoyer' | null
type DepositStep  = 'idle' | 'approving' | 'depositing' | 'success' | 'error'
type SendTab      = 'finbank' | 'sepa'
type TransferStep = 'idle' | 'sending' | 'success' | 'error'

type TxItem = {
  type:   'in' | 'out'
  amount: bigint
  block:  bigint
  hash:   string
  date?:  Date
}

/* ── Utils ──────────────────────────────────────────── */
function safeParseUnits(value: string, decimals: number): bigint | null {
  try {
    if (!value || value.trim() === '') return null
    const num = Number(value)
    if (!isFinite(num) || num <= 0) return null
    const [int, frac = ''] = value.split('.')
    const sanitized = frac.length > 0 ? `${int}.${frac.slice(0, decimals)}` : int
    return parseUnits(sanitized, decimals)
  } catch {
    return null
  }
}

function extractError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('4001')) {
      return 'Transaction annulée.'
    }
    if (msg.includes('NotAuthorized') || msg.includes('not authorized') || msg.includes('isAuthorized')) {
      return 'Identification requise pour approvisionner.'
    }
    if (msg.includes('insufficient')) return 'Solde insuffisant.'
    if (msg.includes('reverted'))     return 'Opération refusée par le réseau.'
  }
  return 'Opération impossible. Réessaie.'
}

const fmtEur = (v?: bigint) =>
  v !== undefined
    ? Number(formatUnits(v, 6)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

const fmtTok = (v?: bigint) =>
  v !== undefined
    ? Number(formatUnits(v, 18)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

function timeAgo(date?: Date): string {
  if (!date) return '—'
  const now = Date.now()
  const diff = (now - date.getTime()) / 1000
  if (diff < 60)        return 'à l\'instant'
  if (diff < 3600)      return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86_400)    return `il y a ${Math.floor(diff / 3600)} h`
  if (diff < 7 * 86_400)return `il y a ${Math.floor(diff / 86_400)} j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ═══════════════════════════════════════════════════════════════ */
export default function AccountView() {
  const { address }  = useAccount()
  const chainId      = useChainId()
  const publicClient = usePublicClient()
  const isTestnet    = chainId === 84532

  const [modal,         setModal]         = useState<ActionModal>(null)
  const [showSettings,  setShowSettings]  = useState(false)

  const [receiveTab,    setReceiveTab]    = useState<'wallet' | 'sepa'>('wallet')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositStep,   setDepositStep]   = useState<DepositStep>('idle')
  const [depositError,  setDepositError]  = useState<string | null>(null)

  const [sendTab,       setSendTab]       = useState<SendTab>('finbank')
  const [transferTo,    setTransferTo]    = useState('')
  const [transferAmount,setTransferAmount]= useState('')
  const [transferStep,  setTransferStep]  = useState<TransferStep>('idle')
  const [transferError, setTransferError] = useState<string | null>(null)

  const [claiming, setClaiming]     = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [minting, setMinting]       = useState(false)
  const [mintError, setMintError]   = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [verifyClicked, setVerifyClicked] = useState(false)

  const [txs, setTxs] = useState<TxItem[]>([])
  const [loadingTxs, setLoadingTxs] = useState(false)

  const POLL_MS = 15_000

  /* ── Reads ─────────────────────────────────────────── */
  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'totalAssets',
    query: { refetchInterval: POLL_MS },
  })

  const { data: userShares, refetch: refetchShares } = useReadContract({
    address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: POLL_MS },
  })

  const { data: userAssets, refetch: refetchAssets } = useReadContract({
    address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'convertToAssets',
    args: userShares !== undefined ? [userShares] : undefined,
    query: { enabled: userShares !== undefined, refetchInterval: POLL_MS },
  })

  const { data: maxWithdrawable, refetch: refetchMaxWithdraw } = useReadContract({
    address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'maxWithdraw',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: POLL_MS },
  })

  const { data: eurcBalance, refetch: refetchEurc } = useReadContract({
    address: CONTRACTS.MOCK_EURC, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: POLL_MS },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.MOCK_EURC, abi: ERC20_ABI, functionName: 'allowance',
    args: address ? [address, CONTRACTS.VAULT] : undefined,
    query: { enabled: !!address },
  })

  const { data: pendingFbk, refetch: refetchFbk } = useReadContract({
    address: CONTRACTS.DISTRIBUTOR, abi: DISTRIBUTOR_ABI, functionName: 'earned',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: POLL_MS },
  })

  const { data: fbkBalance, refetch: refetchFbkBalance } = useReadContract({
    address: CONTRACTS.FBK_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: POLL_MS },
  })

  const { data: isAuthorized, refetch: refetchAuth } = useReadContract({
    address: CONTRACTS.EAS_CHECKER, abi: EAS_CHECKER_ABI, functionName: 'isAuthorized',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { writeContractAsync }  = useWriteContract()
  const { signMessageAsync }    = useSignMessage()

  /* ── Tx history (on-chain) ─────────────────────────── */
  const loadTxs = useCallback(async () => {
    if (!address || !publicClient) return
    setLoadingTxs(true)
    try {
      const latestBlock = await publicClient.getBlockNumber()
      // Look back ~3 days on Base (2s blocks → ~130k blocks)
      const fromBlock = latestBlock > 130_000n ? latestBlock - 130_000n : 0n

      const [deposits, withdraws] = await Promise.all([
        publicClient.getContractEvents({
          address: CONTRACTS.VAULT,
          abi: VAULT_ABI,
          eventName: 'Deposit',
          args: { owner: address },
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getContractEvents({
          address: CONTRACTS.VAULT,
          abi: VAULT_ABI,
          eventName: 'Withdraw',
          args: { owner: address },
          fromBlock,
          toBlock: latestBlock,
        }),
      ])

      const items: TxItem[] = []
      for (const e of deposits) {
        items.push({
          type: 'in',
          amount: (e.args as { assets: bigint }).assets,
          block: e.blockNumber!,
          hash: e.transactionHash!,
        })
      }
      for (const e of withdraws) {
        items.push({
          type: 'out',
          amount: (e.args as { assets: bigint }).assets,
          block: e.blockNumber!,
          hash: e.transactionHash!,
        })
      }
      items.sort((a, b) => Number(b.block - a.block))

      // Resolve timestamps for the first 10
      const top = items.slice(0, 10)
      await Promise.all(top.map(async (it) => {
        try {
          const block = await publicClient.getBlock({ blockNumber: it.block })
          it.date = new Date(Number(block.timestamp) * 1000)
        } catch { /* ignore */ }
      }))

      setTxs(top)
    } catch (err) {
      console.warn('[txs] load failed', err)
    } finally {
      setLoadingTxs(false)
    }
  }, [address, publicClient])

  useEffect(() => { loadTxs() }, [loadTxs])

  /* ── Refetch all ───────────────────────────────────── */
  const refetchAll = useCallback(async () => {
    await refetchShares()
    await Promise.all([
      refetchTotalAssets(),
      refetchAssets(),
      refetchEurc(),
      refetchAllowance(),
      refetchMaxWithdraw(),
      refetchFbk(),
      refetchFbkBalance(),
    ])
  }, [refetchTotalAssets, refetchShares, refetchAssets, refetchEurc, refetchAllowance, refetchMaxWithdraw, refetchFbk, refetchFbkBalance])

  const refetchAfterTx = useCallback(async () => {
    await refetchAll()
    setTimeout(() => { refetchAll(); loadTxs() }, 2000)
  }, [refetchAll, loadTxs])

  /* ── KYC polling (mainnet Coinbase flow) ───────────── */
  useEffect(() => {
    if (!verifyClicked || isAuthorized !== false) return
    const t = setInterval(() => { refetchAuth() }, 5_000)
    return () => clearInterval(t)
  }, [verifyClicked, isAuthorized, refetchAuth])

  useEffect(() => { setVerifyClicked(false) }, [address])

  /* ── Esc closes modal ──────────────────────────────── */
  useEffect(() => {
    if (!modal && !showSettings) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeModal(); setShowSettings(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, showSettings, depositStep, transferStep])

  const openModal = (m: ActionModal) => {
    setModal(m)
    if (m === 'recevoir') {
      setReceiveTab('wallet')
      setDepositAmount(''); setDepositStep('idle'); setDepositError(null)
    } else if (m === 'envoyer') {
      setSendTab('finbank')
      setTransferTo(''); setTransferAmount(''); setTransferStep('idle'); setTransferError(null)
    }
  }

  const closeModal = () => {
    if (depositStep === 'approving' || depositStep === 'depositing') return
    if (transferStep === 'sending') return
    setModal(null); setDepositStep('idle'); setTransferStep('idle')
  }

  /* ── Handlers ──────────────────────────────────────── */
  const handleDeposit = async () => {
    if (!address || !depositAmount) return
    const amount = safeParseUnits(depositAmount, 6)
    if (!amount) { setDepositError('Montant invalide.'); return }
    if (eurcBalance !== undefined && amount > eurcBalance) {
      setDepositError('Montant supérieur à ton solde.'); return
    }
    setDepositError(null)
    try {
      const cur = allowance ?? 0n
      if (cur < amount) {
        setDepositStep('approving')
        const hash = await writeContractAsync({
          address: CONTRACTS.MOCK_EURC, abi: ERC20_ABI,
          functionName: 'approve', args: [CONTRACTS.VAULT, amount],
        })
        await waitForTransactionReceipt(config, { hash })
      }
      setDepositStep('depositing')
      const hash = await writeContractAsync({
        address: CONTRACTS.VAULT, abi: VAULT_ABI,
        functionName: 'deposit', args: [amount, address],
      })
      await waitForTransactionReceipt(config, { hash })
      setDepositStep('success')
      refetchAfterTx()
    } catch (err) {
      setDepositError(extractError(err)); setDepositStep('error')
    }
  }

  const handleTransfer = async () => {
    if (!address || !transferTo || !transferAmount) return
    // Valider l'adresse destinataire (0x + 40 hex chars)
    if (!/^0x[0-9a-fA-F]{40}$/.test(transferTo)) {
      setTransferError('Adresse invalide (format 0x…).')
      return
    }
    if (transferTo.toLowerCase() === address.toLowerCase()) {
      setTransferError('Tu ne peux pas t\'envoyer à toi-même.')
      return
    }
    const amount = safeParseUnits(transferAmount, 6)
    if (!amount) { setTransferError('Montant invalide.'); return }
    if (maxWithdrawable !== undefined && amount > maxWithdrawable) {
      setTransferError('Montant supérieur à ton solde.'); return
    }
    setTransferError(null); setTransferStep('sending')
    try {
      // Convertir le montant EUR en shares, puis transférer les shares
      const shares = await readContract(config, {
        address: CONTRACTS.VAULT, abi: VAULT_ABI,
        functionName: 'convertToShares', args: [amount],
      })
      const hash = await writeContractAsync({
        address: CONTRACTS.VAULT, abi: VAULT_ABI,
        functionName: 'transfer',
        args: [transferTo as `0x${string}`, shares],
      })
      await waitForTransactionReceipt(config, { hash })
      setTransferStep('success')
      refetchAfterTx()
    } catch (err) {
      setTransferError(extractError(err)); setTransferStep('error')
    }
  }

  const handleClaim = async () => {
    if (!pendingFbk || pendingFbk === 0n || claiming) return
    setClaiming(true); setClaimError(null)
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.DISTRIBUTOR, abi: DISTRIBUTOR_ABI, functionName: 'claim',
      })
      await waitForTransactionReceipt(config, { hash })
      refetchAfterTx()
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) {
        // silent
      } else {
        setClaimError(extractError(err))
      }
    } finally { setClaiming(false) }
  }

  const handleMint = async () => {
    if (!address || minting) return
    setMinting(true); setMintError(null)
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.MOCK_EURC, abi: ERC20_ABI,
        functionName: 'mint', args: [address, 1_000_000_000n],
      })
      await waitForTransactionReceipt(config, { hash })
      refetchEurc()
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) return
      setMintError('Échec. Vérifie tes ETH Sepolia.')
    } finally { setMinting(false) }
  }

  const handleSelfRegister = async () => {
    if (registering || !address) return
    setRegistering(true); setRegisterError(null)
    try {
      // Sign a message proving ownership of the address (no gas cost, just a wallet prompt)
      const message = `FinBank testnet access\nAddress: ${address.toLowerCase()}`
      const signature = await signMessageAsync({ message })
      const res = await fetch('/api/testnet-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec')
      await new Promise(r => setTimeout(r, 2000))
      refetchAuth()
    } catch (err) {
      if (err instanceof Error && (err.message.includes('rejected') || err.message.includes('4001'))) return
      setRegisterError(extractError(err))
    } finally { setRegistering(false) }
  }

  /* ── Derived ───────────────────────────────────────── */
  const balanceEur = fmtEur(userAssets)
  const walletEur  = fmtEur(eurcBalance)
  const maxOutEur  = fmtEur(maxWithdrawable)
  const fbkPend    = fmtTok(pendingFbk)
  const fbkOwn     = fmtTok(fbkBalance)

  const depositLabel = useMemo(() => {
    if (depositStep === 'approving')  return 'AUTORISATION 1/2'
    if (depositStep === 'depositing') return 'TRANSFERT 2/2'
    if (depositStep === 'success')    return 'CONFIRMÉ'
    if (depositStep === 'error')      return 'RÉESSAYER'
    const a = safeParseUnits(depositAmount, 6)
    return !a || (allowance ?? 0n) < a ? 'AUTORISER ET RECEVOIR' : 'RECEVOIR'
  }, [depositStep, depositAmount, allowance])

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 120px' }}>

      {/* ── Header bar ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="b-dot" />
          <span className="b-label">COFFRE — AUTHENTIFIÉ</span>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="b-btn-ghost"
          aria-label="Paramètres de souveraineté"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Souveraineté
        </button>
      </div>

      {/* ── Balance ────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <p className="b-label" style={{ marginBottom: 16 }}>SOLDE DU COFFRE</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 18, color: 'var(--text-2)', fontWeight: 400 }}>€</span>
          <span className="mono" style={{
            fontSize: 56, fontWeight: 500, color: 'var(--text)',
            letterSpacing: '-0.04em', lineHeight: 1,
          }}>
            {balanceEur}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Disponible immédiatement · €&nbsp;{maxOutEur}
        </p>
      </div>

      {/* ── KYC blocks ─────────────────────────────────── */}
      {isAuthorized === false && isTestnet && (
        <div className="b-surface" style={{ padding: '20px 24px', marginBottom: 32 }}>
          <p className="b-label" style={{ marginBottom: 8 }}>ACCÈS — RÉSEAU DE TEST</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
            En un clic. Aucun document. Aucune donnée stockée par FinBank.
          </p>
          <button
            onClick={handleSelfRegister}
            disabled={registering}
            className="b-btn"
            style={{ fontSize: 11 }}
          >
            {registering ? 'EN COURS…' : 'OBTENIR L\'ACCÈS'}
          </button>
          {registerError && (
            <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 10 }}>{registerError}</p>
          )}
        </div>
      )}

      {isAuthorized === false && !isTestnet && !verifyClicked && (
        <div className="b-surface" style={{ padding: '20px 24px', marginBottom: 32 }}>
          <p className="b-label" style={{ marginBottom: 8 }}>IDENTIFICATION REQUISE</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
            Vérification une fois, via Coinbase. Aucune donnée stockée par FinBank.
            Tes retraits restent toujours disponibles, même sans identification.
          </p>
          <a
            href="https://coinbase.com/onchain-verify"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setVerifyClicked(true)}
            className="b-btn"
            style={{ fontSize: 11 }}
          >
            S&apos;IDENTIFIER VIA COINBASE ↗
          </a>
        </div>
      )}

      {isAuthorized === false && !isTestnet && verifyClicked && (
        <div className="b-surface" style={{ padding: '20px 24px', marginBottom: 32 }}>
          <p className="b-label" style={{ marginBottom: 8 }}>EN ATTENTE DE LA PREUVE</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
            Termine la procédure sur Coinbase. La détection est automatique.
          </p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-2)' }}>
            <span className="b-dot" />
            <span className="mono">VÉRIFICATION CONTINUE</span>
          </span>
        </div>
      )}

      {/* ── Two big actions ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 56 }}>
        <button
          onClick={() => openModal('recevoir')}
          disabled={isAuthorized === false}
          className="b-btn"
          style={{ padding: '24px 16px', fontSize: 13 }}
          title={isAuthorized === false ? 'Identification requise' : undefined}
        >
          ↓ &nbsp; RECEVOIR
        </button>
        <button
          onClick={() => openModal('envoyer')}
          className="b-btn b-btn-outline"
          style={{ padding: '24px 16px', fontSize: 13 }}
        >
          ↑ &nbsp; ENVOYER
        </button>
      </div>

      {/* ── Activity feed ──────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <p className="b-label">ACTIVITÉ</p>
          <button onClick={loadTxs} className="b-btn-ghost" style={{ fontSize: 11 }}>
            ↻ {loadingTxs ? 'Lecture…' : 'Actualiser'}
          </button>
        </div>

        <hr className="b-divider" />

        {txs.length === 0 && !loadingTxs && (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Aucun mouvement dans les 3 derniers jours.</p>
          </div>
        )}

        {txs.map((t) => (
          <div
            key={t.hash}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{
                width: 32, height: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--line)', borderRadius: 2,
                fontSize: 14, color: t.type === 'in' ? 'var(--success)' : 'var(--text-2)',
              }}>
                {t.type === 'in' ? '↓' : '↑'}
              </span>
              <div>
                <p className="mono" style={{
                  fontSize: 14, color: 'var(--text)',
                  fontWeight: 500, marginBottom: 2,
                }}>
                  {t.type === 'in' ? '+' : '−'} €&nbsp;{fmtEur(t.amount)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {t.type === 'in' ? 'Approvisionnement' : 'Retrait'} · {timeAgo(t.date)}
                </p>
              </div>
            </div>
            <a
              href={`${BASESCAN_URL}/tx/${t.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'none' }}
            >
              {t.hash.slice(0, 6)}···{t.hash.slice(-4)} ↗
            </a>
          </div>
        ))}
      </div>

      {/* ── Self-custody footer ────────────────────────── */}
      <div className="b-surface" style={{
        padding: '20px 24px',
        background: 'transparent',
        borderColor: 'var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span style={{ fontSize: 14, color: 'var(--success)' }}>◆</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
              Tu détiens tes clés.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
              Personne ne peut bloquer tes retraits. Tu peux partir avec tes fonds à tout moment.
              Cette propriété est inscrite dans le code, pas dans une promesse.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL — RECEVOIR (deposit)                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {modal === 'recevoir' && (
        <DarkModal title="Recevoir" onClose={closeModal}>

          {/* Onglets */}
          <div style={{
            display: 'flex', gap: 4,
            background: '#F1F5F9', borderRadius: 10, padding: 4,
            marginBottom: 24,
          }}>
            {([['wallet', '↓  Depuis mon wallet'], ['sepa', '🏦  Virement SEPA']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setReceiveTab(tab)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: receiveTab === tab ? '#FFFFFF' : 'transparent',
                  color: receiveTab === tab ? '#0F172A' : '#64748B',
                  boxShadow: receiveTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contenu onglet SEPA */}
          {receiveTab === 'sepa' && (
            <MoneriumConnect />
          )}

          {/* Contenu onglet wallet */}
          {receiveTab === 'wallet' && <>
          <p className="b-label" style={{ marginBottom: 8 }}>MONTANT</p>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <span style={{
              position: 'absolute', left: 18, top: '50%',
              transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-3)',
              pointerEvents: 'none',
            }}>€</span>
            <input
              className="b-input"
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
              style={{ paddingLeft: 36 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <p className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Disponible · €&nbsp;{walletEur}
            </p>
            {eurcBalance !== undefined && eurcBalance > 0n && (
              <button
                onClick={() => setDepositAmount(formatUnits(eurcBalance, 6))}
                className="b-btn-ghost"
                style={{ fontSize: 11 }}
              >
                MAX
              </button>
            )}
          </div>

          {depositError && (
            <p role="alert" style={{
              fontSize: 12, color: 'var(--danger)',
              marginBottom: 16, padding: '10px 14px',
              background: 'rgba(229, 72, 77, 0.08)', borderRadius: 2,
            }}>
              {depositError}
            </p>
          )}

          <button
            onClick={depositStep === 'success' ? closeModal : handleDeposit}
            disabled={!depositAmount || depositStep === 'approving' || depositStep === 'depositing'}
            className="b-btn"
            style={{ width: '100%' }}
          >
            {depositStep === 'success' ? 'TERMINÉ ✓' : depositLabel}
          </button>

          {depositStep !== 'approving' && depositStep !== 'depositing' && (
            <p className="mono" style={{
              fontSize: 10, color: 'var(--text-3)',
              marginTop: 12, textAlign: 'center', letterSpacing: '0.08em',
            }}>
              {(allowance ?? 0n) >= (safeParseUnits(depositAmount, 6) ?? 0n) && depositAmount
                ? 'AUTORISATION DÉJÀ DONNÉE — 1 SIGNATURE'
                : '2 SIGNATURES · AUTORISATION + TRANSFERT'}
            </p>
          )}
          </>}
        </DarkModal>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL — ENVOYER (2 onglets : FinBank + SEPA)            */}
      {/* ═══════════════════════════════════════════════════════ */}
      {modal === 'envoyer' && (
        <DarkModal title="Envoyer" onClose={closeModal}>

          {/* Onglets */}
          <div style={{
            display: 'flex', gap: 4,
            background: '#F1F5F9', borderRadius: 10, padding: 4,
            marginBottom: 24,
          }}>
            {([
              ['finbank', '↑  Compte FinBank'],
              ['sepa',    '🏦  Virement SEPA'],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => { setSendTab(tab); setTransferError(null); setTransferStep('idle') }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: sendTab === tab ? '#FFFFFF' : 'transparent',
                  color: sendTab === tab ? '#0F172A' : '#64748B',
                  boxShadow: sendTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Onglet FinBank → FinBank ─────────────────────── */}
          {sendTab === 'finbank' && (
            <>
              {/* Bannière souveraineté */}
              <div style={{
                border: '1px solid var(--line)', borderRadius: 2,
                padding: '12px 16px', marginBottom: 20,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>◆</span>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Transfert instantané de parts du coffre. Les deux parties doivent être membres FinBank.
                </p>
              </div>

              {transferStep === 'success' ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>✓</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>Transfert effectué</p>
                  <p style={{ fontSize: 13, color: '#64748B' }}>
                    €&nbsp;{transferAmount} transféré vers {transferTo.slice(0, 6)}···{transferTo.slice(-4)}
                  </p>
                  <button onClick={closeModal} className="b-btn" style={{ marginTop: 20, fontSize: 12 }}>
                    FERMER
                  </button>
                </div>
              ) : (
                <>
                  <p className="b-label" style={{ marginBottom: 6 }}>ADRESSE DESTINATAIRE</p>
                  <input
                    className="b-input"
                    autoFocus
                    placeholder="0x…"
                    value={transferTo}
                    onChange={e => {
                      setTransferTo(e.target.value)
                      if (transferStep === 'error') setTransferStep('idle')
                      setTransferError(null)
                    }}
                    disabled={transferStep === 'sending'}
                    style={{ marginBottom: 12, fontFamily: 'monospace', fontSize: 13 }}
                  />

                  <p className="b-label" style={{ marginBottom: 6 }}>MONTANT</p>
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <span style={{
                      position: 'absolute', left: 18, top: '50%',
                      transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-3)',
                      pointerEvents: 'none',
                    }}>€</span>
                    <input
                      className="b-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={e => {
                        setTransferAmount(e.target.value)
                        if (transferStep === 'error') setTransferStep('idle')
                        setTransferError(null)
                      }}
                      disabled={transferStep === 'sending'}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <p className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Maximum · €&nbsp;{maxOutEur}
                    </p>
                    {maxWithdrawable !== undefined && maxWithdrawable > 0n && (
                      <button
                        onClick={() => setTransferAmount(formatUnits(maxWithdrawable, 6))}
                        className="b-btn-ghost"
                        style={{ fontSize: 11 }}
                      >
                        MAX
                      </button>
                    )}
                  </div>

                  {transferError && (
                    <p role="alert" style={{
                      fontSize: 12, color: 'var(--danger)',
                      marginBottom: 16, padding: '10px 14px',
                      background: 'rgba(229, 72, 77, 0.08)', borderRadius: 2,
                    }}>
                      {transferError}
                    </p>
                  )}

                  <button
                    onClick={handleTransfer}
                    disabled={!transferTo || !transferAmount || transferStep === 'sending'}
                    className="b-btn"
                    style={{ width: '100%' }}
                  >
                    {transferStep === 'sending' ? 'TRANSFERT EN COURS…' : 'ENVOYER'}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Onglet Virement SEPA ─────────────────────────── */}
          {sendTab === 'sepa' && (
            <MoneriumSend
              maxAmount={maxWithdrawable !== undefined ? formatUnits(maxWithdrawable, 6) : undefined}
            />
          )}
        </DarkModal>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL — SOUVERAINETÉ (settings)                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showSettings && (
        <DarkModal title="PARAMÈTRES DE SOUVERAINETÉ" onClose={() => setShowSettings(false)}>

          <SovBlock label="ADRESSE" value={
            <span className="mono">{address?.slice(0, 10)}···{address?.slice(-8)}</span>
          } />

          <SovBlock label="RÉSERVE COMMUNE" value={
            <span className="mono">€&nbsp;{fmtEur(totalAssets)}</span>
          } sub="Total des dépôts membres" />

          <SovBlock label="RÉCOMPENSES DISPONIBLES" value={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="mono">{fbkPend} FBK</span>
              {pendingFbk !== undefined && pendingFbk > 0n && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="b-btn"
                  style={{ fontSize: 11, padding: '10px 16px' }}
                >
                  {claiming ? 'EN COURS…' : 'COLLECTER'}
                </button>
              )}
            </div>
          } sub={claimError ?? 'Tokens de gouvernance gagnés par usage'} subError={!!claimError} />

          <SovBlock label="MES PARTS" value={
            <span className="mono">{fbkOwn} FBK</span>
          } sub="Tu es co-propriétaire du protocole" />

          <SovBlock label="VÉRIFIER ON-CHAIN" value={
            <a
              href={`${BASESCAN_URL}/address/${CONTRACTS.VAULT}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--line-strong)' }}
            >
              Coffre.sol ↗
            </a>
          } sub="Toute donnée est vérifiable publiquement" />

          {/* Faucet (testnet) */}
          {isTestnet && (
            <>
              <hr className="b-divider" style={{ margin: '20px 0' }} />
              <p className="b-label" style={{ marginBottom: 8 }}>RÉSEAU DE TEST</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
                Mint 1 000 € factices pour tester. Aucune valeur réelle.
              </p>
              <button
                onClick={handleMint}
                disabled={minting}
                className="b-btn b-btn-outline"
                style={{ fontSize: 11 }}
              >
                {minting ? 'EN COURS…' : '+ 1 000 €  TEST'}
              </button>
              {mintError && (
                <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 8 }}>{mintError}</p>
              )}
            </>
          )}
        </DarkModal>
      )}

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/* Dark modal                                                  */
/* ═══════════════════════════════════════════════════════════ */
function DarkModal({
  title, onClose, children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 460,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(15,23,42,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94A3B8', fontSize: 22, lineHeight: 1, padding: '0 4px',
            }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ── Sovereignty block helper ─────────────────────────────── */
function SovBlock({
  label, value, sub, subError,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  subError?: boolean
}) {
  return (
    <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid var(--line)' }}>
      <p className="b-label" style={{ marginBottom: 6 }}>{label}</p>
      <div style={{ fontSize: 14, color: 'var(--text)' }}>{value}</div>
      {sub && (
        <p style={{ fontSize: 11, color: subError ? 'var(--danger)' : 'var(--text-3)', marginTop: 6 }}>
          {sub}
        </p>
      )}
    </div>
  )
}
