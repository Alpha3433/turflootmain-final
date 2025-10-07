import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { keccak256 } from 'js-sha3';
import { TransactionInstruction, TransactionMessage } from '@solana/web3.js';
import { connectToDatabase } from '../mongodb.js';
import {
  getJoinTicketTtlSeconds,
  getRoomQuote,
  getSeatHoldMilliseconds,
  memoIssuer
} from './config.js';
import { PaymentIntentStatus } from './constants.js';
import {
  PublicKey,
  SystemProgram,
  MEMO_PROGRAM_ID,
  buildPriorityFeeInstruction,
  clearBlockhashCache,
  getLatestBlockhashWithCache,
  getParsedTransactionWithRetries,
  getRawTransactionWithRetries
} from '../solana.js';

const COLLECTION_PAYMENT_INTENTS = 'paymentIntents';
const COLLECTION_TX_AUDIT = 'paidRoomTxAudits';
const JOIN_TICKET_SECRET = process.env.PAID_ROOMS_JWT_SECRET || process.env.JWT_SECRET;
const JWT_ISSUER = memoIssuer;

if (!JOIN_TICKET_SECRET) {
  console.warn('⚠️ Paid room JWT secret not configured - using development fallback. Set PAID_ROOMS_JWT_SECRET.');
}

async function getCollections() {
  const { db } = await connectToDatabase();
  return {
    intents: db.collection(COLLECTION_PAYMENT_INTENTS),
    audits: db.collection(COLLECTION_TX_AUDIT)
  };
}

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  const { intents, audits } = await getCollections();
  await intents.createIndexes([
    { key: { intentId: 1 }, unique: true },
    { key: { status: 1, expiresAt: 1 } },
    { key: { signature: 1 }, unique: true, sparse: true },
    { key: { referenceId: 1 }, unique: true, sparse: true }
  ]);
  await audits.createIndexes([
    { key: { signature: 1 }, unique: true },
    { key: { intentId: 1 } },
    { key: { timestamp: -1 } }
  ]);
  indexesEnsured = true;
}

function validateIntentRequest({ userId, gameId, roomId, playerPubkey }) {
  if (!userId || !gameId || !roomId || !playerPubkey) {
    throw new Error('Missing required fields for payment intent');
  }

  try {
    // Validate public key format
    // eslint-disable-next-line no-new
    new PublicKey(playerPubkey);
  } catch (error) {
    throw new Error('Invalid player public key');
  }
}

function computeReferenceId({ roomId, playerPubkey, totalLamports, nonce }) {
  const payload = `${roomId}|${playerPubkey}|${totalLamports}|${nonce}`;
  return keccak256(payload);
}

function normaliseLamports(value) {
  const lamports = Number(value || 0);
  if (!Number.isFinite(lamports) || lamports < 0) {
    return 0;
  }
  return Math.floor(lamports);
}

function buildMemoBuffer(memoJson) {
  const memoString = JSON.stringify(memoJson);
  return Buffer.from(memoString, 'utf8');
}

function extractMemoText(parsedInstruction) {
  if (!parsedInstruction) return null;
  if (typeof parsedInstruction.parsed === 'string') {
    return parsedInstruction.parsed;
  }
  if (parsedInstruction.parsed?.type === 'memo') {
    return parsedInstruction.parsed.info.memo;
  }
  if (parsedInstruction.parsed?.memo) {
    return parsedInstruction.parsed.memo;
  }
  if (parsedInstruction.data) {
    try {
      return Buffer.from(parsedInstruction.data, 'base64').toString('utf8');
    } catch (error) {
      console.warn('⚠️ Unable to decode memo data:', error);
    }
  }
  return null;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function createMemoInstruction(memoJson) {
  const memoBuffer = buildMemoBuffer(memoJson);
  return new TransactionInstruction({
    keys: [],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: memoBuffer
  });
}

async function buildServerMessage({
  playerPubkey,
  prizeVault,
  feeVault,
  entryLamports,
  feeLamports,
  memoJson,
  priorityFeeMicroLamports
}) {
  const payer = new PublicKey(playerPubkey);
  const prizeVaultPubkey = new PublicKey(prizeVault);
  const feeVaultPubkey = new PublicKey(feeVault);
  const { blockhash, lastValidBlockHeight } = await getLatestBlockhashWithCache();

  const instructions = [buildPriorityFeeInstruction(priorityFeeMicroLamports)];

  if (entryLamports > 0) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: prizeVaultPubkey,
        lamports: entryLamports
      })
    );
  }

  if (feeLamports > 0) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: feeVaultPubkey,
        lamports: feeLamports
      })
    );
  }

  instructions.push(createMemoInstruction(memoJson));

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions
  }).compileToV0Message();

  const serializedMessage = Buffer.from(message.serialize()).toString('base64');

  return {
    serializedMessage,
    blockhash,
    lastValidBlockHeight
  };
}

