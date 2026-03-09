"use client";

import styles from "../B2bUx.module.css";
import { clampPercent } from "./card-insights";
import {
  type ReportSummaryHealthPageProps,
  type ReportSummaryMedicationPageProps,
  type ReportSummaryOverviewPageProps,
} from "./page-contracts";
import { SurveyDetailCards } from "./SurveyDetailPages";

export function ReportSummaryOverviewPage(props: ReportSummaryOverviewPageProps) {
  const {
    donutRadius,
    donutCircumference,
    donutOffset,
    radarLevels,
    radarCenterX,
    radarCenterY,
    radarAxes,
    radarAreaPoints,
    resolvedHealthScore,
    lifestyleOverallText,
    sectionNeedsForPage1,
    healthNeedAverageText,
    hiddenSectionNeedCount,
    firstPageSurveyDetails,
    hasFirstPageSurveyContent,
    hasSectionAdviceContent,
    metaEmployeeName,
    metaPeriodKey,
    metaGeneratedAt,
    text,
  } = props;

  return (
    <section className={`${styles.reportSheet} ${styles.reportSheetFirst}`} data-report-page="1">
      <header className={styles.reportPageHeader}>
        <p className={styles.reportPageKicker}>{text.pageKicker}</p>
        <h2 className={styles.reportPageTitle}>{text.title}</h2>
        <p className={styles.reportPageSubtitle}>{text.subtitle}</p>
        <div className={styles.reportMetaRow}>
          <span className={styles.reportMetaItem}>
            {text.employeeLabel}: {metaEmployeeName}
          </span>
          <span className={styles.reportMetaItem}>
            {text.periodLabel}: {metaPeriodKey}
          </span>
          <span className={styles.reportMetaItem}>
            {text.generatedLabel}: {metaGeneratedAt}
          </span>
        </div>
      </header>

      <section className={styles.reportTopGrid}>
        <article className={styles.reportTopCard}>
          <div className={styles.reportTopHead}>
            <h3 className={styles.sectionTitle}>{text.scoreTitle}</h3>
          </div>
          <div className={styles.reportScoreStack}>
            <div className={styles.donutWrap}>
              <svg
                viewBox="0 0 140 140"
                className={styles.donutSvg}
                role="img"
                aria-label={text.scoreAriaLabel}
              >
                <circle cx="70" cy="70" r={donutRadius} className={styles.donutTrack} />
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  className={styles.donutProgress}
                  style={{
                    strokeDasharray: donutCircumference,
                    strokeDashoffset: donutOffset,
                  }}
                />
              </svg>
              <div className={styles.donutCenter}>
                <strong>
                  <span className={styles.scoreValue}>{resolvedHealthScore.valueText}</span>
                  {resolvedHealthScore.unitText ? (
                    <span className={styles.scoreUnit}>{resolvedHealthScore.unitText}</span>
                  ) : null}
                </strong>
              </div>
            </div>
            <p className={styles.reportFormula}>{text.scoreFormula}</p>
          </div>
        </article>

        <article className={styles.reportTopCard}>
          <div className={styles.reportTopHead}>
            <h3 className={styles.sectionTitle}>{text.lifestyleRiskTitle}</h3>
          </div>
          <div className={styles.radarWrap}>
            <svg
              viewBox="0 0 240 210"
              className={styles.radarSvg}
              role="img"
              aria-label={text.lifestyleRiskAriaLabel}
            >
              {radarLevels.map((level) => {
                const levelPoints = radarAxes
                  .map((axis) => ({
                    x: radarCenterX + (axis.outerX - radarCenterX) * level,
                    y: radarCenterY + (axis.outerY - radarCenterY) * level,
                  }))
                  .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
                  .join(" ");

                return (
                  <polygon
                    key={`radar-level-${level}`}
                    className={styles.radarGrid}
                    points={levelPoints}
                  />
                );
              })}
              {radarAxes.map((axis) => (
                <line
                  key={`radar-axis-${axis.id}`}
                  className={styles.radarAxis}
                  x1={radarCenterX}
                  y1={radarCenterY}
                  x2={axis.outerX}
                  y2={axis.outerY}
                />
              ))}
              <polygon className={styles.radarArea} points={radarAreaPoints} />
              {radarAxes.map((axis) => (
                <circle
                  key={`radar-point-${axis.id}`}
                  className={styles.radarPoint}
                  cx={axis.valueX}
                  cy={axis.valueY}
                  r={3}
                />
              ))}
              {radarAxes.map((axis) => (
                <text
                  key={`radar-label-${axis.id}`}
                  className={styles.radarLabel}
                  x={axis.labelX}
                  y={axis.labelY}
                  textAnchor={axis.labelAnchor}
                  dominantBaseline="central"
                >
                  {axis.labelLines.map((labelLine, lineIndex) => (
                    <tspan
                      key={`radar-label-line-${axis.id}-${lineIndex}`}
                      x={axis.labelX}
                      dy={lineIndex === 0 ? "-0.35em" : "1.1em"}
                    >
                      {labelLine}
                    </tspan>
                  ))}
                  <tspan x={axis.labelX} dy="1.15em" className={styles.radarScoreLabel}>
                    {axis.scoreText}
                  </tspan>
                </text>
              ))}
            </svg>
          </div>
          <p className={styles.inlineHint}>
            {text.lifestyleRiskOverallLabel} <span className={styles.riskScoreText}>{lifestyleOverallText}</span>
          </p>
        </article>

        <article className={`${styles.reportTopCard} ${styles.reportTopCardNeed}`}>
          <div className={styles.reportTopHead}>
            <h3 className={styles.sectionTitle}>{text.healthNeedTitle}</h3>
          </div>
          <div className={styles.needCardContent}>
            {sectionNeedsForPage1.length === 0 ? (
              <p className={styles.inlineHint}>{text.healthNeedEmpty}</p>
            ) : (
              <ul className={styles.needList}>
                {sectionNeedsForPage1.map((section) => (
                  <li key={`need-${section.sectionId}`} className={styles.needRow}>
                    <div className={styles.needHead}>
                      <span>{section.sectionTitle}</span>
                      <strong>{section.percentText}</strong>
                    </div>
                    <div className={styles.needTrack}>
                      <div
                        className={styles.needFill}
                        style={{ width: `${clampPercent(section.percent)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.inlineHint}>
              {text.healthNeedAverageLabel}{" "}
              <span className={styles.riskScoreText}>{healthNeedAverageText}</span>
            </p>
            {hiddenSectionNeedCount > 0 ? (
              <p className={styles.inlineHint}>
                {text.healthNeedMoreLabel.replace("{count}", String(hiddenSectionNeedCount))}
              </p>
            ) : null}
          </div>
        </article>
      </section>

      {hasFirstPageSurveyContent ? (
        <SurveyDetailCards
          page={firstPageSurveyDetails}
          pageNumber={1}
          showSectionAdviceEmpty={!hasSectionAdviceContent}
        />
      ) : null}
    </section>
  );
}

export function ReportSummaryHealthPage(props: ReportSummaryHealthPageProps) {
  const { pageNumber, healthMetrics, healthInsightEmptyMessage, text } = props;

  return (
    <section
      className={`${styles.reportSheet} ${styles.reportSheetSecond}`}
      data-report-page={String(pageNumber)}
    >
      <header className={styles.reportPageHeader}>
        <p className={styles.reportPageKicker}>{text.pageKicker.replace("{page}", String(pageNumber))}</p>
        <h2 className={styles.reportPageTitle}>{text.title}</h2>
        <p className={styles.reportPageSubtitle}>{text.subtitle}</p>
      </header>

      <div className={styles.reportSecondStack}>
        <article className={styles.reportDataCard}>
          <div className={styles.reportDataHeadRow}>
            <h3 className={styles.reportDataTitle}>{text.metricsTitle}</h3>
          </div>
          {healthMetrics.length === 0 ? (
            <p className={styles.reportDataEmpty}>{text.metricsEmpty}</p>
          ) : (
            <ul className={styles.reportMetricGrid}>
              {healthMetrics.map((metric, index) => (
                <li key={`metric-${index}`} className={styles.reportMetricItem}>
                  <div className={styles.reportMetricHead}>
                    <span className={styles.reportMetricLabel}>{metric.label}</span>
                    <span className={styles.reportInsightBadge}>{metric.statusLabel}</span>
                  </div>
                  <span className={styles.reportMetricValue}>{metric.value}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={styles.reportDataCard}>
          <h3 className={styles.reportDataTitle}>{text.insightTitle}</h3>
          <p className={styles.reportDataEmpty}>{healthInsightEmptyMessage}</p>
        </article>
      </div>
    </section>
  );
}

export function ReportSummaryMedicationPage(props: ReportSummaryMedicationPageProps) {
  const {
    pageNumber,
    medications,
    medicationStatusMessage,
    pharmacistSummary,
    pharmacistRecommendations,
    pharmacistCautions,
    viewerMode,
    metaGeneratedAt,
    metaEmployeeName,
    metaPeriodKey,
    metaIsMockData,
    buildMedicationMetaLine: formatMedicationMeta,
    text,
  } = props;

  return (
    <section
      className={`${styles.reportSheet} ${styles.reportSheetThird}`}
      data-report-page={String(pageNumber)}
    >
      <header className={styles.reportPageHeader}>
        <p className={styles.reportPageKicker}>{text.pageKicker.replace("{page}", String(pageNumber))}</p>
        <h2 className={styles.reportPageTitle}>{text.title}</h2>
        <p className={styles.reportPageSubtitle}>{text.subtitle}</p>
      </header>

      <div className={styles.reportSecondStack}>
        <article className={styles.reportDataCard}>
          <div className={styles.reportDataHeadRow}>
            <h3 className={styles.reportDataTitle}>{text.medicationTitle}</h3>
          </div>
          {medicationStatusMessage ? (
            <p className={styles.reportBlockLead}>{medicationStatusMessage}</p>
          ) : null}
          {medications.length === 0 ? (
            <p className={styles.reportDataEmpty}>{text.medicationEmpty}</p>
          ) : (
            <ul className={styles.reportMedicationList}>
              {medications.map((medication, index) => (
                <li key={`medication-${index}`} className={styles.reportMedicationItem}>
                  <p className={styles.reportMedicationName}>{medication.medicationName}</p>
                  <p className={styles.reportMedicationMeta}>
                    {formatMedicationMeta({
                      date: medication.date,
                      hospitalName: medication.hospitalName,
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={styles.reportDataCard}>
          <h3 className={styles.reportDataTitle}>{text.pharmacistTitle}</h3>
          {pharmacistSummary ? (
            <p className={styles.reportBlockLead}>{pharmacistSummary}</p>
          ) : (
            <p className={styles.reportDataEmpty}>{text.pharmacistEmpty}</p>
          )}
          {pharmacistRecommendations ? (
            <p className={styles.reportDataBody}>
              <strong>{text.recommendationLabel}</strong> {pharmacistRecommendations}
            </p>
          ) : null}
          {pharmacistCautions ? (
            <p className={styles.reportDataBody}>
              <strong>{text.cautionLabel}</strong> {pharmacistCautions}
            </p>
          ) : null}
        </article>
      </div>

      <section className={styles.metaFooter}>
        {viewerMode === "admin" ? (
          <>
            {text.generatedLabel}: {metaGeneratedAt} / {text.employeeLabel}: {metaEmployeeName} / {text.periodLabel}:{" "}
            {metaPeriodKey}
            {metaIsMockData ? text.mockSuffix : ""}
          </>
        ) : (
          <>
            {text.employeeLabel}: {metaEmployeeName} / {text.periodLabel}: {metaPeriodKey}
          </>
        )}
      </section>
    </section>
  );
}
