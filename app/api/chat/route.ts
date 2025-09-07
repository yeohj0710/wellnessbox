import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { ChatRequestBody } from "@/types/chat";
import { getDefaultModel } from "@/lib/ai/models";
import { getLatestResults } from "@/lib/server/results";
import { ensureClient } from "@/lib/server/client";
import { CATEGORY_LABELS, CategoryKey, KEY_TO_CODE } from "@/lib/categories";
import { getProductSummaries } from "@/lib/product/product";
import { ensureIndexed } from "@/lib/ai/indexer";
import { getRelevantDocuments } from "@/lib/ai/retriever";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function buildProductBrief(products: any[]) {
  const lines: string[] = [];
  for (const p of products) {
    const cats =
      Array.isArray(p.categories) && p.categories.length
        ? ` [${p.categories.join("/")}]`
        : "";
    const cap = p.capacity ? ` ${p.capacity}` : "";
    const price = p.price != null ? ` ${p.price}원` : "";
    const line = `${p.name}${cats}${cap}${price}`.trim();
    const next = lines.concat(line).join("; ");
    if (next.length > 1500) break;
    lines.push(line);
  }
  return lines.join("; ");
}

function buildProductsByCategory(products: any[]) {
  const map: Record<string, string[]> = {};
  for (const p of products) {
    const cats = Array.isArray(p.categories) ? p.categories : [];
    for (const c of cats) {
      const key = labelOf(c);
      if (!map[key]) map[key] = [];
      const item = [
        p.name,
        p.capacity ? `(${p.capacity})` : "",
        p.price != null ? `${p.price}원` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const next = map[key].concat(item);
      const flat = next.join("; ");
      if (flat.length <= 1500) map[key] = next;
    }
  }
  return map;
}

async function buildKnownContext(
  clientId: string | undefined,
  headers: Headers,
  localAssessCats: string[] | undefined,
  localCheckAiTopLabels: string[] | undefined
) {
  if (!clientId || typeof clientId !== "string") return "";
  await ensureClient(clientId, { userAgent: headers.get("user-agent") });
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
    return parts.length
      ? `Known user results (server): ${parts.join("; ")}.`
      : "";
  } catch {
    return "";
  }
}

