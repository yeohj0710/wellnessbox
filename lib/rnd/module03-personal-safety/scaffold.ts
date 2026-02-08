// RND: Module 03 Personal Safety Validation Engine scaffold fixture builder.

import {
  assertRndModule03AppliedRuleResult,
  assertRndModule03RuleReference,
  assertRndModule03SafetyOutput,
  assertRndModule03SafetyRule,
  assertRndModule03TraceLog,
  assertRndModule03ValidationInput,
  type RndModule03AppliedRuleResult,
  type RndModule03RuleReference,
  type RndModule03SafetyOutput,
  type RndModule03SafetyRule,
  type RndModule03TraceLog,
  type RndModule03ValidationInput,
} from "./contracts";

export type Module03ScaffoldBundle = {
  generatedAt: string;
  validationInput: RndModule03ValidationInput;
  references: RndModule03RuleReference[];
  rules: RndModule03SafetyRule[];
  appliedResults: RndModule03AppliedRuleResult[];
  safetyOutput: RndModule03SafetyOutput;
  traceLogs: RndModule03TraceLog[];
};

function assertIsoDateTime(value: string, fieldName: string) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

export function buildModule03ScaffoldBundle(
  generatedAt = new Date().toISOString()
): Module03ScaffoldBundle {
  assertIsoDateTime(generatedAt, "generatedAt");

  const caseId = "rnd03-case-warfarin-001";
  const validationInput: RndModule03ValidationInput = {
    caseId,
    module: "03_personal_safety_validation_engine",
    schemaVersion: "2026-02-scaffold-v1",
    capturedAt: generatedAt,
    profile: {
      appUserIdHash: "sha256:87e8db5a4e7a9c40",
      ageBand: "40-49",
      sex: "female",
      medications: ["warfarin"],
      conditions: ["hypertension"],
      allergies: ["shellfish"],
      lifestyleTags: ["night-shift"],
      healthGoals: ["bone-health", "stress-support"],
    },
    candidates: [
      { ingredientCode: "vitamin_k", dailyIntakeMg: 0.12 },
      { ingredientCode: "magnesium", dailyIntakeMg: 450 },
      { ingredientCode: "omega3", dailyIntakeMg: 1000 },
    ],
  };

  const references: RndModule03RuleReference[] = [
    {
      referenceId: "ref-warfarin-vitk-001",
      source: "medical_database",
      sourceRef: "micromedex://interaction/warfarin-vitamin-k",
      summary: "Vitamin K can reduce warfarin anticoagulant effect.",
      capturedAt: generatedAt,
    },
    {
      referenceId: "ref-magnesium-ul-001",
      source: "regulatory_guideline",
      sourceRef: "ods://magnesium/supplemental-upper-limit",
      summary: "Supplemental magnesium intake should remain at or below 350mg/day.",
      capturedAt: generatedAt,
    },
  ];

  const rules: RndModule03SafetyRule[] = [
    {
      ruleId: "m03-rule-vitk-warfarin",
      kind: "interaction",
      ingredientCode: "vitamin_k",
      triggers: { medications: ["warfarin"] },
      referenceIds: ["ref-warfarin-vitk-001"],
      priority: 1,
      active: true,
    },
    {
      ruleId: "m03-rule-magnesium-max",
      kind: "overdose",
      ingredientCode: "magnesium",
      triggers: {},
      threshold: { maxDailyIntakeMg: 350 },
      referenceIds: ["ref-magnesium-ul-001"],
      priority: 2,
      active: true,
    },
  ];

  const appliedResults: RndModule03AppliedRuleResult[] = [
    {
      resultId: "m03-result-vitk-warfarin",
      caseId,
      ruleId: "m03-rule-vitk-warfarin",
      ingredientCode: "vitamin_k",
      decision: "block",
      violation: true,
      reason: "Current medication contains warfarin, so vitamin K is blocked.",
      referenceIds: ["ref-warfarin-vitk-001"],
      evaluatedAt: generatedAt,
    },
    {
      resultId: "m03-result-magnesium-max",
      caseId,
      ruleId: "m03-rule-magnesium-max",
      ingredientCode: "magnesium",
      decision: "limit",
      violation: true,
      reason: "Requested daily intake exceeds the configured 350mg/day threshold.",
      referenceIds: ["ref-magnesium-ul-001"],
      evaluatedAt: generatedAt,
    },
  ];

  const safetyOutput: RndModule03SafetyOutput = {
    caseId,
    module: "03_personal_safety_validation_engine",
    schemaVersion: "2026-02-scaffold-v1",
    generatedAt,
    ranges: [
      {
        ingredientCode: "vitamin_k",
        allowedDailyIntakeMg: null,
        prohibited: true,
        blockedReasons: [
          "Blocked due to interaction risk with active warfarin medication.",
        ],
        blockedRuleIds: ["m03-rule-vitk-warfarin"],
      },
      {
        ingredientCode: "magnesium",
        allowedDailyIntakeMg: { min: 0, max: 350 },
        prohibited: false,
        blockedReasons: [
          "Daily dosage is constrained to the configured 350mg/day upper bound.",
        ],
        blockedRuleIds: ["m03-rule-magnesium-max"],
      },
      {
        ingredientCode: "omega3",
        allowedDailyIntakeMg: { min: 0, max: 1000 },
        prohibited: false,
        blockedReasons: [],
        blockedRuleIds: [],
      },
    ],
    prohibitedIngredients: ["vitamin_k"],
    prohibitedRules: ["m03-rule-vitk-warfarin"],
  };

  const traceLogs: RndModule03TraceLog[] = [
    {
      traceId: "m03-trace-vitk-warfarin",
      caseId,
      resultId: "m03-result-vitk-warfarin",
      ruleId: "m03-rule-vitk-warfarin",
      referenceIds: ["ref-warfarin-vitk-001"],
      summary: "Interaction rule triggered by medication overlap: warfarin.",
      loggedAt: generatedAt,
    },
    {
      traceId: "m03-trace-magnesium-max",
      caseId,
      resultId: "m03-result-magnesium-max",
      ruleId: "m03-rule-magnesium-max",
      referenceIds: ["ref-magnesium-ul-001"],
      summary: "Overdose rule triggered by intake threshold comparison.",
      loggedAt: generatedAt,
    },
  ];

  const bundle: Module03ScaffoldBundle = {
    generatedAt,
    validationInput,
    references,
    rules,
    appliedResults,
    safetyOutput,
    traceLogs,
  };
  assertModule03ScaffoldBundle(bundle);
  return bundle;
}

