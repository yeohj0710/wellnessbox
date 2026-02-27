import { z } from "zod";
import db from "@/lib/db";
import { sign } from "@/lib/jwt";
import {
  requirePharmSession,
  requireRiderSession,
} from "@/lib/server/route-auth";
import { noStoreJson } from "@/lib/server/no-store";

const streamTokenRequestSchema = z.union([
  z.object({
    role: z.literal("customer"),
    orderId: z.coerce.number().int().positive(),
    phone: z.string().trim().min(1),
    password: z.string().trim().min(1),
  }),
  z.object({
    role: z.enum(["pharm", "rider"]),
    orderId: z.coerce.number().int().positive(),
  }),
]);

type StreamTokenRequest = z.infer<typeof streamTokenRequestSchema>;
type CustomerStreamTokenRequest = Extract<StreamTokenRequest, { role: "customer" }>;

export function parseStreamTokenRequest(rawBody: unknown) {
  return streamTokenRequestSchema.safeParse(rawBody);
}

function buildUnauthorizedResponse() {
  return noStoreJson({ error: "Unauthorized" }, 403);
}

async function issueCustomerToken(input: CustomerStreamTokenRequest) {
  const order = await db.order.findFirst({
    where: {
      id: input.orderId,
      phone: input.phone,
      password: input.password,
    },
    select: { id: true },
  });
  if (!order) return buildUnauthorizedResponse();

  const { token, exp } = sign({
    role: "customer",
    orderId: input.orderId,
  });
  return noStoreJson({ token, exp });
}

async function issuePharmToken(orderId: number) {
  const auth = await requirePharmSession();
  if (!auth.ok) return auth.response;

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      pharmacyId: auth.data.pharmacyId,
    },
    select: { id: true },
  });
  if (!order) return buildUnauthorizedResponse();

  const { token, exp } = sign({
    role: "pharm",
    pharmacyId: auth.data.pharmacyId,
    orderId,
  });
  return noStoreJson({ token, exp });
}

async function issueRiderToken(orderId: number) {
  const auth = await requireRiderSession();
  if (!auth.ok) return auth.response;

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      riderId: auth.data.riderId,
    },
    select: { id: true },
  });
  if (!order) return buildUnauthorizedResponse();

  const { token, exp } = sign({
    role: "rider",
    riderId: auth.data.riderId,
    orderId,
  });
  return noStoreJson({ token, exp });
}

export async function issueStreamToken(payload: StreamTokenRequest) {
  if (payload.role === "customer") return issueCustomerToken(payload);
  if (payload.role === "pharm") return issuePharmToken(payload.orderId);
  return issueRiderToken(payload.orderId);
}

export async function runMessageStreamTokenPostRoute(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = parseStreamTokenRequest(body);
    if (!parsed.success) {
      return noStoreJson({ error: "Missing params" }, 400);
    }
    return issueStreamToken(parsed.data);
  } catch {
    return noStoreJson({ error: "Unauthorized" }, 403);
  }
}
