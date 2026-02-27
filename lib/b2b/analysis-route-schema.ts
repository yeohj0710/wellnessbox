import { z } from "zod";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";

const periodKeySchema = z.string().regex(B2B_PERIOD_KEY_REGEX);

export const adminAnalysisPutSchema = z.object({
  payload: z.unknown(),
  periodKey: periodKeySchema.optional(),
  generateAiEvaluation: z.boolean().optional(),
});

export const adminAnalysisPostSchema = z.object({
  periodKey: periodKeySchema.optional(),
  generateAiEvaluation: z.boolean().optional(),
  forceAiRegenerate: z.boolean().optional(),
  externalAnalysisPayload: z.unknown().optional(),
  replaceLatestPeriodEntry: z.boolean().optional(),
});
