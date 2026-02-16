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
const CATEGORY_SYNONYMS: Record<string, string> = {
  멀티비타민: "종합비타민",
  프로바이오틱스: "프로바이오틱스(유산균)",
  유산균: "프로바이오틱스(유산균)",
  밀크씨슬: "밀크씨슬(실리마린)",
  밀크시슬: "밀크씨슬(실리마린)",
};

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
  localCheckAiTopLabels: string[] | undefined,
  actorContext?: { loggedIn?: boolean; phoneLinked?: boolean }
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

    if (actorContext && typeof actorContext.loggedIn === "boolean") {
      if (!actorContext.loggedIn) {
        parts.push("데이터 범위: 비로그인 기기(clientId) 기반");
      } else if (actorContext.phoneLinked) {
        parts.push("데이터 범위: 로그인 계정 기반(주문 포함)");
      } else {
        parts.push("데이터 범위: 로그인 계정 기반(주문은 전화번호 연결 시 확장)");
      }
    }

    if (latest.assessCats?.length) {
      const cats = latest.assessCats.slice(0, 3);
      const summary = cats
        .map((cat) => labelOf(cat))
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

function normalizeCategoryName(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\(.*?\)/g, "");
}

function parseDaysFromCapacity(capacity: unknown) {
  const text = typeof capacity === "string" ? capacity : "";
  if (!text) return 30;
  const numbers = (text.match(/\d+(?:\.\d+)?/g) || [])
    .map((token) => Number.parseFloat(token))
    .filter((value) => Number.isFinite(value) && value > 0);
  const likelyDays = numbers.find((value) => value >= 7 && value <= 180);
  if (likelyDays) return likelyDays;
  return 30;
}

function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

function mapCategoryLabel(raw: string) {
  const aliased = CATEGORY_SYNONYMS[raw.trim()] || raw.trim();
  const source = normalizeCategoryName(aliased);
  if (!source) return "";
  for (const label of Object.values(CATEGORY_LABELS)) {
    const normalizedLabel = normalizeCategoryName(label);
    if (!normalizedLabel) continue;
    if (source.includes(normalizedLabel) || normalizedLabel.includes(source)) {
      return label;
    }
  }
  return aliased;
}

type ChatCatalogLike = Array<{
  category?: string;
  products?: Array<{
    name?: string;
    optionType?: string | null;
    capacity?: string | null;
    sevenDayPrice?: number;
    priceMode?: "exact7d" | "converted" | string;
    basePrice?: number;
  }>;
}>;

function buildProductBriefFromCatalog(catalog: ChatCatalogLike) {
  const productsByCategory = new Map<
    string,
    Array<{
      name: string;
      optionType: string;
      capacity: string;
      price: number;
      sevenDayPrice: number;
      priceMode: "exact7d" | "converted";
    }>
  >();

  for (const item of catalog) {
    const rawCategory = typeof item.category === "string" ? item.category : "";
    const label = mapCategoryLabel(rawCategory);
    if (!label) continue;
    const products = Array.isArray(item.products) ? item.products : [];
    if (products.length === 0) continue;

    for (const product of products) {
      const name = typeof product.name === "string" ? product.name.trim() : "";
      if (!name) continue;
      const sevenDayPrice = typeof product.sevenDayPrice === "number" ? product.sevenDayPrice : NaN;
      const basePrice = typeof product.basePrice === "number" ? product.basePrice : NaN;
      if (!Number.isFinite(sevenDayPrice) || sevenDayPrice <= 0) continue;
      if (!Number.isFinite(basePrice) || basePrice <= 0) continue;

      const capacity = typeof product.capacity === "string" ? product.capacity.trim() : "";
      const optionType = typeof product.optionType === "string" ? product.optionType.trim() : "";
      const priceMode = product.priceMode === "exact7d" ? "exact7d" : "converted";
      const bucket = productsByCategory.get(label) || [];
      bucket.push({
        name,
        optionType,
        capacity,
        price: basePrice,
        sevenDayPrice,
        priceMode,
      });
      productsByCategory.set(label, bucket);
    }
  }

  const lines: string[] = [];
  const entries = Array.from(productsByCategory.entries()).sort((left, right) =>
    left[0].localeCompare(right[0], "ko")
  );

  for (const [label, items] of entries) {
    const uniqueByName = new Map<string, (typeof items)[number]>();
    for (const item of [...items].sort((left, right) => left.sevenDayPrice - right.sevenDayPrice)) {
      const current = uniqueByName.get(item.name);
      if (!current || item.sevenDayPrice < current.sevenDayPrice) {
        uniqueByName.set(item.name, item);
      }
    }

    const briefItems = Array.from(uniqueByName.values())
      .sort((left, right) => left.sevenDayPrice - right.sevenDayPrice)
      .slice(0, 3);
    if (!briefItems.length) continue;

    const line = `${label}: ${briefItems
      .map((item) => {
        const capacityText = item.capacity ? `, ${item.capacity}` : "";
        const optionText = item.optionType ? `, ${item.optionType}` : "";
        const modeText = item.priceMode === "converted" ? ", 7일 환산" : "";
        return `${item.name}(${formatKrw(item.sevenDayPrice)} / 7일 기준 가격${modeText}, 패키지 ${formatKrw(item.price)}${optionText}${capacityText})`;
      })
      .join(" | ")}`;

    if (lines.concat(line).join("\n").length > 8000) break;
    lines.push(line);
  }

  if (lines.length === 0) return "";
  return lines.join("\n");
}

