'use client'

import React, { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { TorusWalletAdapter } from '@solana/wallet-adapter-torus'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'

const DEFAULT_SOLANA_NETWORK = WalletAdapterNetwork.Mainnet
let hasWarnedAboutUnsupportedSolanaNetwork = false
let hasWarnedAboutDevnetRpcEndpoint = false

const resolveWalletAdapterNetwork = (network) => {
  const candidate = typeof network === 'string' ? network.trim().toLowerCase() : ''

  if (!candidate) {
    return DEFAULT_SOLANA_NETWORK
  }

  if (candidate.startsWith('solana:')) {
    return resolveWalletAdapterNetwork(candidate.split(':').slice(1).join(':'))
  }

  if (candidate === 'mainnet' || candidate === 'mainnet-beta') {
    return DEFAULT_SOLANA_NETWORK
  }

  if (!hasWarnedAboutUnsupportedSolanaNetwork) {
    console.warn(
      `⚠️ Unsupported Solana network "${candidate}" configured. Enhanced wallet provider will default to mainnet to ensure paid rooms function correctly.`
    )
    hasWarnedAboutUnsupportedSolanaNetwork = true
  }

  return DEFAULT_SOLANA_NETWORK
}

const sanitiseSolanaRpcEndpoint = (endpoint) => {
  if (typeof endpoint !== 'string') {
    return undefined
  }

  const trimmed = endpoint.trim()
  if (!trimmed) {
    return undefined
  }

  if (/devnet/i.test(trimmed)) {
    if (!hasWarnedAboutDevnetRpcEndpoint) {
      console.warn(
        '⚠️ Devnet RPC endpoint detected in enhanced wallet provider configuration. Paid rooms require mainnet; ignoring devnet endpoint.'
      )
      hasWarnedAboutDevnetRpcEndpoint = true
    }
    return undefined
  }

  return trimmed
}

export function EnhancedWalletProvider({ children }) {
  const network = resolveWalletAdapterNetwork(process.env.NEXT_PUBLIC_SOLANA_NETWORK)

  const endpoint = useMemo(() => {
    const configuredEndpoint =
      sanitiseSolanaRpcEndpoint(process.env.NEXT_PUBLIC_SOLANA_RPC_URL) ||
      sanitiseSolanaRpcEndpoint(process.env.NEXT_PUBLIC_SOLANA_RPC)

    if (configuredEndpoint) {
      return configuredEndpoint
    }

    if (network !== WalletAdapterNetwork.Mainnet) {
      return 'https://api.mainnet-beta.solana.com'
    }

    return 'https://api.mainnet-beta.solana.com'
  }, [network])

  // Initialize wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
    ],
    [network]
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}