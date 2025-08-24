import { messageEvents } from "@/lib/events";
import db from "@/lib/db";
import getSession from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ orderId: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  const { orderId: orderIdStr } = await params;
  const orderId = Number(orderIdStr);
  if (!orderId) return new Response("Invalid orderId", { status: 400 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  if (role === "customer") {
    const phone = searchParams.get("phone");
    const password = searchParams.get("password");
    if (!phone || !password)
      return new Response("Unauthorized", { status: 403 });
    const order = await db.order.findFirst({
      where: { id: orderId, phone, password },
    });
    if (!order) return new Response("Unauthorized", { status: 403 });
  } else if (role === "pharm") {
    const session = await getSession();
    const pharmId = session.pharm?.id;
    if (!pharmId) return new Response("Unauthorized", { status: 403 });
    const order = await db.order.findFirst({
      where: { id: orderId, pharmacyId: pharmId },
    });
    if (!order) return new Response("Unauthorized", { status: 403 });
  } else {
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
