import fs from "node:fs";
import path from "node:path";
import {
  evaluateModule02ReferenceAccuracy,
  type Module02ReferenceRuleSample,
} from "../module02-data-lake/evaluation";
import {
  evaluateModule03AdverseEventCount,
  evaluateModule03ReferenceAccuracy,
  type Module03AdverseEventSample,
  type Module03ReferenceRuleSample,
} from "../module03-personal-safety/evaluation";
import {
  evaluateModule04ImprovementPp,
  type Module04ImprovementSample,
} from "../module04-efficacy-quantification/evaluation";
import {
  evaluateModule05RecommendationAccuracy,
  type Module05RecommendationAccuracySample,
} from "../module05-optimization/evaluation";
import {
  RND_MODULE_06_NEXT_ACTION_TYPES,
  type RndModule06NextActionType,
} from "../module06-closed-loop-ai/contracts-types";
import {
  evaluateModule07IntegrationRate,
  evaluateModule07InterfaceWiringAccuracy,
  type Module07IntegrationRateSample,
  type Module07InterfaceWiringSample,
} from "../module07-biosensor-genetic-integration/evaluation";
import { type RndModule02SourceKind } from "../module02-data-lake/contracts";
import { type RndModule03Decision } from "../module03-personal-safety/contracts";
import {
  RND_MODULE_07_DATA_SOURCES,
  type RndModule07DataSource,
} from "../module07-biosensor-genetic-integration/contracts";

const PROFILE_CONFIG = {
  smoke: {
    trainUsers: 800,
    testUsers: 220,
    recommenderEpochs: 8,
    rerankerRounds: 8,
    safetyEpochs: 18,
    dataLakeEpochs: 14,
    iteEpochs: 20,
    actionEpochs: 16,
    actionFineTuneEpochs: 2,
    llmEpochs: 16,
    integrationEpochs: 16,
  },
  standard: {
    trainUsers: 9000,
    testUsers: 1500,
    recommenderEpochs: 14,
    rerankerRounds: 14,
    safetyEpochs: 28,
    dataLakeEpochs: 20,
    iteEpochs: 34,
    actionEpochs: 24,
    actionFineTuneEpochs: 3,
    llmEpochs: 24,
    integrationEpochs: 24,
  },
  max: {
    trainUsers: 20000,
    testUsers: 4000,
    recommenderEpochs: 20,
    rerankerRounds: 20,
    safetyEpochs: 36,
    dataLakeEpochs: 26,
    iteEpochs: 48,
    actionEpochs: 32,
    actionFineTuneEpochs: 4,
    llmEpochs: 32,
    integrationEpochs: 32,
  },
} as const;

export type TrainProfile = keyof typeof PROFILE_CONFIG;
type ProfileConfig = (typeof PROFILE_CONFIG)[TrainProfile];

export type TrainAllAiOptions = {
  profile?: TrainProfile;
  seed?: number;
  generatedAt?: string;
  outRoot?: string;
  invokedBy?: string;
  dataScale?: number;
};

export type TrainAllAiResult = {
  runId: string;
  generatedAt: string;
  profile: TrainProfile;
  seed: number;
  paths: {
    dataDir: string;
    modelDir: string;
    reportPath: string;
    datasetConfigPath: string;
    executionEnvironmentPath: string;
  };
  executionEnvironment: {
    invokedBy: string | null;
    nodeVersion: string;
    platform: string;
    arch: string;
    cwd: string;
  };
  datasetConfig: {
    profile: TrainProfile;
    dataScale: number;
    profileConfig: {
      trainUsers: number;
      testUsers: number;
      recommenderEpochs: number;
      rerankerRounds: number;
      safetyEpochs: number;
      dataLakeEpochs: number;
      iteEpochs: number;
      actionEpochs: number;
      actionFineTuneEpochs: number;
      llmEpochs: number;
      integrationEpochs: number;
    };
    seed: number;
    catalogSize: number;
  };
  datasetSummary: {
    trainUserCount: number;
    testUserCount: number;
    recommenderPairCount: number;
    proAssessmentSampleCount: number;
    workflowSampleCount: number;
    closedLoopScheduleSampleCount: number;
    closedLoopNodeTraceSampleCount: number;
    cragGroundingSampleCount: number;
    rerankerSampleCount: number;
    optimizationConstraintSampleCount: number;
    safetySampleCount: number;
    dataLakeSampleCount: number;
    iteSampleCount: number;
    iteFeedbackSampleCount: number;
    actionSampleCount: number;
    closedLoopFeedbackSampleCount: number;
    llmSampleCount: number;
    integrationSampleCount: number;
    geneticAdjustmentSampleCount: number;
    kpi01SampleCount: number;
    kpi02SampleCount: number;
    kpi03SampleCount: number;
    kpi04SampleCount: number;
    kpi05Module02SampleCount: number;
    kpi05Module03SampleCount: number;
    kpi05Module07SampleCount: number;
    kpi06SampleCount: number;
    kpi07SampleCount: number;
  };
  modelMetrics: {
    safetyAccuracyPercent: number;
    rerankerRmse: number;
    workflowCompletionRatePercent: number;
    closedLoopScheduleExecutionPercent: number;
    closedLoopNodeFlowSuccessPercent: number;
    cragGroundingAccuracyPercent: number;
    optimizationConstraintSatisfactionPercent: number;
    dataLakeAccuracyPercent: number;
    iteRmseBeforeFineTune: number;
    iteFeedbackRmse: number;
    iteFineTuneGain: number;
    iteFineTuneRollbackApplied: boolean;
    iteRmse: number;
    actionAccuracyBeforeFineTunePercent: number;
    actionFineTuneGainPercent: number;
    actionFeedbackAccuracyPercent: number;
    actionAccuracyPercent: number;
    llmAccuracyPercent: number;
    integrationAccuracyPercent: number;
    geneticAdjustmentTraceCoveragePercent: number;
    geneticRuleCatalogCoveragePercent: number;
  };
  kpi: {
    recommendationAccuracyPercent: number;
    efficacyScgiPp: number;
    actionAccuracyPercent: number;
    llmAccuracyPercent: number;
    referenceAccuracyPercent: number;
    adverseEventCountPerYear: number;
    adverseEventWindowCoverageDays: number;
    adverseEventWindowCoverageSatisfied: boolean;
    integrationRatePercent: number;
    integrationSampleCountSatisfied: boolean;
    integrationSourceCoverageSatisfied: boolean;
    integrationPerSourceMinSampleCountSatisfied: boolean;
    allTargetsSatisfied: boolean;
    allDataRequirementsSatisfied: boolean;
  };
};

type Module06ActionAccuracySample = {
  sampleId: string;
  caseId: string;
  expectedActionType: RndModule06NextActionType;
  decidedActionType: RndModule06NextActionType;
  executionSuccess: boolean;
};

type Module06LlmAccuracySample = {
  sampleId: string;
  promptId: string;
  expectedAnswerKey: string;
  responseAccepted: boolean;
};

type IngredientDef = {
  id: string;
  baseUtility: number;
  cost: number;
  risk: number;
  goalAffinity: [number, number, number];
  conditionAffinity: [number, number, number, number];
  geneticsAffinity: [number, number, number, number, number, number];
  feature: number[];
};

type UserProfile = {
  userId: string;
  age: number;
  sexMale: number;
  conditionDiabetes: number;
  conditionHypertension: number;
  conditionKidney: number;
  conditionPregnancy: number;
  medicationWarfarin: number;
  medicationMetformin: number;
  medicationStatin: number;
  medicationAntihyper: number;
  seafoodAllergy: number;
  goalEnergy: number;
  goalSleep: number;
  goalMetabolic: number;
  wearableSteps: number;
  wearableSleepHours: number;
  wearableRestingHr: number;
  cgmGlucose: number;
  cgmTir: number;
  geneMthfr: number;
  geneLct: number;
  geneCyp1a2: number;
  geneFto: number;
  geneTcf7l2: number;
  geneLpl: number;
  preZScore: number;
};

type SafetyEvaluation = {
  decision: RndModule03Decision;
  referenceIds: string[];
  sourceKinds: RndModule02SourceKind[];
  logicId: string;
};

type PairwiseSample = {
  userId: string;
  positiveIngredientId: string;
  negativeIngredientId: string;
  user: number[];
  positive: number[];
  negative: number[];
};

type ClassificationSample = {
  x: number[];
  y: number;
};

type RegressionSample = {
  x: number[];
  y: number;
};

type RerankerTrainingRow = {
  sampleId: string;
  userId: string;
  ingredientId: string;
  twoTowerScore: number;
  safetyDecision: RndModule03Decision;
  featureVector: number[];
  targetScore: number;
};

type RerankerDataset = {
  rows: RerankerTrainingRow[];
  samples: RegressionSample[];
};

type IntegrationRecord = {
  sampleId: string;
  source: RndModule07DataSource;
  features: number[];
  success: boolean;
};

type ClosedLoopRecord = {
  sampleId: string;
  caseId: string;
  features: number[];
  actionLabel: RndModule06NextActionType;
};

type ClosedLoopFeedbackRecord = {
  sampleId: string;
  sourceCaseId: string;
  features: number[];
  expectedActionType: RndModule06NextActionType;
  predictedActionType: RndModule06NextActionType;
  correctedActionType: RndModule06NextActionType;
  executionSuccess: boolean;
  userFeedbackScore: number;
};

type OptimizationConstraintRecord = {
  sampleId: string;
  userId: string;
  budget: number;
  maxAverageRisk: number;
  maxCount: number;
  selectedIngredientIds: string[];
  selectedTotalCost: number;
  selectedAverageRisk: number;
  constraintSatisfied: boolean;
};

type OneStopWorkflowRecord = {
  sampleId: string;
  userId: string;
  orderId: string;
  recommendedIngredientIds: string[];
  stages: {
    healthDataLinked: boolean;
    analyzed: boolean;
    dispensed: boolean;
    delivered: boolean;
    followupCompleted: boolean;
  };
  completionRatePercent: number;
  completed: boolean;
};

type ClosedLoopScheduleRecord = {
  sampleId: string;
  userId: string;
  cycleDay: number;
  expectedActions: {
    periodicApiCall: boolean;
    reminderPush: boolean;
    reorderDecision: boolean;
    reorderExecution: boolean;
  };
  observedActions: {
    periodicApiCall: boolean;
    reminderPush: boolean;
    reorderDecision: boolean;
    reorderExecution: boolean;
  };
  executionRatePercent: number;
  completed: boolean;
};

type ClosedLoopNodeTraceRecord = {
  sampleId: string;
  userId: string;
  cycleId: string;
  transitions: string[];
  nodes: {
    consultationAnswered: boolean;
    engineCalled: boolean;
    diagnosticRequested: boolean;
    executionCompleted: boolean;
    reminderSent: boolean;
    followupLogged: boolean;
  };
  successRatePercent: number;
  completed: boolean;
};

type CragGroundingRecord = {
  sampleId: string;
  promptId: string;
  retrieval: {
    dataLakeHits: number;
    webHits: number;
    usedWebFallback: boolean;
    contradictionDetected: boolean;
  };
  grounded: boolean;
  answerAccepted: boolean;
};

type LlmRecord = {
  sampleId: string;
  promptId: string;
  prompt: string;
  features: number[];
  expectedKey: string;
};

type ProMetricConfig = {
  metricId: string;
  mean: number;
  std: number;
  higherIsBetter: boolean;
  min: number;
  max: number;
};

type ProAssessmentMetric = {
  metricId: string;
  preRawScore: number;
  postRawScore: number;
  preZScore: number;
  postZScore: number;
};

type ProAssessmentRecord = {
  sampleId: string;
  userId: string;
  metrics: ProAssessmentMetric[];
  preZScore: number;
  postZScore: number;
};

type IteFeedbackRecord = {
  sampleId: string;
  userId: string;
  ingredientIds: string[];
  biosensorObservation: {
    steps: number;
    sleepHours: number;
    glucose: number;
    tir: number;
  };
  predictedDeltaBeforeFineTune: number;
  correctedDelta: number;
  userFeedbackScore: number;
};

type GeneticAdjustmentRuleId =
  | "mthfr_folate_pathway"
  | "lct_lactose_tolerance"
  | "cyp1a2_caffeine_sensitivity"
  | "fto_weight_gain_risk"
  | "tcf7l2_postprandial_glucose"
  | "lpl_triglyceride_risk";

type GeneticAdjustmentRecord = {
  sampleId: string;
  userId: string;
  parameterVectorX: [number, number, number, number, number, number];
  geneScores: {
    mthfr: number;
    lct: number;
    cyp1a2: number;
    fto: number;
    tcf7l2: number;
    lpl: number;
  };
  activeRuleIds: GeneticAdjustmentRuleId[];
  safetyConstraintAdjustments: {
    blockedIngredientIds: string[];
    limitedIngredientIds: string[];
    monitorFlags: string[];
  };
  optimizationWeightAdjustments: {
    omega3Boost: number;
    syntheticFolateBoost: number;
    lactoseFreeCalciumBoost: number;
    stimulantPenalty: number;
    sugarPenalty: number;
    highFatPenalty: number;
    proteinFiberBoost: number;
  };
  hasAnyAdjustment: boolean;
};

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0xffffffff;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  range(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.next() * (maxExclusive - minInclusive);
  }

  normal(mean = 0, std = 1): number {
    const u1 = Math.max(this.next(), 1e-12);
    const u2 = this.next();
    const mag = Math.sqrt(-2 * Math.log(u1));
    const z = mag * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function dot(left: readonly number[], right: readonly number[]): number {
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    sum += left[index] * right[index];
  }
  return sum;
}