function buildProductBriefFromSummaries(products: Array<Record<string, any>>) {
  const normalizedCatalog: ChatCatalogLike = [];

  for (const product of products) {
    const name = typeof product.name === "string" ? product.name : "";
    if (!name) continue;
    const priceValue =
      typeof product.price === "number"
        ? product.price
        : typeof product.price === "string"
        ? Number.parseFloat(product.price)
        : NaN;
    if (!Number.isFinite(priceValue) || priceValue <= 0) continue;

    const capacity =
      typeof product.capacity === "string" ? product.capacity.trim() : "";
    const optionType =
      typeof product.optionType === "string" ? product.optionType.trim() : "";
    const baseDays = parseDaysFromCapacity(optionType || capacity || "");
    const sevenDayPrice = Math.max(1, Math.round((priceValue / baseDays) * 7));

    const rawCategories = Array.isArray(product.categories)
      ? product.categories
      : [];
    const categories = rawCategories
      .map((category) => (typeof category === "string" ? category : ""))
      .filter(Boolean);

    for (const category of categories) {
      normalizedCatalog.push({
        category,
        products: [
          {
            name,
            optionType,
            capacity,
            sevenDayPrice,
            priceMode: baseDays === 7 ? "exact7d" : "converted",
            basePrice: priceValue,
          },
        ],
      });
    }
  }

  return buildProductBriefFromCatalog(normalizedCatalog);
}

async function loadProductBrief() {
  try {
    const mod = await import("@/lib/product/product");
    if (typeof mod.getChatProductCatalog === "function") {
      const catalog = await mod.getChatProductCatalog();
      if (Array.isArray(catalog) && catalog.length > 0) {
        const brief = buildProductBriefFromCatalog(catalog as ChatCatalogLike);
        if (brief) return brief;
      }
    }

    if (typeof mod.getProductSummaries !== "function") return "";
    const products = await mod.getProductSummaries(500);
    if (!Array.isArray(products) || products.length === 0) return "";
    return buildProductBriefFromSummaries(products as Array<Record<string, any>>);
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
    actorContext,
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
    localCheckAiTopLabels,
    actorContext
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
    actorContext:
      actorContext && typeof actorContext === "object"
        ? {
            loggedIn: !!actorContext.loggedIn,
            phoneLinked: !!actorContext.phoneLinked,
          }
        : null,
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
    let wrote = false;
    for await (const chunk of eventStream as any) {
      const delta = typeof chunk?.content === "string" ? chunk.content : "";
      if (!delta) continue;
      wrote = true;
      yield delta;
    }

    if (!wrote && isInit) {
      if (contextSummary.hasAnyData) {
        yield "안녕하세요. 현재 데이터 기준으로 맞춤 브리핑을 바로 시작해 볼게요.";
      } else {
        yield "안녕하세요. 맞춤 상담을 위해 핵심 정보부터 간단히 확인해 볼게요.";
      }
    }
  }

  return charStream();
}
