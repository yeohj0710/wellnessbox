"use client";

import styles from "../B2bUx.module.css";
import { groupSectionAdviceRows } from "./survey-detail-groups";

export type SectionAdviceLine = {
  key: string;
  sectionTitle: string;
  questionText: string;
  answerText: string;
  recommendation: string;
  continuation?: boolean;
};

export type SupplementRow = {
  sectionId: string;
  sectionTitle: string;
  title: string;
  showSectionTitle?: boolean;
  paragraphs: string[];
  recommendedNutrients: string[];
  continuation?: boolean;
};

export type SurveyDetailPageModel = {
  routineRows: string[];
  sectionAdviceRows: SectionAdviceLine[];
  supplementRows: SupplementRow[];
};

export function hasSurveyDetailPageContent(page: SurveyDetailPageModel) {
  return (
    page.routineRows.length > 0 ||
    page.sectionAdviceRows.length > 0 ||
    page.supplementRows.length > 0
  );
}

export function SurveyDetailCards(props: {
  page: SurveyDetailPageModel;
  pageNumber: number;
  showSectionAdviceEmpty?: boolean;
}) {
  const { page, pageNumber, showSectionAdviceEmpty = false } = props;
  const sectionAdviceGroups = groupSectionAdviceRows(page.sectionAdviceRows);
  const showSectionAdviceSection = sectionAdviceGroups.length > 0 || showSectionAdviceEmpty;

  return (
    <div className="space-y-4">
      {page.routineRows.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-bold text-slate-900">생활습관 실천 가이드</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {page.routineRows.map((line, lineIndex) => (
              <li
                key={`routine-${pageNumber}-${lineIndex}`}
                className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-emerald-700">실천 권장</p>
                <p className="mt-1 text-sm text-emerald-900">{line}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showSectionAdviceSection ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-bold text-slate-900">영역별 분석 코멘트</h3>
          {sectionAdviceGroups.length > 0 ? (
            <div className="mt-3 space-y-3">
              {sectionAdviceGroups.map((group, groupIndex) => (
                <article
                  key={`section-advice-group-${pageNumber}-${group.sectionTitle}-${groupIndex}`}
                  className="rounded-xl border border-sky-200/80 bg-sky-50/45 px-3 py-3"
                >
                  <p className="text-xs font-semibold text-sky-700">{group.sectionTitle}</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {group.items.map((line) => (
                      <li
                        key={`section-advice-${pageNumber}-${line.key}`}
                        className="rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-2"
                      >
                        {line.normalizedQuestionText ? (
                          <>
                            <p className="font-semibold text-slate-900">
                              {line.normalizedQuestionText}
                            </p>
                            <p className="mt-0.5 text-slate-700">
                              응답: {line.answerText || "-"}
                            </p>
                          </>
                        ) : null}
                        <p
                          className={`text-sm font-medium leading-relaxed text-rose-700 ${
                            line.normalizedQuestionText ? "mt-1.5" : ""
                          }`}
                        >
                          {line.recommendation}
                        </p>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              현재 응답 기준으로 표시할 영역별 분석 코멘트가 없습니다. 문항 응답 데이터가
              더 수집되면 각 영역별 코멘트가 자동으로 표시됩니다.
            </p>
          )}
        </section>
      ) : null}

      {page.supplementRows.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-bold text-slate-900">맞춤 영양제 설계</h3>
          <div className="mt-3 space-y-3">
            {page.supplementRows.map((row, rowIndex) => (
              <article
                key={`supplement-${pageNumber}-${row.sectionId}-${rowIndex}`}
                className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-3"
              >
                {row.showSectionTitle ? (
                  <p className="text-xs font-semibold text-indigo-700">{row.sectionTitle}</p>
                ) : null}
                <h4
                  className={`${row.showSectionTitle ? "mt-1" : "mt-0"} text-sm font-bold text-slate-900`}
                >
                  {row.title || row.sectionTitle}
                </h4>
                {row.paragraphs.length > 0 ? (
                  <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {row.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={`supplement-paragraph-${pageNumber}-${rowIndex}-${paragraphIndex}`}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}
                {row.recommendedNutrients.length > 0 ? (
                  <div className="mt-2 rounded-lg border border-indigo-200/80 bg-white/70 px-2.5 py-2">
                    <p className="text-xs font-semibold text-indigo-700">추천 영양소</p>
                    <p className="mt-0.5 text-[11px] text-indigo-600">
                      현재 결과 기준으로 우선 고려할 성분입니다.
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {row.recommendedNutrients.map((nutrient) => (
                        <span
                          key={`nutrient-${pageNumber}-${rowIndex}-${nutrient}`}
                          className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700"
                        >
                          {nutrient}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function SurveyDetailPages(props: {
  surveyDetailPageStart: number;
  surveyPages: SurveyDetailPageModel[];
  showSectionAdviceEmptyOnFirstPage?: boolean;
}) {
  const { surveyDetailPageStart, surveyPages, showSectionAdviceEmptyOnFirstPage = false } =
    props;

  if (surveyPages.length === 0) {
    return null;
  }

  return (
    <>
      {surveyPages.map((page, pageIndex) => {
        const pageNumber = surveyDetailPageStart + pageIndex;
        return (
          <section
            key={`survey-detail-page-${pageNumber}`}
            className={styles.reportSheet}
            data-report-page={String(pageNumber)}
          >
            <header className={styles.reportPageHeader}>
              <p className={styles.reportPageKicker}>{`${pageNumber}페이지 설문 결과`}</p>
              <h2 className={styles.reportPageTitle}>설문 결과</h2>
              <p className={styles.reportPageSubtitle}>
                생활습관 실천 가이드, 영역별 분석 코멘트, 맞춤 영양제 설계를 정리했습니다.
              </p>
            </header>

            <SurveyDetailCards
              page={page}
              pageNumber={pageNumber}
              showSectionAdviceEmpty={showSectionAdviceEmptyOnFirstPage && pageIndex === 0}
            />
          </section>
        );
      })}
    </>
  );
}
