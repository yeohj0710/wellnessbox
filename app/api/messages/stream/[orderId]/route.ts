import { NextRequest } from "next/server";
import db from "@/lib/db";
import { verify } from "@/lib/jwt";
import { messageEvents } from "@/lib/events";
import { normalizeMessage } from "@/lib/message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: any) {
  const orderId = Number(context.params.orderId);
  if (!orderId || Number.isNaN(orderId))
    return new Response("Invalid orderId", { status: 400 });

  const search = req.nextUrl.searchParams;
  const token = search.get("token");
  if (!token) return new Response("Unauthorized", { status: 403 });
  try {
    const payload = verify(token);
    if (payload.orderId !== orderId)
      return new Response("Unauthorized", { status: 403 });
  } catch {
    return new Response("Unauthorized", { status: 403 });
  }

  const lastIdParam = search.get("lastId");
  const lastId = lastIdParam ? Number(lastIdParam) : null;

  const encoder = new TextEncoder();
  let keepAlive: NodeJS.Timeout;
  let handler: ((msg: any) => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: any) => {
        controller.enqueue(encoder.encode(`id: ${msg.id}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      };

      if (lastId !== null) {
        const backlog = await db.message.findMany({
          where: { orderId, id: { gt: lastId } },
          orderBy: { id: "asc" },
          take: 200,
        });
        for (const m of backlog) {
          send(await normalizeMessage(m));
        }
      }

      handler = (msg: any) => {
        send(msg);
      };
      messageEvents.on(`order:${orderId}`, handler);

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`:ping\n\n`));
      }, 15000);
    },
    cancel() {
      if (handler) messageEvents.off(`order:${orderId}`, handler);
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
