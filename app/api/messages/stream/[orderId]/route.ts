import { NextRequest } from 'next/server';
import { messageEvents } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const orderId = Number(params.orderId);
  if (!orderId) {
    return new Response('Invalid orderId', { status: 400 });
  }

  const encoder = new TextEncoder();
  let onMessage: ((msg: any) => void) | null = null;
  let keepAlive: any;
  const stream = new ReadableStream({
    start(controller) {
      onMessage = (msg: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(msg)}\n\n`)
        );
      };
      messageEvents.on(`message:${orderId}`, onMessage);
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(':keep-alive\n\n'));
      }, 25000);
      controller.enqueue(encoder.encode(':connected\n\n'));
    },
    cancel() {
      if (onMessage) messageEvents.off(`message:${orderId}`, onMessage);
      clearInterval(keepAlive);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