export async function createPaymentIntent(payload) {
  await ensureIndexes();
  validateIntentRequest(payload);

  const quote = getRoomQuote(payload.roomId);
  if (!quote) {
    throw new Error('Room not found');
  }

  const playerPubkey = new PublicKey(payload.playerPubkey).toBase58();
  const totalLamports = normaliseLamports(quote.totalLamports);
  const entryLamports = normaliseLamports(quote.entryLamports);
  const feeLamports = normaliseLamports(quote.feeLamports);

  const seatHoldMs = getSeatHoldMilliseconds();
  const expiresAt = new Date(Date.now() + seatHoldMs);
  const now = new Date();

  const { intents } = await getCollections();

  const existing = await intents.findOne(
    {
      userId: payload.userId,
      roomId: payload.roomId,
      playerPubkey,
      lamports: totalLamports,
      status: PaymentIntentStatus.CREATED
    },
    { sort: { createdAt: -1 } }
  );

  const intentId = existing?.intentId || randomUUID();
  const nonce = existing?.nonce || existing?.memoJson?.nonce || randomUUID();
  const referenceId =
    existing?.referenceId ||
    computeReferenceId({
      roomId: payload.roomId,
      playerPubkey,
      totalLamports,
      nonce
    });

  const memoJson = {
    issuer: memoIssuer,
    intentId,
    referenceId,
    userId: payload.userId,
    gameId: payload.gameId,
    roomId: payload.roomId,
    player: playerPubkey,
    nonce,
    entryLamports,
    feeLamports,
    totalLamports
  };

  const { serializedMessage, blockhash, lastValidBlockHeight } = await buildServerMessage({
    playerPubkey,
    prizeVault: quote.prizeVault,
    feeVault: quote.feeVault,
    entryLamports,
    feeLamports,
    memoJson,
    priorityFeeMicroLamports: quote.priorityFeeMicroLamports
  });

  const baseDoc = {
    intentId,
    userId: payload.userId,
    gameId: payload.gameId,
    roomId: payload.roomId,
    playerPubkey,
    lamports: totalLamports,
    entryLamports,
    feeLamports,
    feeBps: quote.feeBps,
    prizeVault: quote.prizeVault,
    feeVault: quote.feeVault,
    memoJson,
    referenceId,
    nonce,
    expiresAt,
    seatHeldUntil: expiresAt,
    status: PaymentIntentStatus.CREATED,
    updatedAt: now,
    recentBlockhash: blockhash,
    lastValidBlockHeight,
    serializedMessage
  };

  if (existing) {
    await intents.updateOne(
      { intentId },
      {
        $set: {
          ...baseDoc,
          createdAt: existing.createdAt || now
        }
      }
    );
  } else {
    await intents.insertOne({
      ...baseDoc,
      createdAt: now
    });
  }

  return {
    intentId,
    memoJson,
    referenceId,
    nonce,
    lamports: totalLamports,
    entryLamports,
    feeLamports,
    feeBps: quote.feeBps,
    prizeVault: quote.prizeVault,
    feeVault: quote.feeVault,
    serializedMessage,
    recentBlockhash: blockhash,
    lastValidBlockHeight,
    expiresAt
  };
}

export async function getIntentById(intentId) {
  await ensureIndexes();
  const { intents } = await getCollections();
  return intents.findOne({ intentId });
}

