import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { getChatModel } from "./model";
import { makeSnippet } from "./snippet";
import { ChatRequestBody } from "@/types/chat";
import { CATEGORY_LABELS, CategoryKey, KEY_TO_CODE } from "@/lib/categories";
import { ensureIndexed } from "@/lib/ai/indexer";
import {
  getRelevantDocuments,
  RAG_TOP_K,
  RAG_MMR,
  RAG_SCORE_MIN,
  ragStoreKind,
} from "@/lib/ai/retriever";
import { buildUserContextSummary, toPlainText } from "@/lib/chat/context";
import { buildMessages as buildChatMessages } from "@/lib/chat/prompts";
import { enforcePersonalizedResponse } from "@/lib/chat/response-guard";

const CAT_ALIAS: Record<string, CategoryKey> = Object.fromEntries(
  Object.entries(KEY_TO_CODE).flatMap(([key, code]) => {
    const catKey = key as CategoryKey;
    const label = CATEGORY_LABELS[catKey];
    return [
      [key, catKey],
      [code, catKey],
      [label, catKey],
    ];
  })
) as Record<string, CategoryKey>;

const RAG_DEBUG = Boolean(process.env.RAG_DEBUG);

function labelOf(keyOrCodeOrLabel: string) {
  const alias = (CAT_ALIAS[keyOrCodeOrLabel] ?? keyOrCodeOrLabel) as string;
  const label = CATEGORY_LABELS[alias as keyof typeof CATEGORY_LABELS];
  if (label) return label;
  const found = Object.values(CATEGORY_LABELS).find(
    (item) => item === keyOrCodeOrLabel
  );
  return found ?? keyOrCodeOrLabel;
}

function normalizeHistory(messages: unknown) {
  if (!Array.isArray(messages)) return [] as Array<{ role: string; content: string }>;
  return messages
    .filter((message) => {
      const role = (message as any)?.role;
      return role === "user" || role === "assistant";
    })
    .map((message) => {
      const role = String((message as any)?.role || "");
      const content = toPlainText((message as any)?.content).trim();
      return { role, content };
    })
    .filter((message) => Boolean(message.content));
}

function lastUserText(messages: Array<{ role: string; content: string }>) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    if (message.content) return message.content;
  }
  return "";
}

async function buildKnownContext(
  scope: { clientId?: string; appUserId?: string },
  headers: Headers | Record<string, string | null | undefined>,
  localAssessCats: string[] | undefined,
  localCheckAiTopLabels: string[] | undefined
) {
  const clientId =
    typeof scope.clientId === "string" ? scope.clientId : undefined;
  const appUserId =
    typeof scope.appUserId === "string" ? scope.appUserId : undefined;
  if (!clientId && !appUserId) return "";

  try {
    const { ensureClient } = await import("@/lib/server/client");
    const getHeader = (key: string) =>
      typeof (headers as any)?.get === "function"
        ? (headers as any).get(key)
        : (headers as any)?.[key] ?? (headers as any)?.[key.toLowerCase()] ?? null;

    if (clientId) {
      await ensureClient(clientId, { userAgent: getHeader("user-agent") });
    }
  } catch {
    // ignore client-side context hydration failures
  }

  try {
    const { getLatestResultsByScope } = await import("@/lib/server/results");
    const latest = await getLatestResultsByScope({ appUserId, clientId });
    const parts: string[] = [];

    if (latest.assessCats?.length) {
      const cats = latest.assessCats.slice(0, 3);
      const pcts = latest.assessPercents || [];
      const summary = cats
        .map((cat, index) => {
          const pct = pcts[index];
          const percent =
            typeof pct === "number" ? ` ${(pct * 100).toFixed(1)}%` : "";
          return `${labelOf(cat)}${percent}`;
        })
        .join(", ");
      parts.push(`정밀검사 상위 ${summary}`);
    } else if (Array.isArray(localAssessCats) && localAssessCats.length) {
      parts.push(
        `정밀검사(로컬) 상위 ${localAssessCats
          .slice(0, 3)
          .map((cat) => labelOf(cat))
          .join(", ")}`
      );
    }

    if (
      (!latest.assessCats || latest.assessCats.length === 0) &&
      latest.checkAiTopLabels?.length
    ) {
      parts.push(`빠른검사 상위 ${latest.checkAiTopLabels.slice(0, 3).join(", ")}`);
    } else if (
      parts.length === 0 &&
      Array.isArray(localCheckAiTopLabels) &&
      localCheckAiTopLabels.length
    ) {
      parts.push(`빠른검사(로컬) 상위 ${localCheckAiTopLabels.slice(0, 3).join(", ")}`);
    }

    return parts.length > 0 ? parts.join(" | ") : "";
  } catch {
    return "";
  }
}

function buildProductBrief(products: Array<Record<string, any>>) {
  const lines: string[] = [];

  for (const product of products) {
    const name = typeof product.name === "string" ? product.name : "";
    if (!name) continue;
    const cap = product.capacity ? ` ${String(product.capacity)}` : "";
    const price =
      typeof product.price === "number" || typeof product.price === "string"
        ? ` ${product.price}원`
        : "";

    const line = `${name}${cap}${price}`.trim();
    if (!line) continue;

    const joined = lines.concat(line).join("; ");
    if (joined.length > 1200) break;
    lines.push(line);
  }

  return lines.join("; ");
}

async function loadProductBrief() {
  try {
    const mod = await import("@/lib/product/product");
    if (typeof mod.getProductSummaries !== "function") return "";
    const products = await mod.getProductSummaries();
    if (!Array.isArray(products) || products.length === 0) return "";
    return buildProductBrief(products as Array<Record<string, any>>);
  } catch {
    return "";
  }
}

