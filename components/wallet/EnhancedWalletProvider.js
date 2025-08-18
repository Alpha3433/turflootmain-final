'use client'

import React, { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter
} from '@solana/wallet-adapter-phantom'
import {
  SolflareWalletAdapter
} from '@solana/wallet-adapter-solflare'
import {
  TorusWalletAdapter
} from '@solana/wallet-adapter-torus'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'

export function EnhancedWalletProvider({ children }) {
  // Get network from environment
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet

  // Get RPC endpoint
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    }
    return network === WalletAdapterNetwork.Mainnet 
      ? 'https://api.mainnet-beta.solana.com' 
      : 'https://api.devnet.solana.com'
  }, [network])

  // Initialize wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
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