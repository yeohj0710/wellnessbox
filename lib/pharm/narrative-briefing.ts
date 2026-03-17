import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import {
  buildPharmAnomalyRadarSummary,
  type PharmAnomalyRadarSummary,
} from "./anomaly-radar";
import {
  buildPharmFeedbackMiningSummary,
  type PharmFeedbackMiningSummary,
} from "./feedback-mining";
import {
  buildPharmInboxTriageSummary,
  type PharmInboxTriageSummary,
} from "./triage";

export type PharmNarrativeBriefing = {
  headline: string;
  summary: string;
  statBadges: string[];
  actionLines: string[];
  blindspotLines: string[];
};

function uniqueLines(lines: string[], limit: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function buildHeadline(input: {
  anomaly: PharmAnomalyRadarSummary | null;
  triage: PharmInboxTriageSummary;
  feedback: PharmFeedbackMiningSummary | null;
}) {
  const topAlert = input.anomaly?.alerts[0];
  if (topAlert) {
    return `${topAlert.headline} 지금 이 흐름부터 먼저 정리하는 편이 좋습니다.`;
  }
  if (input.triage.replyCount > 0) {
    return `고객 답변 대기 ${input.triage.replyCount}건이 보여서 메시지 큐부터 비우는 것이 우선입니다.`;
  }
  if (input.triage.staleCount > 0) {
    return `상담이 멈춘 주문 ${input.triage.staleCount}건이 있어 접수/초기 안내를 먼저 열어 주는 편이 좋습니다.`;
  }
  if (input.feedback && input.feedback.frictionDrivers.length > 0) {
    return `${input.feedback.frictionDrivers[0]} 이 지점이 최근 운영 품질을 가장 많이 흔들고 있습니다.`;
  }
  return "지금 인박스는 비교적 안정적이라 급한 불보다 놓치기 쉬운 흐름을 먼저 정리하는 편이 좋습니다.";
}

function buildSummary(input: {
  anomaly: PharmAnomalyRadarSummary | null;
  triage: PharmInboxTriageSummary;
  feedback: PharmFeedbackMiningSummary | null;
}) {
  const parts = [
    input.anomaly
      ? `이상징후 ${input.anomaly.alerts.length}개가 최근 72시간 흐름에서 잡혔어요.`
      : "강한 이상징후는 아직 많지 않아요.",
    input.triage.replyCount > 0
      ? `고객 답변 대기 ${input.triage.replyCount}건이 실제 처리 속도를 잡아먹고 있어요.`
      : "즉시 답변이 필요한 고객 대기는 많지 않아요.",
    input.feedback
      ? `최근 피드백에서는 ${input.feedback.headline}`
      : "최근 피드백 신호는 아직 얕아서 주문 흐름 중심으로 보는 편이 좋아요.",
  ];
  return parts.join(" ");
}

function buildActionLines(input: {
  anomaly: PharmAnomalyRadarSummary | null;
  triage: PharmInboxTriageSummary;
  feedback: PharmFeedbackMiningSummary | null;
}) {
  const topAlert = input.anomaly?.alerts[0];
  const lines = [
    topAlert
      ? `지금 1순위: ${topAlert.actionLabel}`
      : input.triage.replyCount > 0
      ? `지금 1순위: 고객이 마지막으로 남긴 주문 ${input.triage.replyCount}건부터 먼저 답장하기`
      : input.triage.staleCount > 0
      ? `지금 1순위: 상담이 멈춘 주문 ${input.triage.staleCount}건에 접수 또는 초기 안내 다시 열기`
      : "지금 1순위: 오늘 들어온 주문 중 아직 첫 메시지가 없는 건부터 빠르게 접수하기",
    input.triage.requestCount > 0
      ? `다음: 배송/수령 요청이 있는 주문 ${input.triage.requestCount}건은 메시지 답변보다 요청사항 확인을 먼저 붙이기`
      : input.triage.missingCount > 0
      ? `다음: 누락 신호가 있는 주문 ${input.triage.missingCount}건은 복약 안내 또는 첫 응답 템플릿으로 빈칸 메우기`
      : "",
    input.feedback?.actionItems[0]
      ? `이번 주 개선: ${input.feedback.actionItems[0]}`
      : input.feedback?.frictionDrivers[0]
      ? `이번 주 개선: ${input.feedback.frictionDrivers[0]}가 반복돼 설명 문구와 응답 템플릿을 손보는 편이 좋아요.`
      : "",
  ];

  return uniqueLines(lines, 3);
}

function buildBlindspotLines(input: {
  anomaly: PharmAnomalyRadarSummary | null;
  triage: PharmInboxTriageSummary;
  feedback: PharmFeedbackMiningSummary | null;
}) {
  const lines = [
    input.anomaly?.alerts.find((alert) => alert.id === "special-request-gap")
      ? "놓치기 쉬운 흐름: 배송 메모와 공동현관 정보는 답변보다 먼저 확인하지 않으면 재문의로 바로 번지기 쉬워요."
      : "",
    input.feedback?.watchItems.find((item) => item.tone === "warn")
      ? `놓치기 쉬운 흐름: ${input.feedback.watchItems.find((item) => item.tone === "warn")?.label} 쪽은 후기/문의 신호가 같이 흔들려 설명을 다시 맞출 필요가 있어요.`
      : "",
    input.triage.replyCount === 0 && input.triage.staleCount === 0
      ? "지금은 급한 불이 적어서, 반복 구매가 붙는 상품의 설명과 복약 안내를 다른 상품에도 복제하는 쪽이 효율적이에요."
      : "",
  ];
  return uniqueLines(lines, 2);
}

export function buildPharmNarrativeBriefing(input: {
  inboxOrders: OrderAccordionOrder[];
  feedbackOrders: OrderAccordionOrder[];
}): PharmNarrativeBriefing | null {
  const triage = buildPharmInboxTriageSummary(input.inboxOrders);
  const anomaly = buildPharmAnomalyRadarSummary(input.feedbackOrders);
  const feedback = buildPharmFeedbackMiningSummary(input.feedbackOrders);

  if (
    input.inboxOrders.length === 0 &&
    (!feedback || feedback.statBadges.length === 0) &&
    !anomaly
  ) {
    return null;
  }

  return {
    headline: buildHeadline({ anomaly, triage, feedback }),
    summary: buildSummary({ anomaly, triage, feedback }),
    statBadges: uniqueLines(
      [
        anomaly ? `이상징후 ${anomaly.alerts.length}개` : "",
        `우선 처리 ${triage.urgentCount}건`,
        triage.replyCount > 0 ? `답변 대기 ${triage.replyCount}건` : "",
        triage.staleCount > 0 ? `상담 정체 ${triage.staleCount}건` : "",
        feedback?.statBadges[0] || "",
      ],
      4
    ),
    actionLines: buildActionLines({ anomaly, triage, feedback }),
    blindspotLines: buildBlindspotLines({ anomaly, triage, feedback }),
  };
}
