// RND: Module 02 KPI rollup runner for consolidated modules 02~07 evaluation output.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type CliArgs = {
  outPath: string | null;
  outDir: string | null;
  generatedAt: string | null;
  evaluatedAt: string | null;
};

type ModuleId =
  | "02_data_lake"
  | "03_personal_safety_validation_engine"
  | "04_efficacy_quantification_model"
  | "05_optimization_engine"
  | "06_closed_loop_ai"
  | "07_biosensor_and_genetic_data_integration";

type ModuleRunner = {
  moduleId: ModuleId;
  runnerPath: string;
  outputFileName: string;
};

type Module02EvaluationOutput = {
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

type Module03EvaluationOutput = {
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

type Module04EvaluationOutput = {
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

type Module05EvaluationOutput = {
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

type Module06EvaluationOutput = {
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

type Module07EvaluationOutput = {
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

type KpiMeasurement = {
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

const MODULE_RUNNERS: readonly ModuleRunner[] = [
  {
    moduleId: "02_data_lake",
    runnerPath: "scripts/rnd/module02/run-evaluation.cjs",
    outputFileName: "module02-evaluation.json",
  },
  {
    moduleId: "03_personal_safety_validation_engine",
    runnerPath: "scripts/rnd/module03/run-evaluation.cjs",
    outputFileName: "module03-evaluation.json",
  },
  {
    moduleId: "04_efficacy_quantification_model",
    runnerPath: "scripts/rnd/module04/run-evaluation.cjs",
    outputFileName: "module04-evaluation.json",
  },
  {
    moduleId: "05_optimization_engine",
    runnerPath: "scripts/rnd/module05/run-evaluation.cjs",
    outputFileName: "module05-evaluation.json",
  },
  {
    moduleId: "06_closed_loop_ai",
    runnerPath: "scripts/rnd/module06/run-evaluation.cjs",
    outputFileName: "module06-evaluation.json",
  },
  {
    moduleId: "07_biosensor_and_genetic_data_integration",
    runnerPath: "scripts/rnd/module07/run-evaluation.cjs",
    outputFileName: "module07-evaluation.json",
  },
] as const;

function getArgValue(argv: string[], flag: string): string | null {
  const flagIndex = argv.indexOf(flag);
  if (flagIndex < 0) {
    return null;
  }

  const value = argv[flagIndex + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function normalizeIsoDate(value: string | null, label: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`${label} must be a valid ISO-8601 date string.`);
  }

  return parsed.toISOString();
}

function parseArgs(argv: string[]): CliArgs {
  const outPath = getArgValue(argv, "--out");
  const outDir = getArgValue(argv, "--out-dir");
  const generatedAt = normalizeIsoDate(getArgValue(argv, "--generated-at"), "--generated-at");
  const evaluatedAt = normalizeIsoDate(getArgValue(argv, "--evaluated-at"), "--evaluated-at");

  if (outPath && outDir) {
    throw new Error("Use either --out or --out-dir, not both.");
  }

  return { outPath, outDir, generatedAt, evaluatedAt };
}

function readJsonFile<T>(filePath: string): T {
  const serialized = fs.readFileSync(filePath, "utf8");
  return JSON.parse(serialized) as T;
}

function toPathSafeTimestamp(timestamp: string): string {
  return timestamp.replace(/[:.]/g, "-");
}

function runModuleEvaluation(
  repoRoot: string,
  runner: ModuleRunner,
  moduleOutDir: string,
  generatedAt: string,
  evaluatedAt: string
): { outputPath: string; command: string } {
  const runnerAbsolutePath = path.resolve(repoRoot, runner.runnerPath);
  const outputPath = path.join(moduleOutDir, runner.outputFileName);
  const runnerArgs = [
    runnerAbsolutePath,
    "--out",
    outputPath,
    "--generated-at",
    generatedAt,
    "--evaluated-at",
    evaluatedAt,
  ];

  try {
    execFileSync(process.execPath, runnerArgs, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const processError = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };
    const stdout = typeof processError.stdout === "string" ? processError.stdout.trim() : "";
    const stderr = typeof processError.stderr === "string" ? processError.stderr.trim() : "";
    throw new Error(
      [
        `Failed to execute ${runner.moduleId} evaluation.`,
        `Command: node ${runner.runnerPath}`,
        stdout.length > 0 ? `stdout: ${stdout}` : "",
        stderr.length > 0 ? `stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return {
    outputPath,
    command: `node ${runner.runnerPath} --out ${outputPath} --generated-at ${generatedAt} --evaluated-at ${evaluatedAt}`,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const evaluatedAt = args.evaluatedAt ?? new Date().toISOString();
  const generatedAt = args.generatedAt ?? evaluatedAt;
  const timestampToken = toPathSafeTimestamp(evaluatedAt);

  const resolvedOutPath = args.outPath
    ? path.resolve(repoRoot, args.outPath)
    : null;
  const resolvedOutDir = args.outDir
    ? path.resolve(repoRoot, args.outDir)
    : null;

  const rollupBaseDir =
    resolvedOutDir ??
    (resolvedOutPath
      ? path.join(
          path.dirname(resolvedOutPath),
          `${path.basename(resolvedOutPath, path.extname(resolvedOutPath))}-modules`
        )
      : path.resolve(repoRoot, "tmp", "rnd", "kpi-rollup", timestampToken));

  const rollupOutputPath =
    resolvedOutPath ?? path.join(rollupBaseDir, `kpi-rollup-${timestampToken}.json`);
  const moduleOutDir = path.join(rollupBaseDir, "module-evaluations");

  fs.mkdirSync(path.dirname(rollupOutputPath), { recursive: true });
  fs.mkdirSync(moduleOutDir, { recursive: true });

  const moduleRuns = MODULE_RUNNERS.map((runner) => {
    const run = runModuleEvaluation(repoRoot, runner, moduleOutDir, generatedAt, evaluatedAt);
    return {
      moduleId: runner.moduleId,
      outputPath: run.outputPath,
      command: run.command,
    };
  });

  const module02 = readJsonFile<Module02EvaluationOutput>(moduleRuns[0].outputPath);
  const module03 = readJsonFile<Module03EvaluationOutput>(moduleRuns[1].outputPath);
  const module04 = readJsonFile<Module04EvaluationOutput>(moduleRuns[2].outputPath);
  const module05 = readJsonFile<Module05EvaluationOutput>(moduleRuns[3].outputPath);
  const module06 = readJsonFile<Module06EvaluationOutput>(moduleRuns[4].outputPath);
  const module07 = readJsonFile<Module07EvaluationOutput>(moduleRuns[5].outputPath);

  const kpi01: KpiMeasurement = {
    kpiId: "kpi-01",
    metric: "Recommendation accuracy",
    unit: "%",
    measuredValue: module05.report.meanScorePercent,
    targetValue: module05.report.targetPercent,
    targetSatisfied: module05.report.targetSatisfied,
    dataRequirementSatisfied: module05.report.minCaseCountSatisfied,
  };
  const kpi02: KpiMeasurement = {
    kpiId: "kpi-02",
    metric: "Measured efficacy improvement (SCGI)",
    unit: "pp",
    measuredValue: module04.report.scgiPp,
    targetValue: module04.report.targetPpThreshold,
    targetSatisfied: module04.report.targetSatisfied,
    dataRequirementSatisfied: module04.report.caseCount > 0,
  };
  const kpi03: KpiMeasurement = {
    kpiId: "kpi-03",
    metric: "Closed-loop action execution accuracy",
    unit: "%",
    measuredValue: module06.report.actionAccuracyReport.accuracyPercent,
    targetValue: module06.report.actionAccuracyReport.targetPercent,
    targetSatisfied: module06.report.actionAccuracyReport.targetSatisfied,
    dataRequirementSatisfied: module06.report.actionAccuracyReport.minCaseCountSatisfied,
  };
  const kpi04: KpiMeasurement = {
    kpiId: "kpi-04",
    metric: "Closed-loop consultation response accuracy",
    unit: "%",
    measuredValue: module06.report.llmAccuracyReport.accuracyPercent,
    targetValue: module06.report.llmAccuracyReport.targetPercent,
    targetSatisfied: module06.report.llmAccuracyReport.targetSatisfied,
    dataRequirementSatisfied: module06.report.llmAccuracyReport.minPromptCountSatisfied,
  };
  const kpi07: KpiMeasurement = {
    kpiId: "kpi-07",
    metric: "Biosensor and genetic integration rate",
    unit: "%",
    measuredValue: module07.report.integrationRateReport.overallIntegrationRatePercent,
    targetValue: module07.report.integrationRateReport.targetPercent,
    targetSatisfied: module07.report.integrationRateReport.targetSatisfied,
    dataRequirementSatisfied:
      module07.report.integrationRateReport.sampleCountSatisfied &&
      module07.report.integrationRateReport.sourceCoverageSatisfied &&
      module07.report.integrationRateReport.perSourceMinSampleCountSatisfied,
  };

  const kpi05Breakdown = [
    {
      moduleId: module02.module,
      accuracyPercent: module02.report.accuracyPercent,
      targetPercent: module02.report.targetPercent,
      targetSatisfied: module02.report.targetSatisfied,
      ruleCount: module02.report.ruleCount,
      minRuleCount: module02.report.minRuleCount,
      minRuleCountSatisfied: module02.report.minRuleCountSatisfied,
    },
    {
      moduleId: module03.module,
      accuracyPercent: module03.report.accuracyPercent,
      targetPercent: module03.report.targetPercent,
      targetSatisfied: module03.report.targetSatisfied,
      ruleCount: module03.report.ruleCount,
      minRuleCount: module03.report.minRuleCount,
      minRuleCountSatisfied: module03.report.minRuleCountSatisfied,
    },
    {
      moduleId: module07.module,
      accuracyPercent: module07.report.interfaceWiringReport.accuracyPercent,
      targetPercent: module07.report.interfaceWiringReport.targetPercent,
      targetSatisfied: module07.report.interfaceWiringReport.targetSatisfied,
      ruleCount: module07.report.interfaceWiringReport.ruleCount,
      minRuleCount: module07.report.interfaceWiringReport.minRuleCount,
      minRuleCountSatisfied: module07.report.interfaceWiringReport.minRuleCountSatisfied,
    },
  ];
  const kpi05: KpiMeasurement = {
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
  const kpi06: KpiMeasurement = {
    kpiId: "kpi-06",
    metric: "Adverse event annual report count",
    unit: "count/year",
    measuredValue: module03.kpi06Report.countedEventCount,
    targetValue: module03.kpi06Report.targetMaxCountPerYear,
    targetSatisfied: module03.kpi06Report.targetSatisfied,
    dataRequirementSatisfied: module03.kpi06Report.eventCount > 0,
  };

  const measuredKpis: KpiMeasurement[] = [
    kpi01,
    kpi02,
    kpi03,
    kpi04,
    kpi05,
    kpi06,
    kpi07,
  ];
  const targetSatisfiedCount = measuredKpis.filter((kpi) => kpi.targetSatisfied).length;
  const dataRequirementSatisfiedCount = measuredKpis.filter(
    (kpi) => kpi.dataRequirementSatisfied
  ).length;

  const rollup = {
    module: "02_data_lake",
    phase: "EVALUATION",
    artifact: "kpi_rollup",
    generatedAt,
    evaluatedAt,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
    },
    commands: moduleRuns.map((run) => run.command),
    moduleArtifacts: moduleRuns.map((run) => ({
      moduleId: run.moduleId,
      outputPath: path.relative(path.dirname(rollupOutputPath), run.outputPath),
    })),
    kpiRollup: {
      kpi01,
      kpi02,
      kpi03,
      kpi04,
      kpi05: {
        ...kpi05,
        moduleBreakdown: kpi05Breakdown,
      },
      kpi06: {
        ...kpi06,
        evaluatedAt: module03.kpi06Report.evaluatedAt,
        windowStart: module03.kpi06Report.windowStart,
        windowEnd: module03.kpi06Report.windowEnd,
      },
      kpi07,
    },
    summary: {
      measuredKpiCount: measuredKpis.length,
      targetSatisfiedCount,
      dataRequirementSatisfiedCount,
      allTargetsSatisfied: targetSatisfiedCount === measuredKpis.length,
      allDataRequirementsSatisfied:
        dataRequirementSatisfiedCount === measuredKpis.length,
    },
  };

  fs.writeFileSync(rollupOutputPath, `${JSON.stringify(rollup, null, 2)}\n`, "utf8");
  console.log(`Wrote Module 02 KPI rollup report: ${rollupOutputPath}`);
}

main();
