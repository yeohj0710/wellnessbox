"use client";

import type { WellnessComputedResult } from "@/lib/wellness/analysis";

const SURVEY_RESULT_DONUT_RADIUS = 44;
const SURVEY_RESULT_DONUT_CIRCUMFERENCE = 2 * Math.PI * SURVEY_RESULT_DONUT_RADIUS;

const SURVEY_LIFESTYLE_RISK_LABEL_BY_ID: Record<string, string> = {
  diet: "식습관 위험도",
  activity: "활동량 위험도",
  immune: "면역관리 위험도",
  sleep: "수면 위험도",
};

const SURVEY_LIFESTYLE_RISK_BASE_LABEL_BY_NAME: Record<string, string> = {
  식습관: "식습관",
  활동량: "활동량",
  면역관리: "면역관리",
  수면: "수면",
};

function clampResultPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function toSurveyLifestyleRiskLabel(input: { id?: string; name?: string }) {
  const normalizedId = (input.id ?? "").trim().toLowerCase();
  if (normalizedId && SURVEY_LIFESTYLE_RISK_LABEL_BY_ID[normalizedId]) {
    return SURVEY_LIFESTYLE_RISK_LABEL_BY_ID[normalizedId];
  }

  const rawName = (input.name ?? input.id ?? "").trim();
  const collapsed = rawName.replace(/\s+/g, "");
  const mapped =
    SURVEY_LIFESTYLE_RISK_BASE_LABEL_BY_NAME[collapsed] || rawName || "생활습관";
  const withoutSuffix = mapped.endsWith("위험도") ? mapped.slice(0, -3).trim() : mapped;
  return `${withoutSuffix} 위험도`;
}

