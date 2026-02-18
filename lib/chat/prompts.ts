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
  runtimeContextText?: string;
  maxHistoryMessages?: number;
};

export type BuildSuggestionPromptInput = {
  contextSummary: UserContextSummary;
  lastAssistantReply: string;
  recentMessages?: Array<{ role?: string | null; content?: unknown }>;
  count: number;
  topicHint?: string | null;
  excludeSuggestions?: string[];
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

function toContextPayload(
  summary: UserContextSummary,
  knownContext?: string,
  productBrief?: string,
  runtimeContextText?: string
) {
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
    actor_context: summary.actorContext,
    recommended_nutrients: summary.recommendedNutrients,
    notable_responses: summary.notableResponses,
    known_context: knownContext || undefined,
    product_catalog_brief: productBrief || undefined,
    runtime_context: runtimeContextText || undefined,
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
          "초기 메시지는 반드시 다음 4개 섹션으로 작성합니다: '개인화 분석', '실행 계획', '점검 포인트', '추천 제품(7일 기준 가격)'.",
          "문항 응답 데이터(notable_responses)가 있으면 '개인화 분석'에서 문항+응답을 최소 2개 직접 인용해 해석합니다.",
          "가능하면 주의 신호 1개 + 보호 신호 1개를 함께 다뤄서 균형 있게 분석합니다.",
          "추천 영양소는 최우선 2~3개만 선택해 한 번만 제시하고, 같은 영양소 설명을 반복하지 않습니다.",
        ]
      : [
          "직전 사용자 질문에 바로 답하고, 필요 시에만 짧은 보충 정보를 덧붙입니다.",
          "질문이 모호해도 먼저 실행 가능한 1차 답변을 주고, 확인 질문은 최대 1개만 제시합니다.",
        ];

  const toneRules =
    mode === "init"
      ? [
          "문체는 부드러운 존댓말(~요)로 유지하고, 딱딱한 공문체를 피합니다.",
          "문장 길이는 짧고 리듬감 있게 작성합니다. 한 문단은 1~3문장으로 유지합니다.",
          "같은 문장 패턴과 접두어(예: '안내드립니다', '다음과 같습니다')를 반복하지 않습니다.",
        ]
      : [
          "채팅 모드 답변은 카카오톡 대화처럼 자연스러운 존댓말(~요)로 작성합니다.",
          "말투는 친근하지만 가볍지 않게, 실제 상담사가 대화하듯 작성합니다.",
          "형식적인 안내문 문체(예: '권장됩니다', '하시기 바랍니다')를 남발하지 않습니다.",
          "짧은 반응 1문장 + 핵심 제안 + 필요한 경우 질문 1개 흐름을 우선합니다.",
        ];

  const dataRules = hasData
    ? [
        "user_context_summary 데이터(주문/검사/프로필/이전상담)를 적극 활용하고, 최소 1개 이상을 본문에 녹여 설명합니다.",
        "퍼센트 수치 반복보다 추천 영양소 이름과 실행 순서를 중심으로 안내합니다.",
        "이미 user_context_summary에 있는 정보를 다시 묻지 않습니다.",
        "질문이 넓어도 먼저 데이터 기반 1차 제안을 제시하고, 필요한 확인 질문은 최대 2개만 덧붙입니다.",
        "evidence_labels가 존재할 때는 '정보가 부족하다'는 문장을 사용하지 않습니다.",
      ]
    : [
        "user_context_summary에 실사용 데이터가 부족합니다.",
        "일반적인 설명보다 먼저 정보 수집 질문 1~2개를 던져 상담 정확도를 높입니다.",
      ];

  const ragRules = hasRag
    ? [
        "rag_context가 있으면 그 근거를 우선 사용하고, 없는 사실은 추측하지 않습니다.",
        "rag_context와 user_context_summary가 충돌하면 user_context_summary를 우선합니다.",
      ]
    : ["rag_context가 없으면 user_context_summary 기반으로만 답변합니다."];

  const structureRule =
    mode === "init"
      ? "5) 초기 답변은 '개인화 분석(또는 맞춤 브리핑) -> 실행 계획 -> 점검 포인트' 순서를 유지해 실천 가능성을 높입니다."
      : "5) 채팅 모드에서는 질문에 먼저 바로 답하고, 필요한 실행 단계만 짧게 제시합니다.";

  const outputRules =
    mode === "init"
      ? [
          "- 본문은 간결한 문단 또는 목록으로 작성합니다.",
          "- 퍼센트 수치가 없더라도 추천 영양소와 실행 순서를 명확히 제시합니다.",
          "- 영양소/성분 나열은 1회로 제한하고, 동일 영양소의 정의를 반복하지 않습니다.",
          "- 실행 계획은 성분별 나열이 아니라 2~3개 행동 단계로 작성합니다.",
          "- 문항 기반 분석 시 '문항: ... / 응답: ... / 해석: ...' 형식을 우선 사용합니다.",
          "- 첫 답변(mode=init)에서는 반드시 '추천 제품(7일 기준 가격)' 소제목을 포함합니다.",
        ]
      : [
          "- 기본은 2~4문장 문단으로 답하고, 제목/번호 목록은 꼭 필요할 때만 사용합니다.",
          "- 불필요한 서론 없이 핵심부터 말하고, 단계 안내는 최대 2~3개로 제한합니다.",
          "- 같은 표현 반복을 피하고, 한 문단 안에서도 문장 톤을 자연스럽게 변화시킵니다.",
          "- 질문이 필요한 경우 한 번에 1개만 제시하고, 답을 들은 뒤 다음 질문으로 이어갑니다.",
        ];

  return [
    "당신은 약국 기반 건강기능식품 개인맞춤 상담사입니다.",
    "의학적 진단을 단정하지 말고, 복용 안전/루틴/모니터링 관점에서 실무적으로 안내합니다.",
    "반드시 존댓말(~요)로 답변합니다.",
    "답변에 '근거:' 문구, '내 데이터 요약' 같은 내부 표현을 노출하지 않습니다.",
    "사용자가 요청하지 않으면 외부 전문가/병원 상담 권유 문구를 넣지 않습니다.",
    "",
    "[말투 규칙]",
    ...toneRules,
    "",
    "[핵심 규칙]",
    "1) 답변은 반드시 user_context_summary를 기반으로 하고, 최소 1개 이상을 본문에 반영합니다.",
    "2) 근거가 부족하면 일반론 대신 정보 수집 질문 1~2개를 먼저 제시합니다.",
    "3) user_context_summary에 없는 민감 정보를 임의로 만들어내지 않습니다.",
    "4) 추천이 필요한 경우 product_catalog_brief를 참고해 제품명과 7일 기준 가격을 함께 제시합니다.",
    "4-1) product_catalog_brief에 없는 제품명/가격을 추측하지 않습니다. '제품명' 같은 placeholder 단어는 절대 출력하지 않습니다.",
    structureRule,
    "6) 제품 추천 시 카테고리 동의어를 먼저 확인하고, 확인 전에는 '제품이 없다'고 단정하지 않습니다.",
    "7) notable_responses가 있으면 문항과 응답 내용을 그대로 인용하고, 각 항목이 왜 중요한지 1줄 해석을 붙입니다.",
    "",
    "[대화 규칙]",
    ...modeRules,
    ...dataRules,
    ...ragRules,
    "",
    "[출력 규칙]",
    ...outputRules,
    "- 제품 추천이 들어갈 때는 '추천 제품(7일 기준 가격)' 소제목과 '카테고리: 제품명 (가격원)' 형식을 사용합니다.",
    "- 가격 숫자는 product_catalog_brief에 있는 값만 사용합니다. 임의 예시 가격이나 반올림 추정값을 만들지 않습니다.",
    "- product_catalog_brief가 비어 있으면 추천 제품 섹션에는 '가격 데이터 확인 중'만 짧게 안내하고, 임의 제품/가격은 쓰지 않습니다.",
    "- 내부 JSON 키, 내부 라벨명(evidence_labels 등)은 그대로 노출하지 않습니다.",
    "- 단계별 행동 지침을 구체적으로 제시합니다.",
    "- 카테고리 동의어 예시: 멀티비타민=종합비타민, 프로바이오틱스=유산균, 밀크시슬=밀크씨슬.",
  ].join("\n");
}