async function buildUserContext(
  orders: any[],
  assessResult: any,
  checkAiResult: any
) {
  const lastOrder = Array.isArray(orders) && orders.length ? orders[0] : null;
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
  const hasData = !!lastOrder || assessTop.length > 0 || quickTop.length > 0;
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

function toSystemBlocks(
  sysPrompt: string,
  userContextBrief: string,
  userContextJson: string,
  productsBrief: string,
  productsByCategory: Record<string, string[]>,
  factProfile: string | null,
  factTest: string | null,
  factOrders: string | null,
  factProducts: string | null
) {
  const schemaGuide = `데이터 스키마 지침:
      - orders.last는 실제 주문 데이터이고 latestTest는 검사 데이터입니다.
      - '주문' 표현은 orders.last가 있을 때만 사용합니다.
      - 검사 항목을 주문으로 단정하지 않습니다.
      - 제품 정보는 PRODUCTS_BRIEF와 FACT_PRODUCTS_JSON을 참고합니다.
      - 사실 확인과 용어 사용은 USER_CONTEXT_JSON과 FACT_*_JSON만을 근거로 합니다.`;
  const answerStyleGuide = `출력 스타일:
      - 한국어 ~요체
      - 스코프 고정: 직전 사용자 요청과 어시스턴트 직전 발화의 주제에만 답변
      - 다른 검사·주문·프로필 이슈는 직접 관련성이 있을 때만 1문장으로 연결
      - 확장이 필요하면 "확장 안내: ..." 한 줄로 허락을 먼저 구함
      - 브리핑 모드(요청되었거나 초기 인사): ①한줄 요약 ②근거 2~3가지 ③복용법(용량·타이밍) ④상호작용/주의 ⑤대안 ⑥다음 단계 1문장 ⑦추천 상품 1~3개
      - 대화 모드: 질문에 대한 직접 답변→필요시 근거 1–2개→간단한 다음 단계→가능하면 추천 상품 1–3개를 제시`;
  const productRecoGuide = `상품 추천 지침:
      - 가능하면 모든 답변에 '추천 상품' 단락을 포함하며, 건강정보만 묻는 질문이라도 관련성이 있으면 1–3개 제시
      - 추천 상품 표기는 '제품명 · 용량 · 가격' 순서로 한 줄 요약과 함께 근거 1문장을 덧붙임
      - 우선순위: 최신 검사 상위 카테고리→프로필 금기·상호작용 확인→최근 주문과의 중복 회피
      - 상품 명세와 가격·용량은 FACT_PRODUCTS_JSON 기반으로만 인용하며 추정·과장은 금지
      - 장바구니 유도는 간결하게 1문장으로만 표기`;
  const blocks: Array<{ role: string; content: string }> = [
    { role: "system", content: sysPrompt },
    { role: "system", content: schemaGuide },
    { role: "system", content: answerStyleGuide },
    { role: "system", content: productRecoGuide },
    { role: "system", content: `USER_CONTEXT_BRIEF: ${userContextBrief}` },
    { role: "system", content: `USER_CONTEXT_JSON: ${userContextJson}` },
  ];
  if (productsBrief)
    blocks.push({
      role: "system",
      content: `PRODUCTS_BRIEF: ${productsBrief}`,
    });
  if (productsByCategory && Object.keys(productsByCategory).length)
    blocks.push({
      role: "system",
      content: `PRODUCTS_BY_CATEGORY_JSON: ${JSON.stringify(
        { productsByCategory },
        null,
        2
      )}`,
    });
  if (factProfile) blocks.push({ role: "system", content: factProfile });
  if (factTest) blocks.push({ role: "system", content: factTest });
  if (factOrders) blocks.push({ role: "system", content: factOrders });
  if (factProducts) blocks.push({ role: "system", content: factProducts });
  return blocks;
}

async function buildRagContext(
  messages: Array<{ role: string; content: string }>
) {
  if (!messages || !messages.length)
    return { ragText: "", ragSources: [] as any[] };
  const last =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";
  if (!last.trim()) return { ragText: "", ragSources: [] as any[] };
  if (!process.env.OPENAI_API_KEY && process.env.OPENAI_KEY)
    process.env.OPENAI_API_KEY = process.env.OPENAI_KEY;
  await ensureIndexed("data");
  const docs = await getRelevantDocuments(
    last,
    Number(process.env.RAG_TOP_K) || 6,
    0.5,
    0.2
  );
  if (!docs || docs.length === 0)
    return { ragText: "", ragSources: [] as any[] };
  const chunks = docs.map(
    (d: any) =>
      `- [${d.metadata?.file ?? "doc"} §${d.metadata?.section ?? ""} #${
        d.metadata?.idx ?? 0
      }] ${d.pageContent}`
  );
  const ragText = chunks
    .join("\n\n")
    .slice(0, Number(process.env.RAG_CONTEXT_LIMIT) || 3500);
  const ragSources = docs.map((d: any, i: number) => ({
    file: d.metadata?.file ?? "doc",
    section: d.metadata?.section ?? "",
    idx: d.metadata?.idx ?? 0,
    score: d.metadata?.score,
    rank: d.metadata?.rank ?? i,
  }));
  return { ragText, ragSources };
}

async function streamOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  const controller = new AbortController();
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      const reader = resp.body!.getReader();
      const enc = new TextEncoder();
      let buffer = "";
      function push(t: string) {
        c.enqueue(enc.encode(t));
      }
      function onLine(line: string) {
        if (!line.trim()) return;
        if (!line.startsWith("data:")) return;
        const data = line.replace(/^data:\s*/, "");
        if (data === "[DONE]") {
          c.close();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) push(delta.replace(/\r/g, ""));
        } catch {}
      }
      function read() {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              c.close();
              return;
            }
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";
            for (const line of lines) onLine(line);
            read();
          })
          .catch((err) => c.error(err));
      }
      read();
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
    const knownContext = await buildKnownContext(
      clientId,
      req.headers,
      localAssessCats,
      localCheckAiTopLabels
    );
    const sysPrompt =
      buildSystemPrompt(profile) + (knownContext ? `\n\n${knownContext}` : "");
    const userContext = await buildUserContext(
      Array.isArray(orders) ? orders : [],
      assessResult ?? null,
      checkAiResult ?? null
    );
    const userContextBrief = buildUserContextBrief({
      ...userContext,
      ...(profile ? { profile } : {}),
    });
    const userContextJson = JSON.stringify(
      { ...(profile ? { profile } : {}), ...userContext },
      null,
      2
    );
    const products = await getProductSummaries();
    const productsBrief = buildProductBrief(products);
    const productsByCategory = buildProductsByCategory(products);
    const factProfile = profile
      ? `FACT_PROFILE_JSON: ${JSON.stringify({ profile }, null, 2)}`
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
    const factProducts = products.length
      ? `FACT_PRODUCTS_JSON: ${JSON.stringify({ products }, null, 2)}`
      : null;
    const base = toSystemBlocks(
      sysPrompt,
      userContextBrief,
      userContextJson,
      productsBrief,
      productsByCategory,
      factProfile,
      factTest,
      factOrders,
      factProducts
    );
    const out: Array<{ role: string; content: string }> = [...base];
    if (isInit) {
      const initGuide = `초기 인사 메시지 지침:
        - 반드시 한국어, ~요체 사용
        - FACT_TEST_JSON이 있으면 브리핑 모드로 작성: 한줄 요약→근거 2~3→복용법 요약→주의/상호작용→대안→다음 단계 1문장→추천 상품 1~3개(제품명·용량·가격·근거 1문장)→사용자가 답하기 쉬운 질문 1개
        - 검사 결과가 없으면 AI 진단 검사를 먼저 권유하고, 상담 목표와 질환·복용약·알레르기 중 두 가지를 물은 뒤, 관련성이 높으면 입문용 추천 상품 1~2개를 간단히 제시
        - 주문(FACT_ORDERS_JSON)은 초기 인사에서 언급하지 않음
        - 스코프 고정 규칙을 준수`;
      out.push({ role: "system", content: initGuide });
      out.push({
        role: "user",
        content: "USER_CONTEXT를 참고하여 초기 인사 메시지를 작성해주세요.",
      });
    } else {
      const { ragText, ragSources } = await buildRagContext(messages || []);
      if (ragText)
        out.push({ role: "system", content: `RAG_CONTEXT:\n${ragText}` });
      out.push({
        role: "system",
        content:
          "규칙: 판단과 사실 인용은 USER_CONTEXT_JSON, FACT_*_JSON, 그리고 제공된 RAG_CONTEXT만을 근거로 하세요. USER_CONTEXT_BRIEF는 요약 참고용입니다. 스코프 고정 규칙을 준수하세요.",
      });
      out.push(
        ...(messages || []).map((m) => ({ role: m.role, content: m.content }))
      );
      if (!req.headers.get("x-rag-sources-disabled"))
        out.push({
          role: "system",
          content: `RAG_SOURCES_JSON: ${JSON.stringify(
            { sources: ragSources },
            null,
            2
          )}`,
        });
    }
    const mdl = model || (await getDefaultModel());
    return await streamOpenAI(apiKey, mdl, out);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
