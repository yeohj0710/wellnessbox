import { z } from "zod";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";

export const adminPharmacistNotePutSchema = z.object({
  note: z.string().max(4000).nullable().optional(),
  recommendations: z.string().max(4000).nullable().optional(),
  cautions: z.string().max(4000).nullable().optional(),
  actorTag: z.string().max(120).optional(),
  periodKey: z.string().regex(B2B_PERIOD_KEY_REGEX).optional(),
});

export type AdminPharmacistNotePutInput = z.infer<
  typeof adminPharmacistNotePutSchema
>;