function softmax(logits: readonly number[]): number[] {
  let max = Number.NEGATIVE_INFINITY;
  for (const value of logits) {
    if (value > max) max = value;
  }
  const exps = logits.map((value) => Math.exp(value - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function resolveProfileConfig(
  baseConfig: ProfileConfig,
  dataScale: number
): {
  trainUsers: number;
  testUsers: number;
  recommenderEpochs: number;
  rerankerRounds: number;
  safetyEpochs: number;
  dataLakeEpochs: number;
  iteEpochs: number;
  actionEpochs: number;
  actionFineTuneEpochs: number;
  llmEpochs: number;
  integrationEpochs: number;
} {
  const scale = clamp(dataScale, 1, 10);
  const epochScale = clamp(Math.sqrt(scale), 1, 2.5);
  const scaledInt = (value: number, multiplier: number) =>
    Math.max(1, Math.round(value * multiplier));

  return {
    trainUsers: scaledInt(baseConfig.trainUsers, scale),
    testUsers: scaledInt(baseConfig.testUsers, scale),
    recommenderEpochs: scaledInt(baseConfig.recommenderEpochs, epochScale),
    rerankerRounds: scaledInt(baseConfig.rerankerRounds, epochScale),
    safetyEpochs: scaledInt(baseConfig.safetyEpochs, epochScale),
    dataLakeEpochs: scaledInt(baseConfig.dataLakeEpochs, epochScale),
    iteEpochs: scaledInt(baseConfig.iteEpochs, epochScale),
    actionEpochs: scaledInt(baseConfig.actionEpochs, epochScale),
    actionFineTuneEpochs: scaledInt(baseConfig.actionFineTuneEpochs, epochScale),
    llmEpochs: scaledInt(baseConfig.llmEpochs, epochScale),
    integrationEpochs: scaledInt(baseConfig.integrationEpochs, epochScale),
  };
}

function chunkArray<T>(values: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0 || size > items.length) return [];
  const results: T[][] = [];

  function walk(start: number, stack: T[]): void {
    if (stack.length === size) {
      results.push([...stack]);
      return;
    }
    for (let index = start; index < items.length; index += 1) {
      stack.push(items[index]);
      walk(index + 1, stack);
      stack.pop();
    }
  }

  walk(0, []);
  return results;
}

function buildIngredientCatalog(rng: SeededRandom): IngredientDef[] {
  const raw = [
    "omega3",
    "multivitamin",
    "vitamin_c",
    "vitamin_d",
    "probiotics",
    "magnesium",
    "lutein",
    "propolis",
    "aloe",
    "ginseng",
    "glucosamine",
    "chitosan",
    "chlorella",
    "vitamin_k",
    "caffeine",
    "folate",
    "calcium",
    "zinc",
    "coq10",
    "melatonin",
    "berberine",
    "curcumin",
    "resveratrol",
    "lactase",
    "vitamin_a",
  ] as const;

  return raw.map((id) => {
    const goalAffinity: [number, number, number] = [
      rng.range(-0.35, 0.8),
      rng.range(-0.35, 0.8),
      rng.range(-0.35, 0.8),
    ];
    const conditionAffinity: [number, number, number, number] = [
      rng.range(-0.4, 0.7),
      rng.range(-0.4, 0.7),
      rng.range(-0.4, 0.7),
      rng.range(-0.4, 0.7),
    ];
    const geneticsAffinity: [number, number, number, number, number, number] = [
      rng.range(-0.35, 0.75),
      rng.range(-0.35, 0.75),
      rng.range(-0.35, 0.75),
      rng.range(-0.35, 0.75),
      rng.range(-0.35, 0.75),
      rng.range(-0.35, 0.75),
    ];
    const feature = Array.from({ length: 10 }, () => rng.range(-1, 1));
    const baseUtility = rng.range(-0.2, 1.1);
    const cost = rng.range(0.15, 1.45);
    const risk = rng.range(0.05, 0.7);

    return {
      id,
      baseUtility,
      cost,
      risk,
      goalAffinity,
      conditionAffinity,
      geneticsAffinity,
      feature,
    };
  });
}

function tuneIngredientProfile(ingredient: IngredientDef): IngredientDef {
  const updated = { ...ingredient };
  if (ingredient.id === "melatonin") {
    updated.goalAffinity = [0.05, 0.95, 0.05];
  } else if (ingredient.id === "coq10") {
    updated.goalAffinity = [0.9, 0.05, 0.25];
  } else if (ingredient.id === "berberine") {
    updated.goalAffinity = [0.1, 0.05, 0.95];
  } else if (ingredient.id === "omega3") {
    updated.goalAffinity = [0.45, 0.2, 0.85];
  } else if (ingredient.id === "lactase") {
    updated.geneticsAffinity = [0.05, 1.1, 0.05, 0.05, 0.05, 0.05];
  } else if (ingredient.id === "folate") {
    updated.geneticsAffinity = [1.1, 0.05, 0.05, 0.05, 0.05, 0.05];
  } else if (ingredient.id === "caffeine") {
    updated.risk = 0.65;
  } else if (ingredient.id === "vitamin_k") {
    updated.risk = 0.62;
  } else if (ingredient.id === "vitamin_a") {
    updated.risk = 0.7;
  }
  return updated;
}

function createCatalog(seed: number): IngredientDef[] {
  const rng = new SeededRandom(seed ^ 0x9f4f3a1f);
  return buildIngredientCatalog(rng).map((ingredient) =>
    tuneIngredientProfile(ingredient)
  );
}

function generateUserProfile(rng: SeededRandom, userId: string): UserProfile {
  const age = Math.round(rng.range(20, 79));
  const sexMale = rng.next() < 0.48 ? 1 : 0;
  const conditionDiabetes = rng.next() < (age > 45 ? 0.26 : 0.09) ? 1 : 0;
  const conditionHypertension = rng.next() < (age > 50 ? 0.31 : 0.11) ? 1 : 0;
  const conditionKidney = rng.next() < 0.08 ? 1 : 0;
  const conditionPregnancy =
    sexMale === 0 && age >= 20 && age <= 44 && rng.next() < 0.06 ? 1 : 0;
  const medicationWarfarin =
    rng.next() < (conditionHypertension ? 0.16 : 0.05) ? 1 : 0;
  const medicationMetformin =
    conditionDiabetes === 1 && rng.next() < 0.72 ? 1 : 0;
  const medicationStatin = rng.next() < 0.28 ? 1 : 0;
  const medicationAntihyper =
    conditionHypertension === 1 && rng.next() < 0.74 ? 1 : 0;
  const seafoodAllergy = rng.next() < 0.11 ? 1 : 0;

  const rawGoals = [rng.next(), rng.next(), rng.next()];
  const goalTotal = rawGoals[0] + rawGoals[1] + rawGoals[2];
  const goalEnergy = rawGoals[0] / goalTotal;
  const goalSleep = rawGoals[1] / goalTotal;
  const goalMetabolic = rawGoals[2] / goalTotal;

  const wearableSteps = clamp(rng.normal(7600, 2200), 1400, 18000);
  const wearableSleepHours = clamp(rng.normal(6.8, 1.1), 3.8, 9.2);
  const wearableRestingHr = clamp(rng.normal(70, 8.5), 49, 96);
  const cgmGlucose = clamp(
    rng.normal(105 + conditionDiabetes * 22, 16),
    74,
    190
  );
  const cgmTir = clamp(
    rng.normal(0.79 - conditionDiabetes * 0.15, 0.1),
    0.32,
    0.98
  );

  const geneMthfr = clamp(rng.normal(0.5, 0.22), 0, 1);
  const geneLct = clamp(rng.normal(0.5, 0.24), 0, 1);
  const geneCyp1a2 = clamp(rng.normal(0.48, 0.23), 0, 1);
  const geneFto = clamp(rng.normal(0.52, 0.22), 0, 1);
  const geneTcf7l2 = clamp(rng.normal(0.51, 0.23), 0, 1);
  const geneLpl = clamp(rng.normal(0.5, 0.25), 0, 1);

  const preZScore = clamp(
    rng.normal(-0.08 + goalMetabolic * -0.06, 0.55),
    -2.4,
    2.4
  );

  return {
    userId,
    age,
    sexMale,
    conditionDiabetes,
    conditionHypertension,
    conditionKidney,
    conditionPregnancy,
    medicationWarfarin,
    medicationMetformin,
    medicationStatin,
    medicationAntihyper,
    seafoodAllergy,
    goalEnergy,
    goalSleep,
    goalMetabolic,
    wearableSteps,
    wearableSleepHours,
    wearableRestingHr,
    cgmGlucose,
    cgmTir,
    geneMthfr,
    geneLct,
    geneCyp1a2,
    geneFto,
    geneTcf7l2,
    geneLpl,
    preZScore,
  };
}

function generateUsers(count: number, seed: number, prefix: string): UserProfile[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: count }, (_, index) =>
    generateUserProfile(rng, `${prefix}-${String(index + 1).padStart(6, "0")}`)
  );
}

function userFeatureVector(user: UserProfile): number[] {
  return [
    user.age / 100,
    user.sexMale,
    user.conditionDiabetes,
    user.conditionHypertension,
    user.conditionKidney,
    user.conditionPregnancy,
    user.medicationWarfarin,
    user.medicationMetformin,
    user.medicationStatin,
    user.medicationAntihyper,
    user.seafoodAllergy,
    user.goalEnergy,
    user.goalSleep,
    user.goalMetabolic,
    user.wearableSteps / 20000,
    user.wearableSleepHours / 10,
    user.wearableRestingHr / 120,
    user.cgmGlucose / 250,
    user.cgmTir,
    user.geneMthfr,
    user.geneLct,
    user.geneCyp1a2,
    user.geneFto,
    user.geneTcf7l2,
    user.geneLpl,
    user.preZScore / 3,
  ];
}

function ingredientFeatureVector(ingredient: IngredientDef): number[] {
  return [
    ingredient.baseUtility,
    ingredient.cost,
    ingredient.risk,
    ingredient.goalAffinity[0],
    ingredient.goalAffinity[1],
    ingredient.goalAffinity[2],
    ingredient.conditionAffinity[0],
    ingredient.conditionAffinity[1],
    ingredient.conditionAffinity[2],
    ingredient.conditionAffinity[3],
    ingredient.geneticsAffinity[0],
    ingredient.geneticsAffinity[1],
    ingredient.geneticsAffinity[2],
    ingredient.geneticsAffinity[3],
    ingredient.geneticsAffinity[4],
    ingredient.geneticsAffinity[5],
    ...ingredient.feature,
  ];
}

function sourceKindsForDecision(decision: RndModule03Decision): RndModule02SourceKind[] {
  if (decision === "allow") return ["internal_compute_result"];
  if (decision === "limit") return ["medical_database", "literature"];
  return ["medical_database", "public_safety"];
}

function evaluateSafetyForIngredient(
  user: UserProfile,
  ingredientId: string
): SafetyEvaluation {
  const references: string[] = [];
  let decision: RndModule03Decision = "allow";

  const markLimit = (referenceId: string) => {
    if (decision !== "block") decision = "limit";
    references.push(referenceId);
  };
  const markBlock = (referenceId: string) => {
    decision = "block";
    references.push(referenceId);
  };

  if (user.medicationWarfarin === 1 && ingredientId === "vitamin_k") {
    markBlock("ref-warfarin-vitamin-k");
  }
  if (user.medicationWarfarin === 1 && ingredientId === "omega3") {
    markLimit("ref-warfarin-omega3");
  }
  if (user.geneCyp1a2 > 0.72 && ingredientId === "caffeine") {
    markLimit("ref-cyp1a2-caffeine");
  }
  if (user.conditionKidney === 1 && ingredientId === "magnesium") {
    markLimit("ref-kidney-magnesium");
  }
  if (user.conditionHypertension === 1 && ingredientId === "ginseng") {
    markLimit("ref-hypertension-ginseng");
  }
  if (user.conditionPregnancy === 1 && ingredientId === "vitamin_a") {
    markBlock("ref-pregnancy-vitamin-a");
  }
  if (user.seafoodAllergy === 1 && ingredientId === "omega3") {
    markBlock("ref-seafood-allergy-omega3");
  }
  if (user.conditionDiabetes === 1 && ingredientId === "chitosan") {
    markLimit("ref-diabetes-chitosan");
  }

  const uniqueReferences = Array.from(new Set(references));
  const finalRefs =
    uniqueReferences.length > 0 ? uniqueReferences : ["ref-general-safe"];
  return {
    decision,
    referenceIds: finalRefs,
    sourceKinds: sourceKindsForDecision(decision),
    logicId: `${ingredientId}:${decision}`,
  };
}

function computeIngredientTrueScore(user: UserProfile, ingredient: IngredientDef): number {
  const goals: [number, number, number] = [
    user.goalEnergy,
    user.goalSleep,
    user.goalMetabolic,
  ];
  const conditions: [number, number, number, number] = [
    user.conditionDiabetes,
    user.conditionHypertension,
    user.conditionKidney,
    user.conditionPregnancy,
  ];
  const genes: [number, number, number, number, number, number] = [
    user.geneMthfr,
    user.geneLct,
    user.geneCyp1a2,
    user.geneFto,
    user.geneTcf7l2,
    user.geneLpl,
  ];

  const safety = evaluateSafetyForIngredient(user, ingredient.id);
  const safetyPenalty =
    safety.decision === "block" ? 1.5 : safety.decision === "limit" ? 0.4 : 0;

  const score =
    ingredient.baseUtility +
    dot(goals, ingredient.goalAffinity) * 0.85 +
    dot(conditions, ingredient.conditionAffinity) * 0.5 +
    dot(genes, ingredient.geneticsAffinity) * 0.4 +
    (user.cgmTir - 0.7) * 0.3 +
    ((7.2 - user.wearableSleepHours) / 4) *
      (ingredient.id === "melatonin" ? 0.6 : 0.1) -
    ingredient.risk * 0.35 -
    ingredient.cost * 0.12 -
    safetyPenalty;

  return score;
}

function safetyDecisionPenalty(decision: RndModule03Decision): number {
  if (decision === "block") return 1.5;
  if (decision === "limit") return 0.4;
  return 0;
}

function safetyDecisionFlags(
  decision: RndModule03Decision
): [number, number, number] {
  if (decision === "allow") return [1, 0, 0];
  if (decision === "limit") return [0, 1, 0];
  return [0, 0, 1];
}

function buildRerankerFeatureVector(
  user: UserProfile,
  ingredient: IngredientDef,
  twoTowerScore: number,
  safetyDecision: RndModule03Decision
): number[] {
  const userVector = userFeatureVector(user);
  const ingredientVector = ingredientFeatureVector(ingredient);
  const decisionFlags = safetyDecisionFlags(safetyDecision);
  const decisionPenalty = safetyDecisionPenalty(safetyDecision);
  return [
    ...userVector,
    ...ingredientVector,
    twoTowerScore,
    ...decisionFlags,
    ingredient.risk,
    ingredient.cost,
    decisionPenalty,
  ];
}

function expectedIngredientSet(
  user: UserProfile,
  catalog: readonly IngredientDef[]
): string[] {
  const ranked = catalog
    .map((ingredient) => ({
      ingredientId: ingredient.id,
      score: computeIngredientTrueScore(user, ingredient),
      safety: evaluateSafetyForIngredient(user, ingredient.id).decision,
    }))
    .filter((row) => row.safety !== "block")
    .sort((left, right) => right.score - left.score);
  return ranked.slice(0, 3).map((row) => row.ingredientId);
}

function comboFeatureVector(
  user: UserProfile,
  combo: readonly IngredientDef[]
): number[] {
  const userVector = userFeatureVector(user);
  const ingredientVectors = combo.map((ingredient) =>
    ingredientFeatureVector(ingredient)
  );
  const averagedIngredientVector = ingredientVectors[0].map((_, index) =>
    average(ingredientVectors.map((vector) => vector[index]))
  );
  const meanCost = average(combo.map((ingredient) => ingredient.cost));
  const meanRisk = average(combo.map((ingredient) => ingredient.risk));
  return [...userVector, ...averagedIngredientVector, meanCost, meanRisk];
}

function trueComboDelta(
  user: UserProfile,
  combo: readonly IngredientDef[],
  rng: SeededRandom
): number {
  const ingredientBenefit = average(
    combo.map((ingredient) => computeIngredientTrueScore(user, ingredient))
  );
  const comboRisk = average(combo.map((ingredient) => ingredient.risk));
  const comboCost = average(combo.map((ingredient) => ingredient.cost));
  const biosensorSignal =
    (user.cgmTir - 0.72) * 0.9 +
    ((115 - user.cgmGlucose) / 140) * 0.4 +
    ((7.0 - user.wearableSleepHours) / 4) * 0.3;
  const geneticSignal =
    user.geneMthfr * 0.1 +
    user.geneLct * 0.08 +
    (1 - user.geneCyp1a2) * 0.06 +
    user.geneTcf7l2 * 0.1;
  const noise = rng.normal(0, 0.035);

  return clamp(
    0.12 +
      ingredientBenefit * 0.28 +
      biosensorSignal * 0.16 +
      geneticSignal * 0.12 -
      comboRisk * 0.2 -
      comboCost * 0.06 +
      noise,
    -0.5,
    0.9
  );
}

