import fs from "node:fs";
import path from "node:path";
import { MODULE03_ADVERSE_EVENT_MIN_WINDOW_COVERAGE_DAYS } from "../../lib/rnd/module03-personal-safety/evaluation";
import type { TrainAllAiResult } from "../../lib/rnd/ai-training/pipeline";

export const KPI_TARGETS = {
  recommendationAccuracyPercent: 80,
  efficacyScgiPp: 0,
  actionAccuracyPercent: 80,
  llmAccuracyPercent: 91,
  referenceAccuracyPercent: 95,
  adverseEventCountPerYearMax: 5,
  integrationRatePercent: 90,
} as const;

export const KPI_WEIGHTS = {
  recommendationAccuracyPercent: 20,
  efficacyScgiPp: 20,
  actionAccuracyPercent: 20,
  llmAccuracyPercent: 20,
  referenceAccuracyPercent: 10,
  adverseEventCountPerYear: 5,
  integrationRatePercent: 5,
} as const;

export const KPI_STABILITY_THRESHOLDS = {
  recommendationAccuracyPercent: 85,
  efficacyScgiPp: 5,
  actionAccuracyPercent: 85,
  llmAccuracyPercent: 94,
  referenceAccuracyPercent: 97,
  adverseEventCountPerYearMax: 4,
  integrationRatePercent: 92,
} as const;

export type KpiStabilityReport = {
  recommendationAccuracySatisfied: boolean;
  efficacyScgiSatisfied: boolean;
  actionAccuracySatisfied: boolean;
  llmAccuracySatisfied: boolean;
  referenceAccuracySatisfied: boolean;
  adverseEventCountSatisfied: boolean;
  integrationRateSatisfied: boolean;
  allSatisfied: boolean;
};

export type CoverageCheck = {
  id: string;
  slideRange: string;
  description: string;
  satisfied: boolean;
  evidence: Record<string, unknown>;
};

export type WeightedKpiItem = {
  id: "kpi01" | "kpi02" | "kpi03" | "kpi04" | "kpi05" | "kpi06" | "kpi07";
  label: string;
  weightPercent: number;
  measuredValue: number;
  unit: "%" | "pp" | "count/year";
  targetDescription: string;
  targetSatisfied: boolean;
  weightedPassContributionPercent: number;
  weightedObjectiveContribution: number;
  slideFormula: string;
};

export type DataRequirementItem = {
  id: string;
  slideRange: string;
  requirement: string;
  measuredValue: number | boolean;
  targetDescription: string;
  satisfied: boolean;
  evidence?: Record<string, unknown>;
};

export type SlideEvidenceItem = {
  slideRange: string;
  title: string;
  objective: string;
  linkedCheckIds: string[];
  linkedDataRequirementIds: string[];
  linkedKpiIds: Array<WeightedKpiItem["id"]>;
  satisfied: boolean;
  evidence: {
    checks: CoverageCheck[];
    dataRequirements: DataRequirementItem[];
    kpis: WeightedKpiItem[];
    notes?: Record<string, unknown>;
  };
};

export type ImplementationCoverageReport = {
  allSatisfied: boolean;
  checks: CoverageCheck[];
};

export type DataRequirementMatrix = {
  allSatisfied: boolean;
  items: DataRequirementItem[];
};

export type SlideEvidenceMap = {
  allSatisfied: boolean;
  items: SlideEvidenceItem[];
};

