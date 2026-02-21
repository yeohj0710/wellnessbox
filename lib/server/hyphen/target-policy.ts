import "server-only";

import {
  LOW_COST_NHIS_FETCH_TARGETS,
  NHIS_FETCH_TARGETS,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import {
  isHighCostTargetsEnabled,
  resolveAllowedTargets,
  resolveBlockedTargets,
} from "@/lib/shared/nhis-fetch-policy";

const ENABLE_HIGH_COST_TARGETS_ENV = "HYPHEN_NHIS_ENABLE_HIGH_COST_TARGETS";

export function isNhisHighCostTargetsEnabled() {
  return isHighCostTargetsEnabled(process.env[ENABLE_HIGH_COST_TARGETS_ENV]);
}

export function resolveAllowedNhisFetchTargets(): NhisFetchTarget[] {
  return resolveAllowedTargets({
    allTargets: NHIS_FETCH_TARGETS,
    lowCostTargets: LOW_COST_NHIS_FETCH_TARGETS,
    highCostEnabled: isNhisHighCostTargetsEnabled(),
  });
}

export function resolveBlockedNhisFetchTargets(targets: NhisFetchTarget[]) {
  return resolveBlockedTargets(targets, resolveAllowedNhisFetchTargets());
}
