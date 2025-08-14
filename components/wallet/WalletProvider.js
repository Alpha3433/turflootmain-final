'use client'

import { useMemo } from 'react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter
} from '@solana/wallet-adapter-wallets'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'

export default function SolanaWalletProvider({ children }) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet
  
  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => 
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  )
  
  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter(),
  ], [network])

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