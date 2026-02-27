import "server-only";

import {
  RND_MODULE_06_BIOSENSOR_SOURCES,
  RND_MODULE_06_EVIDENCE_SOURCES,
  RND_MODULE_06_EXECUTION_CHANNELS,
  RND_MODULE_06_EXECUTION_STATUSES,
  RND_MODULE_06_INTERACTION_EVENT_TYPES,
  RND_MODULE_06_NEXT_ACTION_TYPES,
  RND_MODULE_06_RISK_LEVELS,
  type RndModule06BiosensorSource,
  type RndModule06EvidenceSource,
  type RndModule06ExecutionChannel,
  type RndModule06ExecutionStatus,
  type RndModule06InteractionEventType,
  type RndModule06NextActionType,
  type RndModule06RiskLevel,
} from "./contracts-types";

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

export function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isRndModule06NextActionType(
  value: unknown
): value is RndModule06NextActionType {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_NEXT_ACTION_TYPES as readonly string[]).includes(value)
  );
}

export function isRndModule06ExecutionChannel(
  value: unknown
): value is RndModule06ExecutionChannel {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_EXECUTION_CHANNELS as readonly string[]).includes(value)
  );
}

export function isRndModule06ExecutionStatus(
  value: unknown
): value is RndModule06ExecutionStatus {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_EXECUTION_STATUSES as readonly string[]).includes(value)
  );
}

export function isRndModule06InteractionEventType(
  value: unknown
): value is RndModule06InteractionEventType {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_INTERACTION_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function isRndModule06BiosensorSource(
  value: unknown
): value is RndModule06BiosensorSource {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_BIOSENSOR_SOURCES as readonly string[]).includes(value)
  );
}

export function isRndModule06RiskLevel(
  value: unknown
): value is RndModule06RiskLevel {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_RISK_LEVELS as readonly string[]).includes(value)
  );
}

export function isRndModule06EvidenceSource(
  value: unknown
): value is RndModule06EvidenceSource {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_EVIDENCE_SOURCES as readonly string[]).includes(value)
  );
}
