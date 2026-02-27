import "server-only";

import { z } from "zod";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().trim().min(1),
  keys: z
    .object({
      auth: z.string().optional(),
      p256dh: z.string().optional(),
    })
    .optional(),
});

const customerSubscribeSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  subscription: pushSubscriptionSchema,
  role: z.literal("customer"),
});

const pharmSubscribeSchema = z.object({
  pharmacyId: z.coerce.number().int().positive(),
  subscription: pushSubscriptionSchema,
  role: z.literal("pharm"),
});

const riderSubscribeSchema = z.object({
  riderId: z.coerce.number().int().positive(),
  subscription: pushSubscriptionSchema,
  role: z.literal("rider"),
});

const customerTargetSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  endpoint: z.string().trim().min(1),
  role: z.literal("customer"),
});

const pharmTargetSchema = z.object({
  pharmacyId: z.coerce.number().int().positive(),
  endpoint: z.string().trim().min(1),
  role: z.literal("pharm"),
});

const riderTargetSchema = z.object({
  riderId: z.coerce.number().int().positive(),
  endpoint: z.string().trim().min(1),
  role: z.literal("rider"),
});

export type PushSubscriptionPayload = z.infer<typeof pushSubscriptionSchema>;
export type CustomerPushSubscribePayload = z.infer<typeof customerSubscribeSchema>;
export type PharmPushSubscribePayload = z.infer<typeof pharmSubscribeSchema>;
export type RiderPushSubscribePayload = z.infer<typeof riderSubscribeSchema>;
export type CustomerPushTargetPayload = z.infer<typeof customerTargetSchema>;
export type PharmPushTargetPayload = z.infer<typeof pharmTargetSchema>;
export type RiderPushTargetPayload = z.infer<typeof riderTargetSchema>;

function parseWithSchema<T>(schema: z.ZodType<T>, raw: unknown): T | null {
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseCustomerPushSubscribeBody(
  raw: unknown
): CustomerPushSubscribePayload | null {
  return parseWithSchema(customerSubscribeSchema, raw);
}

export function parsePharmPushSubscribeBody(
  raw: unknown
): PharmPushSubscribePayload | null {
  return parseWithSchema(pharmSubscribeSchema, raw);
}

export function parseRiderPushSubscribeBody(
  raw: unknown
): RiderPushSubscribePayload | null {
  return parseWithSchema(riderSubscribeSchema, raw);
}

export function parseCustomerPushTargetBody(
  raw: unknown
): CustomerPushTargetPayload | null {
  return parseWithSchema(customerTargetSchema, raw);
}

export function parsePharmPushTargetBody(
  raw: unknown
): PharmPushTargetPayload | null {
  return parseWithSchema(pharmTargetSchema, raw);
}

export function parseRiderPushTargetBody(
  raw: unknown
): RiderPushTargetPayload | null {
  return parseWithSchema(riderTargetSchema, raw);
}
