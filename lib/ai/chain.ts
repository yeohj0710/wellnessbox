import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { getChatModel } from "./model";
import {
  buildSystemPrompt,
  SCHEMA_GUIDE,
  ANSWER_STYLE_GUIDE,
  PRODUCT_RECO_GUIDE,
  INIT_GUIDE,
  RAG_RULES,
} from "./prompts";
import { makeSnippet } from "./snippet";
import { ChatRequestBody } from "@/types/chat";
import { CATEGORY_LABELS, CategoryKey, KEY_TO_CODE } from "@/lib/categories";
import { ensureIndexed } from "@/lib/ai/indexer";
import {
  getRelevantDocuments,
  RAG_TOP_K,
  RAG_MMR,
  RAG_SCORE_MIN,
} from "@/lib/ai/retriever";
import { ragStoreKind } from "@/lib/ai/retriever";

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

function buildMegaSystem(
  sysPrompt: string,
  userContextBrief: string,
  userContextJson: string,
  productsBrief: string,
  productsByCategory: Record<string, string[]>,
  factProfile: string | null,
  factTest: string | null,
  factOrders: string | null,
  factProducts: string | null,
  ragText: string,
  ragSourcesJson: string
) {
  const parts: string[] = [];
  parts.push(sysPrompt);
  parts.push(SCHEMA_GUIDE);
  parts.push(ANSWER_STYLE_GUIDE);
  parts.push(PRODUCT_RECO_GUIDE);
  parts.push(`USER_CONTEXT_BRIEF: ${userContextBrief}`);
  parts.push(`USER_CONTEXT_JSON: ${userContextJson}`);
  if (productsBrief) parts.push(`PRODUCTS_BRIEF: ${productsBrief}`);
  if (productsByCategory && Object.keys(productsByCategory).length)
    parts.push(
      `PRODUCTS_BY_CATEGORY_JSON: ${JSON.stringify(
        { productsByCategory },
        null,
        2
      )}`
    );
  if (factProfile) parts.push(factProfile);
  if (factTest) parts.push(factTest);
  if (factOrders) parts.push(factOrders);
  if (factProducts) parts.push(factProducts);
  parts.push(RAG_RULES);
  if (ragText) parts.push(`RAG_CONTEXT:\n${ragText}`);
  if (ragSourcesJson) parts.push(`RAG_SOURCES_JSON: ${ragSourcesJson}`);
  parts.push(
    "컨텍스트에 답이 있으면 사과/거절 없이 바로 답하라. 없을 때만 없다라고 말하라."
  );
  return parts.join("\n\n---\n\n");
}

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

async function buildKnownContext(
  clientId: string | undefined,
  headers: Headers | Record<string, string | null | undefined>,
  localAssessCats: string[] | undefined,
  localCheckAiTopLabels: string[] | undefined
) {
  if (!clientId || typeof clientId !== "string") return "";
  try {
    const { ensureClient } = await import("@/lib/server/client");
    const getHeader = (k: string) =>
      typeof (headers as any)?.get === "function"
        ? (headers as any).get(k)
        : (headers as any)?.[k] ?? (headers as any)?.[k.toLowerCase()] ?? null;
    await ensureClient(clientId, { userAgent: getHeader("user-agent") });
  } catch {}
  try {
    const { getLatestResults } = await import("@/lib/server/results");
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
    const cats: string[] = Array.isArray(p.categories) ? p.categories : [];
    for (const c of cats) {
      if (!map[c]) map[c] = [];
      const cap = p.capacity ? ` ${p.capacity}` : "";
      const price = p.price != null ? ` ${p.price}원` : "";
      const line = `${p.name}${cap}${price}`.trim();
      map[c].push(line);
    }
  }
  return map;
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
  const blocks: Array<{ role: string; content: string }> = [
    { role: "system", content: sysPrompt },
    { role: "system", content: SCHEMA_GUIDE },
    { role: "system", content: ANSWER_STYLE_GUIDE },
    { role: "system", content: PRODUCT_RECO_GUIDE },
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

function toPlainText(x: any): string {
  if (typeof x === "string") return x;
  if (x == null) return "";
  if (Array.isArray(x)) return x.map(toPlainText).join(" ");
  if (typeof x === "object") {
    if (typeof (x as any).text === "string") return (x as any).text;
    if (typeof (x as any).value === "string") return (x as any).value;
    if (Array.isArray((x as any).parts))
      return (x as any).parts.map(toPlainText).join(" ");
    if (Array.isArray((x as any).content))
      return (x as any).content.map(toPlainText).join(" ");
    if (Array.isArray((x as any).children))
      return (x as any).children.map(toPlainText).join(" ");
    if (
      typeof (x as any).type === "string" &&
      Array.isArray((x as any).children)
    ) {
      return (x as any).children.map(toPlainText).join(" ");
    }
  }
  return "";
}

function lastUserText(messages: Array<{ role: string; content: any }>) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user") {
      const s = toPlainText(m.content).trim();
      if (s) return s;
    }
  }
  return "";
}

const RAG_DEBUG = !!process.env.RAG_DEBUG;

