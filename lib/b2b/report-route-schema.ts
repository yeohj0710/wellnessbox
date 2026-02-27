import { z } from "zod";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";

const periodKeySchema = z.string().regex(B2B_PERIOD_KEY_REGEX);

export const adminReportPostSchema = z.object({
  regenerate: z.boolean().optional(),
  pageSize: z.enum(["A4", "LETTER"]).optional(),
  periodKey: periodKeySchema.optional(),
  recomputeAnalysis: z.boolean().optional(),
  generateAiEvaluation: z.boolean().optional(),
});

export type AdminReportPostInput = z.infer<typeof adminReportPostSchema>;
