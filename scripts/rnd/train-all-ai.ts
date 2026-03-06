import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildDataRequirementMatrix,
  buildImplementationCoverageReport,
  buildKpiStabilityReport,
  buildSlideEvidenceMap,
  buildWeightedKpiItems,
  computeWeightedScores,
  KPI_STABILITY_THRESHOLDS,
} from "./train-all-ai.reporting";
import {
  trainAllRndAiModels,
  type TrainAllAiResult,
  type TrainProfile,
} from "../../lib/rnd/ai-training/pipeline";

const DEFAULT_MAX_ATTEMPTS_BY_PROFILE: Record<TrainProfile, number> = {
  smoke: 3,
  standard: 3,
  max: 3,
};
const AUTO_PROFILE_STAGE_DATA_SCALE_STEP = 0.5;
const AUTO_PROFILE_ATTEMPT_DATA_SCALE_STEP = 0.3;
const DEFAULT_AUTO_MAX_DATA_SCALE = 3.2;
const DEFAULT_AUTO_MIN_WEIGHTED_OBJECTIVE_SCORE = 125.9;
const TIPS_SOURCE_PDF_PATH =
  "c:/Users/hjyeo/Desktop/웰박/00 핵심 자료/회사 소개 자료/TIPS 연구개발계획서 전체본.pdf";
const TIPS_IMPLEMENTATION_CRITERIA_SLIDES = "13-26";
const TIPS_KPI_CRITERIA_SLIDES = "25-26";

type CliProfile = TrainProfile | "auto";

type CliArgs = {
  profile: CliProfile;
  seed: number | undefined;
  generatedAt: string | undefined;
  outRoot: string | undefined;
  requirePass: boolean;
  requireStabilityBuffer: boolean;
  requireObjectiveTarget: boolean;
  maxAttempts: number;
  autoPostPassMaxAttempts: number;
  seedStep: number;
  dataScale: number;
  autoMaxDataScale: number;
  autoMinWeightedObjectiveScore: number;
};

type AttemptSummary = {
  attempt: number;
  stage: number;
  profile: TrainProfile;
  seed: number;
  dataScale: number;
  gatePassed: boolean;
  stabilityBufferSatisfied: boolean;
  weightedPassScorePercent: number;
  weightedObjectiveScore: number;
  result: TrainAllAiResult;
};

type ArtifactChecksum = {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
};

type ChecksumVerification = {
  relativePath: string;
  expectedSizeBytes: number;
  actualSizeBytes: number | null;
  expectedSha256: string;
  actualSha256: string | null;
  passed: boolean;
  reason: "ok" | "missing-file" | "size-mismatch" | "hash-mismatch";
};

function valueForFlag(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parseProfile(raw: string | undefined): CliProfile {
  if (!raw) return "auto";
  if (raw === "auto" || raw === "smoke" || raw === "standard" || raw === "max") {
    return raw;
  }
  throw new Error("--profile must be one of: auto, smoke, standard, max.");
}

function parseSeed(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error("--seed must be an integer.");
  }
  return parsed;
}

function parseGeneratedAt(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error("--generated-at must be a valid ISO datetime string.");
  }
  return parsed.toISOString();
}

function parseBooleanFlag(raw: string, flag: string): boolean {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  throw new Error(`${flag} must be one of: true, false, 1, 0.`);
}

function parseIntegerFlag(
  raw: string | undefined,
  flag: string,
  minInclusive: number,
  maxInclusive: number
): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${flag} must be an integer.`);
  }
  if (parsed < minInclusive || parsed > maxInclusive) {
    throw new Error(
      `${flag} must be between ${minInclusive} and ${maxInclusive}.`
    );
  }
  return parsed;
}

function parseNumberFlag(
  raw: string | undefined,
  flag: string,
  minInclusive: number,
  maxInclusive: number
): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} must be a finite number.`);
  }
  if (parsed < minInclusive || parsed > maxInclusive) {
    throw new Error(
      `${flag} must be between ${minInclusive} and ${maxInclusive}.`
    );
  }
  return parsed;
}

function parseRequirePass(argv: readonly string[]): boolean {
  const explicit = valueForFlag(argv, "--require-pass");
  if (explicit) return parseBooleanFlag(explicit, "--require-pass");
  if (argv.includes("--allow-fail") || argv.includes("--no-pass-gate")) {
    return false;
  }
  return true;
}

