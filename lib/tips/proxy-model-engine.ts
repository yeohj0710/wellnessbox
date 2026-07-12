export type BinaryClassifier = { classes: number[]; coefficients: number[][]; intercepts: number[] };
export type ProxyModelSnapshot = {
  schemaVersion: string;
  mode: "PROXY_GOLD_SIMULATION";
  sourceArtifact: string;
  sourceSha256: string;
  seed: number;
  vocabulary: Record<string, number>;
  ingredients: string[];
  ingredientClassifiers: BinaryClassifier[];
  countClassifier: BinaryClassifier;
};
export type TipsLabProfile = {
  age: number;
  sex?: "female" | "male" | "unknown";
  pregnant?: boolean;
  pregnancyStatus?: "not_applicable" | "not_pregnant" | "pregnant" | "lactating";
  monthlyBudgetKrw?: number;
  maxDailyPills?: number;
  preferredForm?: "capsule" | "powder" | "tablet";
  goals: string[];
  conditions: string[];
  medicationClasses: string[];
  allergies: string[];
  dietPatterns?: string[];
  currentSupplements: string[];
  wearableFeatures?: string[];
  geneticFeatures?: string[];
  symptoms?: Array<{ code: string; severity: "mild" | "moderate" | "severe"; redFlag?: boolean }>;
  labs?: Record<string, string>;
  riskFlags: string[];
};
export type ModelCandidate = { ingredientId: string; label: string; score: number };
export type ActiveFeature = { token: string; index: number };
export type FeatureContribution = ActiveFeature & { weight: number; contribution: number };
export type ExplainedCandidate = ModelCandidate & {
  rank: number;
  intercept: number;
  linearScore: number;
  selectedByModel: boolean;
  contributions: FeatureContribution[];
};

function ageBand(age: number) {
  if (age < 30) return "18-29";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  if (age < 60) return "50-59";
  if (age < 70) return "60-69";
  return "70+";
}

function sigmoid(value: number) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

export type BlindProfile = {
  age_band: string; sex_at_birth: string; pregnancy_status: string;
  preferences: { monthly_budget_krw: number; max_daily_pills: number; preferred_form: string };
  goals: string[]; conditions: string[]; medication_classes: string[]; allergies: string[];
  diet_patterns: string[]; current_supplements: string[]; wearable_features: string[];
  genetic_features: string[]; risk_flags: string[];
  symptoms: Array<{ code: string; severity: string; red_flag?: boolean }>;
  labs: Record<string, string>;
};

export function blindProfileTokens(profile: BlindProfile) {
  const tokens = new Set<string>([
    `age=${profile.age_band}`, `sex=${profile.sex_at_birth}`, `pregnancy=${profile.pregnancy_status}`,
    `budget=${profile.preferences.monthly_budget_krw}`, `pill_limit=${profile.preferences.max_daily_pills}`,
    `form=${profile.preferences.preferred_form}`,
  ]);
  const lists: Array<[string, string[]]> = [
    ["goals", profile.goals], ["conditions", profile.conditions], ["medication_classes", profile.medication_classes],
    ["allergies", profile.allergies], ["diet_patterns", profile.diet_patterns], ["current_supplements", profile.current_supplements],
    ["wearable_features", profile.wearable_features], ["genetic_features", profile.genetic_features], ["risk_flags", profile.risk_flags],
  ];
  for (const [key, values] of lists) for (const value of values) tokens.add(`${key}:${value}`);
  for (const symptom of profile.symptoms) {
    tokens.add(`symptom:${symptom.code}`); tokens.add(`symptom_severity:${symptom.severity}`);
    if (symptom.red_flag) tokens.add("symptom:red_flag");
  }
  for (const [name, status] of Object.entries(profile.labs)) tokens.add(`lab:${name}=${status}`);
  return [...tokens].sort();
}

export function predictProxyTokens(snapshot: ProxyModelSnapshot, tokens: string[]) {
  const indices = [...new Set(tokens.map((token) => snapshot.vocabulary[token]).filter(Number.isInteger))].sort((a, b) => a - b);
  const countScores = snapshot.countClassifier.classes.map((rawClass, rowIndex) => ({
    count: Math.max(0, Math.min(2, rawClass)),
    score: indices.reduce((sum, index) => sum + (snapshot.countClassifier.coefficients[rowIndex]?.[index] ?? 0), snapshot.countClassifier.intercepts[rowIndex] ?? 0),
  })).sort((a, b) => b.score - a.score);
  const predictedCount = countScores[0]?.count ?? 0;
  const ranked = snapshot.ingredientClassifiers.map((classifier, index) => ({
    ingredientId: snapshot.ingredients[index],
    probability: sigmoid(indices.reduce((sum, featureIndex) => sum + (classifier.coefficients[0]?.[featureIndex] ?? 0), classifier.intercepts[0] ?? 0)),
  })).sort((a, b) => b.probability - a.probability);
  return { tokens, activeFeatureCount: indices.length, predictedCount, predicted: ranked.slice(0, predictedCount).map((row) => row.ingredientId), ranked };
}

