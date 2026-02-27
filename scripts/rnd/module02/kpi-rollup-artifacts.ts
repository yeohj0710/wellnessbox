export type ModuleId =
  | "02_data_lake"
  | "03_personal_safety_validation_engine"
  | "04_efficacy_quantification_model"
  | "05_optimization_engine"
  | "06_closed_loop_ai"
  | "07_biosensor_and_genetic_data_integration";

export type Module02EvaluationOutput = {
  module: "02_data_lake";
  phase: "EVALUATION";
  generatedAt: string;
  report: {
    evaluatedAt: string;
    ruleCount: number;
    minRuleCount: number;
    accuracyPercent: number;
    targetPercent: number;
    targetSatisfied: boolean;
    minRuleCountSatisfied: boolean;
  };
};

export type Module03EvaluationOutput = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  generatedAt: string;
  report: {
    evaluatedAt: string;
    ruleCount: number;
    minRuleCount: number;
    accuracyPercent: number;
    targetPercent: number;
    targetSatisfied: boolean;
    minRuleCountSatisfied: boolean;
  };
  kpi06Report: {
    evaluatedAt: string;
    windowStart: string;
    windowEnd: string;
    eventCount: number;
    countedEventCount: number;
    targetMaxCountPerYear: number;
    targetSatisfied: boolean;
  };
};

export type Module04EvaluationOutput = {
  module: "04_efficacy_quantification_model";
  phase: "EVALUATION";
  generatedAt: string;
  report: {
    evaluatedAt: string;
    caseCount: number;
    scgiPp: number;
    targetPpThreshold: number;
    targetSatisfied: boolean;
  };
};

export type Module05EvaluationOutput = {
  module: "05_optimization_engine";
  phase: "EVALUATION";
  generatedAt: string;
  report: {
    evaluatedAt: string;
    caseCount: number;
    minCaseCount: number;
    meanScorePercent: number;
    targetPercent: number;
    targetSatisfied: boolean;
    minCaseCountSatisfied: boolean;
  };
};

export type Module06EvaluationOutput = {
  module: "06_closed_loop_ai";
  phase: "EVALUATION";
  generatedAt: string;
  report: {
    evaluatedAt: string;
    actionAccuracyReport: {
      caseCount: number;
      minCaseCount: number;
      accuracyPercent: number;
      targetPercent: number;
      targetSatisfied: boolean;
      minCaseCountSatisfied: boolean;
    };
    llmAccuracyReport: {
      promptCount: number;
      minPromptCount: number;
      accuracyPercent: number;
      targetPercent: number;
      targetSatisfied: boolean;
      minPromptCountSatisfied: boolean;
    };
  };
};

export type Module07EvaluationOutput = {
  module: "07_biosensor_and_genetic_data_integration";
  phase: "EVALUATION";
  generatedAt: string;
  report: {
    evaluatedAt: string;
    integrationRateReport: {
      sampleCount: number;
      minSampleCount: number;
      overallIntegrationRatePercent: number;
      targetPercent: number;
      targetSatisfied: boolean;
      sampleCountSatisfied: boolean;
      sourceCoverageSatisfied: boolean;
      perSourceMinSampleCountSatisfied: boolean;
    };
    interfaceWiringReport: {
      ruleCount: number;
      minRuleCount: number;
      accuracyPercent: number;
      targetPercent: number;
      targetSatisfied: boolean;
      minRuleCountSatisfied: boolean;
    };
  };
};

export type KpiMeasurement = {
  kpiId:
    | "kpi-01"
    | "kpi-02"
    | "kpi-03"
    | "kpi-04"
    | "kpi-05"
    | "kpi-06"
    | "kpi-07";
  metric: string;
  unit: "%" | "pp" | "count/year";
  measuredValue: number;
  targetValue: number;
  targetSatisfied: boolean;
  dataRequirementSatisfied: boolean;
};

export type ModuleRunResult = {
  moduleId: ModuleId;
  outputPath: string;
  command: string;
};

export type ModuleEvaluationOutputs = {
  module02: Module02EvaluationOutput;
  module03: Module03EvaluationOutput;
  module04: Module04EvaluationOutput;
  module05: Module05EvaluationOutput;
  module06: Module06EvaluationOutput;
  module07: Module07EvaluationOutput;
};

