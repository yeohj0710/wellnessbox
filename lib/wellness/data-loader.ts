import commonSurveyJson from "@/data/b2b/survey.common.json";
import reportTextsJson from "@/data/b2b/report.texts.json";
import scoringRulesJson from "@/data/b2b/scoring.rules.json";
import sectionSurveyJson from "@/data/b2b/survey.sections.json";
import { z } from "zod";

const scoredOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(1).optional(),
  aliases: z.array(z.string().min(1)).optional(),
  labelPaper: z.string().min(1).optional(),
});

const listItemSchema = z.object({
  value: z.string().min(1).optional(),
  label: z.string().min(1),
  aliases: z.array(z.string().min(1)).optional(),
});

const noneOptionSchema = z.object({
  value: z.string().min(1).optional(),
  label: z.string().min(1),
});

const optionVariantSchema = z.object({
  variantId: z.string().min(1).optional(),
  optionsPrefix: z.string().nullable().optional(),
  options: z.array(scoredOptionSchema).min(1),
  notes: z.string().optional(),
});

const constraintsSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    integer: z.boolean().optional(),
    maxSelections: z.number().int().min(1).max(24).optional(),
    recommendedSelectionsRange: z
      .tuple([z.number().int().min(0), z.number().int().min(0)])
      .optional(),
  })
  .optional();

const scoringToggleSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .optional();

const displayIfSchema = z
  .object({
    field: z.string().min(1),
    equals: z.union([z.string(), z.number(), z.boolean()]),
  })
  .optional();

const groupFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "number"]),
  unit: z.string().optional(),
  constraints: constraintsSchema,
});

const commonQuestionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1),
  prompt: z.string().min(1),
  type: z.enum([
    "single_choice",
    "multi_select_with_none",
    "multi_select_limited",
    "number",
    "group",
  ]),
  options: z.array(scoredOptionSchema).optional(),
  items: z.array(listItemSchema).optional(),
  noneOption: noneOptionSchema.optional(),
  fields: z.array(groupFieldSchema).optional(),
  constraints: constraintsSchema,
  scoring: scoringToggleSchema,
  displayIf: displayIfSchema,
  unit: z.string().optional(),
  notes: z.string().optional(),
});

const sectionQuestionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1),
  prompt: z.string().min(1),
  type: z.enum(["single_choice", "multi_select_with_none", "multi_select_limited"]),
  optionsPrefix: z.string().nullable().optional(),
  options: z.array(scoredOptionSchema).min(1),
  variants: z.record(z.string(), optionVariantSchema).optional(),
  constraints: constraintsSchema,
  scoring: scoringToggleSchema,
});

const commonSurveySchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  generatedAtUtc: z.string().optional(),
  questions: z.array(commonQuestionSchema).min(1),
});

const sectionSurveySchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  generatedAtUtc: z.string().optional(),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        questionCount: z.number().int().min(0).optional(),
        questions: z.array(sectionQuestionSchema).min(1),
      })
    )
    .min(1),
});

const scoringRulesSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  lifestyleRisk: z.object({
    domains: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          questionIds: z.array(z.string().min(1)).min(1),
          calc: z.object({
            type: z.string().min(1),
            divideBy: z.number().positive().optional(),
          }),
        })
      )
      .min(1),
    overall: z.object({
      calc: z.object({
        type: z.string().min(1),
      }),
      percentTransform: z
        .object({
          type: z.string().min(1),
          factor: z.number().positive(),
        })
        .optional(),
    }),
  }),
  healthManagementNeed: z.object({
    sectionScore: z.object({
      calc: z.object({
        type: z.string().min(1),
      }),
      percentTransform: z
        .object({
          type: z.string().min(1),
          factor: z.number().positive(),
        })
        .optional(),
    }),
    overallAverage: z.object({
      calc: z.object({
        type: z.string().min(1),
      }),
      percentTransform: z
        .object({
          type: z.string().min(1),
          factor: z.number().positive(),
        })
        .optional(),
    }),
  }),
  overallHealthScore: z.object({
    calc: z.object({
      type: z.string().min(1),
      formula: z.string().min(1),
      clampToRange: z.tuple([z.number(), z.number()]).optional(),
      higherIsBetter: z.boolean().optional(),
    }),
  }),
  reportGeneration: z.object({
    sectionAnalysis: z.object({
      includeAdviceIfQuestionScoreGte: z.number().min(0).max(1),
    }),
    lifestyleRoutine: z.object({
      questionRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
      primaryScoreToInclude: z.number().min(0).max(1),
      fallbackScoreToInclude: z.number().min(0).max(1),
    }),
    supplementDesign: z.object({
      defaultTopN: z.number().int().min(1).max(24),
    }),
  }),
});

const reportTextsSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  sectionAnalysisAdvice: z.record(
    z.string(),
    z.object({
      title: z.string().min(1),
      adviceByQuestionNumber: z.record(z.string(), z.string().min(1)),
    })
  ),
  lifestyleRoutineAdviceByCommonQuestionNumber: z.record(z.string(), z.string().min(1)),
  supplementDesignTextBySectionId: z.record(
    z.string(),
    z.object({
      title: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
    })
  ),
});

export type WellnessCommonSurvey = z.infer<typeof commonSurveySchema>;
export type WellnessSectionSurvey = z.infer<typeof sectionSurveySchema>;
export type WellnessScoringRules = z.infer<typeof scoringRulesSchema>;
export type WellnessReportTexts = z.infer<typeof reportTextsSchema>;

export type WellnessSurveyQuestionForTemplate = {
  key: string;
  index: number;
  text: string;
  helpText?: string;
  type: "text" | "single" | "multi" | "number" | "group";
  sourceType:
    | "single_choice"
    | "multi_select_with_none"
    | "multi_select_limited"
    | "number"
    | "group";
  required: boolean;
  options: Array<{
    value: string;
    label: string;
    score?: number;
    aliases?: string[];
    isNoneOption?: boolean;
  }>;
  placeholder?: string;
  maxSelect?: number;
  optionsPrefix?: string;
  unit?: string;
  fields?: Array<{
    id: string;
    label: string;
    type: "text" | "number";
    unit?: string;
    constraints?: {
      min?: number;
      max?: number;
      integer?: boolean;
    };
  }>;
  displayIf?: {
    field: string;
    equals: string;
  };
  constraints?: {
    min?: number;
    max?: number;
    integer?: boolean;
    maxSelections?: number;
    recommendedSelectionsRange?: [number, number];
  };
  scoringEnabled?: boolean;
  noneOptionValue?: string;
  variants?: Record<
    string,
    {
      variantId: string;
      optionsPrefix?: string;
      options: Array<{ value: string; label: string; score?: number }>;
    }
  >;
};

export type WellnessSurveyTemplate = {
  version: number;
  title: string;
  description?: string;
  common: WellnessSurveyQuestionForTemplate[];
  sectionCatalog: Array<{
    key: string;
    title: string;
    displayName?: string;
    description?: string;
    triggerLabel: string;
    questionCount: number;
    aliases?: string[];
  }>;
  sections: Array<{
    key: string;
    title: string;
    displayName?: string;
    description?: string;
    questions: WellnessSurveyQuestionForTemplate[];
  }>;
  rules: {
    selectSectionByCommonQuestionKey: string;
    maxSelectedSections: number;
    minSelectedSections: number;
    recommendedSelectionsRange?: [number, number];
  };
};

type WellnessDataBundle = {
  common: WellnessCommonSurvey;
  sections: WellnessSectionSurvey;
  rules: WellnessScoringRules;
  texts: WellnessReportTexts;
};

let cachedDataBundle: WellnessDataBundle | null = null;
let cachedTemplate: WellnessSurveyTemplate | null = null;