export async function submitIntentSignature(intentId, signature) {
  await ensureIndexes();
  if (!signature) {
    throw new Error('Signature is required');
  }

  const { intents } = await getCollections();

  const update = await intents.findOneAndUpdate(
    {
      intentId,
      status: { $in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.SENT, PaymentIntentStatus.MISMATCH] },
      $or: [{ signature: { $exists: false } }, { signature: null }]
    },
    {
      $set: {
        signature,
        status: PaymentIntentStatus.SENT,
        updatedAt: new Date()
      }
    },
    { returnDocument: 'after' }
  );

  if (!update.value) {
    throw new Error('Intent not found or already has a signature');
  }

  return update.value;
}

function validateMemoAgainstIntent(intent, memoJson) {
  if (!memoJson) return false;

  if (!intent.referenceId || !intent.nonce) {
    return (
      memoJson.intentId === intent.intentId &&
      memoJson.userId === intent.userId &&
      memoJson.gameId === intent.gameId &&
      memoJson.roomId === intent.roomId
    );
  }

  const expectedEntry = Number(intent.entryLamports ?? memoJson.entryLamports ?? 0);
  const expectedFee = Number(intent.feeLamports ?? memoJson.feeLamports ?? 0);
  const expectedTotal = Number(intent.lamports ?? memoJson.totalLamports ?? memoJson.lamports ?? 0);

  return (
    memoJson.intentId === intent.intentId &&
    memoJson.referenceId === intent.referenceId &&
    memoJson.userId === intent.userId &&
    memoJson.gameId === intent.gameId &&
    memoJson.roomId === intent.roomId &&
    memoJson.player === intent.playerPubkey &&
    memoJson.nonce === intent.nonce &&
    Number(memoJson.entryLamports ?? 0) === expectedEntry &&
    Number(memoJson.feeLamports ?? 0) === expectedFee &&
    Number(memoJson.totalLamports ?? memoJson.lamports ?? 0) === expectedTotal
  );
}

async function recordTxAudit({ intent, signature, parsedTx, rawTxBase64, entryTransfer, feeTransfer }) {
  const { audits } = await getCollections();
  const transfers = [];

  const normaliseTransfer = (ix, kind) => {
    if (!ix) return null;
    return {
      kind,
      from: ix.parsed.info.source,
      to: ix.parsed.info.destination,
      lamports: Number(ix.parsed.info.lamports)
    };
  };

  const entryInfo = normaliseTransfer(entryTransfer, 'entry');
  const feeInfo = normaliseTransfer(feeTransfer, 'fee');

  if (entryInfo) transfers.push(entryInfo);
  if (feeInfo) transfers.push(feeInfo);

  if (transfers.length === 0) return;

  const timestamp = parsedTx.blockTime ? new Date(parsedTx.blockTime * 1000) : new Date();

  await audits.updateOne(
    { signature },
    {
      $set: {
        signature,
        intentId: intent.intentId,
        referenceId: intent.referenceId,
        transfers,
        lamports: transfers.reduce((sum, transfer) => sum + Number(transfer.lamports || 0), 0),
        slot: parsedTx.slot,
        timestamp,
        memoJson: intent.memoJson,
        rawTransaction: rawTxBase64
      }
    },
    { upsert: true }
  );
}

function buildJoinTicketPayload(intent) {
  return {
    sub: intent.userId,
    userId: intent.userId,
    gameId: intent.gameId,
    roomId: intent.roomId,
    intentId: intent.intentId,
    type: 'join-ticket',
    iat: Math.floor(Date.now() / 1000)
  };
}

function signJoinTicket(payload, ttlSeconds) {
  if (!JOIN_TICKET_SECRET) {
    throw new Error('Join ticket secret not configured');
  }
  const expiresIn = `${ttlSeconds}s`;
  return jwt.sign(payload, JOIN_TICKET_SECRET, {
    expiresIn,
    issuer: JWT_ISSUER,
    jwtid: randomUUID()
  });
}

