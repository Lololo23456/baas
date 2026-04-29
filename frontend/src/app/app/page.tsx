'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import ConnectWallet from '@/components/bank/ConnectWallet'
import AccountView from '@/components/bank/AccountView'

export default function AppPage() {
  const { isConnected } = useAccount()

  // Toggle dark brutalist mode for /app
  useEffect(() => {
    document.body.classList.add('app')
    return () => { document.body.classList.remove('app') }
  }, [])

  if (!isConnected) {
    return <ConnectWallet />
  }

  return (
    <div style={{ paddingTop: 64 }}>
      <AccountView />
    </div>
  )
}
