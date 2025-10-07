import { NextResponse } from 'next/server';
import { getJoinTicketForIntent } from '../../../../../../lib/paid/intentService.js';
import { PaymentIntentStatus } from '../../../../../../lib/paid/constants.js';
import { ensurePaidRoomWatchers } from '../../../../../../lib/paid/watchers.js';

ensurePaidRoomWatchers();

export async function GET(_request, { params }) {
  try {
    const { intentId } = params;
    const ticketInfo = await getJoinTicketForIntent(intentId);
    if (!ticketInfo) {
      return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
    }

    if (ticketInfo.status !== PaymentIntentStatus.CONFIRMED) {
      const statusCode = ticketInfo.status === PaymentIntentStatus.EXPIRED ? 410 : 202;
      return NextResponse.json({ status: ticketInfo.status }, { status: statusCode });
    }

    return NextResponse.json({
      status: PaymentIntentStatus.CONFIRMED,
      joinTicket: {
        token: ticketInfo.joinTicket.token,
        expiresAt: ticketInfo.joinTicket.expiresAt instanceof Date
          ? ticketInfo.joinTicket.expiresAt.toISOString()
          : ticketInfo.joinTicket.expiresAt
      }
    });
  } catch (error) {
    console.error('❌ Failed to load join ticket:', error);
    return NextResponse.json({ error: error.message || 'Failed to load join ticket' }, { status: 500 });
  }
}