export type Kpi05BreakdownItem = {
  moduleId: ModuleId;
  accuracyPercent: number;
  targetPercent: number;
  targetSatisfied: boolean;
  ruleCount: number;
  minRuleCount: number;
  minRuleCountSatisfied: boolean;
};

export type KpiBundle = {
  kpi01: KpiMeasurement;
  kpi02: KpiMeasurement;
  kpi03: KpiMeasurement;
  kpi04: KpiMeasurement;
  kpi05: KpiMeasurement;
  kpi06: KpiMeasurement;
  kpi07: KpiMeasurement;
  kpi05Breakdown: Kpi05BreakdownItem[];
  measuredKpis: KpiMeasurement[];
};

function buildKpi01(outputs: ModuleEvaluationOutputs): KpiMeasurement {
  return {
    kpiId: "kpi-01",
    metric: "Recommendation accuracy",
    unit: "%",
    measuredValue: outputs.module05.report.meanScorePercent,
    targetValue: outputs.module05.report.targetPercent,
    targetSatisfied: outputs.module05.report.targetSatisfied,
    dataRequirementSatisfied: outputs.module05.report.minCaseCountSatisfied,
  };
}

function buildKpi02(outputs: ModuleEvaluationOutputs): KpiMeasurement {
  return {
    kpiId: "kpi-02",
    metric: "Measured efficacy improvement (SCGI)",
    unit: "pp",
    measuredValue: outputs.module04.report.scgiPp,
    targetValue: outputs.module04.report.targetPpThreshold,
    targetSatisfied: outputs.module04.report.targetSatisfied,
    dataRequirementSatisfied: outputs.module04.report.caseCount > 0,
  };
}

function buildKpi03(outputs: ModuleEvaluationOutputs): KpiMeasurement {
  return {
    kpiId: "kpi-03",
    metric: "Closed-loop action execution accuracy",
    unit: "%",
    measuredValue: outputs.module06.report.actionAccuracyReport.accuracyPercent,
    targetValue: outputs.module06.report.actionAccuracyReport.targetPercent,
    targetSatisfied: outputs.module06.report.actionAccuracyReport.targetSatisfied,
    dataRequirementSatisfied:
      outputs.module06.report.actionAccuracyReport.minCaseCountSatisfied,
  };
}

function buildKpi04(outputs: ModuleEvaluationOutputs): KpiMeasurement {
  return {
    kpiId: "kpi-04",
    metric: "Closed-loop consultation response accuracy",
    unit: "%",
    measuredValue: outputs.module06.report.llmAccuracyReport.accuracyPercent,
    targetValue: outputs.module06.report.llmAccuracyReport.targetPercent,
    targetSatisfied: outputs.module06.report.llmAccuracyReport.targetSatisfied,
    dataRequirementSatisfied:
      outputs.module06.report.llmAccuracyReport.minPromptCountSatisfied,
  };
}

function buildKpi07(outputs: ModuleEvaluationOutputs): KpiMeasurement {
  return {
    kpiId: "kpi-07",
    metric: "Biosensor and genetic integration rate",
    unit: "%",
    measuredValue:
      outputs.module07.report.integrationRateReport.overallIntegrationRatePercent,
    targetValue: outputs.module07.report.integrationRateReport.targetPercent,
    targetSatisfied: outputs.module07.report.integrationRateReport.targetSatisfied,
    dataRequirementSatisfied:
      outputs.module07.report.integrationRateReport.sampleCountSatisfied &&
      outputs.module07.report.integrationRateReport.sourceCoverageSatisfied &&
      outputs.module07.report.integrationRateReport.perSourceMinSampleCountSatisfied,
  };
}