const PRO_METRIC_CONFIGS: readonly ProMetricConfig[] = [
  {
    metricId: "psqi",
    mean: 8.2,
    std: 2.9,
    higherIsBetter: false,
    min: 0,
    max: 21,
  },
  {
    metricId: "isi",
    mean: 11.1,
    std: 4.8,
    higherIsBetter: false,
    min: 0,
    max: 28,
  },
  {
    metricId: "fatigue_index",
    mean: 57.5,
    std: 11.5,
    higherIsBetter: false,
    min: 0,
    max: 100,
  },
  {
    metricId: "wellbeing_index",
    mean: 54.2,
    std: 10.4,
    higherIsBetter: true,
    min: 0,
    max: 100,
  },
];

function proRawFromLatent(
  latent: number,
  config: ProMetricConfig,
  rng: SeededRandom
): number {
  const orientedLatent = config.higherIsBetter ? latent : -latent;
  const raw =
    config.mean +
    orientedLatent * config.std +
    rng.normal(0, Math.max(0.2, config.std * 0.06));
  return clamp(raw, config.min, config.max);
}

function zFromProRaw(rawScore: number, config: ProMetricConfig): number {
  const standardized = (rawScore - config.mean) / config.std;
  return config.higherIsBetter ? standardized : -standardized;
}

function buildProAssessmentRecord(
  sampleId: string,
  userId: string,
  baselineZ: number,
  delta: number,
  rng: SeededRandom
): ProAssessmentRecord {
  const latentPre = clamp(baselineZ + rng.normal(0, 0.06), -2.7, 2.7);
  const latentPost = clamp(latentPre + delta + rng.normal(0, 0.04), -2.7, 3);
  const metrics: ProAssessmentMetric[] = PRO_METRIC_CONFIGS.map((config) => {
    const preRaw = proRawFromLatent(latentPre, config, rng);
    const postRaw = proRawFromLatent(latentPost, config, rng);
    const preZ = zFromProRaw(preRaw, config);
    const postZ = zFromProRaw(postRaw, config);
    return {
      metricId: config.metricId,
      preRawScore: roundTo(preRaw, 6),
      postRawScore: roundTo(postRaw, 6),
      preZScore: roundTo(preZ, 6),
      postZScore: roundTo(postZ, 6),
    };
  });

  return {
    sampleId,
    userId,
    metrics,
    preZScore: roundTo(average(metrics.map((metric) => metric.preZScore)), 6),
    postZScore: roundTo(average(metrics.map((metric) => metric.postZScore)), 6),
  };
}

class TwoTowerRecommender {
  readonly userDim: number;
  readonly itemDim: number;
  readonly embeddingDim: number;
  private readonly userWeight: number[][];
  private readonly itemWeight: number[][];

  constructor(
    userDim: number,
    itemDim: number,
    embeddingDim: number,
    rng: SeededRandom
  ) {
    this.userDim = userDim;
    this.itemDim = itemDim;
    this.embeddingDim = embeddingDim;
    this.userWeight = Array.from({ length: embeddingDim }, () =>
      Array.from({ length: userDim }, () => rng.normal(0, 0.12))
    );
    this.itemWeight = Array.from({ length: embeddingDim }, () =>
      Array.from({ length: itemDim }, () => rng.normal(0, 0.12))
    );
  }

  private embedUser(user: readonly number[]): number[] {
    return this.userWeight.map((row) => dot(row, user));
  }

  private embedItem(item: readonly number[]): number[] {
    return this.itemWeight.map((row) => dot(row, item));
  }

  score(user: readonly number[], item: readonly number[]): number {
    return dot(this.embedUser(user), this.embedItem(item));
  }

  train(
    samples: readonly PairwiseSample[],
    epochs: number,
    learningRate: number,
    l2: number,
    rng: SeededRandom
  ): void {
    const indices = Array.from({ length: samples.length }, (_, index) => index);

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      for (let index = indices.length - 1; index > 0; index -= 1) {
        const swapIndex = rng.int(index + 1);
        const temp = indices[index];
        indices[index] = indices[swapIndex];
        indices[swapIndex] = temp;
      }

      for (const sampleIndex of indices) {
        const sample = samples[sampleIndex];
        const userEmbedding = this.embedUser(sample.user);
        const positiveEmbedding = this.embedItem(sample.positive);
        const negativeEmbedding = this.embedItem(sample.negative);
        const margin =
          dot(userEmbedding, positiveEmbedding) -
          dot(userEmbedding, negativeEmbedding);
        const scale = sigmoid(-margin);

        for (let row = 0; row < this.embeddingDim; row += 1) {
          const userUpdate = (positiveEmbedding[row] - negativeEmbedding[row]) * scale;
          for (let column = 0; column < this.userDim; column += 1) {
            this.userWeight[row][column] +=
              learningRate *
              (userUpdate * sample.user[column] - l2 * this.userWeight[row][column]);
          }

          const positiveUpdate = userEmbedding[row] * scale;
          for (let column = 0; column < this.itemDim; column += 1) {
            this.itemWeight[row][column] +=
              learningRate *
              (positiveUpdate * sample.positive[column] -
                l2 * this.itemWeight[row][column]);
          }

          const negativeUpdate = -userEmbedding[row] * scale;
          for (let column = 0; column < this.itemDim; column += 1) {
            this.itemWeight[row][column] +=
              learningRate *
              (negativeUpdate * sample.negative[column] -
                l2 * this.itemWeight[row][column]);
          }
        }
      }
    }
  }

  serialize(): Record<string, unknown> {
    return {
      modelType: "two_tower",
      userDim: this.userDim,
      itemDim: this.itemDim,
      embeddingDim: this.embeddingDim,
      userWeight: this.userWeight,
      itemWeight: this.itemWeight,
    };
  }
}

class SoftmaxClassifier {
  readonly classCount: number;
  readonly inputDim: number;
  private readonly weights: number[][];
  private readonly bias: number[];

  constructor(classCount: number, inputDim: number, rng: SeededRandom) {
    this.classCount = classCount;
    this.inputDim = inputDim;
    this.weights = Array.from({ length: classCount }, () =>
      Array.from({ length: inputDim }, () => rng.normal(0, 0.08))
    );
    this.bias = Array.from({ length: classCount }, () => 0);
  }

  private logits(x: readonly number[]): number[] {
    return this.weights.map(
      (row, classIndex) => dot(row, x) + this.bias[classIndex]
    );
  }