export function assertModule03ScaffoldBundle(bundle: Module03ScaffoldBundle): void {
  assertIsoDateTime(bundle.generatedAt, "generatedAt");
  assertRndModule03ValidationInput(bundle.validationInput);

  if (bundle.references.length === 0) {
    throw new Error("At least one Module 03 reference is required.");
  }
  bundle.references.forEach((reference) => assertRndModule03RuleReference(reference));

  if (bundle.rules.length === 0) {
    throw new Error("At least one Module 03 safety rule is required.");
  }
  bundle.rules.forEach((rule) => assertRndModule03SafetyRule(rule));

  if (bundle.appliedResults.length === 0) {
    throw new Error("At least one Module 03 applied rule result is required.");
  }
  bundle.appliedResults.forEach((result) => assertRndModule03AppliedRuleResult(result));

  assertRndModule03SafetyOutput(bundle.safetyOutput);

  if (bundle.traceLogs.length === 0) {
    throw new Error("At least one Module 03 trace log is required.");
  }
  bundle.traceLogs.forEach((traceLog) => assertRndModule03TraceLog(traceLog));

  if (bundle.validationInput.caseId !== bundle.safetyOutput.caseId) {
    throw new Error("Module 03 caseId mismatch between input and output.");
  }

  const referenceIds = new Set(bundle.references.map((reference) => reference.referenceId));
  if (referenceIds.size !== bundle.references.length) {
    throw new Error("Module 03 references must be unique by referenceId.");
  }

  const ruleIds = new Set(bundle.rules.map((rule) => rule.ruleId));
  if (ruleIds.size !== bundle.rules.length) {
    throw new Error("Module 03 rules must be unique by ruleId.");
  }
  bundle.rules.forEach((rule) => {
    rule.referenceIds.forEach((referenceId) => {
      if (!referenceIds.has(referenceId)) {
        throw new Error(`Missing reference ${referenceId} for rule ${rule.ruleId}.`);
      }
    });
  });

  const resultIds = new Set(bundle.appliedResults.map((result) => result.resultId));
  if (resultIds.size !== bundle.appliedResults.length) {
    throw new Error("Module 03 applied results must be unique by resultId.");
  }
  bundle.appliedResults.forEach((result) => {
    if (result.caseId !== bundle.validationInput.caseId) {
      throw new Error(`Result ${result.resultId} has mismatched caseId.`);
    }
    if (!ruleIds.has(result.ruleId)) {
      throw new Error(`Missing rule ${result.ruleId} for result ${result.resultId}.`);
    }
    result.referenceIds.forEach((referenceId) => {
      if (!referenceIds.has(referenceId)) {
        throw new Error(
          `Missing reference ${referenceId} for result ${result.resultId}.`
        );
      }
    });
  });

  bundle.traceLogs.forEach((traceLog) => {
    if (traceLog.caseId !== bundle.validationInput.caseId) {
      throw new Error(`Trace ${traceLog.traceId} has mismatched caseId.`);
    }
    if (!resultIds.has(traceLog.resultId)) {
      throw new Error(`Missing result ${traceLog.resultId} for trace ${traceLog.traceId}.`);
    }
    if (!ruleIds.has(traceLog.ruleId)) {
      throw new Error(`Missing rule ${traceLog.ruleId} for trace ${traceLog.traceId}.`);
    }
    traceLog.referenceIds.forEach((referenceId) => {
      if (!referenceIds.has(referenceId)) {
        throw new Error(
          `Missing reference ${referenceId} for trace ${traceLog.traceId}.`
        );
      }
    });
  });

  const prohibitedIngredientSet = new Set(bundle.safetyOutput.prohibitedIngredients);
  const prohibitedRuleSet = new Set(bundle.safetyOutput.prohibitedRules);

  bundle.safetyOutput.ranges.forEach((range) => {
    if (range.prohibited && !prohibitedIngredientSet.has(range.ingredientCode)) {
      throw new Error(
        `Ingredient ${range.ingredientCode} is prohibited in range but missing from summary.`
      );
    }
    range.blockedRuleIds.forEach((ruleId) => {
      if (!ruleIds.has(ruleId)) {
        throw new Error(`Missing rule ${ruleId} referenced in output range.`);
      }
    });
  });

  prohibitedRuleSet.forEach((ruleId) => {
    if (!ruleIds.has(ruleId)) {
      throw new Error(`Missing prohibited rule ${ruleId} in output summary.`);
    }
  });
}

