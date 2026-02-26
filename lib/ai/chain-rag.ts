import { ensureIndexed } from "@/lib/ai/indexer";
import {
  getRelevantDocuments,
  RAG_MMR,
  RAG_SCORE_MIN,
  RAG_TOP_K,
} from "@/lib/ai/retriever";
import { makeSnippet } from "./snippet";
import { lastUserText, type ChatHistoryMessage } from "./chain-chat-utils";

export type RagSourceRow = {
  source: string;
  section: string;
  idx: number;
  score: unknown;
  rank: number;
};

export type RagContextResult = {
  ragText: string;
  ragSources: RagSourceRow[];
};

export async function buildRagContext(
  messages: ChatHistoryMessage[],
  qOverride: string | undefined,
  debug = false
): Promise<RagContextResult> {
  if (!messages.length) {
    if (debug) console.debug("[rag] skipped: no messages");
    return { ragText: "", ragSources: [] };
  }

  const query = (qOverride && qOverride.trim()) || lastUserText(messages);
  if (!query) {
    if (debug) {
      console.debug("[rag] skipped: empty query", { qOverride });
    }
    return { ragText: "", ragSources: [] };
  }

  try {
    await ensureIndexed("data");
    const docs = await getRelevantDocuments(query, RAG_TOP_K, RAG_MMR, RAG_SCORE_MIN);

    if (!docs || docs.length === 0) {
      if (debug) console.debug(`[rag] query="${query}" docs=0 rag=0`);
      return { ragText: "", ragSources: [] };
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

    if (debug) {
      console.debug(
        `[rag] query="${query}" docs=${docs.length} rag=${ragText.length}`
      );
    }

    return { ragText, ragSources };
  } catch {
    if (debug) console.debug(`[rag] query="${query}" error`);
    return { ragText: "", ragSources: [] };
  }
}
