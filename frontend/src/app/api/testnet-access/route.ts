// API Route — Testnet KYC access
//
// POST /api/testnet-access
// Body: { address: "0x..." }
//
// Appelle setAllowed(address, true) sur l'EASChecker Sepolia via la clé du deployer.
// Pas d'interaction wallet requise du côté utilisateur.
// Sécurité : valide l'adresse, rate-limit implicite (Vercel Edge).

import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, createPublicClient, http, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const EAS_CHECKER   = '0x51210B5837521f1254F88Bcd77D4BBEB2b0254c0' as const
const RPC_URL       = 'https://sepolia.base.org'

const SET_ALLOWED_ABI = [{
  name: 'setAllowed',
  type: 'function' as const,
  stateMutability: 'nonpayable' as const,
  inputs: [
    { name: 'user',   type: 'address' },
    { name: 'status', type: 'bool'    },
  ],
  outputs: [],
}] as const

const IS_ALLOWED_ABI = [{
  name: 'allowlisted',
  type: 'function' as const,
  stateMutability: 'view' as const,
  inputs: [{ name: '', type: 'address' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate address
    const { address } = await req.json()
    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    // 2. Check if already allowlisted (skip tx if yes)
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) })
    const alreadyAllowed = await publicClient.readContract({
      address: EAS_CHECKER,
      abi: IS_ALLOWED_ABI,
      functionName: 'allowlisted',
      args: [address as `0x${string}`],
    })
    if (alreadyAllowed) {
      return NextResponse.json({ success: true, alreadyAllowed: true })
    }

    // 3. Deployer wallet (server-side only — private key never leaves the server)
    const pk = process.env.DEPLOYER_PK
    if (!pk) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const account = privateKeyToAccount(pk as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC_URL),
    })

    // 4. Call setAllowed(address, true)
    const hash = await walletClient.writeContract({
      address: EAS_CHECKER,
      abi: SET_ALLOWED_ABI,
      functionName: 'setAllowed',
      args: [address as `0x${string}`, true],
    })

    // 5. Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 500 })
    }

    return NextResponse.json({ success: true, txHash: hash })
  } catch (err) {
    console.error('[testnet-access]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
