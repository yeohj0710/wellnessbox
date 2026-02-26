import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { sign } from "@/lib/jwt";
import {
  requirePharmSession,
  requireRiderSession,
} from "@/lib/server/route-auth";

export const runtime = "nodejs";

const requestSchema = z.union([
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

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function issueCustomerToken(input: {
  orderId: number;
  phone: string;
  password: string;
}) {
  const order = await db.order.findFirst({
    where: {
      id: input.orderId,
      phone: input.phone,
      password: input.password,
    },
    select: { id: true },
  });
  if (!order) return noStoreJson({ error: "Unauthorized" }, 403);

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
  if (!order) return noStoreJson({ error: "Unauthorized" }, 403);

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
  if (!order) return noStoreJson({ error: "Unauthorized" }, 403);

  const { token, exp } = sign({
    role: "rider",
    riderId: auth.data.riderId,
    orderId,
  });
  return noStoreJson({ token, exp });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson({ error: "Missing params" }, 400);
    }

    if (parsed.data.role === "customer") {
      return issueCustomerToken(parsed.data);
    }
    if (parsed.data.role === "pharm") {
      return issuePharmToken(parsed.data.orderId);
    }
    return issueRiderToken(parsed.data.orderId);
  } catch {
    return noStoreJson({ error: "Unauthorized" }, 403);
  }
}
