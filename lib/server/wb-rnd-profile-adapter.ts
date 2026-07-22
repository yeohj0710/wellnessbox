import { randomUUID } from "node:crypto";
import { z, type ZodError } from "zod";

import type { UserProfile } from "@/types/chat";
import type { WbRndRecommendRequest } from "@/lib/server/wb-rnd-client";

const SOURCE_PROFILE_SCHEMA_VERSION = "wellnessbox.chat.UserProfile.v1" as const;

function boundedNonBlankText(maxCharacters: number) {
  return z
    .string()
    .min(1)
    .refine(
      (value) => [...value].length <= maxCharacters,
      `must contain at most ${maxCharacters} Unicode characters`
    )
    .refine((value) => value.trim().length > 0, "must contain visible text");
}

const nonBlankName = boundedNonBlankText(200);
const nonBlankProfileText = boundedNonBlankText(128);
const sourceProfileSchema = z
  .object({
    name: nonBlankName.optional(),
    age: z.number().int().min(18).max(120).optional(),
    sex: z.enum(["male", "female", "other"]).optional(),
    heightCm: z.number().positive().max(300).optional(),
    weightKg: z.number().positive().max(500).optional(),
    conditions: z.array(nonBlankProfileText).max(100).optional(),
    medications: z.array(nonBlankProfileText).max(100).optional(),
    allergies: z.array(nonBlankProfileText).max(100).optional(),
    goals: z.array(nonBlankProfileText).max(20).optional(),
    dietaryRestrictions: z.array(nonBlankProfileText).max(100).optional(),
    pregnantOrBreastfeeding: z.boolean().optional(),
    caffeineSensitivity: z.boolean().optional(),
  })
  .strict();
const adapterOptionsSchema = z
  .object({
    requestId: nonBlankName.optional(),
    subjectId: z.string().regex(/^usr_[a-f0-9]{16,64}$/).optional(),
    surveyConsent: z
      .object({
        useForRecommendation: z.boolean(),
        allowPersistentStorage: z.boolean(),
      })
      .strict(),
  })
  .strict();

type RecommendationGoal = WbRndRecommendRequest["goals"][number];

const GOAL_BY_NORMALIZED_ALIAS: Record<string, RecommendationGoal> = {
  "stress": "stress_support",
  "stress support": "stress_support",
  "stress management": "stress_support",
  "스트레스": "stress_support",
  "sleep": "sleep_support",
  "sleep support": "sleep_support",
  "sleep quality": "sleep_support",
  "수면": "sleep_support",
  "immunity": "immunity_support",
  "immune support": "immunity_support",
  "immunity support": "immunity_support",
  "면역": "immunity_support",
  "energy": "energy_support",
  "energy support": "energy_support",
  "에너지": "energy_support",
  "digestion": "gut_health",
  "digestive": "gut_health",
  "gut": "gut_health",
  "gut health": "gut_health",
  "소화": "gut_health",
  "장 건강": "gut_health",
  "bone": "bone_joint",
  "bone joint": "bone_joint",
  "joint": "bone_joint",
  "관절": "bone_joint",
  "뼈": "bone_joint",
  "heart": "heart_health",
  "heart health": "heart_health",
  "cardiovascular": "heart_health",
  "심장": "heart_health",
  "심혈관": "heart_health",
  "blood glucose": "blood_glucose",
  "glucose": "blood_glucose",
  "혈당": "blood_glucose",
  "general wellness": "general_wellness",
  "health": "general_wellness",
  "wellness": "general_wellness",
  "건강": "general_wellness",
};

export type WbRndProfileAdapterIssue = {
  path: string;
  code: string;
  message: string;
};

export type WbRndProfileAdapterErrorCode =
  | "invalid_source_profile"
  | "invalid_adapter_options"
  | "invalid_json_body"
  | "invalid_request_body"
  | "missing_required_profile_fields"
  | "survey_recommendation_consent_required"
  | "unsupported_profile_goal";

export class WbRndProfileAdapterError extends Error {
  constructor(
    readonly code: WbRndProfileAdapterErrorCode,
    readonly issues: WbRndProfileAdapterIssue[]
  ) {
    super(code);
    this.name = "WbRndProfileAdapterError";
  }
}

function normalizeGoal(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[\s_-]+/g, " ");
}