function buildKpi05Breakdown(outputs: ModuleEvaluationOutputs): Kpi05BreakdownItem[] {
  return [
    {
      moduleId: outputs.module02.module,
      accuracyPercent: outputs.module02.report.accuracyPercent,
      targetPercent: outputs.module02.report.targetPercent,
      targetSatisfied: outputs.module02.report.targetSatisfied,
      ruleCount: outputs.module02.report.ruleCount,
      minRuleCount: outputs.module02.report.minRuleCount,
      minRuleCountSatisfied: outputs.module02.report.minRuleCountSatisfied,
    },
    {
      moduleId: outputs.module03.module,
      accuracyPercent: outputs.module03.report.accuracyPercent,
      targetPercent: outputs.module03.report.targetPercent,
      targetSatisfied: outputs.module03.report.targetSatisfied,
      ruleCount: outputs.module03.report.ruleCount,
      minRuleCount: outputs.module03.report.minRuleCount,
      minRuleCountSatisfied: outputs.module03.report.minRuleCountSatisfied,
    },
    {
      moduleId: outputs.module07.module,
      accuracyPercent: outputs.module07.report.interfaceWiringReport.accuracyPercent,
      targetPercent: outputs.module07.report.interfaceWiringReport.targetPercent,
      targetSatisfied: outputs.module07.report.interfaceWiringReport.targetSatisfied,
      ruleCount: outputs.module07.report.interfaceWiringReport.ruleCount,
      minRuleCount: outputs.module07.report.interfaceWiringReport.minRuleCount,
      minRuleCountSatisfied:
        outputs.module07.report.interfaceWiringReport.minRuleCountSatisfied,
    },
  ];
}

function buildKpi05Measurement(kpi05Breakdown: Kpi05BreakdownItem[]): KpiMeasurement {
  return {
    kpiId: "kpi-05",
    metric: "Safety/data-lake reference accuracy",
    unit: "%",
    measuredValue: Number(
      (
        kpi05Breakdown.reduce((sum, result) => sum + result.accuracyPercent, 0) /
        kpi05Breakdown.length
      ).toFixed(2)
    ),
    targetValue: kpi05Breakdown[0].targetPercent,
    targetSatisfied: kpi05Breakdown.every((result) => result.targetSatisfied),
    dataRequirementSatisfied: kpi05Breakdown.every(
      (result) => result.minRuleCountSatisfied
    ),
  };
}

function buildKpi06(outputs: ModuleEvaluationOutputs): KpiMeasurement {
  return {
    kpiId: "kpi-06",
    metric: "Adverse event annual report count",
    unit: "count/year",
    measuredValue: outputs.module03.kpi06Report.countedEventCount,
    targetValue: outputs.module03.kpi06Report.targetMaxCountPerYear,
    targetSatisfied: outputs.module03.kpi06Report.targetSatisfied,
    dataRequirementSatisfied: outputs.module03.kpi06Report.eventCount > 0,
  };
}

function buildMeasuredKpis(bundle: Omit<KpiBundle, "measuredKpis">): KpiMeasurement[] {
  return [
    bundle.kpi01,
    bundle.kpi02,
    bundle.kpi03,
    bundle.kpi04,
    bundle.kpi05,
    bundle.kpi06,
    bundle.kpi07,
  ];
}

export function buildKpiBundle(outputs: ModuleEvaluationOutputs): KpiBundle {
  const kpi01 = buildKpi01(outputs);
  const kpi02 = buildKpi02(outputs);
  const kpi03 = buildKpi03(outputs);
  const kpi04 = buildKpi04(outputs);
  const kpi07 = buildKpi07(outputs);
  const kpi05Breakdown = buildKpi05Breakdown(outputs);
  const kpi05 = buildKpi05Measurement(kpi05Breakdown);
  const kpi06 = buildKpi06(outputs);
  const measuredKpis = buildMeasuredKpis({
    kpi01,
    kpi02,
    kpi03,
    kpi04,
    kpi05,
    kpi06,
    kpi07,
    kpi05Breakdown,
  });

  return {
    kpi01,
    kpi02,
    kpi03,
    kpi04,
    kpi05,
    kpi06,
    kpi07,
    kpi05Breakdown,
    measuredKpis,
  };
}

export function buildRollupSummary(kpis: KpiBundle) {
  const targetSatisfiedCount = kpis.measuredKpis.filter(
    (kpi) => kpi.targetSatisfied
  ).length;
  const dataRequirementSatisfiedCount = kpis.measuredKpis.filter(
    (kpi) => kpi.dataRequirementSatisfied
  ).length;

  return {
    measuredKpiCount: kpis.measuredKpis.length,
    targetSatisfiedCount,
    dataRequirementSatisfiedCount,
    allTargetsSatisfied: targetSatisfiedCount === kpis.measuredKpis.length,
    allDataRequirementsSatisfied:
      dataRequirementSatisfiedCount === kpis.measuredKpis.length,
  };
}

