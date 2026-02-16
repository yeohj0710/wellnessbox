import type { UserContextSummary } from "@/lib/chat/context";
import { toPlainText } from "@/lib/chat/context";

type PromptRole = "system" | "user" | "assistant";

export type PromptMessage = {
  role: PromptRole;
  content: string;
};

type BuildSystemPromptInput = {
  mode?: "init" | "chat";
  hasRagContext?: boolean;
  summary?: UserContextSummary;
};

export type BuildMessagesInput = {
  mode: "init" | "chat";
  contextSummary: UserContextSummary;
  chatHistory?: Array<{ role?: string | null; content?: unknown }>;
  userText?: string;
  knownContext?: string;
  ragText?: string;
  ragSourcesJson?: string;
  productBrief?: string;
  maxHistoryMessages?: number;
};

export type BuildSuggestionPromptInput = {
  contextSummary: UserContextSummary;
  lastAssistantReply: string;
  recentMessages?: Array<{ role?: string | null; content?: unknown }>;
  count: number;
  topicHint?: string | null;
};

function cleanLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function clip(text: string, max = 300) {
  const cleaned = cleanLine(text);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function formatHistory(
  messages: Array<{ role?: string | null; content?: unknown }> | undefined,
  max = 6
) {
  if (!Array.isArray(messages)) return "";

  const normalized = messages
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .slice(-max)
    .map((message) => {
      const who = message.role === "user" ? "사용자" : "AI";
      const text = clip(toPlainText(message.content), 180);
      return text ? `${who}: ${text}` : "";
    })
    .filter(Boolean);

  return normalized.join("\n");
}

function toContextPayload(summary: UserContextSummary, knownContext?: string, productBrief?: string) {
  return {
    version: summary.version,
    evidence_labels: summary.evidenceLabels,
    missing_data: summary.missingData,
    summary_text: summary.promptSummaryText,
    profile: summary.profile,
    recent_orders: summary.recentOrders,
    latest_assess: summary.latestAssess,
    latest_quick: summary.latestQuick,
    previous_consultations: summary.previousConsultations,
    known_context: knownContext || undefined,
    product_catalog_brief: productBrief || undefined,
  };
}

function normalizeChatHistory(
  history: Array<{ role?: string | null; content?: unknown }> | undefined,
  maxHistoryMessages: number
): PromptMessage[] {
  if (!Array.isArray(history) || history.length === 0) return [];

  return history
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .slice(-maxHistoryMessages)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: clip(toPlainText(message.content), 4000),
    }))
    .filter((message) => Boolean(message.content));
}

export function buildSystemPrompt(input: BuildSystemPromptInput = {}): string {
  const mode = input.mode || "chat";
  const hasData = Boolean(input.summary?.hasAnyData);
  const hasRag = Boolean(input.hasRagContext);

  const modeRules =
    mode === "init"
      ? [
          "초기 인사는 user_context_summary 기준으로 3~5문장으로 작성합니다.",
          "데이터가 비어 있으면 일반론 대신 필요한 정보 질문 1~3개를 먼저 제시합니다.",
          "초기 인사에서도 마지막 줄은 반드시 '근거: ...' 형식을 유지합니다.",
        ]
      : [
          "직전 사용자 질문에 바로 답하고, 필요 시에만 짧은 보충 정보를 덧붙입니다.",
          "사용자 질문이 모호하거나 근거가 부족하면 답변 전에 질문 1~3개를 제시합니다.",
        ];

  const dataRules = hasData
      ? [
        "user_context_summary에 있는 데이터(주문/검사/프로필/이전상담) 중 최소 1개를 본문에서 구체적으로 언급합니다.",
        "데이터를 언급할 때는 항목명 또는 날짜/라벨을 포함해 사용자가 근거를 추적할 수 있게 씁니다.",
        "이미 user_context_summary에 있는 정보를 다시 묻지 않습니다.",
        "질문이 넓어도 먼저 데이터 기반 1차 제안을 제시하고, 필요한 확인 질문은 최대 2개만 덧붙입니다.",
        "evidence_labels가 존재할 때는 '정보가 부족하다'는 문장을 사용하지 않습니다.",
      ]
    : [
        "user_context_summary에 실사용 데이터가 부족합니다.",
        "일반적인 설명보다 먼저 정보 수집 질문 1~3개를 던져 상담 정확도를 높입니다.",
      ];

  const ragRules = hasRag
    ? [
        "rag_context가 있으면 그 근거를 우선 사용하고, 없는 사실은 추측하지 않습니다.",
        "rag_context와 user_context_summary가 충돌하면 user_context_summary를 우선합니다.",
      ]
    : ["rag_context가 없으면 user_context_summary 기반으로만 답변합니다."];

  return [
    "당신은 약국 기반 건강기능식품 개인맞춤 상담사입니다.",
    "의학적 진단을 단정하지 말고, 복용 안전/루틴/모니터링 관점에서 실무적으로 안내합니다.",
    "반드시 존댓말(~요)로 답변합니다.",
    "",
    "[핵심 규칙]",
    "1) 답변은 반드시 user_context_summary를 근거로 삼고, 최소 1개 이상을 본문에서 언급합니다.",
    "2) 근거가 부족하면 일반론 대신 정보 수집 질문 1~3개를 먼저 제시합니다.",
    "3) 답변 마지막 줄은 반드시 '근거: ...' 한 줄로 끝냅니다.",
    "4) user_context_summary에 없는 민감 정보를 임의로 만들어내지 않습니다.",
    "",
    "[대화 규칙]",
    ...modeRules,
    ...dataRules,
    ...ragRules,
    "",
    "[출력 규칙]",
    "- 본문은 간결한 문단 또는 목록으로 작성합니다.",
    "- 마지막 줄 형식: 근거: <user_context_summary에서 사용한 항목>",
    "- '근거:'에는 실제 항목명(예: 최근 주문, 정밀 검사, 빠른 검사, 프로필, 이전 상담)만 사용합니다.",
    "- '근거: ...'처럼 비어 있는 표현은 금지합니다.",
  ].join("\n");
}

