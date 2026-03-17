import { buildUserCapabilitySignals } from "@/lib/ai-capabilities/user-signals";
import type { UserContextSummary } from "@/lib/chat/context";
import type { NormalizedAllResults } from "@/app/chat/hooks/useChat.results";

export type PricePerceptionMode =
  | "price_sensitive"
  | "value_balanced"
  | "trust_first";

export type PricePerceptionModel = {
  mode: PricePerceptionMode;
  badgeLabel: string;
  headline: string;
  helper: string;
  reasonLines: string[];
  shouldLeadWithTrial: boolean;
  shouldLeadWithExplanation: boolean;
  shouldAvoidUpsell: boolean;
};

function uniqueStrings(items: string[], limit = items.length) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }

  return out;
}

function toDate(value: string | number | Date | null | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function daysSince(value: string | number | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function getLatestOrderDays(remoteResults: NormalizedAllResults | null) {
  const latestOrder = [...(remoteResults?.orders || [])].sort((left, right) => {
    const leftAt = toDate(left.createdAt)?.getTime() ?? 0;
    const rightAt = toDate(right.createdAt)?.getTime() ?? 0;
    return rightAt - leftAt;
  })[0];
  return daysSince(latestOrder?.createdAt);
}

export function resolvePricePerception(input: {
  summary: UserContextSummary;
  remoteResults?: NormalizedAllResults | null;
  totalPrice?: number;
  itemCount?: number;
  hasLongPackage?: boolean;
}) {
  const signals = buildUserCapabilitySignals(input.summary);
  const orderCount = input.remoteResults?.orders.length ?? 0;
  const lastOrderDays = getLatestOrderDays(input.remoteResults ?? null);
  const totalPrice = input.totalPrice ?? 0;
  const itemCount = input.itemCount ?? 0;
  const hasLongPackage = input.hasLongPackage ?? false;

  const firstPurchasePressure =
    orderCount === 0 && (totalPrice >= 80000 || itemCount >= 3 || hasLongPackage);
  const restartPressure =
    orderCount > 0 &&
    lastOrderDays != null &&
    lastOrderDays >= 35 &&
    input.summary.journeySegment.id === "drifting_returner";
  const safetyOrTrustNeed =
    signals.isSafetySensitive ||
    signals.hasPreviousConsultations ||
    signals.evidenceScore >= 4 ||
    input.summary.journeySegment.id === "guided_decider" ||
    input.summary.journeySegment.id === "safety_first_manager";
  const lowEvidenceStarter =
    signals.evidenceScore <= 2 &&
    !signals.hasPreviousConsultations &&
    !signals.isSafetySensitive;

  if (safetyOrTrustNeed && !firstPurchasePressure) {
    return {
      mode: "trust_first",
      badgeLabel: "설명 우선",
      headline: "이 사용자에겐 가격보다 왜 맞는지 납득되는지가 더 중요해요",
      helper:
        "할인을 더 세게 밀기보다 근거와 조정 가능성을 먼저 보여주는 편이 전환과 신뢰를 같이 지켜줘요.",
      reasonLines: uniqueStrings(
        [
          signals.isSafetySensitive
            ? "복용약·건강 맥락이 있어 가격보다 안전한 설명이 먼저예요."
            : "",
          signals.hasPreviousConsultations
            ? "이미 상담 맥락이 있어 가격보다 결정 근거를 정리해 주는 편이 잘 맞아요."
            : "",
          signals.evidenceScore >= 4
            ? "기록이 충분히 쌓여 있어 더 싼 제안보다 더 맞는 제안이 설득력이 커요."
            : "",
        ].filter(Boolean),
        3
      ),
      shouldLeadWithTrial: signals.isSafetySensitive,
      shouldLeadWithExplanation: true,
      shouldAvoidUpsell: true,
    } satisfies PricePerceptionModel;
  }

  if (
    firstPurchasePressure ||
    restartPressure ||
    lowEvidenceStarter ||
    input.summary.journeySegment.id === "starter_explorer"
  ) {
    return {
      mode: "price_sensitive",
      badgeLabel: "부담 낮추기",
      headline: "이 사용자에겐 총액보다 시작 부담을 낮춰 주는 구성이 더 잘 먹혀요",
      helper:
        "할인 폭을 키우기보다 7일치, 축 좁히기, 비교 단순화로 첫 결정을 가볍게 만드는 편이 반응이 좋아요.",
      reasonLines: uniqueStrings(
        [
          firstPurchasePressure
            ? "첫 구매인데 총액·구성 수가 함께 커져 망설임이 생기기 쉬워요."
            : "",
          restartPressure ? "오랜 공백 뒤 복귀라 예전 강도를 그대로 반복시키면 부담이 커질 수 있어요." : "",
          lowEvidenceStarter
            ? "아직 기록이 얕아 긴 설명보다 가볍게 시작해 보는 제안이 더 자연스러워요."
            : "",
        ].filter(Boolean),
        3
      ),
      shouldLeadWithTrial: true,
      shouldLeadWithExplanation: false,
      shouldAvoidUpsell: true,
    } satisfies PricePerceptionModel;
  }

  return {
    mode: "value_balanced",
    badgeLabel: "가치 균형",
    headline: "이 사용자에겐 가격과 설명의 균형이 맞는 제안이 좋아요",
    helper:
      "너무 싸게만도, 너무 길게 설명만도 하지 않고 현재 기록과 구매 의도를 같이 보여주는 편이 전환이 잘 붙어요.",
    reasonLines: uniqueStrings(
      [
        orderCount > 0 ? "이전 이용 경험이 있어 가격과 설명을 함께 비교할 준비가 되어 있어요." : "",
        signals.evidenceScore >= 3 ? "기록이 어느 정도 있어 단순 입문형보다 한 단계 더 정교한 비교가 가능해요." : "",
        !signals.isSafetySensitive ? "안전 주의 맥락이 강하지 않아 설명과 선택 폭을 함께 가져가도 괜찮아요." : "",
      ].filter(Boolean),
      3
    ),
    shouldLeadWithTrial: false,
    shouldLeadWithExplanation: false,
    shouldAvoidUpsell: false,
  } satisfies PricePerceptionModel;
}
