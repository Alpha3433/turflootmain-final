import { NextResponse } from 'next/server';
import { submitIntentSignature } from '../../../../../../lib/paid/intentService.js';
import { scheduleIntentVerification, ensurePaidRoomWatchers } from '../../../../../../lib/paid/watchers.js';

ensurePaidRoomWatchers();

export async function POST(request, { params }) {
  try {
    const { intentId } = params;
    const body = await request.json();
    const { signature } = body || {};

    if (!signature) {
      return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
    }

    const intent = await submitIntentSignature(intentId, signature);
    scheduleIntentVerification(intent.intentId, 0);

    return NextResponse.json({ status: intent.status, signature });
  } catch (error) {
    console.error('❌ Failed to store intent signature:', error);
    return NextResponse.json({ error: error.message || 'Failed to store signature' }, { status: 400 });
  }
}
