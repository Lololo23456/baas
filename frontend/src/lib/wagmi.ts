import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

// Use env var RPC URLs in production (Alchemy/Infura), fallback to public nodes
const RPC_SEPOLIA = process.env.NEXT_PUBLIC_RPC_SEPOLIA ?? 'https://sepolia.base.org'
const RPC_BASE    = process.env.NEXT_PUBLIC_RPC_BASE    ?? 'https://mainnet.base.org'

export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    // Base Smart Wallet — Passkey / Face ID (primary)
    coinbaseWallet({
      appName: 'FinBank',
      preference: { options: 'smartWalletOnly' },
    }),
    // MetaMask / browser wallet (fallback)
    injected(),
  ],
  transports: {
    [base.id]:        http(RPC_BASE),
    [baseSepolia.id]: http(RPC_SEPOLIA),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
