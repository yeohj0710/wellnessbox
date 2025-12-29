import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../openai";
import { evaluateExpression } from "../tools/calculator";
import { searchDocs } from "../tools/searchDocs";
import { TraceEvent } from "../types";

const preview = (text: string, max = 200) =>
  text.length > max ? `${text.slice(0, max)}...` : text;

const AgentStateSchema = Annotation.Root({
  message: Annotation<string>({
    reducer: (_prev, next) => next ?? "",
    default: () => "",
  }),
  trace: Annotation<TraceEvent[]>({
    reducer: (_prev, next) => next ?? [],
    default: () => [],
  }),
  plan: Annotation<string | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  searchQuery: Annotation<string | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  searchResults: Annotation<string[]>({
    reducer: (_prev, next) => next ?? [],
    default: () => [],
  }),
  refined: Annotation<boolean>({
    reducer: (_prev, next) => next ?? false,
    default: () => false,
  }),
  calculation: Annotation<string | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  calcResult: Annotation<string | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  questions: Annotation<string[] | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  answer: Annotation<string | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  meta: Annotation<Record<string, unknown>>({
    reducer: (prev, next) => ({ ...(prev ?? {}), ...(next ?? {}) }),
    default: () => ({}),
  }),
});

export type AgentState = typeof AgentStateSchema.State;

const model = createChatModel();

const planNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const nodeStart = Date.now();
  const withStart: TraceEvent[] = [
    ...state.trace,
    {
      type: "NODE_START",
      name: "plan",
      ms: 0,
      inputPreview: preview(state.message),
    },
  ];

  const response = await model.invoke([
    new SystemMessage(
      '사용자 메시지를 이해하고 검색 쿼리와 계산이 필요한지 판단하세요. JSON 예시: {"search_query":"...", "calculation":"(optional)"}. 계산이 없으면 null로 설정.'
    ),
    new HumanMessage(state.message),
  ]);

  const outputText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const llmEvent: TraceEvent = {
    type: "LLM_CALL",
    name: "plan",
    ms: Date.now() - nodeStart,
    inputPreview: preview(state.message),
    outputPreview: preview(outputText),
  };

  let searchQuery = state.message;
  let calculation: string | undefined;

  try {
    const parsed =
      typeof response.content === "string"
        ? JSON.parse(response.content)
        : response.content;

    if (parsed?.search_query) searchQuery = String(parsed.search_query);
    if (parsed?.calculation && parsed.calculation !== null) {
      calculation = String(parsed.calculation);
    }
  } catch {
    searchQuery = state.message;
  }

  const trace: TraceEvent[] = [
    ...withStart,
    llmEvent,
    {
      type: "NODE_END",
      name: "plan",
      ms: Date.now() - nodeStart,
      outputPreview: preview(searchQuery),
    },
  ];

  return {
    plan: outputText,
    searchQuery,
    calculation,
    trace,
    meta: { ...(state.meta ?? {}), plan: response.content },
  };
};

const calculatorNode = async (
  state: AgentState
): Promise<Partial<AgentState>> => {
  if (!state.calculation) return {};

  const start = Date.now();
  const traceStart: TraceEvent[] = [
    ...state.trace,
    {
      type: "NODE_START",
      name: "calculator",
      ms: 0,
      inputPreview: preview(state.calculation),
    },
  ];

  const { result, trace } = evaluateExpression(state.calculation, traceStart);

  const traceWithEnd: TraceEvent[] = [
    ...trace,
    {
      type: "NODE_END",
      name: "calculator",
      ms: Date.now() - start,
      outputPreview: preview(result),
    },
  ];

  return { calcResult: result, trace: traceWithEnd };
};

const searchNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const start = Date.now();
  const q = state.searchQuery || state.message;

  const traceStart: TraceEvent[] = [
    ...state.trace,
    {
      type: "NODE_START",
      name: "searchDocs",
      ms: 0,
      inputPreview: preview(q),
    },
  ];

  const { snippets, trace } = await searchDocs(q, traceStart);

  const traceWithEnd: TraceEvent[] = [
    ...trace,
    {
      type: "NODE_END",
      name: "searchDocs",
      ms: Date.now() - start,
      outputPreview: preview(snippets.join(" | ") || "no results"),
    },
  ];

  return { searchResults: snippets, trace: traceWithEnd };
};

const refineNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const start = Date.now();

  const traceStart: TraceEvent[] = [
    ...state.trace,
    {
      type: "NODE_START",
      name: "refineSearch",
      ms: 0,
      inputPreview: preview(state.searchQuery || state.message),
    },
  ];

  const response = await model.invoke([
    new SystemMessage(
      '검색 결과가 부족합니다. 새로운 검색 키워드 한두 개를 제안하세요. JSON: {"search_query":"..."}'
    ),
    new HumanMessage(
      `원본 메시지: ${state.message}. 현재 쿼리: ${state.searchQuery ?? "없음"}`
    ),
  ]);

  const outputText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  let nextQuery = state.searchQuery || state.message;

  try {
    const parsed =
      typeof response.content === "string"
        ? JSON.parse(response.content)
        : response.content;

    if (parsed?.search_query) nextQuery = String(parsed.search_query);
  } catch {
    nextQuery = state.message;
  }

  const duration = Date.now() - start;

  const traceWithEvents: TraceEvent[] = [
    ...traceStart,
    {
      type: "LLM_CALL",
      name: "refineSearch",
      ms: duration,
      inputPreview: preview(state.searchQuery || ""),
      outputPreview: preview(outputText),
    },
    {
      type: "NODE_END",
      name: "refineSearch",
      ms: duration,
      outputPreview: preview(nextQuery),
    },
  ];

  return { searchQuery: nextQuery, refined: true, trace: traceWithEvents };
};

const needMoreInfoNode = async (
  state: AgentState
): Promise<Partial<AgentState>> => {
  const start = Date.now();

  const traceStart: TraceEvent[] = [
    ...state.trace,
    {
      type: "NODE_START",
      name: "needMoreInfo",
      ms: 0,
      inputPreview: preview(state.message),
    },
  ];

  const response = await model.invoke([
    new SystemMessage(
      "근거가 부족합니다. 사용자에게 추가 질문 1~2개를 제안하고, 추가 정보 요청 응답을 만드세요."
    ),
    new HumanMessage(state.message),
  ]);

  const outputText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const duration = Date.now() - start;

  const trace: TraceEvent[] = [
    ...traceStart,
    {
      type: "LLM_CALL",
      name: "needMoreInfo",
      ms: duration,
      inputPreview: preview(state.message),
      outputPreview: preview(outputText),
    },
    {
      type: "NODE_END",
      name: "needMoreInfo",
      ms: duration,
      outputPreview: preview(outputText),
    },
  ];

  return {
    answer: `추가 정보 요청: ${outputText}`,
    trace,
    questions: outputText.split(/\n+/).filter(Boolean).slice(0, 2),
  };
};

const reportNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const start = Date.now();

  const traceStart: TraceEvent[] = [
    ...state.trace,
    {
      type: "NODE_START",
      name: "report",
      ms: 0,
      inputPreview: preview(state.message),
    },
  ];

  const response = await model.invoke([
    new SystemMessage(
      "검색 근거와 계산 결과를 요약해 간단한 리포트를 작성하세요. 근거는 bullet 형태로 포함하고, 없으면 알려주세요."
    ),
    new HumanMessage(
      `사용자 요청: ${state.message}\n검색 근거: ${
        state.searchResults.join(" | ") || "없음"
      }\n계산 결과: ${state.calcResult ?? "없음"}`
    ),
  ]);

  const outputText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const duration = Date.now() - start;

  const traceWithEnd: TraceEvent[] = [
    ...traceStart,
    {
      type: "LLM_CALL",
      name: "report",
      ms: duration,
      inputPreview: preview(state.message),
      outputPreview: preview(outputText),
    },
    {
      type: "NODE_END",
      name: "report",
      ms: duration,
      outputPreview: preview(outputText),
    },
  ];

  return { answer: outputText, trace: traceWithEnd };
};

const graph = new StateGraph(AgentStateSchema)
  .addNode("planner", planNode)
  .addNode("calculator", calculatorNode)
  .addNode("search", searchNode)
  .addNode("refine", refineNode)
  .addNode("needMoreInfo", needMoreInfoNode)
  .addNode("report", reportNode)
  .addEdge(START, "planner")
  .addConditionalEdges(
    "planner",
    (state): "calculator" | "search" =>
      state.calculation ? "calculator" : "search",
    { calculator: "calculator", search: "search" }
  )
  .addEdge("calculator", "search")
  .addConditionalEdges(
    "search",
    (state): "refine" | "needMoreInfo" | "report" => {
      if (state.searchResults.length < 2 && !state.refined) return "refine";
      if (state.searchResults.length < 2 && state.refined)
        return "needMoreInfo";
      return "report";
    },
    { refine: "refine", needMoreInfo: "needMoreInfo", report: "report" }
  )
  .addEdge("refine", "search")
  .addEdge("report", END)
  .addEdge("needMoreInfo", END);

const app = graph.compile();

export const runAgentGraph = async (message: string) => {
  const initialState: AgentState = {
    message,
    trace: [],
    plan: undefined,
    searchQuery: undefined,
    searchResults: [],
    refined: false,
    calculation: undefined,
    calcResult: undefined,
    questions: undefined,
    answer: undefined,
    meta: {},
  };

  const result = await app.invoke(initialState);

  return {
    answer: result.answer || "결과가 생성되지 않았습니다.",
    trace: result.trace,
    meta: {
      plan: result.plan,
      searchQuery: result.searchQuery,
      searchResults: result.searchResults,
      calculation: result.calculation,
      calcResult: result.calcResult,
      questions: result.questions,
    },
  };
};