export function buildMessages(input: BuildMessagesInput): PromptMessage[] {
  const maxHistoryMessages = Math.max(2, input.maxHistoryMessages ?? 24);
  const contextPayload = toContextPayload(
    input.contextSummary,
    input.knownContext,
    input.productBrief
  );

  const messages: PromptMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        mode: input.mode,
        hasRagContext: Boolean(input.ragText),
        summary: input.contextSummary,
      }),
    },
    {
      role: "system",
      content: `user_context_summary_json:\n${JSON.stringify(contextPayload, null, 2)}`,
    },
    {
      role: "system",
      content: `사용 가능 근거 라벨: ${
        input.contextSummary.evidenceLabels.join(", ") || "없음"
      }\n추가 확인 필요 항목: ${
        input.contextSummary.missingData.join(", ") || "없음"
      }`,
    },
  ];

  if (input.ragText) {
    messages.push({
      role: "system",
      content: `rag_context:\n${input.ragText}`,
    });
  }

  if (input.ragSourcesJson) {
    messages.push({
      role: "system",
      content: `rag_sources_json: ${input.ragSourcesJson}`,
    });
  }

  if (input.mode === "init") {
    messages.push({
      role: "user",
      content:
        "상담을 시작합니다. user_context_summary를 바탕으로 초기 상담 인사를 작성해 주세요.",
    });
    return messages;
  }

  const history = normalizeChatHistory(input.chatHistory, maxHistoryMessages);
  if (history.length > 0) {
    return messages.concat(history);
  }

  const userText = cleanLine(input.userText || "");
  messages.push({
    role: "user",
    content: userText || "상담을 이어가 주세요.",
  });

  return messages;
}

export function buildSuggestionTopicClassifierMessages(params: {
  topics: string[];
  sourceText: string;
}): PromptMessage[] {
  return [
    {
      role: "system",
      content:
        '당신은 주제 분류기입니다. 반드시 JSON 객체 {"topic":"라벨"}만 출력하세요. 목록에 없으면 {"topic":"일반"}.',
    },
    {
      role: "user",
      content: `주제 후보: [${params.topics.join(", ")}]\n\n분류 대상 텍스트:\n${params.sourceText}`,
    },
  ];
}

export function buildSuggestionMessages(
  input: BuildSuggestionPromptInput
): PromptMessage[] {
  const historyText = formatHistory(input.recentMessages, 6);
  const count = Math.max(1, Math.min(input.count, 6));
  const topicHint = input.topicHint ? `주제 힌트: ${input.topicHint}\n` : "";

  const prompt = [
    "아래 조건으로 사용자가 다음에 물어볼 후속 질문을 생성하세요.",
    "출력은 반드시 JSON 객체 {\"suggestions\":[...]}만 허용합니다.",
    "",
    "[입력 데이터]",
    `user_context_summary:\n${input.contextSummary.promptSummaryText}`,
    historyText ? `최근 대화:\n${historyText}` : "최근 대화: 없음",
    `직전 AI 응답:\n${clip(input.lastAssistantReply, 1200)}`,
    topicHint ? topicHint : "",
    "",
    "[생성 규칙]",
    `- 질문 개수: ${count}개`,
    "- 한국어 존댓말, 각 문장 18~60자",
    "- 데이터 기반으로 이어지는 질문을 만들 것",
    "- 질문 유형이 중복되지 않게 구성할 것",
    "- 사용자의 상태를 캐묻는 표현(~하시나요?)을 반복하지 말 것",
    "- 데이터가 부족하면 정보 수집 질문을 우선 포함할 것",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      role: "system",
      content:
        "당신은 상담 후속 질문 생성기입니다. user_context_summary를 근거로 실용적인 후속 질문만 생성합니다.",
    },
    { role: "user", content: prompt },
  ];
}

export function buildTitleMessages(params: {
  firstUserMessage: string;
  firstAssistantMessage: string;
  assistantReply: string;
}): PromptMessage[] {
  const prompt = [
    "아래 대화 기준으로 10~18자 한국어 제목을 1개 생성하세요.",
    "특수문자/따옴표/마침표 없이 제목만 출력하세요.",
    "핵심 증상/목표/카테고리 중 최소 1개를 반영하세요.",
    "보충제 대신 영양제 또는 건강기능식품 표현을 사용하세요.",
    "",
    `AI 챗봇: \"${clip(params.firstAssistantMessage, 500)}\"`,
    `사용자: \"${clip(params.firstUserMessage, 500)}\"`,
    `AI 챗봇: \"${clip(params.assistantReply, 500)}\"`,
  ].join("\n");

  return [
    {
      role: "system",
      content: "한국어 대화 제목 생성기입니다. 간결하고 구체적인 제목만 출력하세요.",
    },
    { role: "user", content: prompt },
  ];
}