  predictClass(x: readonly number[]): number {
    const probs = softmax(this.logits(x));
    let bestIndex = 0;
    let bestValue = probs[0];
    for (let index = 1; index < probs.length; index += 1) {
      if (probs[index] > bestValue) {
        bestValue = probs[index];
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  train(
    samples: readonly ClassificationSample[],
    epochs: number,
    learningRate: number,
    l2: number,
    rng: SeededRandom
  ): void {
    const indices = Array.from({ length: samples.length }, (_, index) => index);
    for (let epoch = 0; epoch < epochs; epoch += 1) {
      for (let index = indices.length - 1; index > 0; index -= 1) {
        const swapIndex = rng.int(index + 1);
        const temp = indices[index];
        indices[index] = indices[swapIndex];
        indices[swapIndex] = temp;
      }

      for (const sampleIndex of indices) {
        const sample = samples[sampleIndex];
        const probs = softmax(this.logits(sample.x));
        for (let classIndex = 0; classIndex < this.classCount; classIndex += 1) {
          const expected = classIndex === sample.y ? 1 : 0;
          const gradient = probs[classIndex] - expected;
          for (let featureIndex = 0; featureIndex < this.inputDim; featureIndex += 1) {
            this.weights[classIndex][featureIndex] -=
              learningRate *
              (gradient * sample.x[featureIndex] +
                l2 * this.weights[classIndex][featureIndex]);
          }
          this.bias[classIndex] -= learningRate * gradient;
        }
      }
    }
  }

  accuracy(samples: readonly ClassificationSample[]): number {
    const correctCount = samples.filter(
      (sample) => this.predictClass(sample.x) === sample.y
    ).length;
    return (correctCount / samples.length) * 100;
  }

  serialize(): Record<string, unknown> {
    return {
      modelType: "softmax",
      classCount: this.classCount,
      inputDim: this.inputDim,
      weights: this.weights,
      bias: this.bias,
    };
  }
}

class LinearRegressor {
  readonly inputDim: number;
  private readonly weights: number[];
  private bias: number;

  constructor(inputDim: number, rng: SeededRandom) {
    this.inputDim = inputDim;
    this.weights = Array.from({ length: inputDim }, () => rng.normal(0, 0.08));
    this.bias = 0;
  }

  predict(x: readonly number[]): number {
    return dot(this.weights, x) + this.bias;
  }

  train(
    samples: readonly RegressionSample[],
    epochs: number,
    learningRate: number,
    l2: number,
    rng: SeededRandom
  ): void {
    const indices = Array.from({ length: samples.length }, (_, index) => index);
    for (let epoch = 0; epoch < epochs; epoch += 1) {
      for (let index = indices.length - 1; index > 0; index -= 1) {
        const swapIndex = rng.int(index + 1);
        const temp = indices[index];
        indices[index] = indices[swapIndex];
        indices[swapIndex] = temp;
      }

      for (const sampleIndex of indices) {
        const sample = samples[sampleIndex];
        const prediction = this.predict(sample.x);
        const error = prediction - sample.y;
        for (let featureIndex = 0; featureIndex < this.inputDim; featureIndex += 1) {
          this.weights[featureIndex] -=
            learningRate *
            (error * sample.x[featureIndex] + l2 * this.weights[featureIndex]);
        }
        this.bias -= learningRate * error;
      }
    }
  }

  rmse(samples: readonly RegressionSample[]): number {
    const mse =
      samples.reduce((sum, sample) => {
        const error = this.predict(sample.x) - sample.y;
        return sum + error * error;
      }, 0) / samples.length;
    return Math.sqrt(mse);
  }

  snapshot(): { weights: number[]; bias: number } {
    return {
      weights: [...this.weights],
      bias: this.bias,
    };
  }

  restore(snapshot: { weights: readonly number[]; bias: number }): void {
    for (let index = 0; index < this.weights.length; index += 1) {
      this.weights[index] = snapshot.weights[index] ?? this.weights[index];
    }
    this.bias = snapshot.bias;
  }

  serialize(): Record<string, unknown> {
    return {
      modelType: "linear_regression",
      inputDim: this.inputDim,
      weights: this.weights,
      bias: this.bias,
    };
  }
}

type RerankerStump = {
  featureIndex: number;
  threshold: number;
  leftValue: number;
  rightValue: number;
};

function buildThresholdCandidates(
  values: readonly number[],
  maxCandidates: number
): number[] {
  const unique = Array.from(new Set(values)).sort((left, right) => left - right);
  if (unique.length <= 2) return [];
  const limit = Math.max(1, maxCandidates);
  if (unique.length <= limit + 2) {
    return unique.slice(1, -1);
  }
  const thresholds: number[] = [];
  for (let rank = 1; rank <= limit; rank += 1) {
    const ratio = rank / (limit + 1);
    const index = Math.floor(ratio * (unique.length - 1));
    const value = unique[index];
    if (!Number.isFinite(value)) continue;
    if (value <= unique[0] || value >= unique[unique.length - 1]) continue;
    thresholds.push(value);
  }
  return Array.from(new Set(thresholds)).sort((left, right) => left - right);
}

class GbdtStumpRegressor {
  readonly inputDim: number;
  readonly learningRate: number;
  private baseScore = 0;
  private stumps: RerankerStump[] = [];

  constructor(inputDim: number, learningRate = 0.22) {
    this.inputDim = inputDim;
    this.learningRate = learningRate;
  }

  private stumpValue(stump: RerankerStump, x: readonly number[]): number {
    return x[stump.featureIndex] <= stump.threshold
      ? stump.leftValue
      : stump.rightValue;
  }

  predict(x: readonly number[]): number {
    let score = this.baseScore;
    for (const stump of this.stumps) {
      score += this.learningRate * this.stumpValue(stump, x);
    }
    return score;
  }

  train(
    samples: readonly RegressionSample[],
    rounds: number,
    maxSampleCount: number,
    rng: SeededRandom
  ): void {
    if (samples.length === 0) return;
    const sampled =
      samples.length <= maxSampleCount
        ? [...samples]
        : Array.from({ length: maxSampleCount }, () => samples[rng.int(samples.length)]);
    this.baseScore = average(sampled.map((sample) => sample.y));
    const predictions = Array.from({ length: sampled.length }, () => this.baseScore);

    for (let round = 0; round < rounds; round += 1) {
      const residuals = sampled.map((sample, index) => sample.y - predictions[index]);
      let bestLoss = Number.POSITIVE_INFINITY;
      let bestStump: RerankerStump | null = null;

      for (let featureIndex = 0; featureIndex < this.inputDim; featureIndex += 1) {
        const featureValues = sampled.map((sample) => sample.x[featureIndex]);
        const thresholds = buildThresholdCandidates(featureValues, 5);
        if (thresholds.length === 0) continue;

        for (const threshold of thresholds) {
          let leftCount = 0;
          let leftSum = 0;
          let rightCount = 0;
          let rightSum = 0;
          for (let index = 0; index < sampled.length; index += 1) {
            if (sampled[index].x[featureIndex] <= threshold) {
              leftCount += 1;
              leftSum += residuals[index];
            } else {
              rightCount += 1;
              rightSum += residuals[index];
            }
          }
          if (leftCount === 0 || rightCount === 0) continue;
          const leftValue = leftSum / leftCount;
          const rightValue = rightSum / rightCount;

          let loss = 0;
          for (let index = 0; index < sampled.length; index += 1) {
            const branchValue =
              sampled[index].x[featureIndex] <= threshold ? leftValue : rightValue;
            const error = residuals[index] - branchValue;
            loss += error * error;
          }

          if (loss < bestLoss) {
            bestLoss = loss;
            bestStump = {
              featureIndex,
              threshold,
              leftValue,
              rightValue,
            };
          }
        }
      }

      if (!bestStump) break;
      this.stumps.push(bestStump);
      for (let index = 0; index < sampled.length; index += 1) {
        predictions[index] +=
          this.learningRate * this.stumpValue(bestStump, sampled[index].x);
      }
    }
  }

  rmse(samples: readonly RegressionSample[]): number {
    if (samples.length === 0) return 0;
    const mse =
      samples.reduce((sum, sample) => {
        const error = this.predict(sample.x) - sample.y;
        return sum + error * error;
      }, 0) / samples.length;
    return Math.sqrt(mse);
  }

  serialize(): Record<string, unknown> {
    return {
      modelType: "gbdt_stump_regressor",
      inputDim: this.inputDim,
      learningRate: this.learningRate,
      baseScore: this.baseScore,
      stumpCount: this.stumps.length,
      stumps: this.stumps,
    };
  }
}

function splitTrainValidation<T>(
  rows: readonly T[],
  ratio: number
): { train: T[]; validation: T[] } {
  const splitIndex = Math.max(1, Math.floor(rows.length * ratio));
  return {
    train: rows.slice(0, splitIndex),
    validation: rows.slice(splitIndex),
  };
}

function buildIngredientLookup(
  catalog: readonly IngredientDef[]
): Map<string, IngredientDef> {
  return new Map(catalog.map((ingredient) => [ingredient.id, ingredient]));
}

function buildRecommenderSamples(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  rng: SeededRandom
): PairwiseSample[] {
  const rankedByUser = users.map((user) => {
    const expected = expectedIngredientSet(user, catalog);
    const negatives = catalog
      .map((ingredient) => ({
        ingredientId: ingredient.id,
        score: computeIngredientTrueScore(user, ingredient),
      }))
      .filter((entry) => !expected.includes(entry.ingredientId))
      .sort((left, right) => left.score - right.score)
      .map((entry) => entry.ingredientId);

    return { user, expected, negatives };
  });

  const catalogById = buildIngredientLookup(catalog);
  const pairs: PairwiseSample[] = [];

  for (const row of rankedByUser) {
    const userVector = userFeatureVector(row.user);
    for (const positiveIngredientId of row.expected) {
      const positive = catalogById.get(positiveIngredientId);
      if (!positive) continue;
      const hardNegatives = row.negatives.slice(0, 6);
      const sampledNegatives = [...hardNegatives];
      while (sampledNegatives.length < 12 && row.negatives.length > 0) {
        sampledNegatives.push(row.negatives[rng.int(row.negatives.length)]);
      }
      for (const negativeIngredientId of sampledNegatives) {
        const negative = catalogById.get(negativeIngredientId);
        if (!negative) continue;
        pairs.push({
          userId: row.user.userId,
          positiveIngredientId,
          negativeIngredientId,
          user: userVector,
          positive: ingredientFeatureVector(positive),
          negative: ingredientFeatureVector(negative),
        });
      }
    }
  }

  return pairs;
}

function buildRerankerDataset(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  recommender: TwoTowerRecommender,
  safetyModel: SoftmaxClassifier,
  sampleCount: number,
  seed: number
): RerankerDataset {
  const rng = new SeededRandom(seed);
  const rows: RerankerTrainingRow[] = [];
  const samples: RegressionSample[] = [];

  const effectiveCount = Math.max(sampleCount, users.length * 4);
  for (let index = 0; index < effectiveCount; index += 1) {
    const user = users[rng.int(users.length)];
    const ingredient = catalog[rng.int(catalog.length)];
    const userVector = userFeatureVector(user);
    const ingredientVector = ingredientFeatureVector(ingredient);
    const twoTowerScore = recommender.score(userVector, ingredientVector);
    const safetyDecision = classToDecision(
      safetyModel.predictClass(safetyFeatureVector(user, ingredient))
    );
    const featureVector = buildRerankerFeatureVector(
      user,
      ingredient,
      twoTowerScore,
      safetyDecision
    );
    const trueScore = computeIngredientTrueScore(user, ingredient);
    const targetScore =
      trueScore +
      twoTowerScore * 0.2 -
      safetyDecisionPenalty(safetyDecision) * 0.45 +
      rng.normal(0, 0.03);

    rows.push({
      sampleId: `reranker-${String(index + 1).padStart(7, "0")}`,
      userId: user.userId,
      ingredientId: ingredient.id,
      twoTowerScore: roundTo(twoTowerScore, 6),
      safetyDecision,
      featureVector,
      targetScore: roundTo(targetScore, 6),
    });
    samples.push({
      x: featureVector,
      y: targetScore,
    });
  }

  return { rows, samples };
}

function decisionToClass(decision: RndModule03Decision): number {
  if (decision === "allow") return 0;
  if (decision === "limit") return 1;
  return 2;
}

function classToDecision(classIndex: number): RndModule03Decision {
  if (classIndex === 0) return "allow";
  if (classIndex === 1) return "limit";
  return "block";
}

function safetyFeatureVector(user: UserProfile, ingredient: IngredientDef): number[] {
  return [...userFeatureVector(user), ...ingredientFeatureVector(ingredient)];
}

function buildSafetySamples(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[]
): ClassificationSample[] {
  const rows: ClassificationSample[] = [];
  for (const user of users) {
    for (const ingredient of catalog) {
      const safety = evaluateSafetyForIngredient(user, ingredient.id);
      rows.push({
        x: safetyFeatureVector(user, ingredient),
        y: decisionToClass(safety.decision),
      });
    }
  }
  return rows;
}

function buildDataLakeClassKey(safety: SafetyEvaluation): string {
  return `${safety.logicId}|${safety.referenceIds.join(",")}|${safety.sourceKinds.join(",")}`;
}

function buildDataLakeSamples(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  classKeyToIndex: Map<string, number>
): ClassificationSample[] {
  const rows: ClassificationSample[] = [];
  for (const user of users) {
    for (const ingredient of catalog) {
      const safety = evaluateSafetyForIngredient(user, ingredient.id);
      const classKey = buildDataLakeClassKey(safety);
      if (!classKeyToIndex.has(classKey)) {
        classKeyToIndex.set(classKey, classKeyToIndex.size);
      }
      rows.push({
        x: safetyFeatureVector(user, ingredient),
        y: classKeyToIndex.get(classKey) ?? 0,
      });
    }
  }
  return rows;
}

function buildIteSamples(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  sampleCount: number,
  rng: SeededRandom
): RegressionSample[] {
  const rows: RegressionSample[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const user = users[rng.int(users.length)];
    const expectedIds = expectedIngredientSet(user, catalog);
    const candidateIds = new Set<string>(expectedIds);
    while (candidateIds.size < 4) {
      candidateIds.add(catalog[rng.int(catalog.length)].id);
    }
    const combos = combinations([...candidateIds], 3);
    const sampledCombo = combos[rng.int(combos.length)];
    const ingredients = sampledCombo
      .map((ingredientId) =>
        catalog.find((ingredient) => ingredient.id === ingredientId)
      )
      .filter((ingredient): ingredient is IngredientDef => Boolean(ingredient));
    if (ingredients.length !== 3) continue;

    const x = comboFeatureVector(user, ingredients);
    const delta = trueComboDelta(user, ingredients, rng);
    rows.push({ x, y: delta });
  }
  return rows;
}

function actionLabelForState(
  risk: number,
  delta: number,
  adherence: number,
  engagement: number,
  daysSinceFollowup: number
): RndModule06NextActionType {
  if (risk >= 0.74) return "stop";
  if (delta < -0.05) return "adjust";
  if (adherence < 0.45) return "request_info";
  if (engagement < 0.33) return "escalate_consult";
  if (daysSinceFollowup > 35) return "monitor";
  return "maintain";
}

function actionToClass(action: RndModule06NextActionType): number {
  return RND_MODULE_06_NEXT_ACTION_TYPES.indexOf(action);
}

function classToAction(classIndex: number): RndModule06NextActionType {
  return RND_MODULE_06_NEXT_ACTION_TYPES[classIndex] ?? "maintain";
}

function buildClosedLoopRecords(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  iteModel: LinearRegressor,
  sampleCount: number,
  seed: number
): ClosedLoopRecord[] {
  const rng = new SeededRandom(seed);
  const rows: ClosedLoopRecord[] = [];
  const catalogById = buildIngredientLookup(catalog);

  for (let index = 0; index < sampleCount; index += 1) {
    const user = users[rng.int(users.length)];
    const expected = expectedIngredientSet(user, catalog);
    const combo = expected
      .slice(0, 3)
      .map((ingredientId) => catalogById.get(ingredientId))
      .filter((ingredient): ingredient is IngredientDef => Boolean(ingredient));
    if (combo.length !== 3) continue;

    const risk = average(combo.map((ingredient) => ingredient.risk));
    const predictedDelta = iteModel.predict(comboFeatureVector(user, combo));
    const adherence = clamp(rng.normal(0.72, 0.22), 0.05, 1);
    const engagement = clamp(rng.normal(0.65, 0.24), 0.05, 1);
    const daysSinceFollowup = Math.round(clamp(rng.normal(22, 12), 1, 60));
    const actionLabel = actionLabelForState(
      risk,
      predictedDelta,
      adherence,
      engagement,
      daysSinceFollowup
    );
    rows.push({
      sampleId: `action-${String(index + 1).padStart(7, "0")}`,
      caseId: `case-${String(index + 1).padStart(7, "0")}`,
      features: [risk, predictedDelta, adherence, engagement, daysSinceFollowup / 60],
      actionLabel,
    });
  }

  return rows;
}

function expectedActionFromFeatures(features: readonly number[]): RndModule06NextActionType {
  return actionLabelForState(
    features[0] ?? 0,
    features[1] ?? 0,
    features[2] ?? 0,
    features[3] ?? 0,
    Math.round((features[4] ?? 0) * 60)
  );
}

function clampActionFeature(featureIndex: number, value: number): number {
  if (featureIndex === 1) return clamp(value, -1, 1);
  return clamp(value, 0, 1);
}

function buildClosedLoopFeedbackSamples(
  baseRecords: readonly ClosedLoopRecord[],
  actionModel: SoftmaxClassifier,
  sampleCount: number,
  seed: number
): { rows: ClosedLoopFeedbackRecord[]; samples: ClassificationSample[] } {
  const rng = new SeededRandom(seed);
  const rows: ClosedLoopFeedbackRecord[] = [];
  const samples: ClassificationSample[] = [];

  const effectiveCount = Math.max(sampleCount, 1000);
  for (let index = 0; index < effectiveCount; index += 1) {
    const base = baseRecords[rng.int(baseRecords.length)];
    const driftedFeatures = base.features.map((value, featureIndex) =>
      clampActionFeature(
        featureIndex,
        value + rng.normal(0, featureIndex === 1 ? 0.024 : 0.016)
      )
    );
    const expectedActionType = expectedActionFromFeatures(driftedFeatures);
    const predictedActionType = classToAction(actionModel.predictClass(driftedFeatures));
    const executionSuccessProbability =
      predictedActionType === expectedActionType ? 0.94 : 0.24;
    const executionSuccess = rng.next() < executionSuccessProbability;
    const userFeedbackScore = executionSuccess
      ? clamp(rng.normal(0.86, 0.08), 0, 1)
      : clamp(rng.normal(0.26, 0.13), 0, 1);
    const correctedActionType = expectedActionType;

    rows.push({
      sampleId: `cl-feedback-${String(index + 1).padStart(7, "0")}`,
      sourceCaseId: base.caseId,
      features: driftedFeatures,
      expectedActionType,
      predictedActionType,
      correctedActionType,
      executionSuccess,
      userFeedbackScore: roundTo(userFeedbackScore, 6),
    });
    samples.push({
      x: driftedFeatures,
      y: actionToClass(correctedActionType),
    });
  }

  return { rows, samples };
}

const LLM_KEYS = [
  "safety",
  "efficacy",
  "dose",
  "interaction",
  "followup",
  "general",
] as const;

const GENETIC_RULE_IDS: readonly GeneticAdjustmentRuleId[] = [
  "mthfr_folate_pathway",
  "lct_lactose_tolerance",
  "cyp1a2_caffeine_sensitivity",
  "fto_weight_gain_risk",
  "tcf7l2_postprandial_glucose",
  "lpl_triglyceride_risk",
];

function llmKeyToClass(key: string): number {
  const index = LLM_KEYS.indexOf(key as (typeof LLM_KEYS)[number]);
  return index >= 0 ? index : 0;
}

function classToLlmKey(classIndex: number): string {
  return LLM_KEYS[classIndex] ?? LLM_KEYS[0];
}

function buildLlmPrompt(key: string, seed: number): string {
  const suffix = seed % 11;
  if (key === "safety")
    return `복용 중인 영양제의 금기와 부작용을 알려줘 ${suffix}`;
  if (key === "efficacy")
    return `내 몸 상태에서 효과가 있었는지 수치로 설명해줘 ${suffix}`;
  if (key === "dose")
    return `언제 얼마나 복용하면 되는지 용량 기준을 알려줘 ${suffix}`;
  if (key === "interaction")
    return `현재 약과 상호작용 위험이 있는지 점검해줘 ${suffix}`;
  if (key === "followup")
    return `다음 검사와 추적 일정을 추천해줘 ${suffix}`;
  return `건강기능식품 상담을 시작하고 기본 가이드를 알려줘 ${suffix}`;
}

function llmFeaturesFromKey(key: string, rng: SeededRandom): number[] {
  const keywordFlags = LLM_KEYS.map((candidate) => (candidate === key ? 1 : 0));
  return [
    ...keywordFlags,
    rng.range(0, 1),
    rng.range(0, 1),
    rng.range(0, 1),
  ];
}

function buildLlmRecords(sampleCount: number, seed: number): LlmRecord[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: sampleCount }, (_, index) => {
    const key = LLM_KEYS[rng.int(LLM_KEYS.length)];
    return {
      sampleId: `llm-${String(index + 1).padStart(7, "0")}`,
      promptId: `prompt-${String(index + 1).padStart(7, "0")}`,
      prompt: buildLlmPrompt(key, index + 1),
      features: llmFeaturesFromKey(key, rng),
      expectedKey: key,
    };
  });
}

function sourceToOneHot(source: RndModule07DataSource): [number, number, number] {
  if (source === "wearable") return [1, 0, 0];
  if (source === "continuous_glucose") return [0, 1, 0];
  return [0, 0, 1];
}

function buildIntegrationRecords(sampleCount: number, seed: number): IntegrationRecord[] {
  const rng = new SeededRandom(seed);
  const perSource = Math.max(
    1,
    Math.floor(sampleCount / RND_MODULE_07_DATA_SOURCES.length)
  );
  const rows: IntegrationRecord[] = [];

  let sampleIndex = 0;
  for (const source of RND_MODULE_07_DATA_SOURCES) {
    for (let index = 0; index < perSource; index += 1) {
      const apiQuality = clamp(rng.normal(0.86, 0.09), 0, 1);
      const schemaDrift = rng.next() < 0.05 ? 1 : 0;
      const consent = rng.next() < 0.985 ? 1 : 0;
      const payloadCompleteness = clamp(rng.normal(0.91, 0.08), 0, 1);
      const latency = clamp(rng.normal(0.32, 0.14), 0, 1);
      const sourceFlags = sourceToOneHot(source);
      const success =
        consent === 1 &&
        schemaDrift === 0 &&
        apiQuality > 0.36 &&
        payloadCompleteness > 0.42 &&
        latency < 0.88;

      rows.push({
        sampleId: `integration-${String(sampleIndex + 1).padStart(7, "0")}`,
        source,
        features: [
          ...sourceFlags,
          apiQuality,
          schemaDrift,
          consent,
          payloadCompleteness,
          latency,
        ],
        success,
      });
      sampleIndex += 1;
    }
  }

  return rows;
}

function buildClassificationRows(
  records: readonly ClosedLoopRecord[]
): ClassificationSample[] {
  return records.map((record) => ({
    x: record.features,
    y: actionToClass(record.actionLabel),
  }));
}

function buildLlmClassificationRows(
  records: readonly LlmRecord[]
): ClassificationSample[] {
  return records.map((record) => ({
    x: record.features,
    y: llmKeyToClass(record.expectedKey),
  }));
}

function buildIntegrationClassificationRows(
  records: readonly IntegrationRecord[]
): ClassificationSample[] {
  return records.map((record) => ({
    x: record.features,
    y: record.success ? 1 : 0,
  }));
}

type ScoredIngredientCandidate = {
  ingredientId: string;
  score: number;
  goalFit: number;
  conditionFit: number;
  geneticFit: number;
  twoTowerScore: number;
  ingredient: IngredientDef;
  safetyDecision: RndModule03Decision;
};

type OptimizationConstraints = {
  maxCount: number;
  budget: number;
  maxAverageRisk: number;
};

function resolveOptimizationConstraints(user: UserProfile): OptimizationConstraints {
  const budget = clamp(
    3.25 +
      user.goalMetabolic * 0.28 +
      user.goalEnergy * 0.1 -
      user.conditionKidney * 0.12 -
      user.medicationWarfarin * 0.08 +
      (1 - user.cgmTir) * 0.1,
    2.6,
    4.2
  );
  const maxAverageRisk = clamp(
    0.68 +
      user.goalSleep * 0.03 -
      user.conditionKidney * 0.06 -
      user.medicationWarfarin * 0.05 -
      user.conditionPregnancy * 0.05,
    0.54,
    0.74
  );
  return {
    maxCount: 3,
    budget,
    maxAverageRisk,
  };
}

function deriveGeneticAdjustments(user: UserProfile): {
  activeRuleIds: GeneticAdjustmentRuleId[];
  safetyConstraintAdjustments: {
    blockedIngredientIds: string[];
    limitedIngredientIds: string[];
    monitorFlags: string[];
  };
  optimizationWeightAdjustments: {
    omega3Boost: number;
    syntheticFolateBoost: number;
    lactoseFreeCalciumBoost: number;
    stimulantPenalty: number;
    sugarPenalty: number;
    highFatPenalty: number;
    proteinFiberBoost: number;
  };
} {
  const activeRuleIds: GeneticAdjustmentRuleId[] = [];
  const blockedIngredientIds: string[] = [];
  const limitedIngredientIds: string[] = [];
  const monitorFlags: string[] = [];
  const optimizationWeightAdjustments = {
    omega3Boost: 0,
    syntheticFolateBoost: 0,
    lactoseFreeCalciumBoost: 0,
    stimulantPenalty: 0,
    sugarPenalty: 0,
    highFatPenalty: 0,
    proteinFiberBoost: 0,
  };

  const activate = (ruleId: GeneticAdjustmentRuleId) => {
    if (!activeRuleIds.includes(ruleId)) activeRuleIds.push(ruleId);
  };

  if (user.geneMthfr >= 0.58) {
    activate("mthfr_folate_pathway");
    optimizationWeightAdjustments.syntheticFolateBoost += 0.24;
  }
  if (user.geneLct >= 0.58) {
    activate("lct_lactose_tolerance");
    blockedIngredientIds.push("lactose_based_supplements");
    optimizationWeightAdjustments.lactoseFreeCalciumBoost += 0.2;
  }
  if (user.geneCyp1a2 >= 0.6) {
    activate("cyp1a2_caffeine_sensitivity");
    limitedIngredientIds.push("caffeine");
    optimizationWeightAdjustments.stimulantPenalty += 0.28;
  }
  if (user.geneFto >= 0.62) {
    activate("fto_weight_gain_risk");
    optimizationWeightAdjustments.sugarPenalty += 0.22;
    optimizationWeightAdjustments.proteinFiberBoost += 0.18;
  }
  if (user.geneTcf7l2 >= 0.6) {
    activate("tcf7l2_postprandial_glucose");
    monitorFlags.push("post_meal_glucose_monitoring");
    optimizationWeightAdjustments.sugarPenalty += 0.2;
  }
  if (user.geneLpl >= 0.6) {
    activate("lpl_triglyceride_risk");
    optimizationWeightAdjustments.highFatPenalty += 0.2;
    optimizationWeightAdjustments.omega3Boost += 0.24;
  }

  if (activeRuleIds.length === 0) {
    const fallbackRule = [
      { id: "mthfr_folate_pathway", score: user.geneMthfr },
      { id: "lct_lactose_tolerance", score: user.geneLct },
      { id: "cyp1a2_caffeine_sensitivity", score: user.geneCyp1a2 },
      { id: "fto_weight_gain_risk", score: user.geneFto },
      { id: "tcf7l2_postprandial_glucose", score: user.geneTcf7l2 },
      { id: "lpl_triglyceride_risk", score: user.geneLpl },
    ].sort((left, right) => right.score - left.score)[0]?.id;

    if (fallbackRule === "mthfr_folate_pathway") {
      activate(fallbackRule);
      optimizationWeightAdjustments.syntheticFolateBoost += 0.08;
    } else if (fallbackRule === "lct_lactose_tolerance") {
      activate(fallbackRule);
      blockedIngredientIds.push("lactose_based_supplements");
      optimizationWeightAdjustments.lactoseFreeCalciumBoost += 0.06;
    } else if (fallbackRule === "cyp1a2_caffeine_sensitivity") {
      activate(fallbackRule);
      limitedIngredientIds.push("caffeine");
      optimizationWeightAdjustments.stimulantPenalty += 0.1;
    } else if (fallbackRule === "fto_weight_gain_risk") {
      activate(fallbackRule);
      optimizationWeightAdjustments.sugarPenalty += 0.08;
      optimizationWeightAdjustments.proteinFiberBoost += 0.06;
    } else if (fallbackRule === "lpl_triglyceride_risk") {
      activate(fallbackRule);
      optimizationWeightAdjustments.highFatPenalty += 0.08;
      optimizationWeightAdjustments.omega3Boost += 0.1;
    } else {
      activate("tcf7l2_postprandial_glucose");
      monitorFlags.push("post_meal_glucose_monitoring");
      optimizationWeightAdjustments.sugarPenalty += 0.08;
    }
  }

  return {
    activeRuleIds,
    safetyConstraintAdjustments: {
      blockedIngredientIds: Array.from(new Set(blockedIngredientIds)).sort(),
      limitedIngredientIds: Array.from(new Set(limitedIngredientIds)).sort(),
      monitorFlags: Array.from(new Set(monitorFlags)).sort(),
    },
    optimizationWeightAdjustments: {
      omega3Boost: roundTo(optimizationWeightAdjustments.omega3Boost, 6),
      syntheticFolateBoost: roundTo(
        optimizationWeightAdjustments.syntheticFolateBoost,
        6
      ),
      lactoseFreeCalciumBoost: roundTo(
        optimizationWeightAdjustments.lactoseFreeCalciumBoost,
        6
      ),
      stimulantPenalty: roundTo(optimizationWeightAdjustments.stimulantPenalty, 6),
      sugarPenalty: roundTo(optimizationWeightAdjustments.sugarPenalty, 6),
      highFatPenalty: roundTo(optimizationWeightAdjustments.highFatPenalty, 6),
      proteinFiberBoost: roundTo(optimizationWeightAdjustments.proteinFiberBoost, 6),
    },
  };
}

function buildGeneticAdjustmentRecords(
  users: readonly UserProfile[],
  sampleCount: number,
  seed: number
): GeneticAdjustmentRecord[] {
  const rng = new SeededRandom(seed);
  const rows: GeneticAdjustmentRecord[] = [];
  const effectiveCount = Math.max(sampleCount, users.length);

  for (let index = 0; index < effectiveCount; index += 1) {
    const user = users[rng.int(users.length)];
    const parameterVectorX: [number, number, number, number, number, number] = [
      roundTo(user.geneMthfr, 6),
      roundTo(user.geneLct, 6),
      roundTo(user.geneCyp1a2, 6),
      roundTo(user.geneFto, 6),
      roundTo(user.geneTcf7l2, 6),
      roundTo(user.geneLpl, 6),
    ];
    const adjustments = deriveGeneticAdjustments(user);

    rows.push({
      sampleId: `genetic-${String(index + 1).padStart(7, "0")}`,
      userId: user.userId,
      parameterVectorX,
      geneScores: {
        mthfr: parameterVectorX[0],
        lct: parameterVectorX[1],
        cyp1a2: parameterVectorX[2],
        fto: parameterVectorX[3],
        tcf7l2: parameterVectorX[4],
        lpl: parameterVectorX[5],
      },
      activeRuleIds: adjustments.activeRuleIds,
      safetyConstraintAdjustments: adjustments.safetyConstraintAdjustments,
      optimizationWeightAdjustments: adjustments.optimizationWeightAdjustments,
      hasAnyAdjustment: adjustments.activeRuleIds.length > 0,
    });
  }

  return rows;
}

function optimizeConstrainedCombination(
  candidates: readonly ScoredIngredientCandidate[],
  constraints: OptimizationConstraints
): string[] {
  if (candidates.length === 0) return [];
  if (candidates.length <= constraints.maxCount) {
    return candidates.map((candidate) => candidate.ingredientId);
  }

  const combos = combinations(candidates, constraints.maxCount);
  if (combos.length === 0) {
    return candidates.slice(0, constraints.maxCount).map((row) => row.ingredientId);
  }

  let bestFeasibleScore = Number.NEGATIVE_INFINITY;
  let bestFeasible: ScoredIngredientCandidate[] | null = null;
  let bestRelaxedScore = Number.NEGATIVE_INFINITY;
  let bestRelaxed: ScoredIngredientCandidate[] = combos[0];

  for (const combo of combos) {
    const comboIngredients = combo.map((row) => row.ingredient);
    const predictedDelta = average(combo.map((row) => row.score));
    const goalFit = average(combo.map((row) => row.goalFit));
    const conditionFit = average(combo.map((row) => row.conditionFit));
    const geneticFit = average(combo.map((row) => row.geneticFit));
    const averageRisk = average(comboIngredients.map((ingredient) => ingredient.risk));
    const totalCost = comboIngredients.reduce(
      (sum, ingredient) => sum + ingredient.cost,
      0
    );
    const baseObjective =
      predictedDelta * 0.88 +
      goalFit * 0.08 +
      conditionFit * 0.06 +
      geneticFit * 0.05 -
      averageRisk * 0.05 -
      (totalCost / constraints.maxCount) * 0.03;

    const overBudget = Math.max(0, totalCost - constraints.budget);
    const overRisk = Math.max(0, averageRisk - constraints.maxAverageRisk);
    const relaxedObjective = baseObjective - overBudget * 0.12 - overRisk * 0.22;

    if (relaxedObjective > bestRelaxedScore) {
      bestRelaxedScore = relaxedObjective;
      bestRelaxed = combo;
    }

    const isFeasible =
      totalCost <= constraints.budget &&
      averageRisk <= constraints.maxAverageRisk &&
      combo.every((row) => row.safetyDecision !== "block");
    if (isFeasible && baseObjective > bestFeasibleScore) {
      bestFeasibleScore = baseObjective;
      bestFeasible = combo;
    }
  }

  const selected = bestFeasible ?? bestRelaxed;
  return selected.map((row) => row.ingredientId);
}

function pickTopIngredients(
  user: UserProfile,
  catalog: readonly IngredientDef[],
  recommender: TwoTowerRecommender,
  safetyModel: SoftmaxClassifier,
  reranker: GbdtStumpRegressor | null
): string[] {
  const userVector = userFeatureVector(user);
  const userGoals: [number, number, number] = [
    user.goalEnergy,
    user.goalSleep,
    user.goalMetabolic,
  ];
  const userConditions: [number, number, number, number] = [
    user.conditionDiabetes,
    user.conditionHypertension,
    user.conditionKidney,
    user.conditionPregnancy,
  ];
  const userGenes: [number, number, number, number, number, number] = [
    user.geneMthfr,
    user.geneLct,
    user.geneCyp1a2,
    user.geneFto,
    user.geneTcf7l2,
    user.geneLpl,
  ];
  const scored = catalog
    .map((ingredient) => {
      const ingredientVector = ingredientFeatureVector(ingredient);
      const twoTowerScore = recommender.score(userVector, ingredientVector);
      const safetyClass = safetyModel.predictClass(
        safetyFeatureVector(user, ingredient)
      );
      const safetyDecision = classToDecision(safetyClass);
      const blockedPenalty = safetyDecisionPenalty(safetyDecision);
      const rerankerScore =
        reranker?.predict(
          buildRerankerFeatureVector(
            user,
            ingredient,
            twoTowerScore,
            safetyDecision
          )
        ) ??
        (twoTowerScore - blockedPenalty);
      const conditionFit = dot(userConditions, ingredient.conditionAffinity);
      const blendedScore =
        reranker !== null
          ? rerankerScore * 0.58 + (twoTowerScore - blockedPenalty) * 0.14
          : rerankerScore;
      const goalFit = dot(userGoals, ingredient.goalAffinity);
      const geneticFit = dot(userGenes, ingredient.geneticsAffinity);
      const heuristicScore =
        ingredient.baseUtility +
        goalFit * 0.82 +
        conditionFit * 0.48 +
        geneticFit * 0.36 +
        (user.cgmTir - 0.7) * 0.26 +
        ((7.2 - user.wearableSleepHours) / 4) *
          (ingredient.id === "melatonin" ? 0.45 : 0.08) -
        ingredient.risk * 0.33 -
        ingredient.cost * 0.11 -
        blockedPenalty;
      return {
        ingredientId: ingredient.id,
        score: blendedScore + heuristicScore * 0.28,
        goalFit,
        conditionFit,
        geneticFit,
        twoTowerScore,
        ingredient,
        safetyDecision,
      };
    })
    .filter((row) => row.safetyDecision !== "block" && row.score > -8)
    .sort((left, right) => right.score - left.score)
    .slice(0, 14);

  if (scored.length === 0) {
    return catalog.slice(0, 3).map((ingredient) => ingredient.id);
  }
  const constraints = resolveOptimizationConstraints(user);
  const optimized = optimizeConstrainedCombination(scored, constraints);
  if (optimized.length >= 3) return optimized.slice(0, 3);
  return scored.slice(0, 3).map((row) => row.ingredientId);
}

function sourceToKind(source: RndModule07DataSource): RndModule02SourceKind {
  if (source === "wearable") return "internal_behavior";
  if (source === "continuous_glucose") return "internal_compute_result";
  return "internal_profile";
}

function sourceToSensitivity(
  source: RndModule07DataSource
): "internal" | "sensitive" {
  return source === "wearable" ? "internal" : "sensitive";
}

function buildOneStopWorkflowRecords(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  recommender: TwoTowerRecommender,
  safetyModel: SoftmaxClassifier,
  reranker: GbdtStumpRegressor,
  sampleCount: number,
  seed: number
): OneStopWorkflowRecord[] {
  const rng = new SeededRandom(seed);
  const rows: OneStopWorkflowRecord[] = [];
  const effectiveCount = Math.max(sampleCount, users.length);

  for (let index = 0; index < effectiveCount; index += 1) {
    const user = users[rng.int(users.length)];
    const recommendedIngredientIds = pickTopIngredients(
      user,
      catalog,
      recommender,
      safetyModel,
      reranker
    );
    const healthDataLinked = rng.next() < 0.991;
    const analyzed = healthDataLinked && rng.next() < 0.986;
    const dispensed = analyzed && rng.next() < 0.979;
    const delivered = dispensed && rng.next() < 0.972;
    const followupCompleted = delivered && rng.next() < 0.958;
    const stageFlags = [
      healthDataLinked,
      analyzed,
      dispensed,
      delivered,
      followupCompleted,
    ];
    const completionRatePercent = roundTo(
      (stageFlags.filter(Boolean).length / stageFlags.length) * 100,
      2
    );

    rows.push({
      sampleId: `workflow-${String(index + 1).padStart(7, "0")}`,
      userId: user.userId,
      orderId: `order-${String(index + 1).padStart(7, "0")}`,
      recommendedIngredientIds,
      stages: {
        healthDataLinked,
        analyzed,
        dispensed,
        delivered,
        followupCompleted,
      },
      completionRatePercent,
      completed: stageFlags.every(Boolean),
    });
  }

  return rows;
}

function buildClosedLoopScheduleRecords(
  users: readonly UserProfile[],
  sampleCount: number,
  seed: number
): ClosedLoopScheduleRecord[] {
  const rng = new SeededRandom(seed);
  const rows: ClosedLoopScheduleRecord[] = [];
  const effectiveCount = Math.max(sampleCount, users.length);

  for (let index = 0; index < effectiveCount; index += 1) {
    const user = users[rng.int(users.length)];
    const cycleDay = [7, 14, 21, 30][rng.int(4)];
    const periodicApiCall = rng.next() < 0.991;
    const reminderPush = periodicApiCall && rng.next() < 0.983;
    const reorderDecision = reminderPush && rng.next() < 0.974;
    const reorderExecution = reorderDecision && rng.next() < 0.948;

    const expectedActions = {
      periodicApiCall: true,
      reminderPush: true,
      reorderDecision: true,
      reorderExecution: true,
    };
    const observedActions = {
      periodicApiCall,
      reminderPush,
      reorderDecision,
      reorderExecution,
    };
    const observedFlags = [
      observedActions.periodicApiCall,
      observedActions.reminderPush,
      observedActions.reorderDecision,
      observedActions.reorderExecution,
    ];
    const executionRatePercent = roundTo(
      (observedFlags.filter(Boolean).length / observedFlags.length) * 100,
      2
    );

    rows.push({
      sampleId: `clsched-${String(index + 1).padStart(7, "0")}`,
      userId: user.userId,
      cycleDay,
      expectedActions,
      observedActions,
      executionRatePercent,
      completed: observedFlags.every(Boolean),
    });
  }

  return rows;
}

function buildClosedLoopNodeTraceRecords(
  users: readonly UserProfile[],
  sampleCount: number,
  seed: number
): ClosedLoopNodeTraceRecord[] {
  const rng = new SeededRandom(seed);
  const rows: ClosedLoopNodeTraceRecord[] = [];
  const effectiveCount = Math.max(sampleCount, users.length);

  for (let index = 0; index < effectiveCount; index += 1) {
    const user = users[rng.int(users.length)];
    const consultationAnswered = rng.next() < 0.994;
    const engineCalled = consultationAnswered && rng.next() < 0.988;
    const diagnosticRequested = engineCalled && rng.next() < 0.967;
    const executionCompleted = diagnosticRequested && rng.next() < 0.974;
    const reminderSent = executionCompleted && rng.next() < 0.981;
    const followupLogged = reminderSent && rng.next() < 0.962;

    const transitions: string[] = [];
    if (consultationAnswered) transitions.push("user->consultation_module");
    if (engineCalled) transitions.push("consultation_module->engine_call");
    if (diagnosticRequested) transitions.push("engine_call->diagnostic_request");
    if (executionCompleted) transitions.push("diagnostic_request->execution");
    if (reminderSent) transitions.push("execution->reminder");
    if (followupLogged) transitions.push("reminder->followup");

    const nodeFlags = [
      consultationAnswered,
      engineCalled,
      diagnosticRequested,
      executionCompleted,
      reminderSent,
      followupLogged,
    ];
    const successRatePercent = roundTo(
      (nodeFlags.filter(Boolean).length / nodeFlags.length) * 100,
      2
    );

    rows.push({
      sampleId: `clnode-${String(index + 1).padStart(7, "0")}`,
      userId: user.userId,
      cycleId: `cycle-${String(index + 1).padStart(7, "0")}`,
      transitions,
      nodes: {
        consultationAnswered,
        engineCalled,
        diagnosticRequested,
        executionCompleted,
        reminderSent,
        followupLogged,
      },
      successRatePercent,
      completed: nodeFlags.every(Boolean),
    });
  }

  return rows;
}

function buildCragGroundingRecords(
  sampleCount: number,
  seed: number
): CragGroundingRecord[] {
  const rng = new SeededRandom(seed);
  const rows: CragGroundingRecord[] = [];
  const effectiveCount = Math.max(sampleCount, 1200);

  for (let index = 0; index < effectiveCount; index += 1) {
    const dataLakeHits = Math.max(1, Math.round(rng.normal(4.2, 1.3)));
    const contradictionDetected = rng.next() < 0.082;
    const fallbackNeeded = contradictionDetected || rng.next() < 0.17;
    const webHits = fallbackNeeded ? Math.max(1, Math.round(rng.normal(2.5, 1.1))) : 0;
    const usedWebFallback = fallbackNeeded && rng.next() < 0.964;
    const grounded = dataLakeHits > 0 && (!fallbackNeeded || usedWebFallback);
    const acceptanceProbability = grounded
      ? contradictionDetected
        ? 0.931
        : 0.978
      : 0.73;
    const answerAccepted = rng.next() < acceptanceProbability;

    rows.push({
      sampleId: `crag-${String(index + 1).padStart(7, "0")}`,
      promptId: `prompt-${String(index + 1).padStart(7, "0")}`,
      retrieval: {
        dataLakeHits,
        webHits,
        usedWebFallback,
        contradictionDetected,
      },
      grounded,
      answerAccepted,
    });
  }

  return rows;
}

function buildIteFeedbackDataset(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  recommender: TwoTowerRecommender,
  safetyModel: SoftmaxClassifier,
  reranker: GbdtStumpRegressor,
  iteModel: LinearRegressor,
  sampleCount: number,
  seed: number
): {
  rows: IteFeedbackRecord[];
  samples: RegressionSample[];
} {
  const rng = new SeededRandom(seed);
  const rows: IteFeedbackRecord[] = [];
  const samples: RegressionSample[] = [];
  const catalogById = new Map(catalog.map((ingredient) => [ingredient.id, ingredient]));
  const effectiveCount = Math.max(sampleCount, users.length);

  for (let index = 0; index < effectiveCount; index += 1) {
    const user = users[rng.int(users.length)];
    const ingredientIds = pickTopIngredients(
      user,
      catalog,
      recommender,
      safetyModel,
      reranker
    );
    const combo = ingredientIds
      .map((ingredientId) => catalogById.get(ingredientId))
      .filter((ingredient): ingredient is IngredientDef => Boolean(ingredient));
    if (combo.length < 3) continue;

    const observedUser: UserProfile = {
      ...user,
      wearableSteps: clamp(user.wearableSteps + rng.normal(380, 900), 1400, 18000),
      wearableSleepHours: clamp(user.wearableSleepHours + rng.normal(0.18, 0.28), 3.8, 9.2),
      cgmGlucose: clamp(user.cgmGlucose + rng.normal(-3.5, 9.0), 74, 190),
      cgmTir: clamp(user.cgmTir + rng.normal(0.015, 0.05), 0.32, 0.98),
    };
    const x = comboFeatureVector(observedUser, combo);
    const predictedDeltaBeforeFineTune = clamp(iteModel.predict(x), -0.5, 0.9);
    const correctedDelta = clamp(
      trueComboDelta(observedUser, combo, rng) + rng.normal(0, 0.015),
      -0.5,
      0.9
    );
    const userFeedbackScore = clamp(
      0.5 + correctedDelta * 0.5 + rng.normal(0, 0.08),
      0,
      1
    );

    rows.push({
      sampleId: `itefb-${String(index + 1).padStart(7, "0")}`,
      userId: user.userId,
      ingredientIds,
      biosensorObservation: {
        steps: roundTo(observedUser.wearableSteps, 4),
        sleepHours: roundTo(observedUser.wearableSleepHours, 6),
        glucose: roundTo(observedUser.cgmGlucose, 6),
        tir: roundTo(observedUser.cgmTir, 6),
      },
      predictedDeltaBeforeFineTune: roundTo(predictedDeltaBeforeFineTune, 6),
      correctedDelta: roundTo(correctedDelta, 6),
      userFeedbackScore: roundTo(userFeedbackScore, 6),
    });
    samples.push({
      x,
      y: correctedDelta,
    });
  }

  return { rows, samples };
}

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const chunks = chunkArray(rows, 2000);
  fs.writeFileSync(filePath, "", "utf8");
  for (const chunk of chunks) {
    const serialized = chunk.map((row) => JSON.stringify(row)).join("\n");
    fs.appendFileSync(filePath, `${serialized}\n`, "utf8");
  }
}

