import type { ChatMessage } from "@/types/chat";
import {
  CHAT_ACTION_TYPES,
  type ChatActionType,
  type ChatAgentCartIntent,
} from "@/lib/chat/agent-actions";

const ACTION_HINT_REGEX =
  /(담아|추가|장바구니|카트|비워|초기화|구매|결제|주문|열어|보여|프로필|설정|내\s*주문|주문\s*조회|내\s*정보|내\s*데이터|계정\s*정보|주문\s*영역|문의|고객센터|연락처|약관|개인정보|환불|이메일|전화|7일치|홈\s*상품|상품\s*섹션|진단|검사|빠른\s*검사|정밀\s*검사|체크\s*ai|check\s*ai|문항|설문|자가\s*진단|이동|가자|가줘|둘러봐|탐색|대화로|채팅으로|약국\s*관리|라이더|관리자)/i;
const AFFIRMATIVE_REGEX =
  /^(응|네|예|좋아|그래|ㅇㅇ|오케이|ok|콜|해줘|진행해|부탁해|맞아)\s*[!.?]*$/i;
const RECOMMENDATION_SECTION_REGEX =
  /추천\s*제품\s*\(7일\s*기준\s*가격\)/i;

const CHAT_ACTION_TYPE_SET = new Set<string>(CHAT_ACTION_TYPES);

function toSafeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function pickLatestAssistantText(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const text = toSafeString(message.content);
    if (!text) continue;
    return text;
  }
  return "";
}

export function hasRecommendationSection(text: string) {
  return RECOMMENDATION_SECTION_REGEX.test(toSafeString(text));
}

export function isLikelyActionIntentText(
  text: string,
  sessionMessages: ChatMessage[]
) {
  const trimmed = toSafeString(text);
  if (!trimmed) return false;
  if (ACTION_HINT_REGEX.test(trimmed)) return true;

  if (AFFIRMATIVE_REGEX.test(trimmed)) {
    const latestAssistantText = pickLatestAssistantText(sessionMessages);
    return hasRecommendationSection(latestAssistantText);
  }

  return false;
}

export function normalizeActionTypeList(value: unknown): ChatActionType[] {
  if (!Array.isArray(value)) return [];
  const out: ChatActionType[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const raw = toSafeString(item);
    if (!raw || !CHAT_ACTION_TYPE_SET.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw as ChatActionType);
  }
  return out;
}

function normalizeQuantity(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(parsed) || parsed <= 1) return 1;
  return Math.min(20, Math.floor(parsed));
}

export function buildSyntheticCartCommand(params: {
  actions: ChatActionType[];
  cartIntent?: ChatAgentCartIntent | null;
}) {
  const cartIntent = params.cartIntent ?? { mode: "none" as const };
  const target = toSafeString(cartIntent.targetProductName);
  const quantity = normalizeQuantity(cartIntent.quantity);
  const quantityText = quantity > 1 ? ` ${quantity}개` : "";

  if (cartIntent.mode === "buy_all") {
    return `추천 상품 전체${quantityText} 바로 구매`;
  }
  if (cartIntent.mode === "add_all") {
    return `추천 상품 전체${quantityText} 담아줘`;
  }
  if (cartIntent.mode === "buy_named" && target) {
    return `${target}${quantityText} 바로 구매`;
  }
  if (cartIntent.mode === "add_named" && target) {
    return `${target}${quantityText} 담아줘`;
  }

  if (params.actions.includes("buy_recommended_all")) {
    return `추천 상품 전체${quantityText} 바로 구매`;
  }
  if (params.actions.includes("add_recommended_all")) {
    return `추천 상품 전체${quantityText} 담아줘`;
  }
  return null;
}