export function profileTokens(profile: TipsLabProfile) {
  const result = new Set<string>([
    `age=${ageBand(profile.age)}`,
    `pregnancy=${profile.pregnancyStatus ?? (profile.pregnant ? "pregnant" : "not_pregnant")}`,
    `budget=${profile.monthlyBudgetKrw ?? 50000}`,
    `pill_limit=${profile.maxDailyPills ?? 3}`,
    `form=${profile.preferredForm ?? "capsule"}`,
  ]);
  if (profile.sex === "female" || profile.sex === "male") result.add(`sex=${profile.sex}`);
  const lists: Array<[string, string[]]> = [
    ["goals", profile.goals], ["conditions", profile.conditions],
    ["medication_classes", profile.medicationClasses], ["allergies", profile.allergies],
    ["current_supplements", profile.currentSupplements], ["risk_flags", profile.riskFlags],
    ["diet_patterns", profile.dietPatterns ?? []], ["wearable_features", profile.wearableFeatures ?? []],
    ["genetic_features", profile.geneticFeatures ?? []],
  ];
  for (const [key, values] of lists) for (const value of values) result.add(`${key}:${value}`);
  for (const symptom of profile.symptoms ?? []) {
    result.add(`symptom:${symptom.code}`); result.add(`symptom_severity:${symptom.severity}`);
    if (symptom.redFlag) result.add("symptom:red_flag");
  }
  for (const [name, status] of Object.entries(profile.labs ?? {})) if (status) result.add(`lab:${name}=${status}`);
  return [...result].sort();
}

export function explainProxySnapshot(
  snapshot: ProxyModelSnapshot,
  profile: TipsLabProfile,
  ingredientLabels: Record<string, string>
) {
  const activeFeatures: ActiveFeature[] = profileTokens(profile)
    .map((token) => ({ token, index: snapshot.vocabulary[token] }))
    .filter((item): item is ActiveFeature => Number.isInteger(item.index))
    .sort((a, b) => a.index - b.index);
  const indices = activeFeatures.map((item) => item.index);
  const classScores = snapshot.countClassifier.classes.map((rawClass, rowIndex) => {
    const weights = snapshot.countClassifier.coefficients[rowIndex] ?? [];
    const intercept = snapshot.countClassifier.intercepts[rowIndex] ?? 0;
    const linearScore = indices.reduce((sum, index) => sum + (weights[index] ?? 0), intercept);
    return { rawClass, recommendationCount: Math.max(0, Math.min(2, rawClass)), intercept, linearScore };
  }).sort((a, b) => b.linearScore - a.linearScore);
  const countDecision = { predictedCount: classScores[0]?.recommendationCount ?? 0, classScores };
  const candidateScores: ExplainedCandidate[] = snapshot.ingredientClassifiers
    .map((classifier, index) => {
      const weights = classifier.coefficients[0] ?? [];
      const intercept = classifier.intercepts[0] ?? 0;
      const contributions = activeFeatures.map((feature) => ({
        ...feature,
        weight: weights[feature.index] ?? 0,
        contribution: weights[feature.index] ?? 0,
      })).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
      const linearScore = intercept + contributions.reduce((sum, item) => sum + item.contribution, 0);
      const ingredientId = snapshot.ingredients[index] ?? "ING:UNKNOWN";
      return {
        ingredientId,
        label: ingredientLabels[ingredientId] ?? ingredientId,
        score: sigmoid(linearScore),
        rank: 0,
        intercept,
        linearScore,
        selectedByModel: false,
        contributions,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => ({ ...candidate, rank: index + 1, selectedByModel: index < countDecision.predictedCount }));
  return {
    formula: "probability = sigmoid(intercept + Σ(active_feature × coefficient))",
    activeFeatures,
    countDecision,
    candidateScores,
    selectedCandidates: candidateScores.filter((item) => item.selectedByModel),
  };
}
