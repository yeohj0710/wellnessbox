"use client";

import styles from "../B2bUx.module.css";

type RiskCategory = "detailed" | "common" | "domain" | "section";

type RiskDetailLine = {
  key: string;
  category: RiskCategory;
  title: string;
  score: number;
  questionText: string;
  answerText: string;
  recommendation: string;
};

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
  paragraphs: string[];
  recommendedNutrients: string[];
};

function riskCategoryLabel(category: RiskCategory) {
  if (category === "common") return "공통";
  if (category === "detailed") return "상세";
  if (category === "domain") return "생활습관";
  return "영역";
}

export default function SurveyDetailPages(props: {
  combinedSurveyPageCount: number;
  surveyDetailPageStart: number;
  riskPages: RiskDetailLine[][];
  routinePages: string[][];
  sectionAdvicePageStart: number;
  sectionAdvicePages: SectionAdviceLine[][];
  supplementPageStart: number;
  supplementPages: SupplementRow[][];
}) {
  const {
    combinedSurveyPageCount,
    surveyDetailPageStart,
    riskPages,
    routinePages,
    sectionAdvicePageStart,
    sectionAdvicePages,
    supplementPageStart,
    supplementPages,
  } = props;

  return (
    <>
      {Array.from({ length: combinedSurveyPageCount }).map((_, pageIndex) => {
        const pageNumber = surveyDetailPageStart + pageIndex;
        const riskChunk = riskPages[pageIndex] ?? [];
        const routineChunk = routinePages[pageIndex] ?? [];
        return (
          <section
            key={`survey-detail-page-${pageNumber}`}
            className={styles.reportSheet}
            data-report-page={String(pageNumber)}
          >
            <header className={styles.reportPageHeader}>
              <p className={styles.reportPageKicker}>{`${pageNumber}페이지 상세 데이터`}</p>
              <h2 className={styles.reportPageTitle}>
                {pageIndex === 0 ? "설문 결과 상세" : "설문 결과 상세 (계속)"}
              </h2>
              <p className={styles.reportPageSubtitle}>
                설문에서 확인된 위험 신호와 생활습관 실천 가이드를 정리했습니다.
              </p>
            </header>

            <div className={styles.reportSecondStack}>
              <article className={styles.reportDataCard}>
                <h3 className={styles.reportDataTitle}>핵심 위험 하이라이트</h3>
                <p className={styles.reportDataEmpty}>
                  표기된 점수는 전체 위험도가 아니라 각 문항 응답 기준의 문항 위험도입니다.
                </p>
                {riskChunk.length === 0 ? (
                  <p className={styles.reportDataEmpty}>표시할 하이라이트가 없습니다.</p>
                ) : (
                  <ul className={styles.reportFriendlyList}>
                    {riskChunk.map((line) => (
                      <li
                        key={`risk-detail-${pageNumber}-${line.key}`}
                        className={styles.reportFriendlyItem}
                      >
                        <p className={styles.reportDataBody}>
                          <strong>
                            {riskCategoryLabel(line.category)} · 문항 위험도{" "}
                            {Math.round(line.score)}점
                          </strong>
                        </p>
                        <p className={styles.reportDataBody}>{line.questionText || line.title}</p>
                        <p className={styles.reportDataBody}>
                          <strong>내 답변:</strong> {line.answerText || "응답 정보 없음"}
                        </p>
                        <p className={styles.reportDataBody}>
                          <strong>권장안:</strong> {line.recommendation}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className={styles.reportDataCard}>
                <h3 className={styles.reportDataTitle}>생활습관 실천 가이드</h3>
                {routineChunk.length === 0 ? (
                  <p className={styles.reportDataEmpty}>추가 실천 가이드가 없습니다.</p>
                ) : (
                  <ul className={styles.reportFriendlyList}>
                    {routineChunk.map((line, lineIndex) => (
                      <li
                        key={`routine-${pageNumber}-${lineIndex}`}
                        className={styles.reportFriendlyItem}
                      >
                        <p className={styles.reportDataBody}>{line}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </section>
        );
      })}

      {sectionAdvicePages.map((rows, pageIndex) => {
        const pageNumber = sectionAdvicePageStart + pageIndex;
        return (
          <section
            key={`section-advice-page-${pageNumber}`}
            className={styles.reportSheet}
            data-report-page={String(pageNumber)}
          >
            <header className={styles.reportPageHeader}>
              <p className={styles.reportPageKicker}>{`${pageNumber}페이지 상세 데이터`}</p>
              <h2 className={styles.reportPageTitle}>
                {pageIndex === 0 ? "영역별 분석 코멘트" : "영역별 분석 코멘트 (계속)"}
              </h2>
              <p className={styles.reportPageSubtitle}>
                선택한 영역의 주요 문항, 내 답변, 권장안을 함께 확인할 수 있습니다.
              </p>
            </header>

            <article className={styles.reportDataCard}>
              {rows.length === 0 ? (
                <p className={styles.reportDataEmpty}>영역별 분석 코멘트가 없습니다.</p>
              ) : (
                <ul className={styles.reportFriendlyList}>
                  {rows.map((line) => (
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
                      <p className={styles.reportDataBody}>
                        <strong>권장안:</strong> {line.recommendation}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        );
      })}

      {supplementPages.map((rows, pageIndex) => {
        const pageNumber = supplementPageStart + pageIndex;
        return (
          <section
            key={`supplement-page-${pageNumber}`}
            className={styles.reportSheet}
            data-report-page={String(pageNumber)}
          >
            <header className={styles.reportPageHeader}>
              <p className={styles.reportPageKicker}>{`${pageNumber}페이지 상세 데이터`}</p>
              <h2 className={styles.reportPageTitle}>
                {pageIndex === 0 ? "맞춤 영양제 설계" : "맞춤 영양제 설계 (계속)"}
              </h2>
              <p className={styles.reportPageSubtitle}>
                설문 결과를 기반으로 우선순위가 높은 맞춤 영양 설계를 제공합니다.
              </p>
            </header>

            <article className={styles.reportDataCard}>
              {rows.length === 0 ? (
                <p className={styles.reportDataEmpty}>
                  현재 선택한 설문 결과에서 제안할 맞춤 설계가 없습니다.
                </p>
              ) : (
                <div className={styles.reportSecondStack}>
                  {rows.map((row, rowIndex) => (
                    <article
                      key={`supplement-${pageNumber}-${row.sectionId}-${rowIndex}`}
                      className={styles.reportDataCard}
                    >
                      <h3 className={styles.reportDataTitle}>
                        {row.sectionTitle} · {row.title}
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
              )}
            </article>
          </section>
        );
      })}
    </>
  );
}
