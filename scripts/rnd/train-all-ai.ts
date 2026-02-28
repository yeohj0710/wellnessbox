import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  trainAllRndAiModels,
  type TrainAllAiResult,
  type TrainProfile,
} from "../../lib/rnd/ai-training/pipeline";

const KPI_TARGETS = {
  recommendationAccuracyPercent: 80,
  efficacyScgiPp: 0,
  actionAccuracyPercent: 80,
  llmAccuracyPercent: 91,
  referenceAccuracyPercent: 95,
  adverseEventCountPerYearMax: 5,
  integrationRatePercent: 90,
} as const;

const KPI_WEIGHTS = {
  recommendationAccuracyPercent: 20,
  efficacyScgiPp: 20,
  actionAccuracyPercent: 20,
  llmAccuracyPercent: 20,
  referenceAccuracyPercent: 10,
  adverseEventCountPerYear: 5,
  integrationRatePercent: 5,
} as const;

const KPI_STABILITY_THRESHOLDS = {
  recommendationAccuracyPercent: 85,
  efficacyScgiPp: 5,
  actionAccuracyPercent: 85,
  llmAccuracyPercent: 94,
  referenceAccuracyPercent: 97,
  adverseEventCountPerYearMax: 4,
  integrationRatePercent: 92,
} as const;

const DEFAULT_MAX_ATTEMPTS_BY_PROFILE: Record<TrainProfile, number> = {
  smoke: 3,
  standard: 3,
  max: 3,
};
const AUTO_PROFILE_STAGE_DATA_SCALE_STEP = 0.5;
const AUTO_PROFILE_ATTEMPT_DATA_SCALE_STEP = 0.3;
const DEFAULT_AUTO_MAX_DATA_SCALE = 3.2;
const DEFAULT_AUTO_MIN_WEIGHTED_OBJECTIVE_SCORE = 125.9;
const ADVERSE_EVENT_WINDOW_MIN_COVERAGE_DAYS = 300;

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

type KpiStabilityReport = {
  recommendationAccuracySatisfied: boolean;
  efficacyScgiSatisfied: boolean;
  actionAccuracySatisfied: boolean;
  llmAccuracySatisfied: boolean;
  referenceAccuracySatisfied: boolean;
  adverseEventCountSatisfied: boolean;
  integrationRateSatisfied: boolean;
  allSatisfied: boolean;
};

type CoverageCheck = {
  id: string;
  slideRange: string;
  description: string;
  satisfied: boolean;
  evidence: Record<string, unknown>;
};

type WeightedKpiItem = {
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

type DataRequirementItem = {
  id: string;
  slideRange: string;
  requirement: string;
  measuredValue: number | boolean;
  targetDescription: string;
  satisfied: boolean;
  evidence?: Record<string, unknown>;
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

function buildKpiStabilityReport(
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
    kpi.referenceAccuracyPercent >= KPI_STABILITY_THRESHOLDS.referenceAccuracyPercent;
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

function positiveImprovementObjectiveRate(efficacyScgiPp: number): number {
  if (efficacyScgiPp > 0) {
    return 1 + clamp(efficacyScgiPp / 20, 0, 1.5);
  }
  return clamp(efficacyScgiPp / 10, -1, 0);
}

function computeWeightedScores(kpi: TrainAllAiResult["kpi"]): {
  weightedPassScorePercent: number;
  weightedObjectiveScore: number;
} {
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

function buildWeightedKpiItems(kpi: TrainAllAiResult["kpi"]): WeightedKpiItem[] {
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

function buildImplementationCoverageReport(result: TrainAllAiResult): {
  allSatisfied: boolean;
  checks: CoverageCheck[];
} {
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
        adverseEventWindowMinCoverageDays: ADVERSE_EVENT_WINDOW_MIN_COVERAGE_DAYS,
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

function buildDataRequirementMatrix(result: TrainAllAiResult): {
  allSatisfied: boolean;
  items: DataRequirementItem[];
} {
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
      targetDescription: `>= ${ADVERSE_EVENT_WINDOW_MIN_COVERAGE_DAYS} days`,
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
  const weightedPassScorePercent = roundTo(
    weightedKpis.reduce(
      (sum, item) => sum + item.weightedPassContributionPercent,
      0
    ),
    2
  );
  const weightedObjectiveScore = roundTo(
    weightedKpis.reduce(
      (sum, item) => sum + item.weightedObjectiveContribution,
      0
    ),
    4
  );
  const implementationCoverage = buildImplementationCoverageReport(selected.result);
  const dataRequirements = buildDataRequirementMatrix(selected.result);
  const implementationCoveragePath = path.join(
    selected.result.paths.modelDir,
    "tips-implementation-coverage.json"
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
  const tipsSummaryPath = path.join(
    selected.result.paths.modelDir,
    "tips-kpi-evaluation-summary.json"
  );
  const tipsSummary = {
    title: "TIPS KPI Evaluation Summary",
    reference: {
      source: "TIPS R&D Plan Slides 25-26",
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
    kpis: weightedKpis,
    reports: {
      trainReportPath: selected.result.paths.reportPath,
      attemptSelectionReportPath: attemptReportPath,
      datasetConfigPath: selected.result.paths.datasetConfigPath,
      executionEnvironmentPath: selected.result.paths.executionEnvironmentPath,
      implementationCoveragePath,
    },
    command: invokedBy,
  };
  fs.writeFileSync(tipsSummaryPath, JSON.stringify(tipsSummary, null, 2), "utf8");

  const modelArtifactChecksums = collectChecksumsForFiles([
    ...buildModelArtifactPaths(selected.result.paths.modelDir),
    attemptReportPath,
    tipsSummaryPath,
    implementationCoveragePath,
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
      pdfSlides: "TIPS R&D Plan Slides 25-26",
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
    outputs: {
      trainReportPath: selected.result.paths.reportPath,
      tipsSummaryPath,
      attemptReportPath,
      datasetConfigPath: selected.result.paths.datasetConfigPath,
      executionEnvironmentPath: selected.result.paths.executionEnvironmentPath,
      implementationCoveragePath,
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
    submissionBundlePath,
    verificationReportPath,
    attemptReportPath,
    implementationCoverageSatisfied: implementationCoverage.allSatisfied,
    dataRequirementsSatisfied: dataRequirements.allSatisfied,
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
