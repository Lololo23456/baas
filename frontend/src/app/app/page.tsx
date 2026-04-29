'use client'

import { useAccount } from 'wagmi'
import ConnectWallet from '@/components/bank/ConnectWallet'
import AccountView from '@/components/bank/AccountView'

export default function AppPage() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return <ConnectWallet />
  }

  return (
    <div style={{ paddingTop: 64 }}>
      <AccountView />
    </div>
  )
}
