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

function pickOrderItemNames(items: any[]) {
  if (!Array.isArray(items)) return [];
  const names = items
    .map(
      (it: any) =>
        it?.name ??
        it?.productName ??
        it?.product?.name ??
        it?.label ??
        it?.title ??
        it?.sku ??
        null
    )
    .filter(Boolean);
  return Array.from(new Set(names)).slice(0, 5);
}

function buildUserContextBrief(ctx: any) {
  const parts: string[] = [];
  if (ctx.profile) {
    const p = ctx.profile;
    const pParts: string[] = [];
    if (p.sex === "male") pParts.push("남성");
    else if (p.sex === "female") pParts.push("여성");
    if (typeof p.age === "number") pParts.push(`${p.age}세`);
    if (Array.isArray(p.conditions) && p.conditions.length)
      pParts.push(`질환:${p.conditions.slice(0, 2).join(",")}`);
    if (Array.isArray(p.medications) && p.medications.length)
      pParts.push(`약:${p.medications.slice(0, 2).join(",")}`);
    if (Array.isArray(p.allergies) && p.allergies.length)
      pParts.push(`알레르기:${p.allergies.slice(0, 2).join(",")}`);
    if (Array.isArray(p.goals) && p.goals.length)
      pParts.push(`목표:${p.goals.slice(0, 2).join(",")}`);
    if (pParts.length) parts.push(`프로필: ${pParts.join(" · ")}`);
  }
  if (ctx.latestTest?.top?.length) {
    const tops = ctx.latestTest.top
      .map(
        (t: any) =>
          t.label + (t.percent != null ? ` ${t.percent.toFixed(1)}%` : "")
      )
      .join(", ");
    parts.push(`[검사] ${ctx.latestTest.type} · ${tops}`);
  }
  if (ctx.orders?.last) {
    const names = Array.isArray(ctx.orderItemNames)
      ? ctx.orderItemNames.slice(0, 3)
      : [];
    parts.push(
      `[주문] #${ctx.orders.last.id} ${ctx.orders.last.status}${
        names.length ? ` · ${names.join(", ")}` : ""
      }`
    );
  }
  const brief = parts.join(" | ");
  return brief.length > 480 ? brief.slice(0, 480) + "…" : brief;
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
          name:
            it?.name ??
            it?.productName ??
            it?.product?.name ??
            it?.label ??
            it?.title ??
            it?.sku ??
            null,
          qty: it?.quantity ?? it?.qty ?? null,
        })) ?? [];
      const orderItemNames = pickOrderItemNames(lastOrder?.items ?? []);
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
        orderItemNames,
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

    const userContext = {
      ...buildUserContext(
        Array.isArray(orders) ? orders : [],
        assessResult ?? null,
        checkAiResult ?? null
      ),
      ...(profile ? { profile } : {}),
    };
    const userContextBrief = buildUserContextBrief(userContext);
    const userContextJson = JSON.stringify(userContext, null, 2);

    const schemaGuide = `데이터 스키마 지침:
      - orders.last는 실제 주문 데이터이고 latestTest는 검사 데이터입니다.
      - '주문' 표현은 orders.last가 있을 때만 사용합니다.
      - 검사 항목을 주문으로 단정하지 않습니다.
      - 사실 확인과 용어 사용은 USER_CONTEXT_JSON과 FACT_*_JSON만을 근거로 합니다.
      - 사용자에게 JSON이나 내부 키 이름을 드러내지 않습니다.`;

    const factProfile = userContext.profile
      ? `FACT_PROFILE_JSON: ${JSON.stringify(
          { profile: userContext.profile },
          null,
          2
        )}`
      : null;
    const factTest = userContext.latestTest
      ? `FACT_TEST_JSON: ${JSON.stringify(
          { latestTest: userContext.latestTest },
          null,
          2
        )}`
      : null;
    const factOrders = userContext.orders?.last
      ? `FACT_ORDERS_JSON: ${JSON.stringify(
          {
            orders: userContext.orders,
            orderItemNames: userContext.orderItemNames ?? [],
          },
          null,
          2
        )}`
      : null;

    const answerStyleGuide = `출력 스타일:
      - 한국어 ~요체
      - 스코프 고정: 직전 사용자 요청과 어시스턴트 직전 발화의 주제에만 답변
      - 다른 검사·주문·프로필 이슈는 직접 관련성이 있을 때만 1문장으로 연결
      - 확장이 필요하면 "확장 안내: ..." 한 줄로 허락을 먼저 구함
      - 브리핑 모드(요청되었거나 초기 인사): ①한줄 요약 ②근거 2~3가지 ③복용법(용량·타이밍) ④상호작용/주의 ⑤대안 ⑥다음 단계 1문장
      - 대화 모드: 질문에 대한 직접 답변→필요시 근거 1~2개→간단한 다음 단계`;

    const openaiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: sysPrompt },
      { role: "system", content: schemaGuide },
      { role: "system", content: answerStyleGuide },
      { role: "system", content: `USER_CONTEXT_BRIEF: ${userContextBrief}` },
      { role: "system", content: `USER_CONTEXT_JSON: ${userContextJson}` },
    ];

    if (factProfile)
      openaiMessages.push({ role: "system", content: factProfile });
    if (factTest) openaiMessages.push({ role: "system", content: factTest });
    if (factOrders)
      openaiMessages.push({ role: "system", content: factOrders });

    if (isInit) {
      const initGuide = `초기 인사 메시지 지침:
        - 반드시 한국어, ~요체 사용
        - FACT_TEST_JSON이 있으면 브리핑 모드로 작성: 한줄 요약→근거 2~3→복용법 요약→주의/상호작용→대안→다음 단계 1문장→사용자가 답하기 쉬운 질문 1개
        - 검사 결과가 없으면 AI 진단 검사를 먼저 권유하고, 상담 목표와 질환·복용약·알레르기 중 두 가지를 물을 것
        - 주문(FACT_ORDERS_JSON)은 초기 인사에서 언급하지 않음
        - 스코프 고정 규칙을 준수`;
      openaiMessages.push({ role: "system", content: initGuide });
      openaiMessages.push({
        role: "user",
        content: "USER_CONTEXT를 참고하여 초기 인사 메시지를 작성해주세요.",
      });
    } else {
      openaiMessages.push({
        role: "system",
        content:
          "규칙: 판단과 사실 인용은 USER_CONTEXT_JSON과 FACT_*_JSON만을 근거로 하세요. USER_CONTEXT_BRIEF는 요약 참고용입니다. 스코프 고정: 직전 사용자 메시지와 직전 어시스턴트 발화의 주제에만 답변하세요. 다른 주제를 끌어오고 싶다면 '확장 안내:' 한 줄로 먼저 제안하세요. '주문' 표현은 FACT_ORDERS_JSON이 있고 orderItemNames 중 하나를 문장에 포함할 때만 사용하세요. 검사 관련 내용은 '검사'로만 지칭하고 주문으로 단정하지 마세요.",
      });
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
        max_tokens: 900,
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
          return s.replace(/\r/g, "");
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
