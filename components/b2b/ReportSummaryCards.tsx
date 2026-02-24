"use client";

type PayloadSummary = {
  meta?: {
    employeeName?: string;
    generatedAt?: string;
    periodKey?: string;
    isMockData?: boolean;
  };
  analysis?: {
    summary?: {
      overallScore?: number;
      surveyScore?: number;
      healthScore?: number;
      medicationScore?: number;
      riskLevel?: string;
      topIssues?: Array<{ title?: string; score?: number }>;
    };
    recommendations?: string[];
    trend?: {
      months?: Array<{
        periodKey?: string;
        overallScore?: number;
        surveyScore?: number;
        healthScore?: number;
      }>;
    };
    aiEvaluation?: {
      summary?: string;
      monthlyGuide?: string;
      actionItems?: string[];
      caution?: string;
    } | null;
  };
  survey?: {
    sectionScores?: Array<{
      sectionTitle?: string;
      score?: number;
      answeredCount?: number;
      questionCount?: number;
    }>;
  };
  health?: {
    coreMetrics?: Array<{
      label?: string;
      value?: string;
      unit?: string | null;
      status?: string;
    }>;
    medicationStatus?: {
      type?: "available" | "none" | "fetch_failed" | "unknown";
      message?: string | null;
      failedTargets?: string[];
    };
    medications?: Array<{
      medicationName?: string;
      date?: string | null;
      dosageDay?: string | null;
      hospitalName?: string | null;
    }>;
  };
  pharmacist?: {
    summary?: string | null;
    recommendations?: string | null;
    cautions?: string | null;
  };
};

function formatScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}점`;
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function medicationStatusLabel(type?: string) {
  if (type === "available") return "연동 완료";
  if (type === "none") return "복약 없음";
  if (type === "fetch_failed") return "조회 실패";
  return "미확인";
}

export default function ReportSummaryCards(props: { payload: PayloadSummary | null | undefined }) {
  const payload = props.payload;
  if (!payload) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        표시할 리포트 데이터가 없습니다.
      </div>
    );
  }

  const topIssues = payload.analysis?.summary?.topIssues ?? [];
  const sectionScores = payload.survey?.sectionScores ?? [];
  const recommendations = payload.analysis?.recommendations ?? [];
  const trend = payload.analysis?.trend?.months ?? [];
  const metrics = payload.health?.coreMetrics ?? [];
  const medications = payload.health?.medications ?? [];
  const ai = payload.analysis?.aiEvaluation;
  const medStatus = payload.health?.medicationStatus;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">종합 점수</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatScore(payload.analysis?.summary?.overallScore)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">설문/검진/복약</p>
          <p className="mt-1 text-sm text-slate-700">
            {formatScore(payload.analysis?.summary?.surveyScore)} /{" "}
            {formatScore(payload.analysis?.summary?.healthScore)} /{" "}
            {formatScore(payload.analysis?.summary?.medicationScore)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">리스크 레벨</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {payload.analysis?.summary?.riskLevel || "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">복약 상태</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {medicationStatusLabel(medStatus?.type)}
          </p>
          {medStatus?.message ? (
            <p className="mt-1 text-xs text-slate-500">{medStatus.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">상위 이슈 TOP3</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {topIssues.length === 0 ? <li>데이터 없음</li> : null}
            {topIssues.slice(0, 3).map((issue, index) => (
              <li key={`${issue.title ?? "issue"}-${index}`}>
                {issue.title || "-"} ({formatScore(issue.score)})
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">최근 3회 복약 요약</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {medications.length === 0 ? <li>데이터 없음</li> : null}
            {medications.slice(0, 3).map((item, index) => (
              <li key={`${item.medicationName ?? "med"}-${index}`}>
                {item.medicationName || "-"}
                {item.date ? ` / ${item.date}` : ""}
                {item.dosageDay ? ` / ${item.dosageDay}` : ""}
                {item.hospitalName ? ` / ${item.hospitalName}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">건강검진 핵심 지표</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {metrics.length === 0 ? <li>데이터 없음</li> : null}
            {metrics.slice(0, 8).map((metric, index) => (
              <li key={`${metric.label ?? "metric"}-${index}`}>
                {metric.label || "-"}: {metric.value || "-"}
                {metric.unit ? ` ${metric.unit}` : ""} ({metric.status || "unknown"})
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">섹션별 점수</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {sectionScores.length === 0 ? <li>데이터 없음</li> : null}
            {sectionScores.slice(0, 8).map((section, index) => (
              <li key={`${section.sectionTitle ?? "section"}-${index}`}>
                {section.sectionTitle || "-"}: {formatScore(section.score)}
                {typeof section.answeredCount === "number" &&
                typeof section.questionCount === "number"
                  ? ` (${section.answeredCount}/${section.questionCount})`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">권장 사항</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {recommendations.length === 0 ? <li>데이터 없음</li> : null}
          {recommendations.slice(0, 6).map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">월별 추이</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {trend.length === 0 ? <li>데이터 없음</li> : null}
          {trend.slice(-6).map((month, index) => (
            <li key={`${month.periodKey ?? "period"}-${index}`}>
              {month.periodKey || "-"}: 종합 {formatScore(month.overallScore)} / 설문{" "}
              {formatScore(month.surveyScore)} / 검진 {formatScore(month.healthScore)}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">약사 코멘트 가공</h3>
          <p className="mt-2 text-sm text-slate-700">
            요약: {payload.pharmacist?.summary || "입력 없음"}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            권장: {payload.pharmacist?.recommendations || "입력 없음"}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            주의: {payload.pharmacist?.cautions || "입력 없음"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">AI 종합평가</h3>
          {ai ? (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p>요약: {ai.summary || "-"}</p>
              <p>한 달 가이드: {ai.monthlyGuide || "-"}</p>
              {Array.isArray(ai.actionItems) && ai.actionItems.length > 0 ? (
                <ul className="list-disc pl-5">
                  {ai.actionItems.slice(0, 3).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {ai.caution ? <p>주의: {ai.caution}</p> : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">생성된 AI 평가가 없습니다.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        생성 시각: {formatDate(payload.meta?.generatedAt)} / 대상: {payload.meta?.employeeName || "-"} /
        기간: {payload.meta?.periodKey || "-"}
      </div>
    </div>
  );
}
