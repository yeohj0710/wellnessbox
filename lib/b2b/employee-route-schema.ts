import { z } from "zod";

export const b2bEmployeeIdentityInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  birthDate: z.string().trim().regex(/^\d{8}$/),
  phone: z.string().trim().regex(/^\d{10,11}$/),
});

export type B2bEmployeeIdentityInput = z.infer<
  typeof b2bEmployeeIdentityInputSchema
>;
