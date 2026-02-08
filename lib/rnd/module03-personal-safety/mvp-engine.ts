// RND: Module 03 Personal Safety Validation Engine MVP deterministic rule execution.

import {
  RND_MODULE_03_NAME,
  assertRndModule03AppliedRuleResult,
  assertRndModule03RuleReference,
  assertRndModule03SafetyOutput,
  assertRndModule03SafetyRule,
  assertRndModule03TraceLog,
  assertRndModule03ValidationInput,
  type RndModule03AppliedRuleResult,
  type RndModule03Decision,
  type RndModule03RuleReference,
  type RndModule03SafetyOutput,
  type RndModule03SafetyRule,
  type RndModule03TraceLog,
  type RndModule03ValidationInput,
} from "./contracts";

const MODULE03_MVP_PHASE = "MVP" as const;

export type Module03MvpRuntimeLog = {
  logId: string;
  caseId: string;
  module: typeof RND_MODULE_03_NAME;
  phase: typeof MODULE03_MVP_PHASE;
  stage: "input_validation" | "rule_matching" | "output_build";
  event: string;
  details: Record<string, string | number | boolean | null>;
  loggedAt: string;
};

export type RunModule03SafetyValidationMvpInput = {
  validationInput: RndModule03ValidationInput;
  rules: RndModule03SafetyRule[];
  references: RndModule03RuleReference[];
  evaluatedAt?: string;
};

export type RunModule03SafetyValidationMvpResult = {
  module: typeof RND_MODULE_03_NAME;
  phase: typeof MODULE03_MVP_PHASE;
  evaluatedAt: string;
  appliedResults: RndModule03AppliedRuleResult[];
  safetyOutput: RndModule03SafetyOutput;
  traceLogs: RndModule03TraceLog[];
  runtimeLogs: Module03MvpRuntimeLog[];
};

type ProfileContext = {
  medications: Set<string>;
  conditions: Set<string>;
  allergies: Set<string>;
};

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function toNormalizedSet(values: string[]): Set<string> {
  return new Set(values.map((value) => normalizeToken(value)).filter(Boolean));
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values));
}

function matchesTrigger(triggerValues: string[] | undefined, profileSet: Set<string>): boolean {
  if (!triggerValues || triggerValues.length === 0) return true;
  return triggerValues.some((value) => profileSet.has(normalizeToken(value)));
}

function matchedTriggerValues(triggerValues: string[] | undefined, profileValues: string[]): string[] {
  if (!triggerValues || triggerValues.length === 0) return [];
  const profileSet = toNormalizedSet(profileValues);
  return triggerValues.filter((value) => profileSet.has(normalizeToken(value)));
}

function buildDecision(violation: boolean, ruleKind: RndModule03SafetyRule["kind"]): RndModule03Decision {
  if (!violation) return "allow";
  if (ruleKind === "overdose" || ruleKind === "caution") return "limit";
  return "block";
}

function buildTriggerSummary(
  rule: RndModule03SafetyRule,
  input: RndModule03ValidationInput
): string {
  const chunks: string[] = [];
  const medicationMatches = matchedTriggerValues(
    rule.triggers.medications,
    input.profile.medications
  );
  if (medicationMatches.length > 0) {
    chunks.push(`medications=${medicationMatches.join(",")}`);
  }

  const conditionMatches = matchedTriggerValues(
    rule.triggers.conditions,
    input.profile.conditions
  );
  if (conditionMatches.length > 0) {
    chunks.push(`conditions=${conditionMatches.join(",")}`);
  }

  const allergyMatches = matchedTriggerValues(rule.triggers.allergies, input.profile.allergies);
  if (allergyMatches.length > 0) {
    chunks.push(`allergies=${allergyMatches.join(",")}`);
  }

  return chunks.length > 0 ? chunks.join("; ") : "general_safety_rule";
}

