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
    <div className={styles.reportSecondStack}>
      {page.routineRows.length > 0 ? (
        <article className={styles.reportDataCard}>
          <div className={styles.reportDataHeadRow}>
            <h3 className={styles.reportDataTitle}>생활습관 실천 가이드</h3>
            <span className={styles.reportInsightBadge}>
              체크포인트 {page.routineRows.length}개
            </span>
          </div>

          <ul className={styles.reportRoutineList}>
            {page.routineRows.map((line, lineIndex) => (
              <li key={`routine-${pageNumber}-${lineIndex}`} className={styles.reportRoutineItem}>
                {line}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {showSectionAdviceSection ? (
        <article className={styles.reportDataCard}>
          <div className={styles.reportDataHeadRow}>
            <h3 className={styles.reportDataTitle}>영역별 분석 코멘트</h3>
            {sectionAdviceGroups.length > 0 ? (
              <span className={styles.reportInsightBadge}>
                분석 영역 {sectionAdviceGroups.length}개
              </span>
            ) : null}
          </div>

          {sectionAdviceGroups.length > 0 ? (
            <div className={styles.reportAdviceGroupList}>
              {sectionAdviceGroups.map((group, groupIndex) => (
                <section
                  key={`section-advice-group-${pageNumber}-${group.sectionTitle}-${groupIndex}`}
                  className={styles.reportAdviceGroup}
                >
                  <div className={styles.reportAdviceGroupHeader}>
                    <p className={styles.reportAdviceGroupTitle}>{group.sectionTitle}</p>
                    <span className={styles.reportMetaItem}>{group.items.length}개 문항</span>
                  </div>

                  <ul className={styles.reportAdviceEntryList}>
                    {group.items.map((line) => (
                      <li
                        key={`section-advice-${pageNumber}-${line.key}`}
                        className={styles.reportAdviceEntry}
                      >
                        {line.normalizedQuestionText ? (
                          <>
                            <p className={styles.reportAdviceQuestion}>
                              {line.normalizedQuestionText}
                            </p>
                            <p className={styles.reportAdviceAnswer}>
                              응답: {line.answerText || "-"}
                            </p>
                          </>
                        ) : null}

                        <p className={styles.reportAdviceRecommendation}>
                          {line.recommendation}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className={styles.reportDataEmpty}>
              현재 응답 기준으로 표시할 영역별 분석 코멘트가 없습니다. 문항 응답 데이터가 더
              수집되면 맞춤 코멘트가 자동으로 반영됩니다.
            </p>
          )}
        </article>
      ) : null}

      {page.supplementRows.length > 0 ? (
        <article className={styles.reportDataCard}>
          <div className={styles.reportDataHeadRow}>
            <h3 className={styles.reportDataTitle}>맞춤 영양 설계</h3>
            <span className={styles.reportInsightBadge}>
              제안 {page.supplementRows.length}개
            </span>
          </div>

          <div className={styles.reportSupplementList}>
            {page.supplementRows.map((row, rowIndex) => (
              <section
                key={`supplement-${pageNumber}-${row.sectionId}-${rowIndex}`}
                className={styles.reportSupplementCard}
              >
                {row.showSectionTitle ? (
                  <p className={styles.reportSupplementEyebrow}>{row.sectionTitle}</p>
                ) : null}

                <h4 className={styles.reportSupplementTitle}>
                  {row.title || row.sectionTitle}
                </h4>

                {row.paragraphs.length > 0 ? (
                  <div className={styles.reportSupplementParagraphs}>
                    {row.paragraphs.map((paragraph, paragraphIndex) => (
                      <p
                        key={`supplement-paragraph-${pageNumber}-${rowIndex}-${paragraphIndex}`}
                        className={styles.reportSupplementParagraph}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}

                {row.recommendedNutrients.length > 0 ? (
                  <div className={styles.reportNutrientPanel}>
                    <p className={styles.reportNutrientTitle}>추천 영양소</p>
                    <p className={styles.reportNutrientHint}>
                      현재 결과 기준으로 우선 고려할 성분을 정리했습니다.
                    </p>
                    <div className={styles.reportNutrientTags}>
                      {row.recommendedNutrients.map((nutrient) => (
                        <span
                          key={`nutrient-${pageNumber}-${rowIndex}-${nutrient}`}
                          className={styles.reportNutrientTag}
                        >
                          {nutrient}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </article>
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
                생활습관 실천 가이드와 영역별 분석 코멘트를 한 페이지 흐름 안에서 읽기 쉽게
                정리했습니다.
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