function zodIssues(error: ZodError): WbRndProfileAdapterIssue[] {
  const result: WbRndProfileAdapterIssue[] = [];
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        result.push({
          path: [...issue.path, key].join("."),
          code: issue.code,
          message: issue.message,
        });
      }
      continue;
    }
    result.push({
      path: issue.path.join("."),
      code: issue.code,
      message: issue.message,
    });
  }
  return result;
}

function parseSourceProfile(value: unknown): UserProfile {
  const result = sourceProfileSchema.safeParse(value);
  if (!result.success) {
    throw new WbRndProfileAdapterError(
      "invalid_source_profile",
      zodIssues(result.error)
    );
  }
  return result.data;
}

function mapGoals(goals: string[]): RecommendationGoal[] {
  return goals.map((goal, index) => {
    const mapped = GOAL_BY_NORMALIZED_ALIAS[normalizeGoal(goal)];
    if (!mapped) {
      throw new WbRndProfileAdapterError("unsupported_profile_goal", [
        {
          path: `goals.${index}`,
          code: "unsupported_value",
          message: `Unsupported profile goal: ${goal}`,
        },
      ]);
    }
    return mapped;
  });
}

function falseConsent() {
  return {
    use_for_recommendation: false,
    allow_persistent_storage: false,
  };
}

export function mapWellnessBoxProfileToWbRndRequest(
  value: unknown,
  optionsValue: unknown
): WbRndRecommendRequest {
  const profile = parseSourceProfile(value);
  const optionsResult = adapterOptionsSchema.safeParse(optionsValue);
  if (!optionsResult.success) {
    throw new WbRndProfileAdapterError(
      "invalid_adapter_options",
      zodIssues(optionsResult.error)
    );
  }
  const options = optionsResult.data;

  const missingIssues: WbRndProfileAdapterIssue[] = [];
  if (profile.age === undefined) {
    missingIssues.push({ path: "age", code: "required", message: "Age is required." });
  }
  if (profile.sex === undefined) {
    missingIssues.push({ path: "sex", code: "required", message: "Sex is required." });
  }
  if (!profile.goals?.length) {
    missingIssues.push({ path: "goals", code: "required", message: "At least one goal is required." });
  }
  if (missingIssues.length) {
    throw new WbRndProfileAdapterError(
      "missing_required_profile_fields",
      missingIssues
    );
  }
  if (!options.surveyConsent.useForRecommendation) {
    throw new WbRndProfileAdapterError(
      "survey_recommendation_consent_required",
      [
        {
          path: "surveyConsent.useForRecommendation",
          code: "consent_required",
          message: "Survey recommendation-use consent is required.",
        },
      ]
    );
  }

  const age = profile.age as number;
  const sex = profile.sex as NonNullable<UserProfile["sex"]>;
  const goals = mapGoals(profile.goals as string[]);
  const {
    name: _directIdentifier,
    caffeineSensitivity: _unusedCaffeineSensitivity,
    ...minimumSourceProfile
  } = profile;
  const sourceProfile = structuredClone(minimumSourceProfile);

  return {
    request_id: options.requestId ?? randomUUID(),
    source_profile: {
      schema_version: SOURCE_PROFILE_SCHEMA_VERSION,
      ...(options.subjectId === undefined
        ? {}
        : { subject_id: options.subjectId as `usr_${string}` }),
      profile: sourceProfile,
    },
    user_profile: {
      age,
      biological_sex: sex,
      pregnant: profile.pregnantOrBreastfeeding ?? false,
      ...(profile.heightCm === undefined ? {} : { height_cm: profile.heightCm }),
      ...(profile.weightKg === undefined ? {} : { weight_kg: profile.weightKg }),
    },
    goals,
    symptoms: [],
    conditions: [...(profile.conditions ?? [])],
    allergies: [...(profile.allergies ?? [])],
    risk_flags: [],
    medications: (profile.medications ?? []).map((name) => ({ name })),
    current_supplements: [],
    dietary_patterns: [...(profile.dietaryRestrictions ?? [])],
    laboratory_observations: [],
    input_availability: {
      survey: true,
      nhis: false,
      wearable: false,
      cgm: false,
      genetic: false,
    },
    data_source_consents: {
      survey: {
        use_for_recommendation: true,
        allow_persistent_storage:
          options.surveyConsent.allowPersistentStorage,
      },
      nhis: falseConsent(),
      wearable: falseConsent(),
      cgm: falseConsent(),
      genetic: falseConsent(),
    },
    preferences: {
      budget_level: "medium",
      max_products: 2,
      avoid_ingredients: [],
    },
  };
}
