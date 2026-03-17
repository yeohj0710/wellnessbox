import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { resolveGovernedModel } from "./governance";
import { buildKnownContext } from "./chain-known-context";
import {
  loadProductBriefCached,
  warmProductBriefCache,
} from "./chain-product-brief";
import { getChatModel, getDefaultModel } from "./model";
import {
  lastUserText,
  limitPromptMessages,
  normalizeHistory,
  withTimeout,
} from "./chain-chat-utils";
import { buildRagContext } from "./chain-rag";
import { ChatRequestBody } from "@/types/chat";
import { ragStoreKind } from "@/lib/ai/retriever";
import { buildUserContextSummary } from "@/lib/chat/context";
import { buildMessages as buildChatMessages } from "@/lib/chat/prompts";

const RAG_DEBUG = Boolean(process.env.RAG_DEBUG);
const DEFAULT_KNOWN_CONTEXT_TIMEOUT_MS = 220;
const DEFAULT_PRODUCT_BRIEF_TIMEOUT_MS = 1200;
const DEFAULT_RAG_TIMEOUT_MS = 700;

void warmProductBriefCache();

export async function streamChat(
  body: ChatRequestBody,
  headers: Headers | Record<string, string | null | undefined>
) {
  const {
    messages,
    profile,
    clientId,
    appUserId,
    mode,
    localCheckAiTopLabels,
    localAssessCats,
    orders,
    assessResult,
    checkAiResult,
    healthLink,
    actorContext,
    runtimeContext,
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

  const contextSummary = buildUserContextSummary({
    profile: profile ?? null,
    orders: Array.isArray(orders) ? (orders as any[]) : [],
    assessResult: (assessResult as any) ?? null,
    checkAiResult: (checkAiResult as any) ?? null,
    healthLink: (healthLink as any) ?? null,
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

  const knownContextTimeoutMs = Number.parseInt(
    process.env.CHAT_KNOWN_CONTEXT_TIMEOUT_MS || "",
    10
  );
  const productBriefTimeoutMs = Number.parseInt(
    process.env.CHAT_PRODUCT_BRIEF_TIMEOUT_MS || "",
    10
  );
  const ragTimeoutMs = Number.parseInt(process.env.CHAT_RAG_TIMEOUT_MS || "", 10);

  const knownContextPromise = withTimeout(
    buildKnownContext(
      { clientId, appUserId },
      headers,
      localAssessCats,
      localCheckAiTopLabels,
      actorContext
    ),
    Number.isFinite(knownContextTimeoutMs) && knownContextTimeoutMs > 0
      ? knownContextTimeoutMs
      : DEFAULT_KNOWN_CONTEXT_TIMEOUT_MS,
    ""
  );

  const productBriefPromise = withTimeout(
    loadProductBriefCached(),
    Number.isFinite(productBriefTimeoutMs) && productBriefTimeoutMs > 0
      ? productBriefTimeoutMs
      : DEFAULT_PRODUCT_BRIEF_TIMEOUT_MS,
    ""
  );

  const ragPromise = isInit
    ? Promise.resolve({ ragText: "", ragSources: [] as any[] })
    : withTimeout(
        buildRagContext(history, (body as any)?.ragQuery, RAG_DEBUG),
        Number.isFinite(ragTimeoutMs) && ragTimeoutMs > 0
          ? ragTimeoutMs
          : DEFAULT_RAG_TIMEOUT_MS,
        { ragText: "", ragSources: [] as any[] }
      );

  const [knownContext, productBrief, { ragText, ragSources }] =
    await Promise.all([knownContextPromise, productBriefPromise, ragPromise]);

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
    runtimeContextText:
      typeof runtimeContext?.runtimeContextText === "string"
        ? runtimeContext.runtimeContextText
        : [
            runtimeContext?.routePath,
            runtimeContext?.pageTitle,
            runtimeContext?.pageSummary,
          ]
            .filter(
              (value): value is string =>
                typeof value === "string" && value.trim().length > 0
            )
            .join(" | "),
    maxHistoryMessages: Number(process.env.RAG_MAX_MESSAGES) || 40,
  });

  const maxMsgs = Math.max(1, Number(process.env.RAG_MAX_MESSAGES) || 40);
  const allMessages = limitPromptMessages(promptMessages, maxMsgs);

  const prompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("messages"),
  ]);

  const llm = getChatModel(
    resolveGovernedModel({
      task: "chat_stream",
      configuredModel: await getDefaultModel(),
      summary: contextSummary,
    }).resolvedModel
  );
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
        yield "안녕하세요. 현재 데이터 기준으로 맞춤 브리핑을 바로 시작해 보겠습니다.";
      } else {
        yield "안녕하세요. 맞춤 상담을 위해 필요한 정보부터 간단히 확인해 보겠습니다.";
      }
    }
  }

  return charStream();
}