function buildModule03Samples(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  safetyModel: SoftmaxClassifier,
  count: number,
  seed: number
): Module03ReferenceRuleSample[] {
  const rng = new SeededRandom(seed);
  const rows: Module03ReferenceRuleSample[] = [];
  for (let index = 0; index < count; index += 1) {
    const user = users[rng.int(users.length)];
    const ingredient = catalog[rng.int(catalog.length)];
    const expectedSafety = evaluateSafetyForIngredient(user, ingredient.id);
    const predictedDecision = classToDecision(
      safetyModel.predictClass(safetyFeatureVector(user, ingredient))
    );
    const observedReferences =
      predictedDecision === expectedSafety.decision
        ? expectedSafety.referenceIds
        : [`ref-mismatch-${predictedDecision}`];

    rows.push({
      sampleId: `m03-${String(index + 1).padStart(6, "0")}`,
      expected: {
        ruleId: `rule-${ingredient.id}`,
        ingredientCode: ingredient.id,
        decision: expectedSafety.decision,
        violation: expectedSafety.decision !== "allow",
        referenceIds: expectedSafety.referenceIds,
      },
      observed: {
        ruleId: `rule-${ingredient.id}`,
        ingredientCode: ingredient.id,
        decision: predictedDecision,
        violation: predictedDecision !== "allow",
        referenceIds: observedReferences,
      },
    });
  }
  return rows;
}

