// API Route — Testnet KYC access
//
// POST /api/testnet-access
// Body: { address: "0x...", signature: "0x..." }
//
// Vérifie que le caller contrôle bien l'adresse (signature EIP-191),
// puis appelle setAllowed(address, true) via la clé du deployer.
// Supporte EOA et smart wallets (EIP-1271).

import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, createPublicClient, http, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const TESTNET_ACCESS_MSG = (address: string) =>
  `FinBank testnet access\nAddress: ${address.toLowerCase()}`

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
    // 1. Parse & validate inputs
    const { address, signature } = await req.json()
    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }
    if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
      return NextResponse.json({ error: 'Signature required' }, { status: 400 })
    }

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) })

    // 2. Verify signature — proves the caller controls the address (supports EOA + EIP-1271)
    const isValid = await publicClient.verifyMessage({
      address: address as `0x${string}`,
      message: TESTNET_ACCESS_MSG(address),
      signature: signature as `0x${string}`,
    })
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 3. Check if already allowlisted (skip tx if yes)
    const alreadyAllowed = await publicClient.readContract({
      address: EAS_CHECKER,
      abi: IS_ALLOWED_ABI,
      functionName: 'allowlisted',
      args: [address as `0x${string}`],
    })
    if (alreadyAllowed) {
      return NextResponse.json({ success: true, alreadyAllowed: true })
    }

    // 4. Deployer wallet (server-side only — private key never leaves the server)
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

    // 5. Call setAllowed(address, true)
    const hash = await walletClient.writeContract({
      address: EAS_CHECKER,
      abi: SET_ALLOWED_ABI,
      functionName: 'setAllowed',
      args: [address as `0x${string}`, true],
    })

    // 6. Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Allowlist transaction failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, txHash: hash })
  } catch (err) {
    console.error('[testnet-access]', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
