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
    const {
      messages,
      profile,
      model,
      clientId,
      mode,
      localCheckAiTopLabels,
      localAssessCats,
      orders,
      assessResult,
      checkAiResult,
    } = body || {};
    const isInit = mode === "init";

    if (
      (!messages || !Array.isArray(messages) || messages.length === 0) &&
      !isInit
    ) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Gather known context from server for better continuity
    let knownContext = "";
    if (clientId && typeof clientId === "string") {
      await ensureClient(clientId, {
        userAgent: req.headers.get("user-agent"),
      });
      try {
        const latest = await getLatestResults(clientId);
        const parts: string[] = [];
        if (latest.assessCats && latest.assessCats.length) {
          const cats = latest.assessCats.slice(0, 3);
          const pcts = latest.assessPercents || [];
          const pctText = cats
            .map(
              (c, i) =>
                `${c}${
                  pcts[i] != null ? ` (${(pcts[i] * 100).toFixed(1)}%)` : ""
                }`
            )
            .join(", ");
          parts.push(`Assessment top categories: ${pctText}`);
        } else if (Array.isArray(localAssessCats) && localAssessCats.length) {
          parts.push(
            `Assessment top categories (local): ${localAssessCats
              .slice(0, 3)
              .join(", ")}`
          );
        }
        if (
          (!latest.assessCats || latest.assessCats.length === 0) &&
          latest.checkAiTopLabels?.length
        ) {
          parts.push(
            `Check-AI top categories: ${latest.checkAiTopLabels
              .slice(0, 3)
              .join(", ")}`
          );
        }
        if (
          parts.length === 0 &&
          Array.isArray(localCheckAiTopLabels) &&
          localCheckAiTopLabels.length
        ) {
          parts.push(
            `Check-AI top categories (local): ${localCheckAiTopLabels
              .slice(0, 3)
              .join(", ")}`
          );
        }
        if (parts.length) {
          knownContext = `Known user results (server): ${parts.join("; ")}.`;
        }
      } catch {}
    }

    const sysPrompt =
      buildSystemPrompt(profile) + (knownContext ? `\n\n${knownContext}` : "");

    const userContext = {
      orders: Array.isArray(orders) ? orders : [],
      assessmentResult: assessResult ?? null,
      checkAiResult: checkAiResult ?? null,
    };
    const userContextJson = JSON.stringify(userContext);

    const openaiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: sysPrompt },
      { role: "system", content: `USER_CONTEXT_JSON: ${userContextJson}` },
    ];
    if (isInit) {
      const initGuide = `초기 인사 메시지 지침:
        - 제공된 USER_CONTEXT_JSON에서 주문, AI 진단 검사 결과의 특징을 1-2문장으로 브리핑.
        - 건강기능식품 상담을 위해 관련된 질문을 1개 이상 제시하여 대화를 이어가기.
        - USER_CONTEXT_JSON에 유의미한 정보가 없다면 /check-ai와 /assess 사용을 권유하고, 상담 목표와 현재 질환·복용약·알레르기 중 두 가지를 물어볼 것.
        - 불필요한 장황한 서론 금지.
        - 한국어, ~요로 끝나는 말투.`;
      openaiMessages.push({ role: "system", content: initGuide });
      openaiMessages.push({
        role: "user",
        content:
          "USER_CONTEXT_JSON을 참고하여 초기 인사 메시지를 작성해주세요.",
      });
    } else {
      openaiMessages.push(
        ...messages.map((m) => ({ role: m.role, content: m.content }))
      );
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
          } catch {}
        }

        function read() {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              const chunk = new TextDecoder().decode(value);
              buffer += chunk;
              const lines = buffer.split(/\r?\n/);
              buffer = lines.pop() ?? "";
              for (const line of lines) onLine(line);
              read();
            })
            .catch((err) => {
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
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
