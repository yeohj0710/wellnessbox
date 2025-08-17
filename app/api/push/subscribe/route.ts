import { NextRequest, NextResponse } from 'next/server';
import { saveSubscription } from '@/lib/notification';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, subscription } = body;
    if (!orderId || !subscription) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }
    await saveSubscription(orderId, subscription);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