export function buildMessages(input: BuildMessagesInput): PromptMessage[] {
  const maxHistoryMessages = Math.max(2, input.maxHistoryMessages ?? 24);
  const contextPayload = toContextPayload(
    input.contextSummary,
    input.knownContext,
    input.productBrief,
    input.runtimeContextText
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
      content: `내부 참고 라벨: ${
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
        "상담을 시작합니다. user_context_summary를 바탕으로 초기 답변을 작성해 주세요. 반드시 '개인화 분석 -> 실행 계획 -> 점검 포인트 -> 추천 제품(7일 기준 가격)' 순서를 지키고, 문항+응답 기반 해석을 2개 이상 포함해 주세요. 영양소 설명은 반복하지 말고 우선순위 2~3개만 제시해 주세요.",
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
  const excludes = Array.isArray(input.excludeSuggestions)
    ? input.excludeSuggestions
        .map((item) => cleanLine(item))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const excludeBlock = excludes.length
    ? `중복 금지 질문:\n${excludes.map((item) => `- ${item}`).join("\n")}\n`
    : "";

  const prompt = [
    "아래 조건으로 사용자가 다음에 물어볼 후속 질문을 생성하세요.",
    "출력은 반드시 JSON 객체 {\"suggestions\":[...]}만 허용합니다.",
    "",
    "[입력 데이터]",
    `user_context_summary:\n${input.contextSummary.promptSummaryText}`,
    historyText ? `최근 대화:\n${historyText}` : "최근 대화: 없음",
    `직전 AI 응답:\n${clip(input.lastAssistantReply, 1200)}`,
    topicHint ? topicHint : "",
    excludeBlock,
    "",
    "[생성 규칙]",
    `- 질문 개수: ${count}개`,
    "- 자연스러운 한국어 대화체 존댓말, 각 문장 18~60자",
    '- 문장은 반드시 "제/내" 같은 1인칭 표현을 포함한 사용자 요청형으로 작성',
    "- AI가 사용자에게 묻거나 권유하는 어투는 금지",
    "- 데이터 기반으로 이어지는 질문을 만들 것",
    "- 서로 다른 목적(예: 루틴/안전/점검/제품)으로 구성할 것",
    "- 사용자의 상태를 캐묻는 표현(~하시나요?)을 반복하지 말 것",
    "- 데이터가 부족하면 정보 수집 질문을 우선 포함할 것",
    "- 중복 금지 질문과 의미가 겹치면 안 됨",
    "- 각 질문은 바로 실행 가능한 요청형 문장으로 작성",
  ]
    .filter(Boolean)
    .join("\n");

  const qualityGuard = [
    "[Quality Gate]",
    "- Do not ask the user to report past intake effects or body changes.",
    '- Bad example: "복용한 후 변화가 있었는지 점검해 보시겠어요?"',
    '- Bad example: "이 항목을 점검해 보시겠어요?"',
    '- Good example: "제 상태 기준으로 이번 주 점검 항목을 표로 정리해 주세요."',
    "- Write every suggestion as an immediate assistant-executable request.",
  ].join("\n");

  return [
    {
      role: "system",
      content:
        "당신은 상담 후속 질문 생성기입니다. user_context_summary를 기반으로 실용적이고 중복 없는 후속 질문만 생성합니다.",
    },
    { role: "user", content: `${prompt}\n\n${qualityGuard}` },
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
