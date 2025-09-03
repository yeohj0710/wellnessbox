import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { ChatRequestBody } from "@/types/chat";
import { getDefaultModel } from "@/lib/ai/models";
import { getLatestResults } from "@/lib/server/results";
import { ensureClient } from "@/lib/server/client";
import { CATEGORY_LABELS, CategoryKey, KEY_TO_CODE } from "@/lib/categories";

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

function buildUserContextBrief(ctx: any) {
  const parts: string[] = [];
  if (ctx.summary) parts.push(ctx.summary);
  if (ctx.latestTest?.top?.length) {
    const tops = ctx.latestTest.top
      .map(
        (t: any) =>
          t.label + (t.percent != null ? ` ${t.percent.toFixed(1)}%` : "")
      )
      .join(", ");
    parts.push(`최근 검사: ${ctx.latestTest.type} · ${tops}`);
  }
  if (ctx.orders?.last)
    parts.push(`최근 주문: #${ctx.orders.last.id} ${ctx.orders.last.status}`);
  const brief = parts.join(" · ");
  return brief.length > 480 ? brief.slice(0, 480) + "…" : brief;
}

function trimMessagesWindow(
  messages: Array<{ role: string; content: string }>,
  maxChars = 8000,
  maxCount = 16
) {
  const win = messages.slice(-maxCount);
  let total = 0;
  const out: typeof win = [];
  for (let i = win.length - 1; i >= 0; i--) {
    const m = win[i];
    total += m.content.length;
    if (total > maxChars) break;
    out.push(m);
  }
  return out.reverse();
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

    function buildUserContext(
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
      const assessAnswers = Array.isArray(assessResult?.answers)
        ? assessResult.answers
        : [];
      const assessAnswered = assessAnswers.length;
      const quickAnswers = Array.isArray(checkAiResult?.answers)
        ? checkAiResult.answers
        : [];
      const quickAnswered = quickAnswers.length;
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
      if (assessBrief) summaryParts.push(`정밀 AI 검사 상위: ${assessBrief}`);
      if (quickBrief) summaryParts.push(`빠른 AI 검사 상위: ${quickBrief}`);
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
              answers: assessAnswers,
            }
          : null,
        quick: quickTop.length
          ? {
              createdAt: checkAiResult?.createdAt ?? null,
              top: quickTop,
              answered: quickAnswered,
              answers: quickAnswers,
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
        },
        latestTest: (() => {
          const aDate = assessResult?.createdAt
            ? new Date(assessResult.createdAt).getTime()
            : 0;
          const qDate = checkAiResult?.createdAt
            ? new Date(checkAiResult.createdAt).getTime()
            : 0;
          if (aDate === 0 && qDate === 0) return null;
          if (aDate >= qDate && assessTop.length)
            return {
              type: "assess",
              createdAt: assessResult.createdAt,
              top: assessTop,
              answers: assessAnswers,
            };
          if (qDate > aDate && quickTop.length)
            return {
              type: "quick",
              createdAt: checkAiResult.createdAt,
              top: quickTop,
              answers: quickAnswers,
            };
          return null;
        })(),
      };
    }

    const userContext = buildUserContext(
      Array.isArray(orders) ? orders : [],
      assessResult ?? null,
      checkAiResult ?? null
    );
    const userContextBrief = buildUserContextBrief(userContext);
    const userContextJson = JSON.stringify(userContext, null, 2);

    const openaiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: sysPrompt },
      { role: "system", content: `USER_CONTEXT_BRIEF: ${userContextBrief}` },
      { role: "system", content: `USER_CONTEXT_JSON: ${userContextJson}` },
    ];

    if (isInit) {
      const initGuide = `초기 인사 메시지 지침:
        - USER_CONTEXT.orders.last가 있으면 최근 주문을 한 문장으로 요약.
        - USER_CONTEXT.latestTest가 있으면 해당 검사 종류와 상위 추천 항목을 언급하고 answers를 참고해 추천 이유를 간단히 설명.
        - USER_CONTEXT.latestTest.answers에서 후속 상담을 위한 질문을 1개 골라 사용자에게 질문.
        - 유의미한 정보가 없으면 AI 진단 검사를 먼저 하고 오기를 권장하고, 상담 목표와 현재 질환·복용약·알레르기 중 두 가지를 물어볼 것.
        - 한국어, ~요로 끝나는 말투.
        - 출력 형식: 문단 사이 빈 줄은 1개만 사용, 연속 개행은 2회 이하, 답변 시작과 끝에는 개행을 넣지 말 것.`;
      openaiMessages.push({ role: "system", content: initGuide });
      openaiMessages.push({
        role: "user",
        content: "USER_CONTEXT를 참고하여 초기 인사 메시지를 작성해주세요.",
      });
    } else {
      openaiMessages.push({
        role: "system",
        content:
          "규칙: 위 USER_CONTEXT_BRIEF/JSON을 항상 우선 반영해 답변하라. 건강과 무관한 요청엔 행동을 제한하고 필요한 경우 AI 진단 검사만 권고하라. 출력 형식: 문단 사이 빈 줄은 1개만, 연속 개행은 2회 이하.",
      });

      const trimmed = trimMessagesWindow(
        messages.map((m) => ({ role: m.role, content: m.content }))
      );
      openaiMessages.push(...trimmed);
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
        let started = false;
        let newlineRun = 0;
        function normalizeChunk(s: string) {
          let out = "";
          for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c === "\r") continue;
            if (!started) {
              if (c === "\n" || c === " " || c === "\t") continue;
              started = true;
            }
            if (c === "\n") {
              newlineRun++;
              if (newlineRun <= 1) out += "\n";
              continue;
            }
            if (c === " " || c === "\t") {
              if (newlineRun > 0) continue;
              out += c;
              continue;
            }
            newlineRun = 0;
            out += c;
          }
          return out;
        }
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
            if (delta) push(normalizeChunk(delta));
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
