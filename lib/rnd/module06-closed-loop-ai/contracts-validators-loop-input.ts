import {
  RND_MODULE_06_NAME,
  RND_MODULE_06_SCHEMA_VERSION,
  type RndModule06BiosensorObservation,
  type RndModule06EfficacySnapshot,
  type RndModule06InteractionEvent,
  type RndModule06LoopInput,
  type RndModule06OptimizationSelection,
  type RndModule06SafetySnapshot,
  type RndModule06UserProfile,
} from "./contracts-types";
import {
  isFiniteNumber,
  isIsoDateTime,
  isNonEmptyString,
  isObject,
  isRndModule06BiosensorSource,
  isRndModule06InteractionEventType,
  isRndModule06RiskLevel,
  isStringArray,
} from "./contracts-validators-primitives";

export function isRndModule06UserProfile(
  value: unknown
): value is RndModule06UserProfile {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.appUserIdHash)) return false;
  if (!isNonEmptyString(value.ageBand)) return false;
  if (
    value.sex !== "female" &&
    value.sex !== "male" &&
    value.sex !== "other" &&
    value.sex !== "unknown"
  ) {
    return false;
  }
  if (!isStringArray(value.healthGoals)) return false;
  if (!isStringArray(value.conditions)) return false;
  if (!isStringArray(value.medications)) return false;
  if (!isStringArray(value.allergies)) return false;
  return true;
}

export function isRndModule06EfficacySnapshot(
  value: unknown
): value is RndModule06EfficacySnapshot {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.evaluationId)) return false;
  if (!isFiniteNumber(value.deltaScore)) return false;
  if (!isFiniteNumber(value.improvementPp)) return false;
  if (!isIsoDateTime(value.measuredAt)) return false;
  return true;
}

export function isRndModule06SafetySnapshot(
  value: unknown
): value is RndModule06SafetySnapshot {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.safetyCaseId)) return false;
  if (!isRndModule06RiskLevel(value.riskLevel)) return false;
  if (!isStringArray(value.prohibitedIngredientCodes)) return false;
  if (!isStringArray(value.blockedRuleIds)) return false;
  if (!isIsoDateTime(value.evaluatedAt)) return false;
  return true;
}

export function isRndModule06OptimizationSelection(
  value: unknown
): value is RndModule06OptimizationSelection {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.optimizationRunId)) return false;
  if (!isNonEmptyString(value.recommendedComboId)) return false;
  if (value.selectedComboId !== null && !isNonEmptyString(value.selectedComboId)) {
    return false;
  }
  if (typeof value.selectionChanged !== "boolean") return false;
  if (!isIsoDateTime(value.selectedAt)) return false;
  return true;
}

export function isRndModule06InteractionEvent(
  value: unknown
): value is RndModule06InteractionEvent {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.eventId)) return false;
  if (!isRndModule06InteractionEventType(value.eventType)) return false;
  if (!isNonEmptyString(value.summary)) return false;
  if (!isStringArray(value.relatedIds)) return false;
  if (!isIsoDateTime(value.occurredAt)) return false;
  return true;
}

export function isRndModule06BiosensorObservation(
  value: unknown
): value is RndModule06BiosensorObservation {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.observationId)) return false;
  if (!isRndModule06BiosensorSource(value.source)) return false;
  if (!isNonEmptyString(value.metricKey)) return false;
  if (!isFiniteNumber(value.value)) return false;
  if (!isNonEmptyString(value.unit)) return false;
  if (!isIsoDateTime(value.observedAt)) return false;
  return true;
}

export function isRndModule06LoopInput(value: unknown): value is RndModule06LoopInput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (value.module !== RND_MODULE_06_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_06_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.capturedAt)) return false;
  if (!isRndModule06UserProfile(value.profile)) return false;
  if (!isRndModule06EfficacySnapshot(value.efficacy)) return false;
  if (!isRndModule06SafetySnapshot(value.safety)) return false;
  if (!isRndModule06OptimizationSelection(value.optimization)) return false;
  if (!Array.isArray(value.interactionEvents) || value.interactionEvents.length === 0) {
    return false;
  }
  if (!value.interactionEvents.every((event) => isRndModule06InteractionEvent(event))) {
    return false;
  }
  if (!Array.isArray(value.biosensorObservations)) return false;
  if (
    !value.biosensorObservations.every((observation) =>
      isRndModule06BiosensorObservation(observation)
    )
  ) {
    return false;
  }
  return true;
}

export function assertRndModule06LoopInput(
  value: unknown
): asserts value is RndModule06LoopInput {
  if (!isRndModule06LoopInput(value)) {
    throw new Error("Invalid Module 06 loop input payload.");
  }
}
