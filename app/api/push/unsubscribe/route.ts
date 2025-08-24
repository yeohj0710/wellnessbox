import { NextRequest, NextResponse } from 'next/server';
import { removeSubscription } from '@/lib/notification';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, orderId, role } = body;
    if (!endpoint || !orderId || !role) {
      return NextResponse.json(
        { error: 'Missing params' },
        { status: 400 }
      );
    }
    await removeSubscription(endpoint, orderId, role);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