async function generateJoinTicket(intent) {
  const ttlSeconds = getJoinTicketTtlSeconds();
  const payload = buildJoinTicketPayload(intent);
  const token = signJoinTicket(payload, ttlSeconds);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const { intents } = await getCollections();
  await intents.updateOne(
    { intentId: intent.intentId },
    {
      $set: {
        joinTicket: token,
        joinTicketExpiresAt: expiresAt,
        updatedAt: new Date()
      }
    }
  );

  return { token, expiresAt };
}

function parseMemoFromInstruction(instructions) {
  const memoIx = instructions.find((ix) => ix.program === 'spl-memo' || ix.programId?.toBase58?.() === MEMO_PROGRAM_ID);
  if (!memoIx) {
    return null;
  }
  const memoText = extractMemoText(memoIx);
  return memoText ? safeJsonParse(memoText) : null;
}

function instructionsContainTransfer(instructions, intent) {
  const transfers = instructions.filter((ix) => ix.program === 'system' && ix.parsed?.type === 'transfer');
  if (!transfers.length) {
    return { ok: false, reason: 'NO_TRANSFER' };
  }

  const expectedPrizeVault = intent.prizeVault || intent.recipient;
  const expectedFeeVault = intent.feeVault;
  const expectedEntryLamports = Number(intent.entryLamports ?? 0);
  const expectedFeeLamports = Number(intent.feeLamports ?? 0);
  const expectedTotalLamports = Number(intent.lamports ?? expectedEntryLamports + expectedFeeLamports);

  for (const transfer of transfers) {
    if (transfer.parsed.info.source !== intent.playerPubkey) {
      return {
        ok: false,
        reason: 'BAD_SOURCE',
        expected: intent.playerPubkey,
        received: transfer.parsed.info.source
      };
    }
  }

  const matchTransfer = (destination, lamports) =>
    transfers.find((ix) => {
      if (destination && ix.parsed.info.destination !== destination) {
        return false;
      }
      return Number(ix.parsed.info.lamports) === Number(lamports);
    });

  const entryTransfer = matchTransfer(expectedPrizeVault, expectedEntryLamports);
  if (expectedEntryLamports > 0 && !entryTransfer) {
    return {
      ok: false,
      reason: 'MISSING_ENTRY_TRANSFER',
      expected: { destination: expectedPrizeVault, lamports: expectedEntryLamports }
    };
  }

  let feeTransfer = null;
  if (expectedFeeLamports > 0) {
    feeTransfer = matchTransfer(expectedFeeVault || intent.prizeVault, expectedFeeLamports);
    if (!feeTransfer) {
      return {
        ok: false,
        reason: 'MISSING_FEE_TRANSFER',
        expected: { destination: expectedFeeVault || intent.prizeVault, lamports: expectedFeeLamports }
      };
    }
  }

  const totalTransferred = transfers.reduce((sum, ix) => sum + Number(ix.parsed.info.lamports), 0);
  if (expectedTotalLamports > 0 && totalTransferred < expectedTotalLamports) {
    return {
      ok: false,
      reason: 'INSUFFICIENT_TOTAL',
      expected: expectedTotalLamports,
      received: totalTransferred
    };
  }

  return { ok: true, entryTransfer, feeTransfer };
}