function normalizeHighlightIdentityText(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeSurveyHighRiskHighlights(highlights: WellnessComputedResult["highRiskHighlights"]) {
  const picked: WellnessComputedResult["highRiskHighlights"] = [];
  const seenIdentities = new Set<string>();

  for (const item of highlights) {
    const normalizedQuestionText = normalizeHighlightIdentityText(item.questionText);
    const normalizedQuestionKey = normalizeHighlightIdentityText(item.questionKey);
    const normalizedTitle = normalizeHighlightIdentityText(item.title);
    const identity =
      normalizedQuestionText
        ? `question:${normalizedQuestionText}`
        : normalizedQuestionKey
          ? `key:${normalizedQuestionKey}`
          : normalizedTitle
            ? `title:${normalizedTitle}`
            : "";

    if (identity && seenIdentities.has(identity)) continue;
    picked.push(item);
    if (identity) {
      seenIdentities.add(identity);
    }
  }

  return picked;
}

function normalizeSupplementHeadingText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function toSurveyRadarPointString(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function shouldWrapLifestyleRiskLabel(input: { id?: string; label: string }) {
  const normalizedId = (input.id ?? "").trim().toLowerCase();
  const normalizedLabel = input.label.replace(/\s+/g, "");
  return (
    normalizedId.includes("activity") ||
    normalizedId.includes("immune") ||
    normalizedLabel.includes("활동량위험도") ||
    normalizedLabel.includes("면역관리위험도")
  );
}

export type SurveyResultPanelText = {
  resultTitle: string;
  scoreHealth: string;
  scoreRisk: string;
  editSurvey: string;
  restart: string;
  viewEmployeeReport: string;
};

export default function SurveyResultPanel(props: {
  resultSummary: WellnessComputedResult | null;
  sectionTitleMap: Map<string, string>;
  text: SurveyResultPanelText;
  onEditSurvey: () => void;
  onRestart: () => void;
  onOpenEmployeeReport: () => void;
}) {
  const { resultSummary, sectionTitleMap, text } = props;
  const highRiskHighlights = resultSummary
    ? dedupeSurveyHighRiskHighlights(resultSummary.highRiskHighlights)
    : [];

  return (
    <div
      data-testid="survey-result"
      className="mx-auto max-w-[840px] rounded-[26px] border border-sky-100/70 bg-white/82 p-5 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.38)] backdrop-blur sm:p-7"
    >
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{text.resultTitle}</h2>
      {resultSummary ? (
        <div className="mt-5 space-y-5">
          {(() => {
            const healthScore = clampResultPercent(Math.round(resultSummary.overallHealthScore));
            const lifestyleOverall = clampResultPercent(
              Math.round(resultSummary.lifestyleRisk.overallPercent)
            );
            const healthNeedAverage = clampResultPercent(
              Math.round(resultSummary.healthManagementNeed.averagePercent)
            );
            const donutOffset = SURVEY_RESULT_DONUT_CIRCUMFERENCE * (1 - healthScore / 100);
            const lifestyleRiskDomainsRaw = resultSummary.lifestyleRisk.domains
              .map((axis) => ({
                id: axis.id,
                label: toSurveyLifestyleRiskLabel({
                  id: axis.id,
                  name: axis.name ?? axis.id ?? "",
                }),
                percent: clampResultPercent(Math.round(axis.percent ?? 0)),
              }))
              .filter((axis) => axis.label.length > 0)
              .slice(0, 4);
            const lifestyleRiskDomains =
              lifestyleRiskDomainsRaw.length > 0
                ? lifestyleRiskDomainsRaw
                : [
                    { id: "diet", label: "식습관 위험도", percent: 0 },
                    { id: "activity", label: "활동량 위험도", percent: 0 },
                    { id: "immune", label: "면역관리 위험도", percent: 0 },
                    { id: "sleep", label: "수면 위험도", percent: 0 },
                  ];
            const radarCenterX = 120;
            const radarCenterY = 106;
            const radarRadius = 52;
            const radarAxes = lifestyleRiskDomains.map((axis, index, axisList) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisList.length;
              const outerX = radarCenterX + radarRadius * Math.cos(angle);
              const outerY = radarCenterY + radarRadius * Math.sin(angle);
              const valueRatio = clampResultPercent(axis.percent) / 100;
              const valueX = radarCenterX + radarRadius * valueRatio * Math.cos(angle);
              const valueY = radarCenterY + radarRadius * valueRatio * Math.sin(angle);
              const labelRadius = radarRadius + 22;
              const rawLabelX = radarCenterX + labelRadius * Math.cos(angle);
              const rawLabelY = radarCenterY + labelRadius * Math.sin(angle);
              const labelX = Math.max(16, Math.min(224, rawLabelX));
              const labelY = Math.max(20, Math.min(186, rawLabelY));
              const labelAnchor: "start" | "middle" | "end" =
                rawLabelX < radarCenterX - 30
                  ? "end"
                  : rawLabelX > radarCenterX + 30
                    ? "start"
                    : "middle";
              const isWrappedRiskLabel = shouldWrapLifestyleRiskLabel({
                id: axis.id,
                label: axis.label,
              });
              const labelBaseText = isWrappedRiskLabel
                ? axis.label.replace(/\s*위험도$/u, "").trim()
                : axis.label;
              const labelLines =
                isWrappedRiskLabel && labelBaseText.length > 0
                  ? [labelBaseText, "위험도"]
                  : [axis.label];
              return {
                ...axis,
                outerX,
                outerY,
                valueX,
                valueY,
                labelX,
                labelY,
                labelAnchor,
                labelLines,
              };
            });
            const radarLevels = [0.25, 0.5, 0.75, 1];
            const radarAreaPoints = toSurveyRadarPointString(
              radarAxes.map((axis) => ({ x: axis.valueX, y: axis.valueY }))
            );
            const sectionNeedRows = [...(resultSummary.healthManagementNeed.sections ?? [])]
              .map((section) => ({
                sectionId: section.sectionId,
                sectionTitle: (section.sectionTitle ?? section.sectionId ?? "").trim(),
                percent: clampResultPercent(Math.round(section.percent ?? 0)),
              }))
              .filter((section) => section.sectionTitle.length > 0)
              .sort((left, right) => right.percent - left.percent)
              .slice(0, 3);

            return (
              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{text.scoreHealth}</p>
                  <div className="mt-2 grid justify-items-center gap-2">
                    <div className="relative h-[112px] w-[112px] shrink-0">
                      <svg
                        viewBox="0 0 120 120"
                        className="h-full w-full"
                        role="img"
                        aria-label="건강점수 원형 차트"
                      >
                        <circle
                          cx="60"
                          cy="60"
                          r={SURVEY_RESULT_DONUT_RADIUS}
                          fill="none"
                          stroke="#E2E8F0"
                          strokeWidth="10"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r={SURVEY_RESULT_DONUT_RADIUS}
                          fill="none"
                          stroke="#16A34A"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={SURVEY_RESULT_DONUT_CIRCUMFERENCE}
                          strokeDashoffset={donutOffset}
                          transform="rotate(-90 60 60)"
                        />
                      </svg>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <p className="text-3xl font-extrabold text-slate-900">
                          {healthScore}
                          <span className="ml-0.5 text-xl">점</span>
                        </p>
                      </div>
                    </div>
                    <p className="max-w-[220px] text-center text-[11px] leading-relaxed text-slate-500">
                      건강점수 = 100 - ((생활습관 위험도 + 건강관리 위험도 평균) / 2)
                    </p>
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{text.scoreRisk}</p>
                  <div className="mt-2 grid justify-items-center">
                    <svg
                      viewBox="0 0 240 210"
                      className="h-auto w-full max-w-[252px]"
                      role="img"
                      aria-label="생활습관 위험도 다이아몬드 그래프"
                    >
                      {radarLevels.map((level) => {
                        const levelPoints = toSurveyRadarPointString(
                          radarAxes.map((axis) => ({
                            x: radarCenterX + (axis.outerX - radarCenterX) * level,
                            y: radarCenterY + (axis.outerY - radarCenterY) * level,
                          }))
                        );
                        return (
                          <polygon
                            key={`survey-radar-level-${level}`}
                            points={levelPoints}
                            fill="none"
                            stroke="#d7e3f7"
                            strokeWidth="1"
                          />
                        );
                      })}
                      {radarAxes.map((axis) => (
                        <line
                          key={`survey-radar-axis-${axis.id}`}
                          x1={radarCenterX}
                          y1={radarCenterY}
                          x2={axis.outerX}
                          y2={axis.outerY}
                          stroke="#cad8ef"
                          strokeWidth="1"
                        />
                      ))}
                      <polygon points={radarAreaPoints} fill="rgba(239,68,68,0.2)" stroke="#dc2626" strokeWidth="2" />
                      {radarAxes.map((axis) => (
                        <circle
                          key={`survey-radar-point-${axis.id}`}
                          cx={axis.valueX}
                          cy={axis.valueY}
                          r="3"
                          fill="#fff7f7"
                          stroke="#b91c1c"
                          strokeWidth="2"
                        />
                      ))}
                      {radarAxes.map((axis) => (
                        <text
                          key={`survey-radar-label-${axis.id}`}
                          x={axis.labelX}
                          y={axis.labelY}
                          textAnchor={axis.labelAnchor}
                          dominantBaseline="central"
                          fill="#4b5563"
                          fontSize="11.5"
                          fontWeight="700"
                        >
                          {axis.labelLines.map((labelLine, lineIndex) => (
                            <tspan
                              key={`survey-radar-label-line-${axis.id}-${lineIndex}`}
                              x={axis.labelX}
                              dy={lineIndex === 0 ? "-0.35em" : "1.1em"}
                            >
                              {labelLine}
                            </tspan>
                          ))}
                          <tspan x={axis.labelX} dy="1.2em" fill="#be123c" fontSize="12.5" fontWeight="800">
                            {axis.percent}점
                          </tspan>
                        </text>
                      ))}
                    </svg>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    종합 위험도:{" "}
                    <span className="font-semibold text-rose-600">{lifestyleOverall}점</span>
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:min-h-[220px] sm:flex sm:flex-col">
                  <p className="text-sm font-semibold text-slate-900">건강관리 위험도</p>
                  <div className="mt-3">
                    {sectionNeedRows.length === 0 ? (
                      <p className="text-xs text-slate-500">선택한 세부 영역 데이터가 없습니다.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {sectionNeedRows.map((section) => (
                          <li key={`need-${section.sectionId}`}>
                            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                              <span className="truncate pr-2">{section.sectionTitle}</span>
                              <span className="font-semibold text-rose-600">{section.percent}점</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                                style={{ width: `${section.percent}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      평균 위험도:{" "}
                      <span className="font-semibold text-rose-600">{healthNeedAverage}점</span>
                    </p>
                  </div>
                </article>
              </div>
            );
          })()}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-bold text-slate-900">주의가 필요한 문항 요약</h3>
            <p className="mt-1 text-xs text-slate-500">
              표기된 점수는 전체 위험도가 아니라 각 문항 응답 기준의 문항 위험도입니다.
            </p>
            {highRiskHighlights.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {highRiskHighlights.map((item, index) => {
                  const categoryLabel =
                    item.category === "common"
                      ? "공통"
                      : item.category === "detailed"
                        ? "상세"
                        : item.category === "domain"
                          ? "생활습관"
                          : "영역";
                  return (
                    <li
                      key={`risk-${item.category}-${item.title}-${index}`}
                      className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-rose-700">
                        {categoryLabel} · 문항 위험도 {Math.round(item.score)}점
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {item.questionText || item.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        내 답변: {item.answerText || "응답 정보 없음"}
                      </p>
                      <p className="mt-1.5 text-sm font-medium leading-relaxed text-rose-700">
                        {item.action}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">표시할 하이라이트가 없습니다.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-bold text-slate-900">생활습관 실천 가이드</h3>
            {resultSummary.lifestyleRoutineAdvice.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {resultSummary.lifestyleRoutineAdvice.map((item, index) => (
                  <li
                    key={`routine-${index}`}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5"
                  >
                    <p className="text-xs font-semibold text-emerald-700">실천 권장</p>
                    <p className="mt-1 text-sm text-emerald-900">{item}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">추가 실천 가이드가 없습니다.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-bold text-slate-900">영역별 분석 코멘트</h3>
            <div className="mt-3 space-y-3">
              {Object.entries(resultSummary.sectionAdvice)
                .filter(([, value]) => value.items.length > 0)
                .map(([sectionId, value]) => (
                  <article
                    key={`section-advice-${sectionId}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    <h4 className="text-sm font-bold text-slate-900">{value.sectionTitle}</h4>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                      {value.items.map((item) => (
                        <li key={`section-item-${sectionId}-${item.questionNumber}`}>
                          <p className="font-semibold text-slate-900">
                            {item.questionText || `${value.sectionTitle} ${item.questionNumber}번 문항`}
                          </p>
                          <p className="mt-0.5 text-slate-700">
                            내 답변: {item.answerText || "응답 정보 없음"}
                          </p>
                          <p className="mt-1.5 text-sm font-medium leading-relaxed text-rose-700">
                            {item.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-bold text-slate-900">맞춤 영양제 설계</h3>
            {resultSummary.supplementDesign.length > 0 ? (
              <div className="mt-3 space-y-3">
                {resultSummary.supplementDesign.map((item) => {
                  const sectionLabel = (sectionTitleMap.get(item.sectionId) ?? item.sectionId).trim();
                  const titleLabel = (item.title ?? "").trim();
                  const showSectionLabel =
                    sectionLabel.length > 0 &&
                    normalizeSupplementHeadingText(sectionLabel) !==
                      normalizeSupplementHeadingText(titleLabel);

                  return (
                  <article
                    key={`supplement-${item.sectionId}`}
                    className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-3"
                  >
                    {showSectionLabel ? (
                      <p className="text-xs font-semibold text-indigo-700">{sectionLabel}</p>
                    ) : null}
                    <h4 className={`${showSectionLabel ? "mt-1" : "mt-0"} text-sm font-bold text-slate-900`}>
                      {titleLabel || sectionLabel}
                    </h4>
                    <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                      {item.paragraphs.map((paragraph, index) => (
                        <p key={`supplement-paragraph-${item.sectionId}-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                    {item.recommendedNutrients && item.recommendedNutrients.length > 0 ? (
                      <div className="mt-2 rounded-lg border border-indigo-200/80 bg-white/70 px-2.5 py-2">
                        <p className="text-xs font-semibold text-indigo-700">추천 영양소</p>
                        <p className="mt-0.5 text-[11px] text-indigo-600">
                          현재 결과 기준으로 우선 고려할 성분입니다.
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.recommendedNutrients.map((nutrient) => (
                            <span
                              key={`nutrient-${item.sectionId}-${nutrient.code}`}
                              className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700"
                            >{nutrient.labelKo ?? nutrient.label}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                현재 선택한 설문 결과에서 제안할 맞춤 설계가 없습니다.
              </p>
            )}
          </section>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          analysis_failed
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-sky-50/55 to-white px-3 py-3 shadow-[0_10px_24px_-22px_rgba(14,116,204,0.65)] sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.01em] text-slate-500">다음 단계</p>
            <p className="mt-0.5 text-xs text-slate-500">
              결과를 확인하고 답안을 다시 조정할 수 있습니다.
            </p>
          </div>
          {/*
            TODO(temp): 개인 사용자의 건강 레포트 직접 열람을 임시 제한합니다.
            정책 확정 후 버튼 노출을 재개하세요.
          */}
          {/* <button
            type="button"
            onClick={props.onOpenEmployeeReport}
            data-testid="survey-result-open-employee-report"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_-14px_rgba(14,116,204,0.9)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_14px_26px_-14px_rgba(14,116,204,0.95)] active:translate-y-0"
          >
            {text.viewEmployeeReport}
          </button> */}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/85 pt-3">
          <button
            type="button"
            onClick={props.onEditSurvey}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99]"
          >
            {text.editSurvey}
          </button>
          <button
            type="button"
            onClick={props.onRestart}
            data-testid="survey-result-reset-button"
            className="rounded-full border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-sky-700 hover:decoration-sky-300 active:scale-[0.99]"
          >
            {text.restart}
          </button>
        </div>
      </section>
    </div>
  );
}
