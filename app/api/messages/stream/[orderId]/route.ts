import { messageEvents } from "@/lib/events";
import db from "@/lib/db";
import { verify } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId: orderIdStr } = await params; // ✅ 반드시 await
  const orderId = Number(orderIdStr);
  if (!orderId) return new Response("Invalid orderId", { status: 400 });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return new Response("Unauthorized", { status: 403 });

  try {
    const payload = verify(token);
    if (payload.role === "customer") {
      if (payload.orderId !== orderId)
        return new Response("Unauthorized", { status: 403 });
    } else if (payload.role === "pharm") {
      const order = await db.order.findFirst({
        where: { id: orderId, pharmacyId: payload.pharmacyId },
      });
      if (!order) return new Response("Unauthorized", { status: 403 });
    } else if (payload.role === "rider") {
      const order = await db.order.findFirst({
        where: { id: orderId, riderId: payload.riderId },
      });
      if (!order) return new Response("Unauthorized", { status: 403 });
    } else {
      return new Response("Unauthorized", { status: 403 });
    }
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
      messageEvents.on(`message:${orderId}`, onMessage);
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(":keep-alive\n\n"));
      }, 25000);
      controller.enqueue(encoder.encode(":connected\n\n"));
    },
    cancel() {
      if (onMessage) messageEvents.off(`message:${orderId}`, onMessage);
      clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