export async function verifyIntent(intent) {
  if (!intent.signature) {
    return { status: intent.status, reason: 'NO_SIGNATURE' };
  }

  try {
    const parsedTx = await getParsedTransactionWithRetries(intent.signature, { retries: 3 });
    if (!parsedTx) {
      return { status: intent.status, reason: 'PENDING' };
    }

    if (parsedTx.meta?.err) {
      return { status: PaymentIntentStatus.MISMATCH, reason: 'TRANSACTION_ERROR', details: parsedTx.meta.err };
    }

    const memoJson = parseMemoFromInstruction(parsedTx.transaction.message.instructions);
    if (!validateMemoAgainstIntent(intent, memoJson)) {
      return { status: PaymentIntentStatus.MISMATCH, reason: 'MEMO_MISMATCH' };
    }

    const transferCheck = instructionsContainTransfer(parsedTx.transaction.message.instructions, intent);
    if (!transferCheck.ok) {
      return { status: PaymentIntentStatus.MISMATCH, reason: transferCheck.reason };
    }

    const rawTx = await getRawTransactionWithRetries(intent.signature, { retries: 3 });
    const rawTxBase64 = rawTx ? Buffer.from(rawTx.transaction.serialize()).toString('base64') : null;

    await recordTxAudit({
      intent,
      signature: intent.signature,
      parsedTx,
      rawTxBase64,
      entryTransfer: transferCheck.entryTransfer,
      feeTransfer: transferCheck.feeTransfer
    });

    const { intents } = await getCollections();
    const confirmedAt = new Date();

    const updateResult = await intents.findOneAndUpdate(
      { intentId: intent.intentId },
      {
        $set: {
          status: PaymentIntentStatus.CONFIRMED,
          confirmedAt,
          updatedAt: confirmedAt,
          memoJson
        }
      },
      { returnDocument: 'after' }
    );

    const confirmedIntent = updateResult.value;
    const joinTicket = await generateJoinTicket(confirmedIntent);

    return { status: PaymentIntentStatus.CONFIRMED, joinTicket };
  } catch (error) {
    if (error?.message?.includes('BlockhashNotFound')) {
      clearBlockhashCache();
    }
    console.error(`❌ Failed to verify intent ${intent.intentId}:`, error);
    return { status: PaymentIntentStatus.MISMATCH, reason: error.message };
  }
}

export async function verifyIntentById(intentId) {
  const intent = await getIntentById(intentId);
  if (!intent) {
    return { status: 'NOT_FOUND' };
  }
  if (![PaymentIntentStatus.SENT, PaymentIntentStatus.MISMATCH].includes(intent.status)) {
    return { status: intent.status };
  }
  return verifyIntent(intent);
}

export async function verifyPendingIntents(limit = 10) {
  await ensureIndexes();
  const { intents } = await getCollections();
  const now = new Date();
  const pending = await intents
    .find({
      status: { $in: [PaymentIntentStatus.SENT, PaymentIntentStatus.MISMATCH] },
      expiresAt: { $gt: now }
    })
    .limit(limit)
    .toArray();

  const results = [];
  for (const intent of pending) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await verifyIntent(intent));
  }
  return results;
}

export async function expireStaleIntents() {
  await ensureIndexes();
  const { intents } = await getCollections();
  const now = new Date();
  const result = await intents.updateMany(
    {
      status: { $in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.SENT, PaymentIntentStatus.MISMATCH] },
      expiresAt: { $lt: now }
    },
    {
      $set: {
        status: PaymentIntentStatus.EXPIRED,
        expiredAt: now,
        updatedAt: now
      }
    }
  );
  return result.modifiedCount || 0;
}

export async function getJoinTicketForIntent(intentId) {
  const intent = await getIntentById(intentId);
  if (!intent) {
    return null;
  }

  if (intent.status !== PaymentIntentStatus.CONFIRMED) {
    return {
      status: intent.status,
      intent
    };
  }

  const now = new Date();
  if (!intent.joinTicket || !intent.joinTicketExpiresAt || intent.joinTicketExpiresAt < now) {
    const joinTicket = await generateJoinTicket(intent);
    return {
      status: PaymentIntentStatus.CONFIRMED,
      joinTicket
    };
  }

  return {
    status: PaymentIntentStatus.CONFIRMED,
    joinTicket: {
      token: intent.joinTicket,
      expiresAt: intent.joinTicketExpiresAt
    }
  };
}

export async function markIntentConsumed(intentId) {
  const { intents } = await getCollections();
  const now = new Date();
  const result = await intents.updateOne(
    { intentId },
    {
      $set: {
        status: PaymentIntentStatus.CONSUMED,
        consumedAt: now,
        updatedAt: now
      }
    }
  );
  return result.modifiedCount > 0;
}

export async function verifyJoinTicket(token) {
  if (!JOIN_TICKET_SECRET) {
    throw new Error('Join ticket secret not configured');
  }
  const decoded = jwt.verify(token, JOIN_TICKET_SECRET, {
    issuer: JWT_ISSUER
  });
  return decoded;
}

export function getRateLimitKey(request, userId) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.ip || 'unknown';
  return `${ip}:${userId}`;
}

export { PaymentIntentStatus };
