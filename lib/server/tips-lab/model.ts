import "server-only";

import snapshotJson from "@/data/tips/proxy-recommendation-model.json";

type BinaryClassifier = {
  classes: number[];
  coefficients: number[][];
  intercepts: number[];
};

type ModelSnapshot = {
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
  goals: string[];
  conditions: string[];
  medicationClasses: string[];
  allergies: string[];
  currentSupplements: string[];
  riskFlags: string[];
};

export type ModelCandidate = {
  ingredientId: string;
  label: string;
  score: number;
};

const snapshot = snapshotJson as ModelSnapshot;

const INGREDIENT_LABELS: Record<string, string> = {
  "ING:VITAMIN_D": "비타민 D",
  "ING:VITAMIN_B12": "비타민 B12",
  "ING:IRON": "철분",
  "ING:FOLATE": "엽산",
  "ING:MAGNESIUM": "마그네슘",
  "ING:OMEGA3": "오메가3",
  "ING:CALCIUM": "칼슘",
  "ING:PROBIOTIC": "프로바이오틱스",
  "ING:COQ10": "코엔자임 Q10",
  "ING:ZINC": "아연",
  "ING:VITAMIN_C": "비타민 C",
  "ING:LUTEIN": "루테인",
  "ING:PSYLLIUM": "차전자피",
  "ING:PROTEIN": "단백질",
};

function ageBand(age: number) {
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  if (age < 60) return "50s";
  return "60plus";
}

function sigmoid(value: number) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function dot(indices: number[], weights: number[], intercept: number) {
  return indices.reduce((sum, index) => sum + (weights[index] ?? 0), intercept);
}

function tokens(profile: TipsLabProfile) {
  const result = new Set<string>([
    `age=${ageBand(profile.age)}`,
    `sex=${profile.sex ?? "unknown"}`,
    `pregnancy=${profile.pregnant ? "pregnant" : "not_pregnant"}`,
    "budget=50000",
    "pill_limit=3",
    "form=any",
  ]);
  const lists: Array<[string, string[]]> = [
    ["goals", profile.goals],
    ["conditions", profile.conditions],
    ["medication_classes", profile.medicationClasses],
    ["allergies", profile.allergies],
    ["current_supplements", profile.currentSupplements],
    ["risk_flags", profile.riskFlags],
  ];
  for (const [key, values] of lists) {
    for (const value of values) result.add(`${key}:${value}`);
  }
  return [...result].sort();
}

function activeIndices(profile: TipsLabProfile) {
  return tokens(profile)
    .map((token) => snapshot.vocabulary[token])
    .filter((value): value is number => Number.isInteger(value))
    .sort((a, b) => a - b);
}

function predictCount(indices: number[]) {
  const classifier = snapshot.countClassifier;
  const scores = classifier.classes.map((label, rowIndex) => ({
    label,
    score: dot(
      indices,
      classifier.coefficients[rowIndex] ?? [],
      classifier.intercepts[rowIndex] ?? 0
    ),
  }));
  const selected = scores.sort((a, b) => b.score - a.score)[0]?.label ?? 1;
  return Math.min(3, Math.max(1, selected));
}

export function predictProxyRecommendations(profile: TipsLabProfile): ModelCandidate[] {
  const indices = activeIndices(profile);
  const count = predictCount(indices);
  return snapshot.ingredientClassifiers
    .map((classifier, index) => {
      const weights = classifier.coefficients[0] ?? [];
      const probability = sigmoid(dot(indices, weights, classifier.intercepts[0] ?? 0));
      const ingredientId = snapshot.ingredients[index] ?? "ING:UNKNOWN";
      return {
        ingredientId,
        label: INGREDIENT_LABELS[ingredientId] ?? ingredientId,
        score: probability,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export const proxyModelMetadata = Object.freeze({
  mode: snapshot.mode,
  schemaVersion: snapshot.schemaVersion,
  sourceArtifact: snapshot.sourceArtifact,
  sourceSha256: snapshot.sourceSha256,
  featureCount: Object.keys(snapshot.vocabulary).length,
  ingredientCount: snapshot.ingredients.length,
});