function parseOptionalBooleanFlag(
  argv: readonly string[],
  flag: string
): boolean | undefined {
  const explicit = valueForFlag(argv, flag);
  if (!explicit) return undefined;
  return parseBooleanFlag(explicit, flag);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeAttemptDataScale(
  profileOption: CliProfile,
  baseDataScale: number,
  stageIndex: number,
  attemptIndex: number,
  autoMaxDataScale: number
): number {
  if (profileOption !== "auto") {
    return clamp(baseDataScale, 1, 10);
  }
  const cappedMaxScale = clamp(autoMaxDataScale, 1, 10);
  const stagedScale =
    baseDataScale + stageIndex * AUTO_PROFILE_STAGE_DATA_SCALE_STEP;
  const attemptedScale =
    stagedScale + attemptIndex * AUTO_PROFILE_ATTEMPT_DATA_SCALE_STEP;
  return roundTo(clamp(attemptedScale, 1, cappedMaxScale), 4);
}

function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function normalizeForReport(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function sha256File(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function collectChecksumsForFiles(filePaths: readonly string[]): ArtifactChecksum[] {
  return filePaths
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => {
      const absolutePath = path.resolve(filePath);
      return {
        relativePath: normalizeForReport(path.basename(absolutePath)),
        sizeBytes: fs.statSync(absolutePath).size,
        sha256: sha256File(absolutePath),
      };
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function verifyChecksumList(
  baseDir: string,
  expected: readonly ArtifactChecksum[]
): {
  passed: boolean;
  results: ChecksumVerification[];
} {
  const results: ChecksumVerification[] = expected.map((entry) => {
    const absolutePath = path.join(baseDir, entry.relativePath);
    if (!fs.existsSync(absolutePath)) {
      return {
        relativePath: entry.relativePath,
        expectedSizeBytes: entry.sizeBytes,
        actualSizeBytes: null,
        expectedSha256: entry.sha256,
        actualSha256: null,
        passed: false,
        reason: "missing-file",
      };
    }
    const actualSizeBytes = fs.statSync(absolutePath).size;
    if (actualSizeBytes !== entry.sizeBytes) {
      return {
        relativePath: entry.relativePath,
        expectedSizeBytes: entry.sizeBytes,
        actualSizeBytes,
        expectedSha256: entry.sha256,
        actualSha256: null,
        passed: false,
        reason: "size-mismatch",
      };
    }
    const actualSha256 = sha256File(absolutePath);
    if (actualSha256 !== entry.sha256) {
      return {
        relativePath: entry.relativePath,
        expectedSizeBytes: entry.sizeBytes,
        actualSizeBytes,
        expectedSha256: entry.sha256,
        actualSha256,
        passed: false,
        reason: "hash-mismatch",
      };
    }
    return {
      relativePath: entry.relativePath,
      expectedSizeBytes: entry.sizeBytes,
      actualSizeBytes,
      expectedSha256: entry.sha256,
      actualSha256,
      passed: true,
      reason: "ok",
    };
  });

  return {
    passed: results.every((item) => item.passed),
    results,
  };
}

function isGatePassed(result: TrainAllAiResult): boolean {
  return (
    result.kpi.allTargetsSatisfied && result.kpi.allDataRequirementsSatisfied
  );
}

function buildAttemptGeneratedAt(
  baseGeneratedAt: string | undefined,
  attemptIndex: number
): string | undefined {
  if (!baseGeneratedAt) return undefined;
  if (attemptIndex === 0) return baseGeneratedAt;
  return new Date(
    new Date(baseGeneratedAt).valueOf() + attemptIndex * 1000
  ).toISOString();
}

function parseArgs(argv: readonly string[]): CliArgs {
  const profile = parseProfile(valueForFlag(argv, "--profile"));
  const seed = parseSeed(valueForFlag(argv, "--seed"));
  const defaultAttemptsForProfile =
    profile === "auto"
      ? DEFAULT_MAX_ATTEMPTS_BY_PROFILE.standard
      : DEFAULT_MAX_ATTEMPTS_BY_PROFILE[profile];
  const maxAttempts =
    parseIntegerFlag(valueForFlag(argv, "--max-attempts"), "--max-attempts", 1, 30) ??
    (seed !== undefined ? 1 : defaultAttemptsForProfile);
  const autoPostPassMaxAttempts =
    parseIntegerFlag(
      valueForFlag(argv, "--auto-post-pass-max-attempts"),
      "--auto-post-pass-max-attempts",
      1,
      30
    ) ?? Math.min(2, maxAttempts);
  const seedStep =
    parseIntegerFlag(valueForFlag(argv, "--seed-step"), "--seed-step", 1, 1_000_000) ??
    137;
  const defaultDataScale = profile === "auto" ? 1.2 : 1;
  const dataScale =
    parseNumberFlag(valueForFlag(argv, "--data-scale"), "--data-scale", 1, 10) ??
    defaultDataScale;
  const autoMaxDataScale =
    parseNumberFlag(
      valueForFlag(argv, "--auto-max-data-scale"),
      "--auto-max-data-scale",
      1,
      10
    ) ??
    (profile === "auto" ? DEFAULT_AUTO_MAX_DATA_SCALE : dataScale);
  const autoMinWeightedObjectiveScore =
    parseNumberFlag(
      valueForFlag(argv, "--auto-min-weighted-objective-score"),
      "--auto-min-weighted-objective-score",
      0,
      500
    ) ??
    (profile === "auto" ? DEFAULT_AUTO_MIN_WEIGHTED_OBJECTIVE_SCORE : 0);
  const requirePass = parseRequirePass(argv);
  const requireStabilityBuffer =
    parseOptionalBooleanFlag(argv, "--require-stability-buffer") ??
    (profile === "auto" ? true : false);
  const requireObjectiveTarget =
    parseOptionalBooleanFlag(argv, "--require-objective-target") ??
    (profile === "auto" ? true : false);

  return {
    profile,
    seed,
    generatedAt: parseGeneratedAt(valueForFlag(argv, "--generated-at")),
    outRoot: valueForFlag(argv, "--out-root"),
    requirePass,
    requireStabilityBuffer,
    requireObjectiveTarget,
    maxAttempts,
    autoPostPassMaxAttempts,
    seedStep,
    dataScale,
    autoMaxDataScale,
    autoMinWeightedObjectiveScore,
  };
}

function buildModelArtifactPaths(modelDir: string): string[] {
  return [
    "recommender-two-tower.json",
    "recommender-reranker-gbdt.json",
    "safety-softmax.json",
    "data-lake-softmax.json",
    "ite-linear-regression.json",
    "ite-finetune-summary.json",
    "closed-loop-action-softmax.json",
    "closed-loop-action-finetune-summary.json",
    "llm-response-softmax.json",
    "integration-softmax.json",
    "train-report.json",
  ].map((fileName) => path.join(modelDir, fileName));
}

function buildDatasetArtifactPaths(dataDir: string): string[] {
  return [
    "dataset-generation-config.json",
    "ingredient-catalog.json",
    "train-users.jsonl",
    "test-users.jsonl",
    "recommender-pairs.jsonl",
    "pro-assessment-samples.jsonl",
    "reranker-samples.jsonl",
    "optimization-constraint-samples.jsonl",
    "safety-samples.jsonl",
    "data-lake-samples.jsonl",
    "ite-samples.jsonl",
    "ite-feedback-samples.jsonl",
    "closed-loop-samples.jsonl",
    "closed-loop-feedback-samples.jsonl",
    "closed-loop-schedule-samples.jsonl",
    "closed-loop-node-trace-samples.jsonl",
    "crag-grounding-samples.jsonl",
    "llm-samples.jsonl",
    "integration-samples.jsonl",
    "genetic-adjustment-samples.jsonl",
    "workflow-samples.jsonl",
    "kpi01-samples.jsonl",
    "kpi02-samples.jsonl",
    "kpi03-samples.jsonl",
    "kpi04-samples.jsonl",
    "kpi05-module02-samples.jsonl",
    "kpi05-module03-samples.jsonl",
    "kpi05-module07-samples.jsonl",
    "kpi06-samples.jsonl",
    "kpi07-samples.jsonl",
  ].map((fileName) => path.join(dataDir, fileName));
}

function rankAttempts(attempts: readonly AttemptSummary[]): AttemptSummary[] {
  return [...attempts].sort((left, right) => {
    if (left.gatePassed !== right.gatePassed) {
      return left.gatePassed ? -1 : 1;
    }
    if (left.stabilityBufferSatisfied !== right.stabilityBufferSatisfied) {
      return left.stabilityBufferSatisfied ? -1 : 1;
    }
    if (left.weightedObjectiveScore !== right.weightedObjectiveScore) {
      return right.weightedObjectiveScore - left.weightedObjectiveScore;
    }
    if (left.weightedPassScorePercent !== right.weightedPassScorePercent) {
      return right.weightedPassScorePercent - left.weightedPassScorePercent;
    }
    return (
      right.result.kpi.recommendationAccuracyPercent -
      left.result.kpi.recommendationAccuracyPercent
    );
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const invokedBy = `node scripts/rnd/train-all-ai.cjs ${process.argv
    .slice(2)
    .join(" ")}`.trim();
  const baseSeed = args.seed ?? 20260227;
  const profilePlan: TrainProfile[] =
    args.profile === "auto" ? ["standard", "max"] : [args.profile];
  const attempts: AttemptSummary[] = [];
  let previousStageSatisfied = false;
  const stageReports: Array<{
    stage: number;
    profile: TrainProfile;
    stageAttemptBudget: number;
    stageAttemptCount: number;
    dataScaleStart: number;
    dataScaleEnd: number;
    dataScaleCap: number;
    bestAttempt: number;
    bestDataScale: number;
    bestRunId: string;
    bestGatePassed: boolean;
    bestStabilityBufferSatisfied: boolean;
    bestObjectiveTargetSatisfied: boolean;
    bestWeightedPassScorePercent: number;
    bestWeightedObjectiveScore: number;
  }> = [];
  let globalAttemptIndex = 0;

  for (let stageIndex = 0; stageIndex < profilePlan.length; stageIndex += 1) {
    const profile = profilePlan[stageIndex];
    const stage = stageIndex + 1;
    const stageAttemptBudget =
      args.profile === "auto" && stageIndex > 0 && previousStageSatisfied
        ? Math.max(1, Math.min(args.maxAttempts, args.autoPostPassMaxAttempts))
        : args.maxAttempts;
    const stageAttempts: AttemptSummary[] = [];
    const stageSeedBase =
      baseSeed + stageIndex * args.maxAttempts * args.seedStep;

    for (
      let attemptIndex = 0;
      attemptIndex < stageAttemptBudget;
      attemptIndex += 1
    ) {
      globalAttemptIndex += 1;
      const attemptSeed = stageSeedBase + attemptIndex * args.seedStep;
      const attemptDataScale = computeAttemptDataScale(
        args.profile,
        args.dataScale,
        stageIndex,
        attemptIndex,
        args.autoMaxDataScale
      );
      const result = trainAllRndAiModels({
        profile,
        seed: attemptSeed,
        generatedAt: buildAttemptGeneratedAt(
          args.generatedAt,
          globalAttemptIndex - 1
        ),
        outRoot: args.outRoot,
        invokedBy,
        dataScale: attemptDataScale,
      });
      const scores = computeWeightedScores(result.kpi);
      const stability = buildKpiStabilityReport(result.kpi);
      const attemptSummary: AttemptSummary = {
        attempt: globalAttemptIndex,
        stage,
        profile,
        seed: attemptSeed,
        dataScale: attemptDataScale,
        gatePassed: isGatePassed(result),
        stabilityBufferSatisfied: stability.allSatisfied,
        weightedPassScorePercent: scores.weightedPassScorePercent,
        weightedObjectiveScore: scores.weightedObjectiveScore,
        result,
      };
      attempts.push(attemptSummary);
      stageAttempts.push(attemptSummary);
    }

    const stageRanked = rankAttempts(stageAttempts);
    const stageBest = stageRanked[0];
    const stageScaleStart = stageAttempts[0]?.dataScale ?? args.dataScale;
    const stageScaleEnd =
      stageAttempts[stageAttempts.length - 1]?.dataScale ?? stageScaleStart;
    stageReports.push({
      stage,
      profile,
      stageAttemptBudget,
      stageAttemptCount: stageAttempts.length,
      dataScaleStart: stageScaleStart,
      dataScaleEnd: stageScaleEnd,
      dataScaleCap: args.autoMaxDataScale,
      bestAttempt: stageBest.attempt,
      bestDataScale: stageBest.dataScale,
      bestRunId: stageBest.result.runId,
      bestGatePassed: stageBest.gatePassed,
      bestStabilityBufferSatisfied: stageBest.stabilityBufferSatisfied,
      bestObjectiveTargetSatisfied:
        stageBest.weightedObjectiveScore >=
        args.autoMinWeightedObjectiveScore,
      bestWeightedPassScorePercent: stageBest.weightedPassScorePercent,
      bestWeightedObjectiveScore: stageBest.weightedObjectiveScore,
    });
    previousStageSatisfied =
      stageBest.gatePassed &&
      stageBest.stabilityBufferSatisfied &&
      stageBest.weightedObjectiveScore >= args.autoMinWeightedObjectiveScore;

    if (
      args.profile === "auto" &&
      previousStageSatisfied &&
      stageIndex === profilePlan.length - 1
    ) {
      break;
    }
  }

  if (attempts.length === 0) {
    throw new Error("No training attempts were executed.");
  }

  const ranked = rankAttempts(attempts);
  const selected = ranked[0];
  const selectedStability = buildKpiStabilityReport(selected.result.kpi);
  const selectedObjectiveTargetSatisfied =
    selected.weightedObjectiveScore >= args.autoMinWeightedObjectiveScore;

  const attemptReportPath = path.join(
    selected.result.paths.modelDir,
    "attempt-selection-report.json"
  );
  const attemptReport = {
    selectedAttempt: selected.attempt,
    selectedRunId: selected.result.runId,
    selectedProfile: selected.profile,
    selectedDataScale: selected.dataScale,
    selectedStabilityBufferSatisfied: selected.stabilityBufferSatisfied,
    selectedObjectiveTargetSatisfied,
    selectedStability,
    profileOption: args.profile,
    profilePlan,
    stageReports,
    maxAttempts: args.maxAttempts,
    autoPostPassMaxAttempts: args.autoPostPassMaxAttempts,
    seedStep: args.seedStep,
    baseDataScale: args.dataScale,
    autoMaxDataScale: args.autoMaxDataScale,
    autoMinWeightedObjectiveScore: args.autoMinWeightedObjectiveScore,
    dataScaleStrategy: args.profile === "auto" ? "auto-escalating" : "fixed",
    baseSeed,
    requirePass: args.requirePass,
    requireStabilityBuffer: args.requireStabilityBuffer,
    requireObjectiveTarget: args.requireObjectiveTarget,
    attempts: attempts.map((attempt) => ({
      attempt: attempt.attempt,
      stage: attempt.stage,
      profile: attempt.profile,
      runId: attempt.result.runId,
      seed: attempt.seed,
      dataScale: attempt.dataScale,
      gatePassed: attempt.gatePassed,
      stabilityBufferSatisfied: attempt.stabilityBufferSatisfied,
      weightedPassScorePercent: attempt.weightedPassScorePercent,
      weightedObjectiveScore: attempt.weightedObjectiveScore,
      generatedAt: attempt.result.generatedAt,
      paths: attempt.result.paths,
      kpi: attempt.result.kpi,
      modelMetrics: attempt.result.modelMetrics,
      datasetSummary: attempt.result.datasetSummary,
    })),
  };
  fs.writeFileSync(attemptReportPath, JSON.stringify(attemptReport, null, 2), "utf8");

  const weightedKpis = buildWeightedKpiItems(selected.result.kpi);
  const { weightedPassScorePercent, weightedObjectiveScore } =
    computeWeightedScores(selected.result.kpi);
  const implementationCoverage = buildImplementationCoverageReport(selected.result);
  const dataRequirements = buildDataRequirementMatrix(selected.result);
  const slideEvidenceMap = buildSlideEvidenceMap(
    selected.result,
    implementationCoverage,
    dataRequirements,
    weightedKpis
  );
  const implementationCoveragePath = path.join(
    selected.result.paths.modelDir,
    "tips-implementation-coverage.json"
  );
  const slideEvidenceMapPath = path.join(
    selected.result.paths.modelDir,
    "tips-slide-evidence-map.json"
  );
  const implementationCoveragePayload = {
    title: "TIPS Slide 01-26 Implementation Coverage",
    generatedAt: new Date().toISOString(),
    selectedRunId: selected.result.runId,
    profile: selected.result.profile,
    allSatisfied: implementationCoverage.allSatisfied,
    checks: implementationCoverage.checks,
  };
  fs.writeFileSync(
    implementationCoveragePath,
    JSON.stringify(implementationCoveragePayload, null, 2),
    "utf8"
  );
  const slideEvidenceMapPayload = {
    title: "TIPS Slide Evidence Map",
    reference: {
      sourcePdf: TIPS_SOURCE_PDF_PATH,
      criteriaSlides: TIPS_IMPLEMENTATION_CRITERIA_SLIDES,
      criteriaDoc: "docs/rnd/01_kpi_and_evaluation.md",
    },
    generatedAt: new Date().toISOString(),
    selectedRunId: selected.result.runId,
    profile: selected.result.profile,
    profileOption: args.profile,
    allSatisfied: slideEvidenceMap.allSatisfied,
    items: slideEvidenceMap.items,
  };
  fs.writeFileSync(
    slideEvidenceMapPath,
    JSON.stringify(slideEvidenceMapPayload, null, 2),
    "utf8"
  );
  const tipsSummaryPath = path.join(
    selected.result.paths.modelDir,
    "tips-kpi-evaluation-summary.json"
  );
  const tipsSummary = {
    title: "TIPS KPI Evaluation Summary",
    reference: {
      sourcePdf: TIPS_SOURCE_PDF_PATH,
      source: `TIPS R&D Plan Slides ${TIPS_KPI_CRITERIA_SLIDES}`,
      implementationSlides: TIPS_IMPLEMENTATION_CRITERIA_SLIDES,
      criteriaDoc: "docs/rnd/01_kpi_and_evaluation.md",
    },
    generatedAt: new Date().toISOString(),
    selectedRunId: selected.result.runId,
    profile: selected.result.profile,
    profileOption: args.profile,
    profilePlan,
    stageReports,
    baseDataScale: args.dataScale,
    autoMaxDataScale: args.autoMaxDataScale,
    autoMinWeightedObjectiveScore: args.autoMinWeightedObjectiveScore,
    autoPostPassMaxAttempts: args.autoPostPassMaxAttempts,
    selectedDataScale: selected.dataScale,
    dataScaleStrategy: args.profile === "auto" ? "auto-escalating" : "fixed",
    selectedSeed: selected.seed,
    requirePass: args.requirePass,
    requireStabilityBuffer: args.requireStabilityBuffer,
    requireObjectiveTarget: args.requireObjectiveTarget,
    passGate: selected.gatePassed,
    stabilityBufferSatisfied: selected.stabilityBufferSatisfied,
    objectiveTargetSatisfied: selectedObjectiveTargetSatisfied,
    stabilityThresholds: KPI_STABILITY_THRESHOLDS,
    stability: selectedStability,
    allTargetsSatisfied: selected.result.kpi.allTargetsSatisfied,
    allDataRequirementsSatisfied:
      selected.result.kpi.allDataRequirementsSatisfied,
    weightedPassScorePercent,
    weightedObjectiveScore,
    implementationCoverage,
    dataRequirements,
    slideEvidenceMap,
    kpis: weightedKpis,
    reports: {
      trainReportPath: selected.result.paths.reportPath,
      attemptSelectionReportPath: attemptReportPath,
      datasetConfigPath: selected.result.paths.datasetConfigPath,
      executionEnvironmentPath: selected.result.paths.executionEnvironmentPath,
      implementationCoveragePath,
      slideEvidenceMapPath,
    },
    command: invokedBy,
  };
  fs.writeFileSync(tipsSummaryPath, JSON.stringify(tipsSummary, null, 2), "utf8");

  const modelArtifactChecksums = collectChecksumsForFiles([
    ...buildModelArtifactPaths(selected.result.paths.modelDir),
    attemptReportPath,
    tipsSummaryPath,
    implementationCoveragePath,
    slideEvidenceMapPath,
    selected.result.paths.executionEnvironmentPath,
  ]);
  const datasetArtifactChecksums = collectChecksumsForFiles(
    buildDatasetArtifactPaths(selected.result.paths.dataDir)
  );

  const submissionBundlePath = path.join(
    selected.result.paths.modelDir,
    "tips-evaluation-submission-bundle.json"
  );
  const submissionBundle = {
    title: "TIPS External Evaluation Submission Bundle",
    generatedAt: new Date().toISOString(),
    selectedRunId: selected.result.runId,
    profile: selected.result.profile,
    profileOption: args.profile,
    profilePlan,
    stageReports,
    baseDataScale: args.dataScale,
    autoMaxDataScale: args.autoMaxDataScale,
    autoMinWeightedObjectiveScore: args.autoMinWeightedObjectiveScore,
    autoPostPassMaxAttempts: args.autoPostPassMaxAttempts,
    selectedDataScale: selected.dataScale,
    dataScaleStrategy: args.profile === "auto" ? "auto-escalating" : "fixed",
    seed: selected.result.seed,
    command: invokedBy,
    references: {
      sourcePdf: TIPS_SOURCE_PDF_PATH,
      pdfSlides: `TIPS R&D Plan Slides ${TIPS_KPI_CRITERIA_SLIDES}`,
      implementationSlides: TIPS_IMPLEMENTATION_CRITERIA_SLIDES,
      criteriaDoc: "docs/rnd/01_kpi_and_evaluation.md",
    },
    kpiGate: {
      requirePass: args.requirePass,
      requireStabilityBuffer: args.requireStabilityBuffer,
      requireObjectiveTarget: args.requireObjectiveTarget,
      passGate: selected.gatePassed,
      stabilityBufferSatisfied: selected.stabilityBufferSatisfied,
      objectiveTargetSatisfied: selectedObjectiveTargetSatisfied,
      autoMinWeightedObjectiveScore: args.autoMinWeightedObjectiveScore,
      allTargetsSatisfied: selected.result.kpi.allTargetsSatisfied,
      allDataRequirementsSatisfied:
        selected.result.kpi.allDataRequirementsSatisfied,
      weightedPassScorePercent,
      weightedObjectiveScore,
    },
    weightedKpis,
    implementationCoverage,
    dataRequirements,
    slideEvidenceMap,
    outputs: {
      trainReportPath: selected.result.paths.reportPath,
      tipsSummaryPath,
      attemptReportPath,
      datasetConfigPath: selected.result.paths.datasetConfigPath,
      executionEnvironmentPath: selected.result.paths.executionEnvironmentPath,
      implementationCoveragePath,
      slideEvidenceMapPath,
    },
    checksums: {
      modelArtifacts: modelArtifactChecksums,
      datasetArtifacts: datasetArtifactChecksums,
    },
  };
  fs.writeFileSync(
    submissionBundlePath,
    JSON.stringify(submissionBundle, null, 2),
    "utf8"
  );

  const modelVerification = verifyChecksumList(
    selected.result.paths.modelDir,
    modelArtifactChecksums
  );
  const datasetVerification = verifyChecksumList(
    selected.result.paths.dataDir,
    datasetArtifactChecksums
  );
  const verificationReportPath = path.join(
    selected.result.paths.modelDir,
    "tips-evaluation-submission-verify.json"
  );
  const verificationReport = {
    title: "TIPS Evaluation Submission Verification",
    verifiedAt: new Date().toISOString(),
    submissionBundlePath,
    passed: modelVerification.passed && datasetVerification.passed,
    modelArtifacts: modelVerification,
    datasetArtifacts: datasetVerification,
  };
  fs.writeFileSync(
    verificationReportPath,
    JSON.stringify(verificationReport, null, 2),
    "utf8"
  );
  if (!verificationReport.passed) {
    throw new Error(
      `Submission bundle verification failed. report=${path.resolve(verificationReportPath)}`
    );
  }

  const latestPointerPath = path.resolve("tmp/rnd/latest-train-all-run.json");
  fs.mkdirSync(path.dirname(latestPointerPath), { recursive: true });
  const latestPointer = {
    updatedAt: new Date().toISOString(),
    runId: selected.result.runId,
    profile: selected.result.profile,
    profileOption: args.profile,
    profilePlan,
    stageReports,
    baseDataScale: args.dataScale,
    autoMaxDataScale: args.autoMaxDataScale,
    autoMinWeightedObjectiveScore: args.autoMinWeightedObjectiveScore,
    autoPostPassMaxAttempts: args.autoPostPassMaxAttempts,
    selectedDataScale: selected.dataScale,
    stabilityBufferSatisfied: selected.stabilityBufferSatisfied,
    objectiveTargetSatisfied: selectedObjectiveTargetSatisfied,
    stabilityThresholds: KPI_STABILITY_THRESHOLDS,
    stability: selectedStability,
    dataScaleStrategy: args.profile === "auto" ? "auto-escalating" : "fixed",
    seed: selected.result.seed,
    modelDir: selected.result.paths.modelDir,
    dataDir: selected.result.paths.dataDir,
    reportPath: selected.result.paths.reportPath,
    tipsSummaryPath,
    implementationCoveragePath,
    slideEvidenceMapPath,
    submissionBundlePath,
    verificationReportPath,
    attemptReportPath,
    implementationCoverageSatisfied: implementationCoverage.allSatisfied,
    dataRequirementsSatisfied: dataRequirements.allSatisfied,
    slideEvidenceSatisfied: slideEvidenceMap.allSatisfied,
  };
  fs.writeFileSync(latestPointerPath, JSON.stringify(latestPointer, null, 2), "utf8");

  const pretty = {
    runId: selected.result.runId,
    profile: selected.result.profile,
    profileOption: args.profile,
    profilePlan,
    stageReports,
    baseDataScale: args.dataScale,
    autoMaxDataScale: args.autoMaxDataScale,
    autoMinWeightedObjectiveScore: args.autoMinWeightedObjectiveScore,
    autoPostPassMaxAttempts: args.autoPostPassMaxAttempts,
    selectedDataScale: selected.dataScale,
    stabilityBufferSatisfied: selected.stabilityBufferSatisfied,
    objectiveTargetSatisfied: selectedObjectiveTargetSatisfied,
    stabilityThresholds: KPI_STABILITY_THRESHOLDS,
    stability: selectedStability,
    dataScaleStrategy: args.profile === "auto" ? "auto-escalating" : "fixed",
    seed: selected.result.seed,
    generatedAt: selected.result.generatedAt,
    dataDir: path.resolve(selected.result.paths.dataDir),
    modelDir: path.resolve(selected.result.paths.modelDir),
    reportPath: path.resolve(selected.result.paths.reportPath),
    datasetConfigPath: path.resolve(selected.result.paths.datasetConfigPath),
    executionEnvironmentPath: path.resolve(
      selected.result.paths.executionEnvironmentPath
    ),
    attemptReportPath: path.resolve(attemptReportPath),
    tipsSummaryPath: path.resolve(tipsSummaryPath),
    implementationCoveragePath: path.resolve(implementationCoveragePath),
    submissionBundlePath: path.resolve(submissionBundlePath),
    verificationReportPath: path.resolve(verificationReportPath),
    latestPointerPath: path.resolve(latestPointerPath),
    kpi: selected.result.kpi,
    modelMetrics: selected.result.modelMetrics,
    datasetSummary: selected.result.datasetSummary,
    requirePass: args.requirePass,
    requireStabilityBuffer: args.requireStabilityBuffer,
    requireObjectiveTarget: args.requireObjectiveTarget,
    maxAttempts: args.maxAttempts,
    seedStep: args.seedStep,
    selectedAttempt: selected.attempt,
    weightedPassScorePercent,
    weightedObjectiveScore,
    implementationCoverageSatisfied: implementationCoverage.allSatisfied,
    dataRequirements,
    attempts: attempts.map((attempt) => ({
      attempt: attempt.attempt,
      stage: attempt.stage,
      profile: attempt.profile,
      runId: attempt.result.runId,
      seed: attempt.seed,
      dataScale: attempt.dataScale,
      gatePassed: attempt.gatePassed,
      stabilityBufferSatisfied: attempt.stabilityBufferSatisfied,
      weightedPassScorePercent: attempt.weightedPassScorePercent,
      weightedObjectiveScore: attempt.weightedObjectiveScore,
      recommendationAccuracyPercent:
        attempt.result.kpi.recommendationAccuracyPercent,
      efficacyScgiPp: attempt.result.kpi.efficacyScgiPp,
      actionAccuracyPercent: attempt.result.kpi.actionAccuracyPercent,
      llmAccuracyPercent: attempt.result.kpi.llmAccuracyPercent,
      referenceAccuracyPercent: attempt.result.kpi.referenceAccuracyPercent,
      adverseEventCountPerYear: attempt.result.kpi.adverseEventCountPerYear,
      integrationRatePercent: attempt.result.kpi.integrationRatePercent,
      allTargetsSatisfied: attempt.result.kpi.allTargetsSatisfied,
      allDataRequirementsSatisfied:
        attempt.result.kpi.allDataRequirementsSatisfied,
    })),
  };

  process.stdout.write(`${JSON.stringify(pretty, null, 2)}\n`);

  if (args.requirePass && !selected.gatePassed) {
    throw new Error(
      `KPI gate failed after ${args.maxAttempts} attempt(s). Best run=${selected.result.runId}, weightedPassScorePercent=${selected.weightedPassScorePercent}, report=${path.resolve(selected.result.paths.reportPath)}.`
    );
  }
  if (args.requireStabilityBuffer && !selected.stabilityBufferSatisfied) {
    throw new Error(
      `Stability buffer gate failed after ${args.maxAttempts} attempt(s). Best run=${selected.result.runId}, weightedObjectiveScore=${selected.weightedObjectiveScore}, report=${path.resolve(selected.result.paths.reportPath)}.`
    );
  }
  if (args.requireObjectiveTarget && !selectedObjectiveTargetSatisfied) {
    throw new Error(
      `Objective target gate failed after ${args.maxAttempts} attempt(s). Best run=${selected.result.runId}, weightedObjectiveScore=${selected.weightedObjectiveScore}, required>=${args.autoMinWeightedObjectiveScore}, report=${path.resolve(selected.result.paths.reportPath)}.`
    );
  }
  if (args.requirePass && !implementationCoverage.allSatisfied) {
    throw new Error(
      `Implementation coverage gate failed. run=${selected.result.runId}, report=${path.resolve(implementationCoveragePath)}.`
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
