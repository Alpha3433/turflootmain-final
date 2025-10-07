import {
  expireStaleIntents,
  verifyIntentById,
  verifyPendingIntents
} from './intentService.js';
import { PaymentIntentStatus } from './constants.js';

let watchersStarted = false;
const activeVerifications = new Set();

function schedule(fn, delay = 0) {
  const timer = setTimeout(fn, delay);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
  return timer;
}

async function runPendingVerifications() {
  try {
    await verifyPendingIntents();
  } catch (error) {
    console.error('❌ Paid room verification sweep failed:', error);
  }
}

async function runExpirySweep() {
  try {
    const expired = await expireStaleIntents();
    if (expired > 0) {
      console.log(`⏳ Expired ${expired} stale payment intents`);
    }
  } catch (error) {
    console.error('❌ Paid room expiry sweep failed:', error);
  }
}

export function ensurePaidRoomWatchers() {
  if (watchersStarted) return;
  watchersStarted = true;
  schedule(runPendingVerifications, 3_000);
  const verificationInterval = setInterval(runPendingVerifications, 5_000);
  verificationInterval.unref?.();
  const expiryInterval = setInterval(runExpirySweep, 10_000);
  expiryInterval.unref?.();
}

export function scheduleIntentVerification(intentId, delay = 500) {
  ensurePaidRoomWatchers();
  if (activeVerifications.has(intentId)) {
    return;
  }
  activeVerifications.add(intentId);
  schedule(async () => {
    try {
      const result = await verifyIntentById(intentId);
      if (result.status === PaymentIntentStatus.SENT) {
        // Requeue to check again until confirmation or expiry
        activeVerifications.delete(intentId);
        scheduleIntentVerification(intentId, 3_000);
        return;
      }
    } catch (error) {
      console.error(`❌ Failed to verify intent ${intentId}:`, error);
    } finally {
      activeVerifications.delete(intentId);
    }
  }, delay);
}
