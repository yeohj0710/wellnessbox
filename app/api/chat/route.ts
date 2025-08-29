import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { ChatRequestBody } from "@/types/chat";
import { DEFAULT_MODEL } from "@/lib/ai/models";

export const runtime = "nodejs";

function ensureEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set`);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = ensureEnv("OPENAI_KEY");
    const body = (await req.json()) as ChatRequestBody;
    const { messages, profile, model } = body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sysPrompt = buildSystemPrompt(profile);

    // Convert to OpenAI message format
    const openaiMessages = [
      { role: "system", content: sysPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const controller = new AbortController();

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages: openaiMessages,
        temperature: 0.3,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${resp.status} ${text}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream SSE from OpenAI to the client as text chunks
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const reader = resp.body!.getReader();
        const encoder = new TextEncoder();
        let buffer = "";

        function push(text: string) {
          controller.enqueue(encoder.encode(text));
        }

        function onLine(line: string) {
          if (!line.trim()) return;
          if (!line.startsWith("data:")) return;
          const data = line.replace(/^data:\s*/, "");
          if (data === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) push(delta);
          } catch {
            // ignore parse errors for keep-alive lines
          }
        }

        function read() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? ""; // keep last partial line
            for (const line of lines) onLine(line);
            read();
          }).catch((err) => {
            controller.error(err);
          });
        }

        read();
      },
      cancel() {
        controller.abort();
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
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

