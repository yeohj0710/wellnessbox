import { messageEvents } from "@/lib/events";
import { verify } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const orderIdNum = Number(orderId);
  if (!orderIdNum || orderIdNum <= 0)
    return new Response("Invalid orderId", { status: 400 });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return new Response("Unauthorized", { status: 403 });

  try {
    const payload = verify(token);
    if (payload.orderId !== orderIdNum)
      return new Response("Unauthorized", { status: 403 });
  } catch {
    return new Response("Unauthorized", { status: 403 });
  }

  const encoder = new TextEncoder();
  let onMessage: ((msg: any) => void) | null = null;
  let keepAlive: any;

  const stream = new ReadableStream({
    start(controller) {
      onMessage = (msg: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      };
      messageEvents.on(`message:${orderIdNum}`, onMessage);
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(":keep-alive\n\n"));
      }, 25000);
      controller.enqueue(encoder.encode(":connected\n\n"));
    },
    cancel() {
      if (onMessage) messageEvents.off(`message:${orderIdNum}`, onMessage);
      clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, no-transform",
      Connection: "keep-alive",
    },
  });
}
