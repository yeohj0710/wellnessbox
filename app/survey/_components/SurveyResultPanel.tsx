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
            const sectionNeedRows = [...(resultSummary.healthManagementNeed.sections ?? [])]
              .map((section) => ({
                sectionId: section.sectionId,
                sectionTitle: (section.sectionTitle ?? section.sectionId ?? "").trim(),
                percent: clampResultPercent(Math.round(section.percent ?? 0)),
              }))
              .filter((section) => section.sectionTitle.length > 0)
              .sort((left, right) => right.percent - left.percent)
              .slice(0, 3);
            const centerNeedCardContent =
              sectionNeedRows.length > 0 && sectionNeedRows.length < 3;

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
                  <ul className="mt-3 space-y-2" aria-label="생활습관 위험도 막대 그래프">
                    {lifestyleRiskDomains.map((axis) => (
                      <li key={`lifestyle-risk-${axis.id}`}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                          <span className="truncate pr-2">{axis.label}</span>
                          <span className="font-semibold text-rose-600">{axis.percent}점</span>
                        </div>
                        <div className="h-2 w-full rounded-sm bg-rose-100">
                          <div
                            className="h-2 rounded-none bg-gradient-to-r from-rose-400 to-red-600"
                            style={{ width: `${axis.percent}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">
                    종합 위험도:{" "}
                    <span className="font-semibold text-rose-600">{lifestyleOverall}점</span>
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:min-h-[220px] sm:flex sm:flex-col">
                  <p className="text-sm font-semibold text-slate-900">건강관리 위험도</p>
                  <div
                    className={`mt-3 ${centerNeedCardContent ? "sm:flex-1 sm:flex sm:flex-col sm:justify-center" : ""}`}
                  >
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
            <h3 className="text-lg font-bold text-slate-900">핵심 위험 하이라이트</h3>
            <p className="mt-1 text-xs text-slate-500">
              표기된 점수는 전체 위험도가 아니라 각 문항 응답 기준의 문항 위험도입니다.
            </p>
            {resultSummary.highRiskHighlights.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {resultSummary.highRiskHighlights.map((item, index) => {
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
                      <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                        <p className="text-xs font-semibold text-amber-700">권장안</p>
                        <p className="mt-0.5 text-sm text-amber-900">{item.action}</p>
                      </div>
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
                          <div className="mt-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-2">
                            <p className="text-xs font-semibold text-cyan-700">권장안</p>
                            <p className="mt-0.5 text-sm text-cyan-900">{item.text}</p>
                          </div>
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
                {resultSummary.supplementDesign.map((item) => (
                  <article
                    key={`supplement-${item.sectionId}`}
                    className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-3"
                  >
                    <p className="text-xs font-semibold text-indigo-700">
                      {sectionTitleMap.get(item.sectionId) ?? item.sectionId}
                    </p>
                    <h4 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h4>
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
                            >
                              추천 성분 · {nutrient.labelKo ?? nutrient.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
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

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={props.onEditSurvey}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99]"
        >
          {text.editSurvey}
        </button>
        <button
          type="button"
          onClick={props.onOpenEmployeeReport}
          data-testid="survey-result-open-employee-report"
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 hover:shadow-md active:scale-[0.99]"
        >
          {text.viewEmployeeReport}
        </button>
        <button
          type="button"
          onClick={props.onRestart}
          data-testid="survey-result-reset-button"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99]"
        >
          {text.restart}
        </button>
      </div>
    </div>
  );
}