export type WeightedScoreSummary = {
  weightedPassScorePercent: number;
  weightedObjectiveScore: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function positiveImprovementObjectiveRate(efficacyScgiPp: number): number {
  if (efficacyScgiPp > 0) {
    return 1 + clamp(efficacyScgiPp / 20, 0, 1.5);
  }
  return clamp(efficacyScgiPp / 10, -1, 0);
}

export function buildKpiStabilityReport(
  kpi: TrainAllAiResult["kpi"]
): KpiStabilityReport {
  const recommendationAccuracySatisfied =
    kpi.recommendationAccuracyPercent >=
    KPI_STABILITY_THRESHOLDS.recommendationAccuracyPercent;
  const efficacyScgiSatisfied =
    kpi.efficacyScgiPp >= KPI_STABILITY_THRESHOLDS.efficacyScgiPp;
  const actionAccuracySatisfied =
    kpi.actionAccuracyPercent >= KPI_STABILITY_THRESHOLDS.actionAccuracyPercent;
  const llmAccuracySatisfied =
    kpi.llmAccuracyPercent >= KPI_STABILITY_THRESHOLDS.llmAccuracyPercent;
  const referenceAccuracySatisfied =
    kpi.referenceAccuracyPercent >=
    KPI_STABILITY_THRESHOLDS.referenceAccuracyPercent;
  const adverseEventCountSatisfied =
    kpi.adverseEventCountPerYear <=
    KPI_STABILITY_THRESHOLDS.adverseEventCountPerYearMax;
  const integrationRateSatisfied =
    kpi.integrationRatePercent >= KPI_STABILITY_THRESHOLDS.integrationRatePercent;

  return {
    recommendationAccuracySatisfied,
    efficacyScgiSatisfied,
    actionAccuracySatisfied,
    llmAccuracySatisfied,
    referenceAccuracySatisfied,
    adverseEventCountSatisfied,
    integrationRateSatisfied,
    allSatisfied:
      recommendationAccuracySatisfied &&
      efficacyScgiSatisfied &&
      actionAccuracySatisfied &&
      llmAccuracySatisfied &&
      referenceAccuracySatisfied &&
      adverseEventCountSatisfied &&
      integrationRateSatisfied,
  };
}

export function computeWeightedScores(
  kpi: TrainAllAiResult["kpi"]
): WeightedScoreSummary {
  const recommendationPassRate = clamp(
    kpi.recommendationAccuracyPercent /
      KPI_TARGETS.recommendationAccuracyPercent,
    0,
    1
  );
  const efficacyPassRate = kpi.efficacyScgiPp > KPI_TARGETS.efficacyScgiPp ? 1 : 0;
  const actionPassRate = clamp(
    kpi.actionAccuracyPercent / KPI_TARGETS.actionAccuracyPercent,
    0,
    1
  );
  const llmPassRate = clamp(
    kpi.llmAccuracyPercent / KPI_TARGETS.llmAccuracyPercent,
    0,
    1
  );
  const referencePassRate = clamp(
    kpi.referenceAccuracyPercent / KPI_TARGETS.referenceAccuracyPercent,
    0,
    1
  );
  const adversePassRate = clamp(
    KPI_TARGETS.adverseEventCountPerYearMax /
      Math.max(kpi.adverseEventCountPerYear, 1),
    0,
    1
  );
  const integrationPassRate = clamp(
    kpi.integrationRatePercent / KPI_TARGETS.integrationRatePercent,
    0,
    1
  );

  const weightedPassScorePercent = roundTo(
    recommendationPassRate * KPI_WEIGHTS.recommendationAccuracyPercent +
      efficacyPassRate * KPI_WEIGHTS.efficacyScgiPp +
      actionPassRate * KPI_WEIGHTS.actionAccuracyPercent +
      llmPassRate * KPI_WEIGHTS.llmAccuracyPercent +
      referencePassRate * KPI_WEIGHTS.referenceAccuracyPercent +
      adversePassRate * KPI_WEIGHTS.adverseEventCountPerYear +
      integrationPassRate * KPI_WEIGHTS.integrationRatePercent,
    2
  );

  const recommendationObjectiveRate =
    kpi.recommendationAccuracyPercent /
    KPI_TARGETS.recommendationAccuracyPercent;
  const efficacyObjectiveRate = positiveImprovementObjectiveRate(
    kpi.efficacyScgiPp
  );
  const actionObjectiveRate =
    kpi.actionAccuracyPercent / KPI_TARGETS.actionAccuracyPercent;
  const llmObjectiveRate =
    kpi.llmAccuracyPercent / KPI_TARGETS.llmAccuracyPercent;
  const referenceObjectiveRate =
    kpi.referenceAccuracyPercent / KPI_TARGETS.referenceAccuracyPercent;
  const adverseObjectiveRate = clamp(
    KPI_TARGETS.adverseEventCountPerYearMax /
      Math.max(kpi.adverseEventCountPerYear, 1),
    0,
    2
  );
  const integrationObjectiveRate =
    kpi.integrationRatePercent / KPI_TARGETS.integrationRatePercent;

  const weightedObjectiveScore = roundTo(
    recommendationObjectiveRate * KPI_WEIGHTS.recommendationAccuracyPercent +
      efficacyObjectiveRate * KPI_WEIGHTS.efficacyScgiPp +
      actionObjectiveRate * KPI_WEIGHTS.actionAccuracyPercent +
      llmObjectiveRate * KPI_WEIGHTS.llmAccuracyPercent +
      referenceObjectiveRate * KPI_WEIGHTS.referenceAccuracyPercent +
      adverseObjectiveRate * KPI_WEIGHTS.adverseEventCountPerYear +
      integrationObjectiveRate * KPI_WEIGHTS.integrationRatePercent,
    4
  );

  return {
    weightedPassScorePercent,
    weightedObjectiveScore,
  };
}

export function buildWeightedKpiItems(
  kpi: TrainAllAiResult["kpi"]
): WeightedKpiItem[] {
  const recommendationPassRate = clamp(
    kpi.recommendationAccuracyPercent /
      KPI_TARGETS.recommendationAccuracyPercent,
    0,
    1
  );
  const efficacyPassRate = kpi.efficacyScgiPp > KPI_TARGETS.efficacyScgiPp ? 1 : 0;
  const actionPassRate = clamp(
    kpi.actionAccuracyPercent / KPI_TARGETS.actionAccuracyPercent,
    0,
    1
  );
  const llmPassRate = clamp(
    kpi.llmAccuracyPercent / KPI_TARGETS.llmAccuracyPercent,
    0,
    1
  );
  const referencePassRate = clamp(
    kpi.referenceAccuracyPercent / KPI_TARGETS.referenceAccuracyPercent,
    0,
    1
  );
  const adversePassRate = clamp(
    KPI_TARGETS.adverseEventCountPerYearMax /
      Math.max(kpi.adverseEventCountPerYear, 1),
    0,
    1
  );
  const integrationPassRate = clamp(
    kpi.integrationRatePercent / KPI_TARGETS.integrationRatePercent,
    0,
    1
  );

  const recommendationObjectiveRate =
    kpi.recommendationAccuracyPercent /
    KPI_TARGETS.recommendationAccuracyPercent;
  const efficacyObjectiveRate = positiveImprovementObjectiveRate(
    kpi.efficacyScgiPp
  );
  const actionObjectiveRate =
    kpi.actionAccuracyPercent / KPI_TARGETS.actionAccuracyPercent;
  const llmObjectiveRate =
    kpi.llmAccuracyPercent / KPI_TARGETS.llmAccuracyPercent;
  const referenceObjectiveRate =
    kpi.referenceAccuracyPercent / KPI_TARGETS.referenceAccuracyPercent;
  const adverseObjectiveRate = clamp(
    KPI_TARGETS.adverseEventCountPerYearMax /
      Math.max(kpi.adverseEventCountPerYear, 1),
    0,
    2
  );
  const integrationObjectiveRate =
    kpi.integrationRatePercent / KPI_TARGETS.integrationRatePercent;

  return [
    {
      id: "kpi01",
      label: "Health Supplement Recommendation Accuracy",
      weightPercent: KPI_WEIGHTS.recommendationAccuracyPercent,
      measuredValue: kpi.recommendationAccuracyPercent,
      unit: "%",
      targetDescription: ">= 80%",
      targetSatisfied:
        kpi.recommendationAccuracyPercent >=
        KPI_TARGETS.recommendationAccuracyPercent,
      weightedPassContributionPercent: roundTo(
        recommendationPassRate * KPI_WEIGHTS.recommendationAccuracyPercent,
        2
      ),
      weightedObjectiveContribution: roundTo(
        recommendationObjectiveRate * KPI_WEIGHTS.recommendationAccuracyPercent,
        4
      ),
      slideFormula: "Score = (1/N) * sum_i 100 * |R_i intersect Gamma_i| / |R_i|",
    },
    {
      id: "kpi02",
      label: "Measured Efficacy Improvement",
      weightPercent: KPI_WEIGHTS.efficacyScgiPp,
      measuredValue: kpi.efficacyScgiPp,
      unit: "pp",
      targetDescription: "> 0pp",
      targetSatisfied: kpi.efficacyScgiPp > KPI_TARGETS.efficacyScgiPp,
      weightedPassContributionPercent: roundTo(
        efficacyPassRate * KPI_WEIGHTS.efficacyScgiPp,
        2
      ),
      weightedObjectiveContribution: roundTo(
        efficacyObjectiveRate * KPI_WEIGHTS.efficacyScgiPp,
        4
      ),
      slideFormula: "SCGI = (1/N) * sum_i 100 * (Phi(z_post,i) - Phi(z_pre,i))",
    },
    {
      id: "kpi03",
      label: "Closed-loop Next-action Accuracy",
      weightPercent: KPI_WEIGHTS.actionAccuracyPercent,
      measuredValue: kpi.actionAccuracyPercent,
      unit: "%",
      targetDescription: ">= 80%",
      targetSatisfied:
        kpi.actionAccuracyPercent >= KPI_TARGETS.actionAccuracyPercent,
      weightedPassContributionPercent: roundTo(
        actionPassRate * KPI_WEIGHTS.actionAccuracyPercent,
        2
      ),
      weightedObjectiveContribution: roundTo(
        actionObjectiveRate * KPI_WEIGHTS.actionAccuracyPercent,
        4
      ),
      slideFormula:
        "Accuracy = 100 * sum_s I(a_s = a*_s and e_s = 1) / |S|",
    },
    {
      id: "kpi04",
      label: "Conversational LLM Answer Accuracy",
      weightPercent: KPI_WEIGHTS.llmAccuracyPercent,
      measuredValue: kpi.llmAccuracyPercent,
      unit: "%",
      targetDescription: ">= 91%",
      targetSatisfied: kpi.llmAccuracyPercent >= KPI_TARGETS.llmAccuracyPercent,
      weightedPassContributionPercent: roundTo(
        llmPassRate * KPI_WEIGHTS.llmAccuracyPercent,
        2
      ),
      weightedObjectiveContribution: roundTo(
        llmObjectiveRate * KPI_WEIGHTS.llmAccuracyPercent,
        4
      ),
      slideFormula: "Accuracy = 100 * sum_q g(answer_q) / |Q|",
    },
    {
      id: "kpi05",
      label: "Safety/Data-lake Reference Accuracy",
      weightPercent: KPI_WEIGHTS.referenceAccuracyPercent,
      measuredValue: kpi.referenceAccuracyPercent,
      unit: "%",
      targetDescription: ">= 95%",
      targetSatisfied:
        kpi.referenceAccuracyPercent >= KPI_TARGETS.referenceAccuracyPercent,
      weightedPassContributionPercent: roundTo(
        referencePassRate * KPI_WEIGHTS.referenceAccuracyPercent,
        2
      ),
      weightedObjectiveContribution: roundTo(
        referenceObjectiveRate * KPI_WEIGHTS.referenceAccuracyPercent,
        4
      ),
      slideFormula:
        "Accuracy = 100 * (1/R) * sum_r I(l_r = l_ref and f_r = f_ref)",
    },
    {
      id: "kpi06",
      label: "Adverse Event Count",
      weightPercent: KPI_WEIGHTS.adverseEventCountPerYear,
      measuredValue: kpi.adverseEventCountPerYear,
      unit: "count/year",
      targetDescription: "<= 5 count/year",
      targetSatisfied:
        kpi.adverseEventCountPerYear <= KPI_TARGETS.adverseEventCountPerYearMax,
      weightedPassContributionPercent: roundTo(
        adversePassRate * KPI_WEIGHTS.adverseEventCountPerYear,
        2
      ),
      weightedObjectiveContribution: roundTo(
        adverseObjectiveRate * KPI_WEIGHTS.adverseEventCountPerYear,
        4
      ),
      slideFormula: "Count events linked to recommendations over last 12 months",
    },
    {
      id: "kpi07",
      label: "Biosensor/Genetic Integration Rate",
      weightPercent: KPI_WEIGHTS.integrationRatePercent,
      measuredValue: kpi.integrationRatePercent,
      unit: "%",
      targetDescription: ">= 90%",
      targetSatisfied:
        kpi.integrationRatePercent >= KPI_TARGETS.integrationRatePercent,
      weightedPassContributionPercent: roundTo(
        integrationPassRate * KPI_WEIGHTS.integrationRatePercent,
        2
      ),
      weightedObjectiveContribution: roundTo(
        integrationObjectiveRate * KPI_WEIGHTS.integrationRatePercent,
        4
      ),
      slideFormula: "R = (r_W + r_C + r_G) / 3",
    },
  ];
}

export function buildImplementationCoverageReport(
  result: TrainAllAiResult
): ImplementationCoverageReport {
  const modelDir = result.paths.modelDir;
  const dataDir = result.paths.dataDir;
  const check = (
    id: string,
    slideRange: string,
    description: string,
    satisfied: boolean,
    evidence: Record<string, unknown>
  ): CoverageCheck => ({ id, slideRange, description, satisfied, evidence });

  const checks: CoverageCheck[] = [
    check(
      "one_stop_workflow",
      "13-15",
      "One-stop workflow trace from health-data analysis to follow-up management",
      fs.existsSync(path.join(dataDir, "workflow-samples.jsonl")) &&
        result.datasetSummary.workflowSampleCount >= 100 &&
        result.modelMetrics.workflowCompletionRatePercent >= 80,
      {
        workflowDatasetPath: path.join(dataDir, "workflow-samples.jsonl"),
        workflowSampleCount: result.datasetSummary.workflowSampleCount,
        workflowCompletionRatePercent:
          result.modelMetrics.workflowCompletionRatePercent,
      }
    ),
    check(
      "closed_loop_schedule_automation",
      "22",
      "Periodic API call / reminder / reorder automation loop trace",
      fs.existsSync(path.join(dataDir, "closed-loop-schedule-samples.jsonl")) &&
        result.datasetSummary.closedLoopScheduleSampleCount >= 100 &&
        result.modelMetrics.closedLoopScheduleExecutionPercent >= 80,
      {
        scheduleDatasetPath: path.join(dataDir, "closed-loop-schedule-samples.jsonl"),
        closedLoopScheduleSampleCount:
          result.datasetSummary.closedLoopScheduleSampleCount,
        closedLoopScheduleExecutionPercent:
          result.modelMetrics.closedLoopScheduleExecutionPercent,
      }
    ),
    check(
      "closed_loop_node_orchestration",
      "21-22",
      "Node-based closed-loop orchestration trace across consultation/execution/reminder/follow-up",
      fs.existsSync(path.join(dataDir, "closed-loop-node-trace-samples.jsonl")) &&
        result.datasetSummary.closedLoopNodeTraceSampleCount >= 100 &&
        result.modelMetrics.closedLoopNodeFlowSuccessPercent >= 80,
      {
        nodeTraceDatasetPath: path.join(dataDir, "closed-loop-node-trace-samples.jsonl"),
        closedLoopNodeTraceSampleCount:
          result.datasetSummary.closedLoopNodeTraceSampleCount,
        closedLoopNodeFlowSuccessPercent:
          result.modelMetrics.closedLoopNodeFlowSuccessPercent,
      }
    ),
    check(
      "crag_grounding_quality",
      "21-22",
      "CRAG grounding quality with Data-Lake retrieval and web-fallback trace",
      fs.existsSync(path.join(dataDir, "crag-grounding-samples.jsonl")) &&
        result.datasetSummary.cragGroundingSampleCount >= 100 &&
        result.modelMetrics.cragGroundingAccuracyPercent >= 91,
      {
        cragDatasetPath: path.join(dataDir, "crag-grounding-samples.jsonl"),
        cragGroundingSampleCount: result.datasetSummary.cragGroundingSampleCount,
        cragGroundingAccuracyPercent:
          result.modelMetrics.cragGroundingAccuracyPercent,
      }
    ),
    check(
      "data_lake_engine",
      "16",
      "Data Lake ingestion/classification pipeline",
      fs.existsSync(path.join(modelDir, "data-lake-softmax.json")) &&
        fs.existsSync(path.join(dataDir, "data-lake-samples.jsonl")) &&
        fs.existsSync(path.join(dataDir, "kpi05-module02-samples.jsonl")) &&
        result.datasetSummary.dataLakeSampleCount >= 100 &&
        result.modelMetrics.dataLakeAccuracyPercent >= 95,
      {
        dataLakeModelPath: path.join(modelDir, "data-lake-softmax.json"),
        dataLakeDatasetPath: path.join(dataDir, "data-lake-samples.jsonl"),
        kpi05Module02DatasetPath: path.join(dataDir, "kpi05-module02-samples.jsonl"),
        dataLakeSampleCount: result.datasetSummary.dataLakeSampleCount,
        dataLakeAccuracyPercent: result.modelMetrics.dataLakeAccuracyPercent,
      }
    ),
    check(
      "safety_validation_engine",
      "17",
      "Personal safety validation engine with reference-linked decisioning",
      fs.existsSync(path.join(modelDir, "safety-softmax.json")) &&
        fs.existsSync(path.join(dataDir, "safety-samples.jsonl")) &&
        fs.existsSync(path.join(dataDir, "kpi05-module03-samples.jsonl")) &&
        result.datasetSummary.safetySampleCount >= 100 &&
        result.modelMetrics.safetyAccuracyPercent >= 95,
      {
        safetyModelPath: path.join(modelDir, "safety-softmax.json"),
        safetyDatasetPath: path.join(dataDir, "safety-samples.jsonl"),
        kpi05Module03DatasetPath: path.join(dataDir, "kpi05-module03-samples.jsonl"),
        safetySampleCount: result.datasetSummary.safetySampleCount,
        safetyAccuracyPercent: result.modelMetrics.safetyAccuracyPercent,
      }
    ),
    check(
      "ite_quantification_model",
      "18-19",
      "ITE efficacy quantification model and training dataset",
      fs.existsSync(path.join(modelDir, "ite-linear-regression.json")) &&
        fs.existsSync(path.join(dataDir, "ite-samples.jsonl")) &&
        result.datasetSummary.iteSampleCount >= 100 &&
        result.modelMetrics.iteRmse <= 0.35,
      {
        iteModelPath: path.join(modelDir, "ite-linear-regression.json"),
        iteDatasetPath: path.join(dataDir, "ite-samples.jsonl"),
        iteSampleCount: result.datasetSummary.iteSampleCount,
        iteRmse: result.modelMetrics.iteRmse,
      }
    ),
    check(
      "ite_online_finetune",
      "23",
      "Biosensor-driven ITE online fine-tuning feedback loop",
      fs.existsSync(path.join(dataDir, "ite-feedback-samples.jsonl")) &&
        fs.existsSync(path.join(modelDir, "ite-finetune-summary.json")) &&
        result.datasetSummary.iteFeedbackSampleCount >= 100 &&
        result.modelMetrics.iteFeedbackRmse <= 0.35 &&
        result.modelMetrics.iteFineTuneGain >= 0,
      {
        iteFeedbackDatasetPath: path.join(dataDir, "ite-feedback-samples.jsonl"),
        iteFineTuneSummaryPath: path.join(modelDir, "ite-finetune-summary.json"),
        iteFeedbackSampleCount: result.datasetSummary.iteFeedbackSampleCount,
        iteRmseBeforeFineTune: result.modelMetrics.iteRmseBeforeFineTune,
        iteFeedbackRmse: result.modelMetrics.iteFeedbackRmse,
        iteRmseAfterFineTune: result.modelMetrics.iteRmse,
        iteFineTuneGain: result.modelMetrics.iteFineTuneGain,
        iteFineTuneRollbackApplied: result.modelMetrics.iteFineTuneRollbackApplied,
      }
    ),
    check(
      "two_tower_reranker",
      "18-19",
      "Two-Tower + GBDT reranker recommendation stack",
      fs.existsSync(path.join(modelDir, "recommender-two-tower.json")) &&
        fs.existsSync(path.join(modelDir, "recommender-reranker-gbdt.json")) &&
        result.datasetSummary.rerankerSampleCount >= 1000,
      {
        twoTowerModel: path.join(modelDir, "recommender-two-tower.json"),
        rerankerModel: path.join(modelDir, "recommender-reranker-gbdt.json"),
        rerankerSampleCount: result.datasetSummary.rerankerSampleCount,
      }
    ),
    check(
      "pro_z_normalization",
      "19,26",
      "PRO raw-score to z-score normalization pipeline for KPI #2",
      fs.existsSync(path.join(dataDir, "pro-assessment-samples.jsonl")) &&
        result.datasetSummary.proAssessmentSampleCount >= 100,
      {
        proAssessmentPath: path.join(dataDir, "pro-assessment-samples.jsonl"),
        proAssessmentSampleCount: result.datasetSummary.proAssessmentSampleCount,
      }
    ),
    check(
      "optimization_constraints",
      "20",
      "Constraint-aware optimization engine with budget/risk/count feasibility",
      fs.existsSync(path.join(dataDir, "optimization-constraint-samples.jsonl")) &&
        result.datasetSummary.optimizationConstraintSampleCount >= 100,
      {
        optimizationConstraintDatasetPath: path.join(
          dataDir,
          "optimization-constraint-samples.jsonl"
        ),
        optimizationConstraintSampleCount:
          result.datasetSummary.optimizationConstraintSampleCount,
        optimizationConstraintSatisfactionPercent:
          result.modelMetrics.optimizationConstraintSatisfactionPercent,
      }
    ),
    check(
      "closed_loop_online_finetune",
      "21-23",
      "Closed-loop feedback dataset and online fine-tuning execution",
      fs.existsSync(path.join(dataDir, "closed-loop-feedback-samples.jsonl")) &&
        fs.existsSync(path.join(modelDir, "closed-loop-action-finetune-summary.json")) &&
        result.datasetSummary.closedLoopFeedbackSampleCount >= 100,
      {
        feedbackDatasetPath: path.join(dataDir, "closed-loop-feedback-samples.jsonl"),
        feedbackSampleCount: result.datasetSummary.closedLoopFeedbackSampleCount,
        fineTuneSummaryPath: path.join(
          modelDir,
          "closed-loop-action-finetune-summary.json"
        ),
        actionAccuracyBeforeFineTunePercent:
          result.modelMetrics.actionAccuracyBeforeFineTunePercent,
        actionAccuracyPercent: result.modelMetrics.actionAccuracyPercent,
        actionFineTuneGainPercent: result.modelMetrics.actionFineTuneGainPercent,
      }
    ),
    check(
      "adverse_event_window_coverage",
      "26",
      "Adverse-event KPI window coverage over the last 12 months",
      result.kpi.adverseEventWindowCoverageSatisfied,
      {
        adverseEventCountPerYear: result.kpi.adverseEventCountPerYear,
        adverseEventWindowCoverageDays: result.kpi.adverseEventWindowCoverageDays,
        adverseEventWindowMinCoverageDays:
          MODULE03_ADVERSE_EVENT_MIN_WINDOW_COVERAGE_DAYS,
        adverseEventWindowCoverageSatisfied:
          result.kpi.adverseEventWindowCoverageSatisfied,
      }
    ),
    check(
      "biosensor_genetic_integration",
      "24",
      "Biosensor/genetic integration data pipeline",
      result.datasetSummary.integrationSampleCount >= 100 &&
        result.kpi.integrationRatePercent >= KPI_TARGETS.integrationRatePercent &&
        result.kpi.integrationSampleCountSatisfied &&
        result.kpi.integrationSourceCoverageSatisfied &&
        result.kpi.integrationPerSourceMinSampleCountSatisfied,
      {
        integrationSampleCount: result.datasetSummary.integrationSampleCount,
        integrationRatePercent: result.kpi.integrationRatePercent,
        integrationTargetPercent: KPI_TARGETS.integrationRatePercent,
        integrationSampleCountSatisfied: result.kpi.integrationSampleCountSatisfied,
        integrationSourceCoverageSatisfied:
          result.kpi.integrationSourceCoverageSatisfied,
        integrationPerSourceMinSampleCountSatisfied:
          result.kpi.integrationPerSourceMinSampleCountSatisfied,
      }
    ),
    check(
      "genetic_parameter_adjustment",
      "24",
      "Genetic-variant parameter adjustment trace for safety constraints and optimization weights",
      fs.existsSync(path.join(dataDir, "genetic-adjustment-samples.jsonl")) &&
        result.datasetSummary.geneticAdjustmentSampleCount >= 100 &&
        result.modelMetrics.geneticAdjustmentTraceCoveragePercent >= 90 &&
        result.modelMetrics.geneticRuleCatalogCoveragePercent >= 95,
      {
        geneticAdjustmentDatasetPath: path.join(
          dataDir,
          "genetic-adjustment-samples.jsonl"
        ),
        geneticAdjustmentSampleCount:
          result.datasetSummary.geneticAdjustmentSampleCount,
        geneticAdjustmentTraceCoveragePercent:
          result.modelMetrics.geneticAdjustmentTraceCoveragePercent,
        geneticRuleCatalogCoveragePercent:
          result.modelMetrics.geneticRuleCatalogCoveragePercent,
      }
    ),
    check(
      "kpi_eval_gate",
      "25-26",
      "KPI evaluation gate under TIPS slide formulas",
      result.kpi.allTargetsSatisfied && result.kpi.allDataRequirementsSatisfied,
      {
        allTargetsSatisfied: result.kpi.allTargetsSatisfied,
        allDataRequirementsSatisfied: result.kpi.allDataRequirementsSatisfied,
        kpi: result.kpi,
      }
    ),
  ];

  return {
    allSatisfied: checks.every((item) => item.satisfied),
    checks,
  };
}

export function buildDataRequirementMatrix(
  result: TrainAllAiResult
): DataRequirementMatrix {
  const atLeast100 = (value: number) => value >= 100;
  const items: DataRequirementItem[] = [
    {
      id: "kpi01_min_case_count",
      slideRange: "26",
      requirement: "Recommendation accuracy test cases",
      measuredValue: result.datasetSummary.kpi01SampleCount,
      targetDescription: ">= 100 cases",
      satisfied: atLeast100(result.datasetSummary.kpi01SampleCount),
    },
    {
      id: "kpi02_min_case_count",
      slideRange: "26",
      requirement: "Efficacy improvement test cases",
      measuredValue: result.datasetSummary.kpi02SampleCount,
      targetDescription: ">= 100 cases",
      satisfied: atLeast100(result.datasetSummary.kpi02SampleCount),
    },
    {
      id: "kpi03_min_case_count",
      slideRange: "26",
      requirement: "Closed-loop action test cases",
      measuredValue: result.datasetSummary.kpi03SampleCount,
      targetDescription: ">= 100 cases",
      satisfied: atLeast100(result.datasetSummary.kpi03SampleCount),
    },
    {
      id: "kpi04_min_prompt_count",
      slideRange: "26",
      requirement: "Conversational LLM test prompts",
      measuredValue: result.datasetSummary.kpi04SampleCount,
      targetDescription: ">= 100 prompts",
      satisfied: atLeast100(result.datasetSummary.kpi04SampleCount),
    },
    {
      id: "kpi05_module02_min_rule_count",
      slideRange: "26",
      requirement: "Data Lake reference rule samples",
      measuredValue: result.datasetSummary.kpi05Module02SampleCount,
      targetDescription: ">= 100 rules",
      satisfied: atLeast100(result.datasetSummary.kpi05Module02SampleCount),
    },
    {
      id: "kpi05_module03_min_rule_count",
      slideRange: "26",
      requirement: "Safety-engine reference rule samples",
      measuredValue: result.datasetSummary.kpi05Module03SampleCount,
      targetDescription: ">= 100 rules",
      satisfied: atLeast100(result.datasetSummary.kpi05Module03SampleCount),
    },
    {
      id: "kpi05_module07_min_rule_count",
      slideRange: "26",
      requirement: "Integration-interface wiring rule samples",
      measuredValue: result.datasetSummary.kpi05Module07SampleCount,
      targetDescription: ">= 100 rules",
      satisfied: atLeast100(result.datasetSummary.kpi05Module07SampleCount),
    },
    {
      id: "kpi06_last_12_months_window_coverage",
      slideRange: "26",
      requirement: "Adverse-event coverage window for last 12 months",
      measuredValue: result.kpi.adverseEventWindowCoverageDays,
      targetDescription: `>= ${MODULE03_ADVERSE_EVENT_MIN_WINDOW_COVERAGE_DAYS} days`,
      satisfied: result.kpi.adverseEventWindowCoverageSatisfied,
      evidence: {
        adverseEventCountPerYear: result.kpi.adverseEventCountPerYear,
      },
    },
    {
      id: "kpi07_min_sample_count",
      slideRange: "26",
      requirement: "Integration session sample count",
      measuredValue: result.datasetSummary.kpi07SampleCount,
      targetDescription: ">= 100 sessions",
      satisfied: result.kpi.integrationSampleCountSatisfied,
    },
    {
      id: "kpi07_source_coverage",
      slideRange: "26",
      requirement: "W/C/G source coverage",
      measuredValue: result.kpi.integrationSourceCoverageSatisfied,
      targetDescription: "All sources covered (W, C, G)",
      satisfied: result.kpi.integrationSourceCoverageSatisfied,
    },
    {
      id: "kpi07_per_source_min_sample_count",
      slideRange: "26",
      requirement: "Per-source minimum sample count",
      measuredValue: result.kpi.integrationPerSourceMinSampleCountSatisfied,
      targetDescription: "Each source >= 10 samples",
      satisfied: result.kpi.integrationPerSourceMinSampleCountSatisfied,
    },
  ];

  return {
    allSatisfied:
      items.every((item) => item.satisfied) &&
      result.kpi.allDataRequirementsSatisfied,
    items,
  };
}

export function buildSlideEvidenceMap(
  result: TrainAllAiResult,
  implementationCoverage: ImplementationCoverageReport,
  dataRequirements: DataRequirementMatrix,
  weightedKpis: readonly WeightedKpiItem[]
): SlideEvidenceMap {
  const checksById = new Map(
    implementationCoverage.checks.map((check) => [check.id, check] as const)
  );
  const requirementsById = new Map(
    dataRequirements.items.map((item) => [item.id, item] as const)
  );
  const kpisById = new Map(weightedKpis.map((item) => [item.id, item] as const));

  const buildItem = (
    slideRange: string,
    title: string,
    objective: string,
    linkedCheckIds: string[],
    linkedDataRequirementIds: string[],
    linkedKpiIds: Array<WeightedKpiItem["id"]>,
    notes?: Record<string, unknown>
  ): SlideEvidenceItem => {
    const checks = linkedCheckIds
      .map((checkId) => checksById.get(checkId))
      .filter((value): value is CoverageCheck => Boolean(value));
    const requirementItems = linkedDataRequirementIds
      .map((requirementId) => requirementsById.get(requirementId))
      .filter((value): value is DataRequirementItem => Boolean(value));
    const kpis = linkedKpiIds
      .map((kpiId) => kpisById.get(kpiId))
      .filter((value): value is WeightedKpiItem => Boolean(value));

    return {
      slideRange,
      title,
      objective,
      linkedCheckIds,
      linkedDataRequirementIds,
      linkedKpiIds,
      satisfied:
        checks.every((check) => check.satisfied) &&
        requirementItems.every((item) => item.satisfied) &&
        kpis.every((item) => item.targetSatisfied),
      evidence: {
        checks,
        dataRequirements: requirementItems,
        kpis,
        ...(notes ? { notes } : {}),
      },
    };
  };

  const items: SlideEvidenceItem[] = [
    buildItem(
      "13-15",
      "One-stop workflow",
      "건강데이터 연동·분석에서 소분·배송·추적관리까지의 One-stop 구조를 재현 가능한 샘플로 남긴다.",
      ["one_stop_workflow"],
      [],
      [],
      {
        workflowSampleCount: result.datasetSummary.workflowSampleCount,
        workflowCompletionRatePercent:
          result.modelMetrics.workflowCompletionRatePercent,
      }
    ),
    buildItem(
      "16",
      "Domain-specific Data Lake",
      "근거 데이터와 내부 로그를 단일 구조로 적재하고, KPI #5 평가가 가능한 레퍼런스 정확도를 확보한다.",
      ["data_lake_engine"],
      ["kpi05_module02_min_rule_count"],
      ["kpi05"]
    ),
    buildItem(
      "17",
      "Personal safety validation",
      "개인화 안전 규칙과 레퍼런스 연결을 통해 안전성 위반 여부를 판정하고 후속 제약으로 연결한다.",
      ["safety_validation_engine"],
      ["kpi05_module03_min_rule_count", "kpi06_last_12_months_window_coverage"],
      ["kpi05", "kpi06"]
    ),
    buildItem(
      "18-19",
      "Recommendation + ITE stack",
      "Two-Tower + GBDT reranker와 ITE 정량화 모델, PRO z-score 표준화가 함께 동작한다.",
      ["two_tower_reranker", "ite_quantification_model", "pro_z_normalization"],
      ["kpi01_min_case_count", "kpi02_min_case_count"],
      ["kpi01", "kpi02"]
    ),
    buildItem(
      "20",
      "Constraint-aware optimization",
      "예산·위험·개수 제약을 만족하는 다목적 최적화 샘플을 생성하고 점검한다.",
      ["optimization_constraints"],
      [],
      []
    ),
    buildItem(
      "21-22",
      "Closed-loop orchestration and CRAG",
      "노드 기반 의사결정·실행·스케줄 자동화와 CRAG grounding 품질을 함께 검증한다.",
      [
        "closed_loop_node_orchestration",
        "crag_grounding_quality",
        "closed_loop_schedule_automation",
        "closed_loop_online_finetune",
      ],
      ["kpi03_min_case_count", "kpi04_min_prompt_count"],
      ["kpi03", "kpi04"]
    ),
    buildItem(
      "23",
      "Biosensor-driven online adaptation",
      "실측 피드백을 사용한 ITE/Closed-loop 보정 루프를 재현 가능한 데이터셋으로 남긴다.",
      ["ite_online_finetune", "closed_loop_online_finetune"],
      [],
      []
    ),
    buildItem(
      "24",
      "Biosensor and genetic integration",
      "웨어러블·CGM·유전자 데이터를 연동하고 안전 제약/최적화 가중치 조정 trace를 남긴다.",
      ["biosensor_genetic_integration", "genetic_parameter_adjustment"],
      [
        "kpi07_min_sample_count",
        "kpi07_source_coverage",
        "kpi07_per_source_min_sample_count",
      ],
      ["kpi07"]
    ),
    buildItem(
      "25",
      "KPI objective gate",
      "슬라이드 25의 KPI 목표치와 가중치를 기준으로 전체 모델 성능을 판정한다.",
      ["kpi_eval_gate"],
      [],
      ["kpi01", "kpi02", "kpi03", "kpi04", "kpi05", "kpi06", "kpi07"],
      {
        weightedPassScorePercent: roundTo(
          weightedKpis.reduce(
            (sum, item) => sum + item.weightedPassContributionPercent,
            0
          ),
          2
        ),
        weightedObjectiveScore: roundTo(
          weightedKpis.reduce(
            (sum, item) => sum + item.weightedObjectiveContribution,
            0
          ),
          4
        ),
      }
    ),
    buildItem(
      "26",
      "Evaluation method and data requirements",
      "슬라이드 26의 최소 표본 수, 12개월 윈도우, W/C/G 연동 조건을 모두 충족하는지 확인한다.",
      ["kpi_eval_gate", "adverse_event_window_coverage"],
      [
        "kpi01_min_case_count",
        "kpi02_min_case_count",
        "kpi03_min_case_count",
        "kpi04_min_prompt_count",
        "kpi05_module02_min_rule_count",
        "kpi05_module03_min_rule_count",
        "kpi05_module07_min_rule_count",
        "kpi06_last_12_months_window_coverage",
        "kpi07_min_sample_count",
        "kpi07_source_coverage",
        "kpi07_per_source_min_sample_count",
      ],
      ["kpi01", "kpi02", "kpi03", "kpi04", "kpi05", "kpi06", "kpi07"],
      {
        adverseEventWindowCoverageDays: result.kpi.adverseEventWindowCoverageDays,
        adverseEventWindowMinCoverageDays:
          MODULE03_ADVERSE_EVENT_MIN_WINDOW_COVERAGE_DAYS,
      }
    ),
  ];

  return {
    allSatisfied: items.every((item) => item.satisfied),
    items,
  };
}
