import {
  cleanPromptLine,
  clipPromptText,
  formatPromptHistory,
} from "./prompt-helpers";
import type { BuildSuggestionPromptInput, PromptMessage } from "./prompt-types";

export function buildSuggestionTopicClassifierMessages(params: {
  topics: string[];
  sourceText: string;
}): PromptMessage[] {
  return [
    {
      role: "system",
      content:
        '당신은 주제 분류기입니다. 반드시 JSON 객체 {"topic":"주제명"}만 출력하세요. 목록에 없으면 {"topic":"일반"}로 답하세요.',
    },
    {
      role: "user",
      content: `주제 후보: [${params.topics.join(", ")}]\n\n분류 대상 텍스트\n${params.sourceText}`,
    },
  ];
}

export function buildSuggestionMessages(
  input: BuildSuggestionPromptInput
): PromptMessage[] {
  const historyText = formatPromptHistory(input.recentMessages, 6);
  const count = Math.max(1, Math.min(input.count, 6));
  const topicHint = input.topicHint ? `주제 힌트: ${input.topicHint}\n` : "";
  const excludes = Array.isArray(input.excludeSuggestions)
    ? input.excludeSuggestions
        .map((item) => cleanPromptLine(item))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const excludeBlock = excludes.length
    ? `중복 금지 질문:\n${excludes.map((item) => `- ${item}`).join("\n")}\n`
    : "";

  const prompt = [
    "아래 조건으로 사용자가 다음에 물어보면 좋은 후속 질문을 생성하세요.",
    '출력은 반드시 JSON 객체 {"suggestions":[...]}만 사용합니다.',
    "",
    "[입력 데이터]",
    `user_context_summary:\n${input.contextSummary.promptSummaryText}`,
    historyText ? `최근 대화\n${historyText}` : "최근 대화 없음",
    `직전 AI 응답:\n${clipPromptText(input.lastAssistantReply, 1200)}`,
    topicHint,
    excludeBlock,
    "",
    "[생성 규칙]",
    `- 질문 개수: ${count}개`,
    "- 자연스러운 존댓말 대화체로, 각 문장은 18~60자 사이로 작성합니다.",
    '- 문장은 반드시 "...해줘" 또는 "...볼까?"처럼 바로 실행 가능한 요청형으로 씁니다.',
    "- AI가 사용자에게 과거 복용 효과나 몸 변화를 회상시키는 질문은 금지합니다.",
    "- 데이터 기반으로 이어지는 질문만 만듭니다.",
    "- 서로 다른 목적(예: 루틴, 식사, 부작용 점검, 제품 비교)으로 구성합니다.",
    "- 사용자의 상태를 캐묻는 표현을 반복하지 않습니다.",
    "- 데이터가 부족하면 정보 수집 질문을 우선 포함합니다.",
    "- 중복 금지 질문과 의미가 겹치면 제외합니다.",
    "- 각 질문은 즉시 실행 가능한 요청 한 문장으로 작성합니다.",
  ]
    .filter(Boolean)
    .join("\n");

  const qualityGuard = [
    "[품질 가드]",
    "- 과거 복용 후 변화나 몸 상태 회상을 직접 요구하지 않습니다.",
    '- 나쁜 예시: "복용 후 몸 변화가 있었는지 알려줘"',
    '- 나쁜 예시: "지난주보다 나아졌는지 말해줘"',
    '- 좋은 예시: "지금 루틴 기준으로 이번 주 점검할 항목을 같이 정리해줘"',
    "- 모든 suggestion은 즉시 실행 가능한 요청 문장으로 작성합니다.",
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
    "아래 대화 기준으로 10~18자 사이의 한국어 제목 1개를 생성하세요.",
    "특수문자나 따옴표 없이 제목만 출력하세요.",
    "대화의 핵심 증상, 목표, 카테고리 중 최소 1개를 반영하세요.",
    "불필요하게 '영양제', '건강기능식품' 같은 표현을 반복하지 마세요.",
    "",
    `AI 첫 답변: "${clipPromptText(params.firstAssistantMessage, 500)}"`,
    `사용자 첫 질문: "${clipPromptText(params.firstUserMessage, 500)}"`,
    `AI 최근 답변: "${clipPromptText(params.assistantReply, 500)}"`,
  ].join("\n");

  return [
    {
      role: "system",
      content:
        "당신은 대화 제목 생성기입니다. 간결하고 구체적인 제목만 출력하세요.",
    },
    { role: "user", content: prompt },
  ];
}
