import { NextRequest } from "next/server";
import { streamChat } from "@/lib/ai/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const q = typeof body?.question === "string" ? body.question.trim() : "";
    const msgs = Array.isArray(body?.messages) ? body.messages : [];
    const normalized =
      msgs.length > 0 ? msgs : q ? [{ role: "user", content: q }] : [];

    const patchedBody = { ...body, messages: normalized, ragQuery: q };

    const headersObj = req.headers;
    let iterable: AsyncIterable<string> | undefined;
    try {
      iterable = (await streamChat(
        patchedBody,
        headersObj
      )) as AsyncIterable<string>;
    } catch (e: any) {
      const raw = typeof e?.message === "string" ? e.message : String(e ?? "");
      const safe = raw.replace(/[{}]/g, (m: string) => (m === "{" ? "(" : ")"));
      const msg =
        "[안내] " +
        (safe || "초기화 중 문제가 발생했어요. 설정을 확인해 주세요.");
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(msg));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        let wrote = false;
        try {
          for await (const token of iterable as AsyncIterable<string>) {
            if (token == null) continue;
            controller.enqueue(encoder.encode(String(token)));
            wrote = true;
          }
        } catch {
          const msg =
            "[안내] 대화 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
          controller.enqueue(encoder.encode(msg));
        } finally {
          if (!wrote) controller.enqueue(encoder.encode(" "));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    return new Response(msg, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
