import { NextResponse } from 'next/server';
import { createPaymentIntent, getRateLimitKey } from '../../../../lib/paid/intentService.js';
import { ensurePaidRoomWatchers } from '../../../../lib/paid/watchers.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.PAID_ROOMS_INTENT_RATE_LIMIT || 5);

const rateLimitStore = globalThis.__PAID_ROOMS_RATE_LIMIT__ || new Map();
if (!globalThis.__PAID_ROOMS_RATE_LIMIT__) {
  globalThis.__PAID_ROOMS_RATE_LIMIT__ = rateLimitStore;
}

function checkRateLimit(request, userId) {
  const key = getRateLimitKey(request, userId);
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (record.resetAt < now) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  record.count += 1;
  rateLimitStore.set(key, record);

  if (record.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    throw new Response(JSON.stringify({ error: 'RATE_LIMITED', retryAfter }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString()
      }
    });
  }
}

ensurePaidRoomWatchers();

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, gameId, roomId, playerPubkey } = body || {};

    if (!userId || !gameId || !roomId || !playerPubkey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
      checkRateLimit(request, userId);
    } catch (responseError) {
      if (responseError instanceof Response) {
        return responseError;
      }
      throw responseError;
    }

    const intent = await createPaymentIntent({ userId, gameId, roomId, playerPubkey });

    return NextResponse.json({
      intentId: intent.intentId,
      serializedMessage: intent.serializedMessage,
      memoJson: intent.memoJson,
      lamports: intent.lamports,
      feeBps: intent.feeBps,
      recipient: intent.recipient,
      recentBlockhash: intent.recentBlockhash,
      lastValidBlockHeight: intent.lastValidBlockHeight,
      expiresAt: intent.expiresAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('❌ Failed to create payment intent:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment intent' }, { status: 500 });
  }
}