async function buildRagContext(
  messages: Array<{ role: string; content: string }>,
  qOverride?: string
) {
  if (!messages.length) {
    if (RAG_DEBUG) console.debug("[rag] skipped: no messages");
    return { ragText: "", ragSources: [] as any[] };
  }

  const query = (qOverride && qOverride.trim()) || lastUserText(messages);
  if (!query) {
    if (RAG_DEBUG) {
      console.debug("[rag] skipped: empty query", { qOverride });
    }
    return { ragText: "", ragSources: [] as any[] };
  }

  try {
    await ensureIndexed("data");
    const docs = await getRelevantDocuments(query, RAG_TOP_K, RAG_MMR, RAG_SCORE_MIN);

    if (!docs || docs.length === 0) {
      if (RAG_DEBUG) console.debug(`[rag] query="${query}" docs=0 rag=0`);
      return { ragText: "", ragSources: [] as any[] };
    }

    const chunks = docs.map(
      (doc: any, index: number) =>
        `### ${index + 1}. ${doc.metadata?.title || doc.metadata?.source || "doc"}\n` +
        makeSnippet(String(doc.pageContent || ""), query, 1000)
    );

    const limit = Math.min(Number(process.env.RAG_CONTEXT_LIMIT) || 4000, 4000);
    const ragText = chunks.join("\n\n---\n\n").slice(0, limit);

    const ragSources = docs.map((doc: any, index: number) => ({
      source: doc.metadata?.source ?? "doc",
      section: doc.metadata?.section ?? "",
      idx: doc.metadata?.idx ?? 0,
      score: doc.metadata?.score,
      rank: doc.metadata?.rank ?? index,
    }));

    if (RAG_DEBUG) {
      console.debug(
        `[rag] query="${query}" docs=${docs.length} rag=${ragText.length}`
      );
    }

    return { ragText, ragSources };
  } catch {
    if (RAG_DEBUG) console.debug(`[rag] query="${query}" error`);
    return { ragText: "", ragSources: [] as any[] };
  }
}

function limitPromptMessages(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number
) {
  if (messages.length <= maxMessages) return messages;

  const system = messages.filter((message) => message.role === "system");
  const convo = messages.filter((message) => message.role !== "system");

  if (system.length >= maxMessages) {
    return system.slice(0, maxMessages);
  }

  const roomForConvo = Math.max(1, maxMessages - system.length);
  return [...system, ...convo.slice(-roomForConvo)];
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
    appUserId,
    mode,
    localCheckAiTopLabels,
    localAssessCats,
    orders,
    assessResult,
    checkAiResult,
  } = body || {};

  const getHeader = (key: string) =>
    typeof (headers as any)?.get === "function"
      ? (headers as any).get(key)
      : (headers as any)?.[key] ?? (headers as any)?.[key.toLowerCase()] ?? null;

  const history = normalizeHistory(messages);
  const hasUserText = history.some((message) => message.role === "user");
  const isInit = mode === "init" && !hasUserText;

  if (RAG_DEBUG) {
    console.debug("[chat:req]", {
      mode,
      isInit,
      msgCount: history.length,
      lastUser: lastUserText(history).slice(0, 80),
      store: ragStoreKind(),
    });
  }

  const knownContext = await buildKnownContext(
    { clientId, appUserId },
    headers,
    localAssessCats,
    localCheckAiTopLabels
  );

  const contextSummary = buildUserContextSummary({
    profile: profile ?? null,
    orders: Array.isArray(orders) ? (orders as any[]) : [],
    assessResult: (assessResult as any) ?? null,
    checkAiResult: (checkAiResult as any) ?? null,
    chatSessions: Array.isArray((body as any)?.chatSessions)
      ? (body as any).chatSessions
      : [],
    currentSessionId:
      typeof (body as any)?.sessionId === "string"
        ? (body as any).sessionId
        : null,
    localAssessCats,
    localCheckAiTopLabels,
  });

  const productBrief = await loadProductBrief();

  const { ragText, ragSources } = isInit
    ? { ragText: "", ragSources: [] as any[] }
    : await buildRagContext(history, (body as any)?.ragQuery);

  if (RAG_DEBUG) {
    console.debug(
      `[chat] ragApplied=${ragText ? 1 : 0} docs=${ragSources.length} chars=${ragText.length}`
    );
  }

  const ragSourcesJson = getHeader("x-rag-sources-disabled")
    ? ""
    : JSON.stringify({ sources: ragSources }, null, 2);

  const promptMessages = buildChatMessages({
    mode: isInit ? "init" : "chat",
    contextSummary,
    chatHistory: history,
    userText: lastUserText(history),
    knownContext,
    ragText,
    ragSourcesJson,
    productBrief,
    maxHistoryMessages: Number(process.env.RAG_MAX_MESSAGES) || 40,
  });

  const maxMsgs = Math.max(1, Number(process.env.RAG_MAX_MESSAGES) || 40);
  const allMessages = limitPromptMessages(promptMessages, maxMsgs);

  const prompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("messages"),
  ]);

  const llm = getChatModel(model);
  const formatted = await prompt.formatMessages({ messages: allMessages });
  const eventStream = await llm.stream(formatted);

  async function* charStream() {
    let fullText = "";
    for await (const chunk of eventStream as any) {
      const delta = typeof chunk?.content === "string" ? chunk.content : "";
      if (!delta) continue;
      fullText += delta;
    }

    const guarded = enforcePersonalizedResponse({
      rawText: fullText,
      summary: contextSummary,
      userText: lastUserText(history),
    });

    for (const char of guarded) {
      yield char;
    }
  }

  return charStream();
}
