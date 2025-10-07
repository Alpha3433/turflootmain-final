import { NextResponse } from 'next/server';
import { getRoomQuote } from '../../../../../../lib/paid/config.js';
import { ensurePaidRoomWatchers } from '../../../../../../lib/paid/watchers.js';

ensurePaidRoomWatchers();

export async function GET(_request, { params }) {
  try {
    const { roomId } = params;
    const quote = getRoomQuote(roomId);
    if (!quote) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      roomId: quote.roomId,
      entryLamports: quote.entryLamports,
      feeLamports: quote.feeLamports,
      totalLamports: quote.totalLamports,
      feeBps: quote.feeBps,
      prizeVault: quote.prizeVault,
      feeVault: quote.feeVault,
      currencyDisplay: quote.currencyDisplay,
      priorityFeeMicroLamports: quote.priorityFeeMicroLamports
    });
  } catch (error) {
    console.error('❌ Failed to load paid room quote:', error);
    return NextResponse.json({ error: error.message || 'Failed to load room quote' }, { status: 500 });
  }
}
