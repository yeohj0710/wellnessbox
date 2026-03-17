import type { AiExperimentDefinition } from "./config";

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function assignAiExperimentVariant(input: {
  definition: AiExperimentDefinition;
  actorSeed: string | null;
}) {
  const { definition, actorSeed } = input;
  const variants = definition.variants.filter((variant) => variant.weight > 0);
  const fallback = variants[0] ?? definition.variants[0];
  if (!fallback) {
    throw new Error(`Experiment ${definition.key} has no variants.`);
  }

  const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
  if (totalWeight <= 0) return fallback.key;

  const hash = hashString(`${definition.key}:${actorSeed ?? "anonymous"}`);
  const bucket = hash % totalWeight;
  let cursor = 0;

  for (const variant of variants) {
    cursor += variant.weight;
    if (bucket < cursor) {
      return variant.key;
    }
  }

  return fallback.key;
}