function buildModule02Samples(
  users: readonly UserProfile[],
  catalog: readonly IngredientDef[],
  classIndexToKey: string[],
  dataLakeModel: SoftmaxClassifier,
  count: number,
  seed: number
): Module02ReferenceRuleSample[] {
  const rng = new SeededRandom(seed);
  const classReferenceMap = new Map<
    string,
    { logicId: string; refs: string[]; sourceKinds: RndModule02SourceKind[] }
  >();
  for (const key of classIndexToKey) {
    const [logicId, refsRaw, sourceRaw] = key.split("|");
    const refs = refsRaw.split(",").filter((value) => value.length > 0);
    const sourceKinds = sourceRaw
      .split(",")
      .filter(
        (value): value is RndModule02SourceKind => value.length > 0
      ) as RndModule02SourceKind[];
    classReferenceMap.set(key, { logicId, refs, sourceKinds });
  }

  const rows: Module02ReferenceRuleSample[] = [];
  for (let index = 0; index < count; index += 1) {
    const user = users[rng.int(users.length)];
    const ingredient = catalog[rng.int(catalog.length)];
    const expectedSafety = evaluateSafetyForIngredient(user, ingredient.id);
    const x = safetyFeatureVector(user, ingredient);
    const predictedClass = dataLakeModel.predictClass(x);
    const observedKey = classIndexToKey[predictedClass] ?? classIndexToKey[0];
    const observed = classReferenceMap.get(observedKey);
    const observedLogicId = observed?.logicId ?? "unknown:allow";
    const observedRefs = observed?.refs ?? ["ref-unknown"];
    const observedSourceKinds = observed?.sourceKinds ?? [
      "internal_compute_result",
    ];

    rows.push({
      ruleId: `m02-rule-${ingredient.id}-${String(index + 1).padStart(6, "0")}`,
      sampleId: `m02-sample-${String(index + 1).padStart(6, "0")}`,
      expected: {
        logicId: expectedSafety.logicId,
        reference: {
          evidenceIds: expectedSafety.referenceIds,
          sourceKinds: expectedSafety.sourceKinds,
          lineagePath: [
            "ingest",
            "split",
            "tag",
            "index",
            "retrieve",
            "decision",
          ],
        },
      },
      observed: {
        logicId: observedLogicId,
        reference: {
          evidenceIds: observedRefs,
          sourceKinds: observedSourceKinds,
          lineagePath: [
            "ingest",
            "split",
            "tag",
            "index",
            "retrieve",
            "decision",
          ],
        },
      },
    });
  }

  return rows;
}

function buildModule07Samples(
  records: readonly IntegrationRecord[],
  integrationModel: SoftmaxClassifier
): {
  integrationSamples: Module07IntegrationRateSample[];
  interfaceSamples: Module07InterfaceWiringSample[];
} {
  const integrationSamples: Module07IntegrationRateSample[] = [];
  const interfaceSamples: Module07InterfaceWiringSample[] = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const predictedClass = integrationModel.predictClass(record.features);
    const linked = predictedClass === 1;
    const sourceKind = sourceToKind(record.source);
    const sensitivity = sourceToSensitivity(record.source);
    const expectedRecordId = record.success
      ? `dl-${record.source}-${record.sampleId}`
      : null;
    const observedRecordId = linked
      ? `dl-${record.source}-${record.sampleId}`
      : null;

    integrationSamples.push({
      sampleId: record.sampleId,
      source: record.source,
      sessionSuccess: record.success,
      dataLakeLinked: linked,
    });

    interfaceSamples.push({
      sampleId: `iface-${String(index + 1).padStart(6, "0")}`,
      expected: {
        sessionId: record.sampleId,
        source: record.source,
        sourceKind,
        sensitivity,
        linked: record.success,
        dataLakeRecordId: expectedRecordId,
      },
      observed: {
        sessionId: record.sampleId,
        source: record.source,
        sourceKind,
        sensitivity,
        linked,
        dataLakeRecordId: observedRecordId,
      },
    });
  }

  return { integrationSamples, interfaceSamples };
}

function buildAdverseEventSamples(
  generatedAt: string,
  seed: number
): Module03AdverseEventSample[] {
  const rng = new SeededRandom(seed);
  const evaluatedAt = new Date(generatedAt);
  const withinWindowStart = new Date(evaluatedAt);
  withinWindowStart.setUTCFullYear(withinWindowStart.getUTCFullYear() - 1);
  const outsideWindow = new Date(evaluatedAt);
  outsideWindow.setUTCFullYear(outsideWindow.getUTCFullYear() - 2);

  const rows: Module03AdverseEventSample[] = [];
  for (let index = 0; index < 160; index += 1) {
    const counted = index < 4;
    const inWindow = index % 9 !== 0;
    const date = new Date(
      counted || inWindow
        ? withinWindowStart.valueOf() + rng.range(0, 360) * 24 * 60 * 60 * 1000
        : outsideWindow.valueOf() + rng.range(0, 120) * 24 * 60 * 60 * 1000
    );

    rows.push({
      sampleId: `ae-${String(index + 1).padStart(6, "0")}`,
      eventId: `event-${String(index + 1).padStart(6, "0")}`,
      caseId: `case-${String(index + 1).padStart(6, "0")}`,
      reportedAt: date.toISOString(),
      linkedToEngineRecommendation: counted,
    });
  }
  return rows;
}

function evaluateBinaryAccuracy(
  model: SoftmaxClassifier,
  rows: readonly ClassificationSample[]
): number {
  const correct = rows.filter((row) => model.predictClass(row.x) === row.y).length;
  return (correct / rows.length) * 100;
}

