import { z } from "zod";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";

export const adminSurveyPutSchema = z.object({
  periodKey: z.string().regex(B2B_PERIOD_KEY_REGEX).optional(),
  selectedSections: z.array(z.string().trim().min(1)).max(24).optional(),
  answers: z
    .record(
      z.string().trim().min(1),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.union([z.string(), z.number(), z.boolean()])),
        z.object({
          answerText: z.string().optional(),
          text: z.string().optional(),
          answerValue: z.string().optional(),
          value: z.string().optional(),
          values: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
          selectedValues: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
          fieldValues: z
            .record(z.string().trim().min(1), z.union([z.string(), z.number()]))
            .optional(),
          score: z.number().min(0).max(1).optional(),
          variantId: z.string().trim().min(1).optional(),
        }),
      ])
    )
    .default({}),
});
