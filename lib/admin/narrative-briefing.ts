import type { AiExperimentSummary } from "@/lib/ai-experiments/service";

export type AdminNarrativeBriefing = {
  headline: string;
  summary: string;
  statBadges: string[];
  actionLines: string[];
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

function getTopVariants(summary: AiExperimentSummary) {
  return [...summary.variants].sort((left, right) => {
    if (right.ctrPercent !== left.ctrPercent) {
      return right.ctrPercent - left.ctrPercent;
    }
    return right.impressions - left.impressions;
  });
}

export function buildAdminNarrativeBriefing(
  summary: AiExperimentSummary | null
): AdminNarrativeBriefing {
  if (!summary) {
    return {
      headline: "지금은 실험 숫자를 읽기보다 로그 적재와 마이그레이션 상태부터 확인하는 편이 좋습니다.",
      summary:
        "실험 데이터가 아직 충분히 보이지 않아 변형 해석보다 계측 배선과 테이블 적용 여부를 먼저 점검해야 합니다.",
      statBadges: ["실험 데이터 대기", "계측 점검 우선"],
      actionLines: [
        "지금 1순위: ai experiment 테이블과 이벤트 적재 상태부터 확인하기",
        "다음: 노출 이벤트가 실제 explore 진입에서 쌓이는지 다시 보기",
        "그다음: 표본이 쌓인 뒤에야 카피 승패를 해석하기",
      ],
    };
  }

  const ranked = getTopVariants(summary);
  const top = ranked[0] ?? null;
  const runnerUp = ranked[1] ?? null;
  const ctrGap =
    top && runnerUp
      ? Number((top.ctrPercent - runnerUp.ctrPercent).toFixed(1))
      : 0;
  const lowSample = summary.totalImpressions < 300;
  const primaryHeavy =
    (top?.primaryClicks ?? 0) >=
    (top?.secondaryClicks ?? 0) + (top?.articleClicks ?? 0);

  const headline = lowSample
    ? `최근 ${summary.windowDays}일 표본이 아직 얕아서, 승패 해석보다 노출과 적재 품질을 먼저 보는 편이 좋습니다.`
    : ctrGap >= 1.5 && top
    ? `${top.label} 변형이 현재 우세해서 이 카피 방향을 다른 진입면에도 복제할 후보로 볼 수 있습니다.`
    : "지금 실험은 큰 승패보다 클릭 방향 차이를 읽고 다음 카피를 좁혀 가는 단계에 가깝습니다.";

  const summaryText = lowSample
    ? `총 노출 ${summary.totalImpressions}건, 성공 이벤트 ${summary.totalSuccessEvents}건이라 아직 카피 확정보다 계측 안정성이 더 중요해요.`
    : top && runnerUp
    ? `${top.label} CTR ${top.ctrPercent}%가 ${runnerUp.label} CTR ${runnerUp.ctrPercent}%보다 ${ctrGap}%p 높습니다. ${summary.recommendation}`
    : summary.recommendation;

  return {
    headline,
    summary: summaryText,
    statBadges: uniqueLines(
      [
        `최근 ${summary.windowDays}일`,
        `총 노출 ${summary.totalImpressions}건`,
        `성공 이벤트 ${summary.totalSuccessEvents}건`,
        top ? `현재 우세 ${top.label}` : "",
      ],
      4
    ),
    actionLines: uniqueLines(
      [
        lowSample
          ? "지금 1순위: 카피 수정 전에 explore 상단 노출과 이벤트 적재가 안정적으로 쌓이는지 먼저 점검하기"
          : top
          ? `지금 1순위: ${top.label} 변형의 문장 톤을 홈/탐색 다른 진입 카드에도 복제할 후보로 검토하기`
          : "지금 1순위: 표본을 더 쌓아 승패를 보기",
        primaryHeavy
          ? "다음: 주 CTA가 잘 먹히고 있어 보조 링크보다 메인 행동 유도 문장을 더 세밀하게 다듬기"
          : "다음: 보조 CTA나 본문 클릭이 더 많다면 메인 CTA 문구가 너무 빠르지 않은지 점검하기",
        ctrGap < 1.5 && !lowSample
          ? "그다음: 변형 차이가 작으니 큰 리디자인보다 제목 한 줄과 CTA 한 줄만 다시 실험하기"
          : "그다음: 우세 변형의 구조는 유지하고 패배 변형의 핵심 문장만 좁혀 다시 비교하기",
      ],
      3
    ),
  };
}
