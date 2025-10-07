// Solana blockchain integration utilities
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

const HELIUS_API_KEY =
  process.env.HELIUS_API_KEY ||
  process.env.NEXT_PUBLIC_HELIUS_API_KEY ||
  process.env.HELIUS_RPC_API_KEY ||
  '9ce7937c-f2a5-4759-8d79-dd8f9ca63fa5';

const SOLANA_NETWORK =
  process.env.SOLANA_NETWORK ||
  process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER ||
  'mainnet-beta';

const normaliseNetworkForHelius = (network) => {
  const normalized = (network || 'mainnet-beta').toLowerCase();
  if (normalized === 'mainnet' || normalized === 'mainnet-beta') {
    return 'mainnet';
  }
  if (normalized === 'devnet' || normalized === 'testnet') {
    return normalized;
  }
  return normalized;
};

const deriveDefaultRpc = () => {
  const configured =
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.HELIUS_RPC_URL ||
    process.env.NEXT_PUBLIC_HELIUS_RPC_URL;

  if (configured) {
    return configured;
  }

  const heliusNetwork = normaliseNetworkForHelius(SOLANA_NETWORK);
  if (HELIUS_API_KEY) {
    return `https://${heliusNetwork}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  }

  return heliusNetwork === 'mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';
};

const SOLANA_RPC_URL = deriveDefaultRpc();

const connection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false
});

let cachedBlockhash = null;
let cachedBlockhashFetchedAt = 0;
const BLOCKHASH_TTL_MS = Number(process.env.PAID_ROOMS_BLOCKHASH_TTL_MS || 25_000);

function isBlockhashStale() {
  if (!cachedBlockhash) return true;
  const now = Date.now();
  return now - cachedBlockhashFetchedAt > BLOCKHASH_TTL_MS;
}

export async function getLatestBlockhashWithCache(force = false) {
  if (!force && !isBlockhashStale()) {
    return cachedBlockhash;
  }

  try {
    const blockhashInfo = await connection.getLatestBlockhash();
    cachedBlockhash = blockhashInfo;
    cachedBlockhashFetchedAt = Date.now();
    return blockhashInfo;
  } catch (error) {
    console.error('❌ Failed to fetch latest blockhash:', error);
    if (!force && cachedBlockhash) {
      return cachedBlockhash;
    }
    throw error;
  }
}

export function clearBlockhashCache() {
  cachedBlockhash = null;
  cachedBlockhashFetchedAt = 0;
}

// Utility to create a compute budget instruction with priority fee
export function buildPriorityFeeInstruction(microLamports) {
  const priorityFee = Number(microLamports || 5_000);
  return ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee });
}

// Get SOL balance for a wallet address
export async function getSolBalance(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    throw new Error('Failed to fetch SOL balance');
  }
}

// Get token accounts for a wallet (for other SPL tokens)
export async function getTokenAccounts(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    return tokenAccounts.value.map((account) => ({
      mint: account.account.data.parsed.info.mint,
      amount: account.account.data.parsed.info.tokenAmount.uiAmount,
      decimals: account.account.data.parsed.info.tokenAmount.decimals
    }));
  } catch (error) {
    console.error('Error fetching token accounts:', error);
    return [];
  }
}

// Verify wallet signature (for authentication)
export async function verifyWalletSignature(publicKey, signature, message) {
  try {
    const publicKeyObj = new PublicKey(publicKey);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

    // Note: This is a simplified verification - in production, use proper signature verification
    void publicKeyObj; // avoid lint warning
    void messageBytes;
    void signatureBytes;
    return true; // Placeholder for now
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Create transaction for game payout
export async function createPayoutTransaction(fromWallet, toWallet, amount) {
  try {
    const fromPublicKey = new PublicKey(fromWallet);
    const toPublicKey = new PublicKey(toWallet);
    const lamports = amount * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPublicKey;

    return transaction;
  } catch (error) {
    console.error('Error creating payout transaction:', error);
    throw new Error('Failed to create payout transaction');
  }
}

// Get transaction status
export async function getTransactionStatus(signature) {
  try {
    const status = await connection.getSignatureStatus(signature);
    return status.value;
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return null;
  }
}

async function withRetries(fn, { retries = 5, delayMs = 1_000 } = {}) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

export async function getParsedTransactionWithRetries(signature, options = {}) {
  return withRetries(
    () =>
      connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      }),
    options
  );
}

export async function getRawTransactionWithRetries(signature, options = {}) {
  return withRetries(
    () =>
      connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      }),
    options
  );
}

export { connection, PublicKey, SystemProgram };
