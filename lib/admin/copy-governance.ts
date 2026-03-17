import { LANDING_COPY_GOVERNANCE_SOURCES } from "@/app/(components)/landingSection2/copyGovernanceSource";
import { TESTIMONIAL_ITEMS } from "@/app/(components)/testimonials.content";
import {
  analyzeCopyRisk,
  type CopyRiskFinding,
  type CopyRiskSeverity,
} from "@/lib/copy-governance";

type CopySourceEntry = {
  source: string;
  surface: string;
  text: string;
};

type CopySourceSummary = {
  source: string;
  surface: string;
  severity: CopyRiskSeverity;
  findings: CopyRiskFinding[];
  action: string;
};

export type AdminCopyGovernanceReport = {
  headline: string;
  summary: string;
  statBadges: string[];
  surfaceLines: CopySourceSummary[];
};

function getSeverityRank(severity: CopyRiskSeverity) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function highestSeverity(findings: CopyRiskFinding[]): CopyRiskSeverity {
  if (findings.some((finding) => finding.severity === "high")) return "high";
  if (findings.some((finding) => finding.severity === "medium")) return "medium";
  return "low";
}

function buildSourceEntries(): CopySourceEntry[] {
  const entries: CopySourceEntry[] = [];

  for (const item of TESTIMONIAL_ITEMS) {
    entries.push({
      source: `후기 섹션 · ${item.name}`,
      surface: "고객 후기",
      text: [item.headline, item.body].join(" "),
    });
  }

  entries.push(...LANDING_COPY_GOVERNANCE_SOURCES);

  return entries;
}

function buildAction(findings: CopyRiskFinding[]) {
  const topFinding = findings[0];
  if (!topFinding) {
    return "현재는 추가 조치가 필요하지 않습니다.";
  }

  switch (topFinding.ruleId) {
    case "therapeutic_claim":
      return "치료·처방처럼 읽히는 표현은 빼고 안내 중심 문장으로 낮추는 편이 좋습니다.";
    case "certainty_claim":
      return "개인차가 보이도록 단정 표현을 줄이고 경험 가능성 중심으로 바꾸는 편이 좋습니다.";
    case "hype_promotion":
      return "혜택 강조보다 신뢰와 이해가 먼저 보이도록 문장 강도를 낮추는 편이 좋습니다.";
    case "excessive_punctuation":
      return "강조 부호를 줄여 차분한 톤으로 맞추는 편이 좋습니다.";
    default:
      return "리스크가 큰 문장을 먼저 다시 확인해 보는 편이 좋습니다.";
  }
}

export function buildAdminCopyGovernanceReport(): AdminCopyGovernanceReport {
  const entries = buildSourceEntries();

  const sourceSummaries = entries
    .map<CopySourceSummary | null>((entry) => {
      const findings = analyzeCopyRisk(entry.text);
      if (findings.length === 0) return null;

      return {
        source: entry.source,
        surface: entry.surface,
        severity: highestSeverity(findings),
        findings,
        action: buildAction(findings),
      };
    })
    .filter((entry): entry is CopySourceSummary => entry !== null)
    .sort((left, right) => {
      const severityGap =
        getSeverityRank(right.severity) - getSeverityRank(left.severity);
      if (severityGap !== 0) return severityGap;
      return right.findings.length - left.findings.length;
    });

  const highCount = sourceSummaries.filter(
    (entry) => entry.severity === "high"
  ).length;
  const mediumCount = sourceSummaries.filter(
    (entry) => entry.severity === "medium"
  ).length;
  const lowCount = sourceSummaries.filter(
    (entry) => entry.severity === "low"
  ).length;

  const headline =
    sourceSummaries.length === 0
      ? "지금 주요 랜딩 카피는 비교적 안정적으로 유지되고 있습니다."
      : `지금 손봐야 할 카피 표면이 ${sourceSummaries.length}곳 보입니다.`;

  const summary =
    sourceSummaries.length === 0
      ? "후기, 랜딩 소개, 요금제 문구를 기준으로 표현 리스크를 다시 확인했고 현재는 과장·오해 가능성이 큰 표면이 두드러지지 않습니다."
      : "후기, 랜딩 소개, 요금제 문구를 기준으로 과장·오해 가능성이 있는 표현을 다시 묶었습니다. 공용 거버넌스로 보정되는 영역 바깥의 문구부터 우선 손보는 데 쓰기 좋습니다.";

  const statBadges = [
    `고위험 ${highCount}곳`,
    `중간 ${mediumCount}곳`,
    `낮음 ${lowCount}곳`,
    `랜딩 소스 ${LANDING_COPY_GOVERNANCE_SOURCES.length}건`,
  ];

  return {
    headline,
    summary,
    statBadges,
    surfaceLines: sourceSummaries.slice(0, 4),
  };
}
