"use client";

import styles from "../B2bUx.module.css";

type SectionAdviceLine = {
  key: string;
  sectionTitle: string;
  questionText: string;
  answerText: string;
  recommendation: string;
};

type SupplementRow = {
  sectionId: string;
  sectionTitle: string;
  title: string;
  showSectionTitle?: boolean;
  paragraphs: string[];
  recommendedNutrients: string[];
};

type SurveyDetailPageModel = {
  routineRows: string[];
  sectionAdviceRows: SectionAdviceLine[];
  supplementRows: SupplementRow[];
};

export default function SurveyDetailPages(props: {
  surveyDetailPageStart: number;
  surveyPages: SurveyDetailPageModel[];
}) {
  const { surveyDetailPageStart, surveyPages } = props;

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
              <h2 className={styles.reportPageTitle}>
                {pageIndex === 0 ? "설문 결과" : "설문 결과 (계속)"}
              </h2>
              <p className={styles.reportPageSubtitle}>
                생활습관 실천 가이드, 영역별 분석 코멘트, 맞춤 영양제 설계를 정리했습니다.
              </p>
            </header>

            <div className={styles.reportSecondStack}>
              {page.routineRows.length > 0 ? (
                <article className={styles.reportDataCard}>
                  <h3 className={styles.reportDataTitle}>생활습관 실천 가이드</h3>
                  <ul className={styles.reportFriendlyList}>
                    {page.routineRows.map((line, lineIndex) => (
                      <li
                        key={`routine-${pageNumber}-${lineIndex}`}
                        className={styles.reportFriendlyItem}
                      >
                        <p className={styles.reportDataBody}>{line}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {page.sectionAdviceRows.length > 0 ? (
                <article className={styles.reportDataCard}>
                  <h3 className={styles.reportDataTitle}>영역별 분석 코멘트</h3>
                  <ul className={styles.reportFriendlyList}>
                    {page.sectionAdviceRows.map((line) => (
                      <li
                        key={`section-advice-${pageNumber}-${line.key}`}
                        className={styles.reportFriendlyItem}
                      >
                        <p className={styles.reportDataBody}>
                          <strong>{line.sectionTitle}</strong> · {line.questionText}
                        </p>
                        <p className={styles.reportDataBody}>
                          <strong>내 답변:</strong> {line.answerText || "-"}
                        </p>
                        <p className={styles.reportRecommendation}>{line.recommendation}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {page.supplementRows.length > 0 ? (
                <article className={styles.reportDataCard}>
                  <h3 className={styles.reportDataTitle}>맞춤 영양제 설계</h3>
                  <div className={styles.reportSecondStack}>
                    {page.supplementRows.map((row, rowIndex) => (
                      <article
                        key={`supplement-${pageNumber}-${row.sectionId}-${rowIndex}`}
                        className={styles.reportDataCard}
                      >
                        <h3 className={styles.reportDataTitle}>
                          {row.showSectionTitle
                            ? `${row.sectionTitle} · ${row.title}`
                            : row.title || row.sectionTitle}
                        </h3>
                        {row.paragraphs.length > 0 ? (
                          <div className={styles.reportSecondStack}>
                            {row.paragraphs.map((paragraph, paragraphIndex) => (
                              <p
                                key={`supplement-paragraph-${pageNumber}-${rowIndex}-${paragraphIndex}`}
                                className={styles.reportDataBody}
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
                              현재 결과 기준으로 우선 고려할 성분입니다.
                            </p>
                            <div className={styles.reportNutrientTags}>
                              {row.recommendedNutrients.map((nutrient) => (
                                <span
                                  key={`nutrient-${pageNumber}-${rowIndex}-${nutrient}`}
                                  className={styles.reportNutrientTag}
                                >
                                  추천 성분 · {nutrient}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        );
      })}
    </>
  );
}
