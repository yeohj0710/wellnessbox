export function dedupeFetchTargets<T extends string>(
  input: T[] | undefined,
  defaults: readonly T[]
) {
  if (!input || input.length === 0) return [...defaults];
  return Array.from(new Set(input));
}

export function normalizeFetchYearLimit(
  value: number | undefined,
  options: {
    defaultYearLimit: number;
    maxYearLimit: number;
  }
) {
  return Math.max(
    options.defaultYearLimit,
    Math.min(value ?? options.defaultYearLimit, options.maxYearLimit)
  );
}

export function resolveEffectiveYearLimit<T extends string>(
  targets: readonly T[],
  value: number | undefined,
  options: {
    defaultYearLimit: number;
    maxYearLimit: number;
    detailTargets: readonly T[];
  }
) {
  const detailTargetSet = new Set(options.detailTargets);
  const requiresYearLimit = targets.some((target) => detailTargetSet.has(target));
  if (!requiresYearLimit) return options.defaultYearLimit;
  return normalizeFetchYearLimit(value, options);
}

export function isHighCostTargetsEnabled(raw: string | undefined) {
  return raw === "1";
}

export function resolveAllowedTargets<T extends string>(options: {
  allTargets: readonly T[];
  lowCostTargets: readonly T[];
  highCostEnabled: boolean;
}) {
  return options.highCostEnabled
    ? [...options.allTargets]
    : [...options.lowCostTargets];
}

export function resolveBlockedTargets<T extends string>(
  targets: readonly T[],
  allowedTargets: readonly T[]
) {
  const allowed = new Set(allowedTargets);
  return targets.filter((target) => !allowed.has(target));
}

export function pickMostRecentDate(
  primary?: Date | null,
  secondary?: Date | null
): Date | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary ?? null;
  if (!secondary) return primary;
  return primary.getTime() >= secondary.getTime() ? primary : secondary;
}

export function computeCooldownState(
  cooldownSeconds: number,
  lastAttemptAt?: Date | null,
  now: Date = new Date()
) {
  if (!lastAttemptAt) {
    return {
      cooldownSeconds,
      remainingSeconds: 0,
      available: true,
      availableAt: null as Date | null,
    };
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - lastAttemptAt.getTime()) / 1000)
  );
  const remainingSeconds = Math.max(0, cooldownSeconds - elapsedSeconds);
  const availableAt =
    remainingSeconds > 0
      ? new Date(lastAttemptAt.getTime() + cooldownSeconds * 1000)
      : null;

  return {
    cooldownSeconds,
    remainingSeconds,
    available: remainingSeconds === 0,
    availableAt,
  };
}
