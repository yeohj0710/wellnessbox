import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { ChatRequestBody } from "@/types/chat";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import { getLatestResults } from "@/lib/server/results";
import { ensureClient } from "@/lib/server/client";

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
    const { messages, profile, model, clientId, mode, localCheckAiTopLabels } = body || {};
    const isInit = mode === "init";

    // Allow empty messages only for init mode (first assistant greeting)
    if ((!messages || !Array.isArray(messages) || messages.length === 0) && !isInit) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Gather known context from server for better continuity
    let knownContext = "";
    if (clientId && typeof clientId === "string") {
      await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
      try {
        const latest = await getLatestResults(clientId);
        const parts: string[] = [];
        if (latest.assessCats && latest.assessCats.length) {
          const cats = latest.assessCats.slice(0, 3);
          const pcts = latest.assessPercents || [];
          const pctText = cats
            .map((c, i) => `${c}${pcts[i] != null ? ` (${(pcts[i] * 100).toFixed(1)}%)` : ""}`)
            .join(", ");
          parts.push(`Assessment top categories: ${pctText}`);
        }
        if ((!latest.assessCats || latest.assessCats.length === 0) && latest.checkAiTopLabels?.length) {
          parts.push(`Check-AI top categories: ${latest.checkAiTopLabels.slice(0, 3).join(", ")}`);
        }
        // If nothing on server, augment with local Check-AI labels (best-effort)
        if (
          parts.length === 0 &&
          Array.isArray(localCheckAiTopLabels) &&
          localCheckAiTopLabels.length
        ) {
          parts.push(
            `Check-AI top categories (local): ${localCheckAiTopLabels.slice(0, 3).join(", ")}`
          );
        }
        if (parts.length) {
          knownContext = `Known user results (server): ${parts.join("; ")}.`;
        }
      } catch {}
    }

    const sysPrompt = buildSystemPrompt(profile) + (knownContext ? `\n\n${knownContext}` : "");

    // Convert to OpenAI message format
    const openaiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: sysPrompt },
    ];
    const isInit = mode === "init";
    if (isInit) {
      // Force the first assistant message to follow the requested structure
      const initGuide = `초기 인사 메시지 지침:
- 인사 후 추천된 상위 3개 카테고리를 먼저 제시.
- 각 카테고리가 어떤 영양 성분/기능인지 1-2문장으로 설명.
- 그 다음 상담을 자연스럽게 이어가며 질문 1개 제시.
- 불필요한 장황한 서론 금지.
- 한국어, 반말 대신 존댓말.
- 의료 자문 아님을 1문장으로 덧붙임.`;
      openaiMessages.push({ role: "system", content: initGuide });
      // Extra guidance in plain ASCII to ensure robust behavior when no results exist
      openaiMessages.push({
        role: "system",
        content:
          "If no known user results are available, greet warmly, suggest /check-ai and /assess as ways to get more precise recommendations, and ask two concise starter questions (main goal, and any conditions/medications/allergies).",
      });
      openaiMessages.push({ role: "user", content: "초기 인사 메시지를 작성해주세요." });
    } else {
      openaiMessages.push(...messages.map((m) => ({ role: m.role, content: m.content })));
    }

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