function normalizeTemplateQuestionType(
  type: WellnessCommonSurvey["questions"][number]["type"] | "single_choice"
) {
  switch (type) {
    case "single_choice":
      return "single" as const;
    case "multi_select_with_none":
    case "multi_select_limited":
      return "multi" as const;
    case "number":
      return "number" as const;
    case "group":
      return "group" as const;
    default:
      return "text" as const;
  }
}

function majorVersionOf(versionText: string) {
  const [majorToken] = versionText.split(".");
  const major = Number.parseInt(majorToken || "1", 10);
  if (Number.isNaN(major) || major < 1) return 1;
  return major + 1;
}

function buildGeneratedValue(questionId: string, index: number, tag: string) {
  const suffix = String(index + 1).padStart(2, "0");
  return `${questionId}_${tag}_${suffix}`;
}

function normalizeConstraint(
  constraints: WellnessCommonSurvey["questions"][number]["constraints"]
) {
  if (!constraints) return undefined;
  const normalized = {
    min: constraints.min,
    max: constraints.max,
    integer: constraints.integer,
    maxSelections: constraints.maxSelections,
    recommendedSelectionsRange: constraints.recommendedSelectionsRange,
  };
  if (
    normalized.min == null &&
    normalized.max == null &&
    normalized.integer == null &&
    normalized.maxSelections == null &&
    !normalized.recommendedSelectionsRange
  ) {
    return undefined;
  }
  return normalized;
}

function buildPlaceholder(question: WellnessCommonSurvey["questions"][number]) {
  if (question.type === "number") {
    return question.unit
      ? `숫자를 입력해 주세요 (${question.unit})`
      : "숫자를 입력해 주세요";
  }
  if (question.type === "group") {
    const labels = (question.fields ?? []).map((field) => field.label).filter(Boolean);
    return labels.length > 0
      ? `${labels.join(", ")} 값을 입력해 주세요`
      : "값을 입력해 주세요";
  }
  return undefined;
}

function toDisplayIf(
  displayIf: WellnessCommonSurvey["questions"][number]["displayIf"]
) {
  if (!displayIf) return undefined;
  return {
    field: displayIf.field,
    equals: String(displayIf.equals),
  };
}

function buildQuestionOptions(question: WellnessCommonSurvey["questions"][number]) {
  const options: WellnessSurveyQuestionForTemplate["options"] = [];

  if (Array.isArray(question.options) && question.options.length > 0) {
    for (const [index, option] of question.options.entries()) {
      options.push({
        value: option.value || buildGeneratedValue(question.id, index, "OPT"),
        label: option.label,
        score: option.score,
        aliases: option.aliases,
      });
    }
  }

  if (Array.isArray(question.items) && question.items.length > 0) {
    for (const [index, item] of question.items.entries()) {
      options.push({
        value: item.value || buildGeneratedValue(question.id, index, "ITEM"),
        label: item.label,
        aliases: item.aliases,
      });
    }
  }

  if (question.noneOption) {
    options.push({
      value: question.noneOption.value || `${question.id}_NONE`,
      label: question.noneOption.label,
      isNoneOption: true,
    });
  }

  return options;
}

export function loadWellnessDataBundle(): WellnessDataBundle {
  if (cachedDataBundle) return cachedDataBundle;
  const bundle = {
    common: commonSurveySchema.parse(commonSurveyJson),
    sections: sectionSurveySchema.parse(sectionSurveyJson),
    rules: scoringRulesSchema.parse(scoringRulesJson),
    texts: reportTextsSchema.parse(reportTextsJson),
  };
  cachedDataBundle = bundle;
  return bundle;
}