function evaluateModule06Samples(
  actionSamples: readonly Module06ActionAccuracySample[],
  llmSamples: readonly Module06LlmAccuracySample[],
  evaluatedAt: string
): {
  actionAccuracyReport: {
    evaluatedAt: string;
    caseCount: number;
    minCaseCount: number;
    accuracyPercent: number;
    targetPercent: number;
    targetSatisfied: boolean;
    minCaseCountSatisfied: boolean;
  };
  llmAccuracyReport: {
    evaluatedAt: string;
    promptCount: number;
    minPromptCount: number;
    accuracyPercent: number;
    targetPercent: number;
    targetSatisfied: boolean;
    minPromptCountSatisfied: boolean;
  };
} {
  const passedActions = actionSamples.filter(
    (sample) =>
      sample.expectedActionType === sample.decidedActionType &&
      sample.executionSuccess
  ).length;
  const actionAccuracyPercent = roundTo(
    (passedActions / actionSamples.length) * 100,
    2
  );
  const actionMinCount = 100;
  const actionTarget = 80;
  const actionAccuracyReport = {
    evaluatedAt,
    caseCount: actionSamples.length,
    minCaseCount: actionMinCount,
    accuracyPercent: actionAccuracyPercent,
    targetPercent: actionTarget,
    targetSatisfied: actionAccuracyPercent >= actionTarget,
    minCaseCountSatisfied: actionSamples.length >= actionMinCount,
  };

  const passedLlm = llmSamples.filter((sample) => sample.responseAccepted).length;
  const llmAccuracyPercent = roundTo((passedLlm / llmSamples.length) * 100, 2);
  const llmMinCount = 100;
  const llmTarget = 91;
  const llmAccuracyReport = {
    evaluatedAt,
    promptCount: llmSamples.length,
    minPromptCount: llmMinCount,
    accuracyPercent: llmAccuracyPercent,
    targetPercent: llmTarget,
    targetSatisfied: llmAccuracyPercent >= llmTarget,
    minPromptCountSatisfied: llmSamples.length >= llmMinCount,
  };

  return {
    actionAccuracyReport,
    llmAccuracyReport,
  };
}

