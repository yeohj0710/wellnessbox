import { NextRequest, NextResponse } from "next/server";
import { streamChat } from "@/lib/ai/chain";
import { resolveActorForRequest } from "@/lib/server/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = await resolveActorForRequest(req, {
      intent: "write",
    });
    const deviceClientId = actor.deviceClientId;
    if (actor.loggedIn && !actor.appUserId) {
      return NextResponse.json({ error: "Missing appUserId" }, { status: 500 });
    }
    if (!actor.loggedIn && !deviceClientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    const smokeHeader = req.headers.get("x-smoke-test") === "1";
    const allowSmoke = smokeHeader && process.env.NODE_ENV !== "production";
    if (smokeHeader && !allowSmoke) {
      return NextResponse.json({ error: "Smoke test disabled" }, { status: 403 });
    }
    if (allowSmoke) {
      const res = new NextResponse("ok", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
      if (actor.cookieToSet) {
        res.cookies.set(
          actor.cookieToSet.name,
          actor.cookieToSet.value,
          actor.cookieToSet.options
        );
      }
      return res;
    }

    const q = typeof body?.question === "string" ? body.question.trim() : "";
    const msgs = Array.isArray(body?.messages) ? body.messages : [];
    const normalized =
      msgs.length > 0 ? msgs : q ? [{ role: "user", content: q }] : [];

    const patchedBody = {
      ...body,
      clientId: deviceClientId ?? undefined,
      appUserId: actor.appUserId ?? undefined,
      actorContext: {
        loggedIn: actor.loggedIn,
        phoneLinked: actor.phoneLinked,
      },
      messages: normalized,
      ragQuery: q,
    };

    const headersObj = req.headers;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        let wrote = false;

        try {
          // Flush stream headers quickly while upstream context/model bootstraps.
          controller.enqueue(encoder.encode("\u200b"));

          const iterable = (await streamChat(
            patchedBody,
            headersObj
          )) as AsyncIterable<string>;

          for await (const token of iterable) {
            if (token == null) continue;
            controller.enqueue(encoder.encode(String(token)));
            wrote = true;
          }
        } catch (e: any) {
          const raw = typeof e?.message === "string" ? e.message : String(e ?? "");
          const safe = raw.replace(/[{}]/g, (m: string) => (m === "{" ? "(" : ")"));
          const msg =
            safe || "응답을 준비하는 중 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
          controller.enqueue(encoder.encode(msg));
        } finally {
          if (!wrote) controller.enqueue(encoder.encode(" "));
          controller.close();
        }
      },
    });

    const res = new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
    if (actor.cookieToSet) {
      res.cookies.set(
        actor.cookieToSet.name,
        actor.cookieToSet.value,
        actor.cookieToSet.options
      );
    }
    return res;
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    const res = new NextResponse(msg, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
    return res;
  }
}
