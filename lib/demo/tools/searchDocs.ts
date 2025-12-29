import { mockDocs } from "../docs";
import { TraceEvent } from "../types";

const preview = (text: string, max = 200) => (text.length > max ? `${text.slice(0, max)}...` : text);

export type SearchResult = {
  snippets: string[];
  trace: TraceEvent[];
};

export const searchDocs = async (query: string, existingTrace: TraceEvent[]): Promise<SearchResult> => {
  const start = Date.now();
  const normalized = query.toLowerCase().split(/\s+/).filter(Boolean);
  const snippets = mockDocs
    .filter((doc) => normalized.some((kw) => doc.toLowerCase().includes(kw)))
    .slice(0, 5);

  const duration = Date.now() - start;
  const toolEvent: TraceEvent = {
    type: "TOOL_CALL",
    name: "searchDocs",
    ms: duration,
    inputPreview: preview(query),
    outputPreview: preview(snippets.join(" | ") || "no results"),
  };

  return {
    snippets,
    trace: [...existingTrace, toolEvent],
  };
};
