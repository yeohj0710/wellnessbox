import "server-only";

import snapshotJson from "@/data/tips/proxy-recommendation-model.json";
import {
  explainProxySnapshot,
  type ModelCandidate,
  type ProxyModelSnapshot,
  type TipsLabProfile,
} from "@/lib/tips/proxy-model-engine";

export type { ActiveFeature, ExplainedCandidate, FeatureContribution, ModelCandidate, TipsLabProfile } from "@/lib/tips/proxy-model-engine";

const snapshot = snapshotJson as ProxyModelSnapshot;
const INGREDIENT_LABELS: Record<string, string> = {
  "ING:VITAMIN_D": "비타민 D", "ING:VITAMIN_B12": "비타민 B12", "ING:IRON": "철분",
  "ING:FOLATE": "엽산", "ING:MAGNESIUM": "마그네슘", "ING:OMEGA3": "오메가3",
  "ING:CALCIUM": "칼슘", "ING:PROBIOTIC": "프로바이오틱스", "ING:COQ10": "코엔자임 Q10",
  "ING:ZINC": "아연", "ING:VITAMIN_C": "비타민 C", "ING:LUTEIN": "루테인",
  "ING:PSYLLIUM": "차전자피", "ING:PROTEIN": "단백질",
};

export function explainProxyRecommendations(profile: TipsLabProfile) {
  return explainProxySnapshot(snapshot, profile, INGREDIENT_LABELS);
}

export function predictProxyRecommendations(profile: TipsLabProfile): ModelCandidate[] {
  return explainProxyRecommendations(profile).selectedCandidates.map(({ ingredientId, label, score }) => ({ ingredientId, label, score }));
}

export const proxyModelMetadata = Object.freeze({
  mode: snapshot.mode,
  schemaVersion: snapshot.schemaVersion,
  sourceArtifact: snapshot.sourceArtifact,
  sourceSha256: snapshot.sourceSha256,
  featureCount: Object.keys(snapshot.vocabulary).length,
  ingredientCount: snapshot.ingredients.length,
});
