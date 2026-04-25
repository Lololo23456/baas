import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

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
    [base.id]:        http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
