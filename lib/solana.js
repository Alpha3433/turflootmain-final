// Solana blockchain integration utilities
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' 
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com'

const connection = new Connection(SOLANA_RPC_URL, 'confirmed')

// Get SOL balance for a wallet address
export async function getSolBalance(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress)
    const balance = await connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Error fetching SOL balance:', error)
    throw new Error('Failed to fetch SOL balance')
  }
}

// Get token accounts for a wallet (for other SPL tokens)
export async function getTokenAccounts(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress)
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: TOKEN_PROGRAM_ID }
    )
    
    return tokenAccounts.value.map(account => ({
      mint: account.account.data.parsed.info.mint,
      amount: account.account.data.parsed.info.tokenAmount.uiAmount,
      decimals: account.account.data.parsed.info.tokenAmount.decimals
    }))
  } catch (error) {
    console.error('Error fetching token accounts:', error)
    return []
  }
}

// Verify wallet signature (for authentication)
export async function verifyWalletSignature(publicKey, signature, message) {
  try {
    const publicKeyObj = new PublicKey(publicKey)
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
    
    // Note: This is a simplified verification - in production, use proper signature verification
    return true // Placeholder for now
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

// Create transaction for game payout
export async function createPayoutTransaction(fromWallet, toWallet, amount) {
  try {
    const fromPublicKey = new PublicKey(fromWallet)
    const toPublicKey = new PublicKey(toWallet)
    const lamports = amount * LAMPORTS_PER_SOL
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: lamports,
      })
    )
    
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromPublicKey
    
    return transaction
  } catch (error) {
    console.error('Error creating payout transaction:', error)
    throw new Error('Failed to create payout transaction')
  }
}

// Get transaction status
export async function getTransactionStatus(signature) {
  try {
    const status = await connection.getSignatureStatus(signature)
    return status.value
  } catch (error) {
    console.error('Error getting transaction status:', error)
    return null
  }
}

export { connection }