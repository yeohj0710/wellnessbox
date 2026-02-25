import assert from "node:assert/strict";
import { resolveReportScores } from "../../lib/b2b/report-score-engine";

function run() {
  const summaryPreferred = resolveReportScores({
    analysisSummary: {
      overallScore: 78,
      surveyScore: 82,
      healthScore: 74,
      medicationScore: 69,
      riskLevel: "medium",
    },
  });

  assert.equal(summaryPreferred.summary.overallScore, 78);
  assert.equal(summaryPreferred.summary.surveyScore, 82);
  assert.equal(summaryPreferred.summary.healthScore, 74);
  assert.equal(summaryPreferred.summary.medicationScore, 69);
  assert.equal(summaryPreferred.summary.riskLevel, "medium");
  assert.equal(summaryPreferred.details.overall.status, "computed");
  assert.equal(summaryPreferred.hasAnyScore, true);

  const fallbackEstimated = resolveReportScores({
    surveySectionScores: [
      { score: 40, questionCount: 2 },
      { score: 80, questionCount: 8 },
    ],
    healthCoreMetrics: [{ status: "normal" }, { status: "high" }],
    medicationStatusType: "none",
    medicationCount: 0,
  });

  assert.equal(fallbackEstimated.summary.surveyScore, 72);
  assert.equal(fallbackEstimated.summary.healthScore, 60);
  assert.equal(fallbackEstimated.summary.medicationScore, 60);
  assert.equal(fallbackEstimated.summary.overallScore, 66);
  assert.equal(fallbackEstimated.summary.riskLevel, "medium");
  assert.equal(fallbackEstimated.details.overall.status, "estimated");
  assert.equal(fallbackEstimated.details.survey.source, "survey_sections");
  assert.equal(fallbackEstimated.details.health.source, "health_metrics");
  assert.equal(fallbackEstimated.details.medication.source, "medication_status");

  const missingAll = resolveReportScores({
    surveySectionScores: [],
    healthCoreMetrics: [],
    medicationStatusType: "unknown",
  });

  assert.equal(missingAll.summary.overallScore, null);
  assert.equal(missingAll.summary.surveyScore, null);
  assert.equal(missingAll.summary.healthScore, null);
  assert.equal(missingAll.summary.medicationScore, null);
  assert.equal(missingAll.summary.riskLevel, "unknown");
  assert.equal(missingAll.details.overall.status, "missing");
  assert.equal(missingAll.details.survey.status, "missing");
  assert.equal(missingAll.details.health.status, "missing");
  assert.equal(missingAll.details.medication.status, "missing");
  assert.equal(missingAll.hasAnyScore, false);

  const fetchFailedMedication = resolveReportScores({
    analysisSummary: {
      riskLevel: "high",
    },
    surveySectionScores: [{ score: 90, questionCount: 1 }],
    healthCoreMetrics: [{ status: "normal" }],
    medicationStatusType: "fetch_failed",
  });

  assert.equal(fetchFailedMedication.details.medication.status, "missing");
  assert.equal(fetchFailedMedication.summary.riskLevel, "high");
  assert.equal(fetchFailedMedication.hasAnyScore, true);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "analysis_summary_preferred",
          "fallback_estimation",
          "missing_data_safe",
          "medication_fetch_failed",
        ],
      },
      null,
      2
    )
  );
}

run();
