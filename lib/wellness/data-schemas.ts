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

export const commonSurveySchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  generatedAtUtc: z.string().optional(),
  questions: z.array(commonQuestionSchema).min(1),
});

export const sectionSurveySchema = z.object({
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

export const scoringRulesSchema = z.object({
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

export const reportTextsSchema = z.object({
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