function evaluateRuleViolation(
  rule: RndModule03SafetyRule,
  input: RndModule03ValidationInput,
  dailyIntakeMg: number
): { violation: boolean; reason: string } {
  if (typeof rule.threshold?.maxDailyIntakeMg === "number") {
    if (dailyIntakeMg > rule.threshold.maxDailyIntakeMg) {
      return {
        violation: true,
        reason: `Daily intake ${dailyIntakeMg}mg exceeds max ${rule.threshold.maxDailyIntakeMg}mg.`,
      };
    }
    return {
      violation: false,
      reason: `Daily intake ${dailyIntakeMg}mg is within max ${rule.threshold.maxDailyIntakeMg}mg.`,
    };
  }

  const triggerSummary = buildTriggerSummary(rule, input);
  return {
    violation: true,
    reason: `Rule trigger matched (${triggerSummary}).`,
  };
}

function sortRules(rules: RndModule03SafetyRule[]): RndModule03SafetyRule[] {
  return [...rules].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return left.ruleId.localeCompare(right.ruleId);
  });
}

function sameIngredient(left: string, right: string): boolean {
  return normalizeToken(left) === normalizeToken(right);
}

function buildProfileContext(input: RndModule03ValidationInput): ProfileContext {
  return {
    medications: toNormalizedSet(input.profile.medications),
    conditions: toNormalizedSet(input.profile.conditions),
    allergies: toNormalizedSet(input.profile.allergies),
  };
}

function ruleAppliesToCandidate(
  rule: RndModule03SafetyRule,
  ingredientCode: string,
  profileContext: ProfileContext
): boolean {
  if (!rule.active) return false;
  if (!sameIngredient(rule.ingredientCode, ingredientCode)) return false;

  const medicationMatch = matchesTrigger(rule.triggers.medications, profileContext.medications);
  const conditionMatch = matchesTrigger(rule.triggers.conditions, profileContext.conditions);
  const allergyMatch = matchesTrigger(rule.triggers.allergies, profileContext.allergies);
  return medicationMatch && conditionMatch && allergyMatch;
}

