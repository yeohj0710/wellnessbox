"use client";

import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import { buildSurveyResultSummaryMetrics } from "@/app/survey/_lib/survey-result-summary";
import SurveyResultActionSection from "@/app/survey/_components/SurveyResultActionSection";
import SurveyResultSummaryCards from "@/app/survey/_components/SurveyResultSummaryCards";

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
    if (identity) seenIdentities.add(identity);
  }

  return picked;
}

function normalizeSupplementHeadingText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveHighlightCategoryLabel(
  category: WellnessComputedResult["highRiskHighlights"][number]["category"]
) {
  if (category === "common") return "공통";
  if (category === "detailed") return "상세";
  if (category === "domain") return "생활습관";
  return "영역";
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
  hideActionSection?: boolean;
}) {
  const { resultSummary, sectionTitleMap, text } = props;
  const highRiskHighlights = resultSummary
    ? dedupeSurveyHighRiskHighlights(resultSummary.highRiskHighlights)
    : [];
  const sectionAdviceEntries = resultSummary
    ? Object.entries(resultSummary.sectionAdvice).filter(([, value]) => value.items.length > 0)
    : [];
  const summaryMetrics = resultSummary ? buildSurveyResultSummaryMetrics(resultSummary) : null;

  return (
    <div
      data-testid="survey-result"
      className="mx-auto max-w-[840px] rounded-[26px] border border-sky-100/70 bg-white/82 p-5 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.38)] backdrop-blur sm:p-7"
    >
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{text.resultTitle}</h2>
      {resultSummary ? (
        <div className="mt-5 space-y-5">
          {summaryMetrics ? (
            <SurveyResultSummaryCards
              summaryMetrics={summaryMetrics}
              scoreHealthLabel={text.scoreHealth}
              scoreRiskLabel={text.scoreRisk}
            />
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-bold text-slate-900">주의가 필요한 문항 요약</h3>
            <p className="mt-1 text-xs text-slate-500">
              표기된 점수는 전체 위험도가 아니라 각 문항 응답 기준의 문항 위험도입니다.
            </p>
            {highRiskHighlights.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {highRiskHighlights.map((item, index) => (
                  <li
                    key={`risk-${item.category}-${item.title}-${index}`}
                    className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-rose-700">
                      {resolveHighlightCategoryLabel(item.category)} · 문항 위험도 {Math.round(item.score)}점
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
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">표시할 요약 문항이 없습니다.</p>
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
              {sectionAdviceEntries.length > 0 ? (
                sectionAdviceEntries.map(([sectionId, value]) => (
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
                ))
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  현재 응답 기준으로 표시할 영역별 분석 코멘트가 없습니다. 문항 응답을 추가로 작성하면 각
                  영역 코멘트가 자동으로 표시됩니다.
                </p>
              )}
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
                              >
                                {nutrient.labelKo ?? nutrient.label}
                              </span>
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
                현재 선택한 설문 결과에서 제안된 맞춤 설계가 없습니다.
              </p>
            )}
          </section>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          결과 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {!props.hideActionSection ? (
        <SurveyResultActionSection
          editSurveyLabel={text.editSurvey}
          restartLabel={text.restart}
          onEditSurvey={props.onEditSurvey}
          onRestart={props.onRestart}
        />
      ) : null}
    </div>
  );
}