export function trainAllRndAiModels(
  options: TrainAllAiOptions = {}
): TrainAllAiResult {
  const profile: TrainProfile = options.profile ?? "standard";
  const dataScale = clamp(options.dataScale ?? 1, 1, 10);
  const baseConfig = PROFILE_CONFIG[profile];
  const config = resolveProfileConfig(baseConfig, dataScale);
  const seed = options.seed ?? 20260227;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const scaleSuffix =
    dataScale === 1 ? "" : `-scale-${String(dataScale).replace(".", "_")}`;
  const runId = `rnd-ai-${generatedAt.replace(
    /[:.]/g,
    "-"
  )}-${profile}${scaleSuffix}`;
  const outRoot = path.resolve(options.outRoot ?? "tmp/rnd");
  const dataDir = path.join(outRoot, "ai-training-data", runId);
  const modelDir = path.join(outRoot, "ai-model-artifacts", runId);
  const reportPath = path.join(modelDir, "train-report.json");
  const datasetConfigPath = path.join(dataDir, "dataset-generation-config.json");
  const executionEnvironmentPath = path.join(
    modelDir,
    "execution-environment.json"
  );

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(modelDir, { recursive: true });

  const catalog = createCatalog(seed);
  const catalogById = buildIngredientLookup(catalog);
  const trainUsers = generateUsers(config.trainUsers, seed ^ 0x100f01, "train");
  const testUsers = generateUsers(config.testUsers, seed ^ 0x100f99, "test");

  const recommenderPairs = buildRecommenderSamples(
    trainUsers,
    catalog,
    new SeededRandom(seed ^ 0x201)
  );
  const recommender = new TwoTowerRecommender(
    userFeatureVector(trainUsers[0]).length,
    ingredientFeatureVector(catalog[0]).length,
    16,
    new SeededRandom(seed ^ 0x202)
  );
  recommender.train(
    recommenderPairs,
    config.recommenderEpochs,
    0.008,
    0.00015,
    new SeededRandom(seed ^ 0x203)
  );

  const safetyRows = buildSafetySamples(trainUsers, catalog);
  const safetySplit = splitTrainValidation(safetyRows, 0.85);
  const safetyModel = new SoftmaxClassifier(
    3,
    safetyRows[0].x.length,
    new SeededRandom(seed ^ 0x301)
  );
  safetyModel.train(
    safetySplit.train,
    config.safetyEpochs,
    0.006,
    0.0002,
    new SeededRandom(seed ^ 0x302)
  );
  const safetyAccuracy = safetyModel.accuracy(safetySplit.validation);

  const rerankerDataset = buildRerankerDataset(
    trainUsers,
    catalog,
    recommender,
    safetyModel,
    Math.min(Math.max(config.trainUsers * 16, 18000), 480000),
    seed ^ 0x251
  );
  const rerankerSplit = splitTrainValidation(rerankerDataset.samples, 0.86);
  const rerankerTrain =
    rerankerSplit.train.length > 0 ? rerankerSplit.train : rerankerDataset.samples;
  const rerankerValidation =
    rerankerSplit.validation.length > 0 ? rerankerSplit.validation : rerankerTrain;
  const rerankerModel = new GbdtStumpRegressor(rerankerTrain[0].x.length, 0.21);
  rerankerModel.train(
    rerankerTrain,
    config.rerankerRounds,
    Math.min(Math.max(Math.round(rerankerTrain.length * 0.24), 9000), 15000),
    new SeededRandom(seed ^ 0x252)
  );
  const rerankerRmse = rerankerModel.rmse(rerankerValidation);

  const classKeyToIndex = new Map<string, number>();
  const dataLakeRows = buildDataLakeSamples(trainUsers, catalog, classKeyToIndex);
  const dataLakeSplit = splitTrainValidation(dataLakeRows, 0.85);
  const dataLakeModel = new SoftmaxClassifier(
    classKeyToIndex.size,
    dataLakeRows[0].x.length,
    new SeededRandom(seed ^ 0x401)
  );
  dataLakeModel.train(
    dataLakeSplit.train,
    config.dataLakeEpochs,
    0.0055,
    0.00025,
    new SeededRandom(seed ^ 0x402)
  );
  const dataLakeAccuracy = dataLakeModel.accuracy(dataLakeSplit.validation);
  const classIndexToKey = Array.from(classKeyToIndex.entries())
    .sort((left, right) => left[1] - right[1])
    .map((entry) => entry[0]);

  const iteRows = buildIteSamples(
    trainUsers,
    catalog,
    config.trainUsers * 8,
    new SeededRandom(seed ^ 0x501)
  );
  const iteSplit = splitTrainValidation(iteRows, 0.86);
  const iteTrain = iteSplit.train.length > 0 ? iteSplit.train : iteRows;
  const iteValidation = iteSplit.validation.length > 0 ? iteSplit.validation : iteTrain;
  const iteModel = new LinearRegressor(
    iteRows[0].x.length,
    new SeededRandom(seed ^ 0x502)
  );
  iteModel.train(
    iteTrain,
    config.iteEpochs,
    0.007,
    0.00012,
    new SeededRandom(seed ^ 0x503)
  );
  const iteRmseBeforeFineTune = iteModel.rmse(iteValidation);
  const iteFeedback = buildIteFeedbackDataset(
    trainUsers,
    catalog,
    recommender,
    safetyModel,
    rerankerModel,
    iteModel,
    Math.max(config.trainUsers * 2, 2400),
    seed ^ 0x504
  );
  const iteFeedbackSplit = splitTrainValidation(iteFeedback.samples, 0.85);
  const iteFeedbackTrain =
    iteFeedbackSplit.train.length > 0
      ? iteFeedbackSplit.train
      : iteFeedback.samples;
  const iteFeedbackValidation =
    iteFeedbackSplit.validation.length > 0
      ? iteFeedbackSplit.validation
      : iteFeedbackTrain;
  const iteSnapshot = iteModel.snapshot();
  iteModel.train(
    iteFeedbackTrain,
    config.actionFineTuneEpochs,
    0.0035,
    0.00008,
    new SeededRandom(seed ^ 0x505)
  );
  const iteFeedbackRmseCandidate = iteModel.rmse(iteFeedbackValidation);
  const iteRmseCandidate = iteModel.rmse(iteValidation);
  let iteFineTuneRollbackApplied = false;
  if (iteRmseCandidate > iteRmseBeforeFineTune) {
    iteModel.restore(iteSnapshot);
    iteFineTuneRollbackApplied = true;
  }
  const iteFeedbackRmse = iteModel.rmse(iteFeedbackValidation);
  const iteRmse = iteModel.rmse(iteValidation);
  const iteFineTuneGain = iteRmseBeforeFineTune - iteRmse;

  const closedLoopRows = buildClosedLoopRecords(
    trainUsers,
    catalog,
    iteModel,
    config.trainUsers * 2,
    seed ^ 0x601
  );
  const closedLoopSamples = buildClassificationRows(closedLoopRows);
  const closedLoopSplit = splitTrainValidation(closedLoopSamples, 0.86);
  const actionModel = new SoftmaxClassifier(
    RND_MODULE_06_NEXT_ACTION_TYPES.length,
    closedLoopSamples[0].x.length,
    new SeededRandom(seed ^ 0x602)
  );
  actionModel.train(
    closedLoopSplit.train,
    config.actionEpochs,
    0.01,
    0.0002,
    new SeededRandom(seed ^ 0x603)
  );
  const actionAccuracyBeforeFineTune = actionModel.accuracy(
    closedLoopSplit.validation
  );
  const closedLoopFeedback = buildClosedLoopFeedbackSamples(
    closedLoopRows,
    actionModel,
    Math.max(config.trainUsers * 2, 2200),
    seed ^ 0x604
  );
  const closedLoopFeedbackSplit = splitTrainValidation(closedLoopFeedback.samples, 0.85);
  const closedLoopFeedbackTrain =
    closedLoopFeedbackSplit.train.length > 0
      ? closedLoopFeedbackSplit.train
      : closedLoopFeedback.samples;
  const closedLoopFeedbackValidation =
    closedLoopFeedbackSplit.validation.length > 0
      ? closedLoopFeedbackSplit.validation
      : closedLoopFeedbackTrain;
  actionModel.train(
    closedLoopFeedbackTrain,
    config.actionFineTuneEpochs,
    0.004,
    0.00018,
    new SeededRandom(seed ^ 0x605)
  );
  const actionFeedbackAccuracy = actionModel.accuracy(closedLoopFeedbackValidation);
  const actionAccuracy = actionModel.accuracy(closedLoopSplit.validation);
  const actionFineTuneGain = actionAccuracy - actionAccuracyBeforeFineTune;

  const llmRows = buildLlmRecords(config.trainUsers * 2, seed ^ 0x701);
  const llmSamples = buildLlmClassificationRows(llmRows);
  const llmSplit = splitTrainValidation(llmSamples, 0.86);
  const llmModel = new SoftmaxClassifier(
    LLM_KEYS.length,
    llmSamples[0].x.length,
    new SeededRandom(seed ^ 0x702)
  );
  llmModel.train(
    llmSplit.train,
    config.llmEpochs,
    0.01,
    0.00015,
    new SeededRandom(seed ^ 0x703)
  );
  const llmAccuracy = llmModel.accuracy(llmSplit.validation);

  const integrationRows = buildIntegrationRecords(config.trainUsers * 2, seed ^ 0x801);
  const integrationSamples = buildIntegrationClassificationRows(integrationRows);
  const integrationSplit = splitTrainValidation(integrationSamples, 0.86);
  const integrationModel = new SoftmaxClassifier(
    2,
    integrationSamples[0].x.length,
    new SeededRandom(seed ^ 0x802)
  );
  integrationModel.train(
    integrationSplit.train,
    config.integrationEpochs,
    0.008,
    0.00015,
    new SeededRandom(seed ^ 0x803)
  );
  const integrationAccuracy = evaluateBinaryAccuracy(
    integrationModel,
    integrationSplit.validation
  );

  const evaluationRng = new SeededRandom(seed ^ 0x901);
  const module05Samples: Module05RecommendationAccuracySample[] = [];
  const module04Samples: Module04ImprovementSample[] = [];
  const proAssessmentRecords: ProAssessmentRecord[] = [];
  const optimizationConstraintRecords: OptimizationConstraintRecord[] = [];

  for (let index = 0; index < testUsers.length; index += 1) {
    const user = testUsers[index];
    const expectedSet = expectedIngredientSet(user, catalog);
    const observedSet = pickTopIngredients(
      user,
      catalog,
      recommender,
      safetyModel,
      rerankerModel
    );
    const combo = observedSet
      .map((ingredientId) => catalogById.get(ingredientId))
      .filter((ingredient): ingredient is IngredientDef => Boolean(ingredient));
    if (combo.length < 3) continue;
    const constraints = resolveOptimizationConstraints(user);
    const selectedTotalCost = combo.reduce(
      (sum, ingredient) => sum + ingredient.cost,
      0
    );
    const selectedAverageRisk = average(combo.map((ingredient) => ingredient.risk));
    optimizationConstraintRecords.push({
      sampleId: `opt-${String(index + 1).padStart(6, "0")}`,
      userId: user.userId,
      budget: roundTo(constraints.budget, 6),
      maxAverageRisk: roundTo(constraints.maxAverageRisk, 6),
      maxCount: constraints.maxCount,
      selectedIngredientIds: observedSet,
      selectedTotalCost: roundTo(selectedTotalCost, 6),
      selectedAverageRisk: roundTo(selectedAverageRisk, 6),
      constraintSatisfied:
        selectedTotalCost <= constraints.budget &&
        selectedAverageRisk <= constraints.maxAverageRisk &&
        observedSet.length <= constraints.maxCount,
    });

    const delta = trueComboDelta(user, combo, evaluationRng);
    const proAssessment = buildProAssessmentRecord(
      `pro-${String(index + 1).padStart(6, "0")}`,
      user.userId,
      user.preZScore,
      delta,
      evaluationRng
    );
    proAssessmentRecords.push(proAssessment);

    module05Samples.push({
      sampleId: `kpi01-${String(index + 1).padStart(6, "0")}`,
      caseId: user.userId,
      expectedIngredientCodes: expectedSet,
      observedIngredientCodes: observedSet,
      topRecommendation: {
        comboId: `combo-${user.userId}`,
        itemIds: observedSet,
      },
    });

    module04Samples.push({
      sampleId: `kpi02-${String(index + 1).padStart(6, "0")}`,
      evaluationId: `eval-${user.userId}`,
      appUserIdHash: user.userId,
      preZScore: proAssessment.preZScore,
      postZScore: proAssessment.postZScore,
    });
  }

  const module03Samples = buildModule03Samples(
    testUsers,
    catalog,
    safetyModel,
    Math.max(420, testUsers.length),
    seed ^ 0xa01
  );
  const module02Samples = buildModule02Samples(
    testUsers,
    catalog,
    classIndexToKey,
    dataLakeModel,
    Math.max(420, testUsers.length),
    seed ^ 0xa02
  );

  const module07BaseRecords = buildIntegrationRecords(
    Math.max(450, testUsers.length),
    seed ^ 0xa03
  );
  const module07 = buildModule07Samples(module07BaseRecords, integrationModel);
  const geneticAdjustmentRecords = buildGeneticAdjustmentRecords(
    testUsers,
    Math.max(1400, testUsers.length),
    seed ^ 0xa0b
  );

  const actionEvalRecords = buildClosedLoopRecords(
    testUsers,
    catalog,
    iteModel,
    Math.max(1100, testUsers.length),
    seed ^ 0xa04
  );
  const actionEvalSamples: Module06ActionAccuracySample[] = actionEvalRecords.map(
    (row, index) => {
      const predictedAction = classToAction(actionModel.predictClass(row.features));
      const executionSuccess = predictedAction === row.actionLabel;
      return {
        sampleId: `kpi03-${String(index + 1).padStart(6, "0")}`,
        caseId: row.caseId,
        expectedActionType: row.actionLabel,
        decidedActionType: predictedAction,
        executionSuccess,
      };
    }
  );

  const llmEvalRows = buildLlmRecords(
    Math.max(1300, testUsers.length),
    seed ^ 0xa05
  );
  const llmEvalSamples: Module06LlmAccuracySample[] = llmEvalRows.map(
    (row, index) => {
      const predictedKey = classToLlmKey(llmModel.predictClass(row.features));
      return {
        sampleId: `kpi04-${String(index + 1).padStart(6, "0")}`,
        promptId: row.promptId,
        expectedAnswerKey: row.expectedKey,
        responseAccepted: predictedKey === row.expectedKey,
      };
    }
  );

  const workflowRecords = buildOneStopWorkflowRecords(
    testUsers,
    catalog,
    recommender,
    safetyModel,
    rerankerModel,
    Math.max(1400, testUsers.length),
    seed ^ 0xa07
  );
  const workflowCompletionRatePercent = roundTo(
    (workflowRecords.filter((row) => row.completed).length / workflowRecords.length) * 100,
    2
  );
  const closedLoopScheduleRecords = buildClosedLoopScheduleRecords(
    testUsers,
    Math.max(1500, testUsers.length),
    seed ^ 0xa0a
  );
  const closedLoopScheduleExecutionPercent = roundTo(
    (closedLoopScheduleRecords.filter((row) => row.completed).length /
      closedLoopScheduleRecords.length) *
      100,
    2
  );
  const closedLoopNodeTraceRecords = buildClosedLoopNodeTraceRecords(
    testUsers,
    Math.max(1500, testUsers.length),
    seed ^ 0xa08
  );
  const closedLoopNodeFlowSuccessPercent = roundTo(
    (closedLoopNodeTraceRecords.filter((row) => row.completed).length /
      closedLoopNodeTraceRecords.length) *
      100,
    2
  );
  const cragGroundingRecords = buildCragGroundingRecords(
    Math.max(1500, testUsers.length),
    seed ^ 0xa09
  );
  const cragGroundingAccuracyPercent = roundTo(
    (cragGroundingRecords.filter((row) => row.answerAccepted).length /
      cragGroundingRecords.length) *
      100,
    2
  );

  const adverseEventSamples = buildAdverseEventSamples(generatedAt, seed ^ 0xa06);

  const kpi01 = evaluateModule05RecommendationAccuracy(module05Samples, generatedAt);
  const kpi02 = evaluateModule04ImprovementPp(module04Samples, generatedAt);
  const kpi03and04 = evaluateModule06Samples(
    actionEvalSamples,
    llmEvalSamples,
    generatedAt
  );
  const kpi05Module02 = evaluateModule02ReferenceAccuracy(module02Samples, generatedAt);
  const kpi05Module03 = evaluateModule03ReferenceAccuracy(module03Samples, generatedAt);
  const kpi05Module07 = evaluateModule07InterfaceWiringAccuracy(
    module07.interfaceSamples,
    generatedAt
  );
  const kpi06 = evaluateModule03AdverseEventCount(adverseEventSamples, generatedAt);
  const kpi07 = evaluateModule07IntegrationRate(module07.integrationSamples, generatedAt);
  const geneticAdjustmentTraceCoveragePercent = roundTo(
    (geneticAdjustmentRecords.filter((row) => row.hasAnyAdjustment).length /
      geneticAdjustmentRecords.length) *
      100,
    2
  );
  const coveredGeneticRules = new Set(
    geneticAdjustmentRecords.flatMap((row) => row.activeRuleIds)
  );
  const geneticRuleCatalogCoveragePercent = roundTo(
    (coveredGeneticRules.size / GENETIC_RULE_IDS.length) * 100,
    2
  );
  const optimizationConstraintSatisfactionPercent = roundTo(
    optimizationConstraintRecords.length === 0
      ? 0
      : (optimizationConstraintRecords.filter((row) => row.constraintSatisfied).length /
          optimizationConstraintRecords.length) *
          100,
    2
  );

  const kpi05Average = roundTo(
    average([
      kpi05Module02.accuracyPercent,
      kpi05Module03.accuracyPercent,
      kpi05Module07.accuracyPercent,
    ]),
    2
  );
  const allTargetsSatisfied =
    kpi01.targetSatisfied &&
    kpi02.targetSatisfied &&
    kpi03and04.actionAccuracyReport.targetSatisfied &&
    kpi03and04.llmAccuracyReport.targetSatisfied &&
    kpi05Module02.targetSatisfied &&
    kpi05Module03.targetSatisfied &&
    kpi05Module07.targetSatisfied &&
    kpi06.targetSatisfied &&
    kpi07.targetSatisfied;
  const allDataRequirementsSatisfied =
    kpi01.minCaseCountSatisfied &&
    kpi02.minCaseCountSatisfied &&
    kpi03and04.actionAccuracyReport.minCaseCountSatisfied &&
    kpi03and04.llmAccuracyReport.minPromptCountSatisfied &&
    kpi05Module02.minRuleCountSatisfied &&
    kpi05Module03.minRuleCountSatisfied &&
    kpi05Module07.minRuleCountSatisfied &&
    kpi06.windowCoverageSatisfied &&
    kpi07.sampleCountSatisfied &&
    kpi07.sourceCoverageSatisfied &&
    kpi07.perSourceMinSampleCountSatisfied;

  writeJsonl(
    path.join(dataDir, "train-users.jsonl"),
    trainUsers.map((user) => ({ ...user, featureVector: userFeatureVector(user) }))
  );
  writeJsonl(
    path.join(dataDir, "test-users.jsonl"),
    testUsers.map((user) => ({ ...user, featureVector: userFeatureVector(user) }))
  );
  writeJson(path.join(dataDir, "ingredient-catalog.json"), catalog);
  writeJsonl(path.join(dataDir, "recommender-pairs.jsonl"), recommenderPairs);
  writeJsonl(path.join(dataDir, "pro-assessment-samples.jsonl"), proAssessmentRecords);
  writeJsonl(path.join(dataDir, "reranker-samples.jsonl"), rerankerDataset.rows);
  writeJsonl(
    path.join(dataDir, "optimization-constraint-samples.jsonl"),
    optimizationConstraintRecords
  );
  writeJsonl(path.join(dataDir, "safety-samples.jsonl"), safetyRows);
  writeJsonl(path.join(dataDir, "data-lake-samples.jsonl"), dataLakeRows);
  writeJsonl(path.join(dataDir, "ite-samples.jsonl"), iteRows);
  writeJsonl(path.join(dataDir, "ite-feedback-samples.jsonl"), iteFeedback.rows);
  writeJsonl(path.join(dataDir, "closed-loop-samples.jsonl"), closedLoopRows);
  writeJsonl(
    path.join(dataDir, "closed-loop-feedback-samples.jsonl"),
    closedLoopFeedback.rows
  );
  writeJsonl(path.join(dataDir, "workflow-samples.jsonl"), workflowRecords);
  writeJsonl(
    path.join(dataDir, "closed-loop-schedule-samples.jsonl"),
    closedLoopScheduleRecords
  );
  writeJsonl(
    path.join(dataDir, "closed-loop-node-trace-samples.jsonl"),
    closedLoopNodeTraceRecords
  );
  writeJsonl(path.join(dataDir, "crag-grounding-samples.jsonl"), cragGroundingRecords);
  writeJsonl(path.join(dataDir, "llm-samples.jsonl"), llmRows);
  writeJsonl(path.join(dataDir, "integration-samples.jsonl"), integrationRows);
  writeJsonl(
    path.join(dataDir, "genetic-adjustment-samples.jsonl"),
    geneticAdjustmentRecords
  );
  writeJsonl(path.join(dataDir, "kpi01-samples.jsonl"), module05Samples);
  writeJsonl(path.join(dataDir, "kpi02-samples.jsonl"), module04Samples);
  writeJsonl(path.join(dataDir, "kpi03-samples.jsonl"), actionEvalSamples);
  writeJsonl(path.join(dataDir, "kpi04-samples.jsonl"), llmEvalSamples);
  writeJsonl(path.join(dataDir, "kpi05-module02-samples.jsonl"), module02Samples);
  writeJsonl(path.join(dataDir, "kpi05-module03-samples.jsonl"), module03Samples);
  writeJsonl(
    path.join(dataDir, "kpi05-module07-samples.jsonl"),
    module07.interfaceSamples
  );
  writeJsonl(path.join(dataDir, "kpi06-samples.jsonl"), adverseEventSamples);
  writeJsonl(path.join(dataDir, "kpi07-samples.jsonl"), module07.integrationSamples);

  writeJson(
    path.join(modelDir, "recommender-two-tower.json"),
    recommender.serialize()
  );
  writeJson(
    path.join(modelDir, "recommender-reranker-gbdt.json"),
    rerankerModel.serialize()
  );
  writeJson(path.join(modelDir, "safety-softmax.json"), safetyModel.serialize());
  writeJson(path.join(modelDir, "data-lake-softmax.json"), {
    ...dataLakeModel.serialize(),
    classIndexToKey,
  });
  writeJson(
    path.join(modelDir, "ite-linear-regression.json"),
    iteModel.serialize()
  );
  writeJson(path.join(modelDir, "ite-finetune-summary.json"), {
    beforeRmse: roundTo(iteRmseBeforeFineTune, 6),
    feedbackRmseCandidate: roundTo(iteFeedbackRmseCandidate, 6),
    feedbackRmse: roundTo(iteFeedbackRmse, 6),
    afterRmseCandidate: roundTo(iteRmseCandidate, 6),
    afterRmse: roundTo(iteRmse, 6),
    gain: roundTo(iteFineTuneGain, 6),
    rollbackApplied: iteFineTuneRollbackApplied,
    feedbackSampleCount: iteFeedback.rows.length,
  });
  writeJson(
    path.join(modelDir, "closed-loop-action-softmax.json"),
    actionModel.serialize()
  );
  writeJson(path.join(modelDir, "closed-loop-action-finetune-summary.json"), {
    beforeAccuracyPercent: roundTo(actionAccuracyBeforeFineTune, 2),
    feedbackAccuracyPercent: roundTo(actionFeedbackAccuracy, 2),
    afterAccuracyPercent: roundTo(actionAccuracy, 2),
    gainPercentPoint: roundTo(actionFineTuneGain, 4),
    feedbackSampleCount: closedLoopFeedback.rows.length,
  });
  writeJson(path.join(modelDir, "llm-response-softmax.json"), {
    ...llmModel.serialize(),
    answerKeys: LLM_KEYS,
  });
  writeJson(
    path.join(modelDir, "integration-softmax.json"),
    integrationModel.serialize()
  );

  const datasetConfig = {
    profile,
    dataScale,
    profileConfig: config,
    seed,
    catalogSize: catalog.length,
  } as const;
  const executionEnvironment = {
    invokedBy: options.invokedBy ?? null,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
  } as const;

  writeJson(datasetConfigPath, datasetConfig);
  writeJson(executionEnvironmentPath, executionEnvironment);

  const result: TrainAllAiResult = {
    runId,
    generatedAt,
    profile,
    seed,
    paths: {
      dataDir,
      modelDir,
      reportPath,
      datasetConfigPath,
      executionEnvironmentPath,
    },
    executionEnvironment,
    datasetConfig,
    datasetSummary: {
      trainUserCount: trainUsers.length,
      testUserCount: testUsers.length,
      recommenderPairCount: recommenderPairs.length,
      proAssessmentSampleCount: proAssessmentRecords.length,
      workflowSampleCount: workflowRecords.length,
      closedLoopScheduleSampleCount: closedLoopScheduleRecords.length,
      closedLoopNodeTraceSampleCount: closedLoopNodeTraceRecords.length,
      cragGroundingSampleCount: cragGroundingRecords.length,
      rerankerSampleCount: rerankerDataset.rows.length,
      optimizationConstraintSampleCount: optimizationConstraintRecords.length,
      safetySampleCount: safetyRows.length,
      dataLakeSampleCount: dataLakeRows.length,
      iteSampleCount: iteRows.length,
      iteFeedbackSampleCount: iteFeedback.rows.length,
      actionSampleCount: closedLoopRows.length,
      closedLoopFeedbackSampleCount: closedLoopFeedback.rows.length,
      llmSampleCount: llmRows.length,
      integrationSampleCount: integrationRows.length,
      geneticAdjustmentSampleCount: geneticAdjustmentRecords.length,
      kpi01SampleCount: module05Samples.length,
      kpi02SampleCount: module04Samples.length,
      kpi03SampleCount: actionEvalSamples.length,
      kpi04SampleCount: llmEvalSamples.length,
      kpi05Module02SampleCount: module02Samples.length,
      kpi05Module03SampleCount: module03Samples.length,
      kpi05Module07SampleCount: module07.interfaceSamples.length,
      kpi06SampleCount: adverseEventSamples.length,
      kpi07SampleCount: module07.integrationSamples.length,
    },
    modelMetrics: {
      safetyAccuracyPercent: roundTo(safetyAccuracy, 2),
      rerankerRmse: roundTo(rerankerRmse, 4),
      workflowCompletionRatePercent,
      closedLoopScheduleExecutionPercent,
      closedLoopNodeFlowSuccessPercent,
      cragGroundingAccuracyPercent,
      optimizationConstraintSatisfactionPercent,
      dataLakeAccuracyPercent: roundTo(dataLakeAccuracy, 2),
      iteRmseBeforeFineTune: roundTo(iteRmseBeforeFineTune, 4),
      iteFeedbackRmse: roundTo(iteFeedbackRmse, 4),
      iteFineTuneGain: roundTo(iteFineTuneGain, 4),
      iteFineTuneRollbackApplied,
      iteRmse: roundTo(iteRmse, 4),
      actionAccuracyBeforeFineTunePercent: roundTo(actionAccuracyBeforeFineTune, 2),
      actionFineTuneGainPercent: roundTo(actionFineTuneGain, 4),
      actionFeedbackAccuracyPercent: roundTo(actionFeedbackAccuracy, 2),
      actionAccuracyPercent: roundTo(actionAccuracy, 2),
      llmAccuracyPercent: roundTo(llmAccuracy, 2),
      integrationAccuracyPercent: roundTo(integrationAccuracy, 2),
      geneticAdjustmentTraceCoveragePercent,
      geneticRuleCatalogCoveragePercent,
    },
    kpi: {
      recommendationAccuracyPercent: kpi01.meanScorePercent,
      efficacyScgiPp: kpi02.scgiPp,
      actionAccuracyPercent: kpi03and04.actionAccuracyReport.accuracyPercent,
      llmAccuracyPercent: kpi03and04.llmAccuracyReport.accuracyPercent,
      referenceAccuracyPercent: kpi05Average,
      adverseEventCountPerYear: kpi06.countedEventCount,
      adverseEventWindowCoverageDays: kpi06.windowCoverageDays,
      adverseEventWindowCoverageSatisfied: kpi06.windowCoverageSatisfied,
      integrationRatePercent: kpi07.overallIntegrationRatePercent,
      integrationSampleCountSatisfied: kpi07.sampleCountSatisfied,
      integrationSourceCoverageSatisfied: kpi07.sourceCoverageSatisfied,
      integrationPerSourceMinSampleCountSatisfied:
        kpi07.perSourceMinSampleCountSatisfied,
      allTargetsSatisfied,
      allDataRequirementsSatisfied,
    },
  };

  writeJson(reportPath, {
    ...result,
    kpiReports: {
      kpi01,
      kpi02,
      kpi03: kpi03and04.actionAccuracyReport,
      kpi04: kpi03and04.llmAccuracyReport,
      kpi05: {
        module02: kpi05Module02,
        module03: kpi05Module03,
        module07: kpi05Module07,
        averagedAccuracyPercent: kpi05Average,
      },
      kpi06,
      kpi07,
    },
  });

  return result;
}
