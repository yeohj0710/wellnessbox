import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { ChatRequestBody } from "@/types/chat";
import { getDefaultModel } from "@/lib/ai/models";
import { getLatestResults } from "@/lib/server/results";
import { ensureClient } from "@/lib/server/client";
import {
  CATEGORY_LABELS,
  CategoryKey,
  KEY_TO_CODE,
} from "@/lib/categories";

export const runtime = "nodejs";

function ensureEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set`);
  return v;
}

const CAT_ALIAS: Record<string, CategoryKey> = Object.fromEntries(
  Object.entries(KEY_TO_CODE).flatMap(([k, code]) => {
    const key = k as CategoryKey;
    const label = CATEGORY_LABELS[key];
    return [
      [k, key],
      [code, key],
      [label, key],
    ];
  })
) as Record<string, CategoryKey>;

function labelOf(keyOrCodeOrLabel: string) {
  const k = (CAT_ALIAS[keyOrCodeOrLabel] ?? keyOrCodeOrLabel) as string;
  const v = CATEGORY_LABELS[k as keyof typeof CATEGORY_LABELS];
  if (v) return v;
  const found = Object.values(CATEGORY_LABELS).find(
    (x) => x === keyOrCodeOrLabel
  );
  return found ?? keyOrCodeOrLabel;
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
                `${labelOf(c)}${
                  pcts[i] != null ? ` (${(pcts[i] * 100).toFixed(1)}%)` : ""
                }`
            )
            .join(", ");
          parts.push(`Assessment top categories: ${pctText}`);
        } else if (Array.isArray(localAssessCats) && localAssessCats.length) {
          parts.push(
            `Assessment top categories (local): ${localAssessCats
              .slice(0, 3)
              .map((c: string) => labelOf(c))
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

    function buildUserContextV2(
      orders: any[],
      assessResult: any,
      checkAiResult: any
    ) {
      const lastOrder =
        Array.isArray(orders) && orders.length ? orders[0] : null;
      const assessTop = Array.isArray(assessResult?.summary)
        ? assessResult.summary
            .map((s: string, i: number) => {
              const m = s.match(/^(.+?)\s+([\d.]+)%$/);
              if (!m) return null;
              const percent = parseFloat(m[2]);
              const label = labelOf(m[1]);
              return { rank: i + 1, label, percent };
            })
            .filter(Boolean)
            .slice(0, 3)
        : [];
      const quickTop = Array.isArray(checkAiResult?.labels)
        ? checkAiResult.labels
            .slice(0, 3)
            .map((x: string, i: number) => ({ rank: i + 1, label: labelOf(x) }))
        : [];

      const assessAnswered = Array.isArray(assessResult?.answers)
        ? assessResult.answers.length
        : 0;
      const quickAnswered = Array.isArray(checkAiResult?.answers)
        ? checkAiResult.answers.length
        : 0;
      const orderItems =
        lastOrder?.items?.map((it: any) => ({
          name: it.name,
          qty: it.quantity ?? null,
        })) ?? [];
      const hasData =
        !!lastOrder || assessTop.length > 0 || quickTop.length > 0;

      const assessBrief = assessTop.length
        ? assessTop
            .map(
              (t: any) =>
                `${t.rank}) ${t.label}${
                  t.percent != null ? ` ${t.percent.toFixed(1)}%` : ""
                }`
            )
            .join(", ")
        : "";
      const quickBrief = quickTop.length
        ? quickTop.map((t: any) => `${t.rank}) ${t.label}`).join(", ")
        : "";
      const summaryParts: string[] = [];
      if (assessBrief) summaryParts.push(`정밀검사 상위: ${assessBrief}`);
      if (quickBrief) summaryParts.push(`빠른검사 상위: ${quickBrief}`);
      if (lastOrder)
        summaryParts.push(`최근 주문: #${lastOrder.id} ${lastOrder.status}`);
      const summary = summaryParts.join(" · ");

      return {
        hasData,
        summary,
        assess: assessTop.length
          ? {
              createdAt: assessResult?.createdAt ?? null,
              top: assessTop,
              answered: assessAnswered,
              note: "createdAt은 검사일시, top은 1~3순위 추천이며 percent는 적합도(%)",
            }
          : null,
        quick: quickTop.length
          ? {
              createdAt: checkAiResult?.createdAt ?? null,
              top: quickTop,
              answered: quickAnswered,
              note: "createdAt은 검사일시, top은 1~3순위 추천이며 percent는 적합도(%)",
            }
          : null,
        orders: {
          count: Array.isArray(orders) ? orders.length : 0,
          last: lastOrder
            ? {
                id: lastOrder.id,
                status: lastOrder.status,
                createdAt: lastOrder.createdAt ?? null,
                updatedAt: lastOrder.updatedAt ?? null,
                items: orderItems,
              }
            : null,
          note: "orders.last.createdAt은 주문일시, orders.last.updatedAt은 가장 최근 조제/배송 상태 갱신 시각",
        },
      };
    }

    const userContextLegacy = {
      "주문 내역": Array.isArray(orders) ? orders : [],
      "정밀 AI 검사": assessResult ?? null,
      "빠른 AI 검사": checkAiResult ?? null,
    };
    const userContextJson = JSON.stringify(userContextLegacy);
    const userContextV2 = buildUserContextV2(
      Array.isArray(orders) ? orders : [],
      assessResult ?? null,
      checkAiResult ?? null
    );
    const userContextV2Json = JSON.stringify(userContextV2);

    const contextSemantics = [
      "USER_CONTEXT_V2 해석 지침:",
      "- assess.createdAt, quick.createdAt은 검사일시를 뜻한다.",
      "- assess.top, quick.top은 1~3순위 추천이며 percent가 있으면 적합도(%)를 뜻한다.",
      "- orders.last.createdAt은 주문일시, orders.last.updatedAt은 가장 최근 조제/배송 상태 갱신 시각을 뜻한다.",
      "- 퍼센트 표기는 한국어 문장 내에서 소수 첫째 자리까지 표기한다.",
      "- 답변은 한국어로 작성한다.",
    ].join("\n");

    const STYLE_GUIDE = [
      "- 답변은 한국어로 작성하고 Markdown 형식을 사용한다.",
      "- 문단 사이에 빈 줄을 두고, 필요 시 불릿 목록(•)을 3~7개 이내로 쓴다.",
      "- 표가 유익하면 간단한 Markdown 표를 사용한다.",
      "- 한 번의 답변은 8문장 또는 1200자 이내로 제한한다.",
    ].join("\n");

    const openaiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: sysPrompt },
      { role: "system", content: contextSemantics },
      { role: "system", content: STYLE_GUIDE },
      { role: "system", content: `USER_CONTEXT_JSON: ${userContextJson}` },
      { role: "system", content: `USER_CONTEXT_V2: ${userContextV2Json}` },
    ];

    if (isInit) {
      const initGuide = `초기 인사 메시지 지침:
        - USER_CONTEXT_V2.summary를 1문장으로 브리핑.
        - USER_CONTEXT_V2.assess.top과 quick.top을 참고해 우선순위 1개를 뽑아 질문을 1개 이상 제시.
        - 유의미한 정보가 없으면 /check-ai와 /assess 사용을 권유하고, 상담 목표와 현재 질환·복용약·알레르기 중 두 가지를 물어볼 것.
        - 한국어, ~요로 끝나는 말투.`;
      openaiMessages.push({ role: "system", content: initGuide });
      openaiMessages.push({
        role: "user",
        content: "USER_CONTEXT_V2를 참고하여 초기 인사 메시지를 작성해주세요.",
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
        model: model || (await getDefaultModel()),
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
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
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