export function runModule03SafetyValidationMvp(
  input: RunModule03SafetyValidationMvpInput
): RunModule03SafetyValidationMvpResult {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  assertIsoDateTime(evaluatedAt, "evaluatedAt");

  assertRndModule03ValidationInput(input.validationInput);
  if (input.rules.length === 0) {
    throw new Error("Module 03 MVP requires at least one safety rule.");
  }
  if (input.references.length === 0) {
    throw new Error("Module 03 MVP requires at least one rule reference.");
  }

  input.rules.forEach((rule) => assertRndModule03SafetyRule(rule));
  input.references.forEach((reference) => assertRndModule03RuleReference(reference));

  const caseId = input.validationInput.caseId;
  const runtimeLogs: Module03MvpRuntimeLog[] = [];
  let runtimeLogCount = 0;
  const pushRuntimeLog = (
    stage: Module03MvpRuntimeLog["stage"],
    event: string,
    details: Module03MvpRuntimeLog["details"]
  ) => {
    runtimeLogCount += 1;
    runtimeLogs.push({
      logId: `m03-runtime-${String(runtimeLogCount).padStart(4, "0")}`,
      caseId,
      module: RND_MODULE_03_NAME,
      phase: MODULE03_MVP_PHASE,
      stage,
      event,
      details,
      loggedAt: evaluatedAt,
    });
  };

  const referenceIdSet = new Set(input.references.map((reference) => reference.referenceId));
  const duplicatedReferenceCount = input.references.length - referenceIdSet.size;
  if (duplicatedReferenceCount > 0) {
    throw new Error("Module 03 MVP references must be unique by referenceId.");
  }

  for (const rule of input.rules) {
    for (const referenceId of rule.referenceIds) {
      if (!referenceIdSet.has(referenceId)) {
        throw new Error(`Rule ${rule.ruleId} references missing id: ${referenceId}`);
      }
    }
  }

  pushRuntimeLog("input_validation", "validated_inputs", {
    ruleCount: input.rules.length,
    referenceCount: input.references.length,
    candidateCount: input.validationInput.candidates.length,
  });

  const sortedRules = sortRules(input.rules);
  const profileContext = buildProfileContext(input.validationInput);
  const appliedResults: RndModule03AppliedRuleResult[] = [];
  const traceLogs: RndModule03TraceLog[] = [];
  let resultCount = 0;
  let traceCount = 0;

  for (const candidate of input.validationInput.candidates) {
    let matchedRuleCount = 0;
    for (const rule of sortedRules) {
      if (!ruleAppliesToCandidate(rule, candidate.ingredientCode, profileContext)) {
        continue;
      }

      matchedRuleCount += 1;
      const evaluation = evaluateRuleViolation(rule, input.validationInput, candidate.dailyIntakeMg);
      resultCount += 1;

      const decision = buildDecision(evaluation.violation, rule.kind);
      const appliedResult: RndModule03AppliedRuleResult = {
        resultId: `m03-result-${String(resultCount).padStart(4, "0")}`,
        caseId,
        ruleId: rule.ruleId,
        ingredientCode: candidate.ingredientCode,
        decision,
        violation: evaluation.violation,
        reason: evaluation.reason,
        referenceIds: [...rule.referenceIds],
        evaluatedAt,
      };
      assertRndModule03AppliedRuleResult(appliedResult);
      appliedResults.push(appliedResult);

      traceCount += 1;
      const traceLog: RndModule03TraceLog = {
        traceId: `m03-trace-${String(traceCount).padStart(4, "0")}`,
        caseId,
        resultId: appliedResult.resultId,
        ruleId: rule.ruleId,
        referenceIds: [...rule.referenceIds],
        summary: `${decision.toUpperCase()} ${candidate.ingredientCode}: ${evaluation.reason}`,
        loggedAt: evaluatedAt,
      };
      assertRndModule03TraceLog(traceLog);
      traceLogs.push(traceLog);
    }

    pushRuntimeLog("rule_matching", "candidate_evaluated", {
      ingredientCode: candidate.ingredientCode,
      dailyIntakeMg: candidate.dailyIntakeMg,
      matchedRuleCount,
    });
  }

  const ruleMap = new Map(sortedRules.map((rule) => [rule.ruleId, rule]));
  const ranges = input.validationInput.candidates.map((candidate) => {
    const candidateViolations = appliedResults.filter((result) => {
      return sameIngredient(result.ingredientCode, candidate.ingredientCode) && result.violation;
    });
    const blockedRuleIds = uniqueValues(candidateViolations.map((result) => result.ruleId));
    const blockedReasons = uniqueValues(candidateViolations.map((result) => result.reason));
    const prohibited = candidateViolations.some((result) => result.decision === "block");

    let allowedDailyIntakeMg: { min: number; max: number } | null = null;
    if (!prohibited) {
      let max = candidate.dailyIntakeMg;
      for (const violation of candidateViolations) {
        if (violation.decision !== "limit") continue;
        const threshold = ruleMap.get(violation.ruleId)?.threshold?.maxDailyIntakeMg;
        if (typeof threshold === "number") {
          max = Math.min(max, threshold);
        }
      }
      allowedDailyIntakeMg = { min: 0, max };
    }

    return {
      ingredientCode: candidate.ingredientCode,
      allowedDailyIntakeMg,
      prohibited,
      blockedReasons,
      blockedRuleIds,
    };
  });

  const prohibitedIngredients = ranges
    .filter((range) => range.prohibited)
    .map((range) => range.ingredientCode);
  const prohibitedRules = uniqueValues(
    appliedResults
      .filter((result) => result.violation && result.decision === "block")
      .map((result) => result.ruleId)
  );

  const safetyOutput: RndModule03SafetyOutput = {
    caseId,
    module: RND_MODULE_03_NAME,
    schemaVersion: input.validationInput.schemaVersion,
    generatedAt: evaluatedAt,
    ranges,
    prohibitedIngredients,
    prohibitedRules,
  };
  assertRndModule03SafetyOutput(safetyOutput);

  pushRuntimeLog("output_build", "built_output", {
    appliedResultCount: appliedResults.length,
    traceLogCount: traceLogs.length,
    prohibitedIngredientCount: prohibitedIngredients.length,
  });

  return {
    module: RND_MODULE_03_NAME,
    phase: MODULE03_MVP_PHASE,
    evaluatedAt,
    appliedResults,
    safetyOutput,
    traceLogs,
    runtimeLogs,
  };
}