export function loadWellnessTemplateForB2b(): WellnessSurveyTemplate {
  if (cachedTemplate) return cachedTemplate;
  const bundle = loadWellnessDataBundle();
  const sectionById = new Map(bundle.sections.sections.map((section) => [section.id, section]));
  const c27 = bundle.common.questions.find((question) => question.id === "C27");

  const maxSelectedSections = c27?.constraints?.maxSelections ?? 5;
  const recommendedSelectionsRange = c27?.constraints?.recommendedSelectionsRange;

  const common = bundle.common.questions.map((question) => {
    const options = buildQuestionOptions(question);
    const noneOptionValue = options.find((option) => option.isNoneOption)?.value;
    const constraints = normalizeConstraint(question.constraints);

    return {
      key: question.id,
      index: question.number,
      text: question.prompt,
      helpText: question.notes,
      type: normalizeTemplateQuestionType(question.type),
      sourceType: question.type,
      required: true,
      options,
      placeholder: buildPlaceholder(question),
      maxSelect:
        question.type === "multi_select_limited" ||
        question.type === "multi_select_with_none"
          ? question.constraints?.maxSelections ?? maxSelectedSections
          : undefined,
      optionsPrefix: undefined,
      unit: question.unit,
      fields: Array.isArray(question.fields)
        ? question.fields.map((field) => ({
            id: field.id,
            label: field.label,
            type: field.type,
            unit: field.unit,
            constraints: field.constraints
              ? {
                  min: field.constraints.min,
                  max: field.constraints.max,
                  integer: field.constraints.integer,
                }
              : undefined,
          }))
        : undefined,
      displayIf: toDisplayIf(question.displayIf),
      constraints,
      scoringEnabled: question.scoring?.enabled === true,
      noneOptionValue,
      variants: undefined,
    } satisfies WellnessSurveyQuestionForTemplate;
  });

  const sections = bundle.sections.sections.map((section) => ({
    key: section.id,
    title: section.title,
    displayName: section.title,
    description: `${section.title} 관련 상세 문항`,
    questions: section.questions.map((question) => ({
      key: question.id,
      index: question.number,
      text: question.prompt,
      helpText: undefined,
      type: normalizeTemplateQuestionType(question.type),
      sourceType: question.type,
      required: true,
      options: question.options.map((option) => ({
        value: option.value,
        label: option.label,
        score: option.score,
      })),
      maxSelect:
        question.type === "multi_select_limited" ||
        question.type === "multi_select_with_none"
          ? question.constraints?.maxSelections ?? question.options.length
          : undefined,
      optionsPrefix: question.optionsPrefix ?? undefined,
      constraints: question.constraints
        ? {
            maxSelections: question.constraints.maxSelections,
            recommendedSelectionsRange:
              question.constraints.recommendedSelectionsRange,
          }
        : undefined,
      scoringEnabled: question.scoring?.enabled === true,
      noneOptionValue: undefined,
      variants: Object.fromEntries(
        Object.entries(question.variants ?? {}).map(([variantKey, variant]) => [
          variantKey,
          {
            variantId: variant.variantId ?? variantKey,
            optionsPrefix: variant.optionsPrefix ?? undefined,
            options: variant.options.map((option) => ({
              value: option.value,
              label: option.label,
              score: option.score,
            })),
          },
        ])
      ),
    })),
  }));

  const sectionCatalog: WellnessSurveyTemplate["sectionCatalog"] = [];
  for (const option of c27?.options ?? []) {
    const section = sectionById.get(option.value);
    if (!section) continue;
    sectionCatalog.push({
      key: section.id,
      title: section.title,
      displayName: section.title,
      description: `${section.title} 관련 상세 문항`,
      triggerLabel: option.label,
      questionCount: section.questions.length,
      aliases: option.aliases ?? [],
    });
  }

  const dedupedSectionCatalog = sectionCatalog.filter(
    (section, index, source) => source.findIndex((item) => item.key === section.key) === index
  );

  const template: WellnessSurveyTemplate = {
    version: majorVersionOf(bundle.common.version),
    title: bundle.common.title,
    description: `${bundle.common.title} + 상세 섹션 설문`,
    common,
    sectionCatalog: dedupedSectionCatalog,
    sections,
    rules: {
      selectSectionByCommonQuestionKey: "C27",
      maxSelectedSections,
      minSelectedSections: 0,
      recommendedSelectionsRange,
    },
  };
  cachedTemplate = template;
  return template;
}