async function buildRagContext(
  messages: Array<{ role: string; content: any }>,
  qOverride?: string
) {
  if (!messages || !messages.length) {
    if (RAG_DEBUG) console.debug("[rag] skipped: no messages");
    return { ragText: "", ragSources: [] as any[] };
  }

  const last = (qOverride && qOverride.trim()) || lastUserText(messages);
  if (!last) {
    if (RAG_DEBUG)
      console.debug("[rag] skipped: empty last user text", { qOverride });
    return { ragText: "", ragSources: [] as any[] };
  }

  try {
    await ensureIndexed("data");
    const docs = await getRelevantDocuments(
      last,
      RAG_TOP_K,
      RAG_MMR,
      RAG_SCORE_MIN
    );
    if (!docs || docs.length === 0) {
      if (RAG_DEBUG) console.debug(`[rag] last="${last}" docs=0 rag=0`);
      return { ragText: "", ragSources: [] as any[] };
    }

    const chunks = docs.map(
      (d: any, i: number) =>
        `### ${i + 1}. ${d.metadata?.title || d.metadata?.source || "doc"}\n` +
        makeSnippet(String(d.pageContent || ""), last, 1000)
    );
    const limit = Math.min(Number(process.env.RAG_CONTEXT_LIMIT) || 4000, 4000);
    const ragText = chunks.join("\n\n---\n\n").slice(0, limit);

    const ragSources = docs.map((d: any, i: number) => ({
      source: d.metadata?.source ?? "doc",
      section: d.metadata?.section ?? "",
      idx: d.metadata?.idx ?? 0,
      score: d.metadata?.score,
      rank: d.metadata?.rank ?? i,
    }));

    if (RAG_DEBUG)
      console.debug(
        `[rag] last="${last}" docs=${docs.length} rag=${ragText.length}`
      );
    return { ragText, ragSources };
  } catch {
    if (RAG_DEBUG) console.debug(`[rag] last="${last}" error`);
    return { ragText: "", ragSources: [] as any[] };
  }
}

export async function streamChat(
  body: ChatRequestBody,
  headers: Headers | Record<string, string | null | undefined>
) {
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
  const getHeader = (k: string) =>
    typeof (headers as any)?.get === "function"
      ? (headers as any).get(k)
      : (headers as any)?.[k] ?? (headers as any)?.[k?.toLowerCase?.()] ?? null;

  const hasUserText =
    Array.isArray(messages) &&
    messages.some((m) => m?.role === "user" && toPlainText(m?.content).trim());
  const isInit = mode === "init" && !hasUserText;

  if (RAG_DEBUG) {
    console.debug("[chat:req]", {
      mode,
      isInit,
      msgCount: Array.isArray(messages) ? messages.length : 0,
      lastUser: (Array.isArray(messages) ? lastUserText(messages) : "").slice(
        0,
        80
      ),
      store: ragStoreKind(),
    });
  }
  const knownContext = await buildKnownContext(
    clientId,
    headers,
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
  let products: Array<{
    name: string;
    categories: string[];
    capacity: any;
    price: any;
  }> = [];
  try {
    const mod = await import("@/lib/product/product");
    if (typeof mod.getProductSummaries === "function") {
      products = await mod.getProductSummaries();
    }
  } catch {}
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

  const history = (messages || []).filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
  const { ragText, ragSources } = isInit
    ? { ragText: "", ragSources: [] as any[] }
    : await buildRagContext(history, (body as any)?.ragQuery);

  if (RAG_DEBUG)
    console.debug(
      `[chat] ragApplied=${ragText ? 1 : 0} docs=${ragSources.length} chars=${
        ragText.length
      }`
    );

  const ragSourcesJson = getHeader("x-rag-sources-disabled")
    ? ""
    : JSON.stringify({ sources: ragSources }, null, 2);

  const sysForMega = isInit
    ? `${sysPrompt}\n\n---\n\n${INIT_GUIDE}`
    : sysPrompt;

  const megaSystem = buildMegaSystem(
    sysForMega,
    userContextBrief,
    userContextJson,
    productsBrief,
    productsByCategory,
    factProfile,
    factTest,
    factOrders,
    factProducts,
    ragText,
    ragSourcesJson
  );

  const runtimeHead = [{ role: "system", content: megaSystem }];

  let convo: Array<{ role: string; content: string }> = [];
  if (isInit) {
    convo = [
      {
        role: "user",
        content: "USER_CONTEXT를 참고하여 초기 인사 메시지를 작성해주세요.",
      },
    ];
  } else {
    convo = history;
  }

  const maxMsgs = Math.max(1, Number(process.env.RAG_MAX_MESSAGES) || 40);
  const roomForConvo = Math.max(0, maxMsgs - 1);
  const keptConvo = convo.slice(-roomForConvo);
  const allMessages = [...runtimeHead, ...keptConvo];

  const prompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("messages"),
  ]);
  const llm = getChatModel(model);
  const formatted = await prompt.formatMessages({ messages: allMessages });
  const eventStream = await llm.stream(formatted);

  async function* charStream() {
    for await (const chunk of eventStream as any) {
      const delta = typeof chunk?.content === "string" ? chunk.content : "";
      if (!delta) continue;
      for (const ch of delta) yield ch;
    }
  }

  return charStream();
}
