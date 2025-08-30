import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import db from "@/lib/db";

export async function getClientIdFromRequest(): Promise<string | null> {
  try {
    const h = await nextHeaders();
    const cid = h.get("x-wb-client-id") || h.get("x-client-id");
    if (cid) return cid;
  } catch {}
  try {
    const c = await nextCookies();
    const v = c.get("wb_cid")?.value;
    if (v) return v;
  } catch {}
  return null;
}

export async function ensureClient(
  clientId: string,
  init?: { userAgent?: string | null; pushEndpoint?: string | null; ipHash?: string | null }
) {
  const now = new Date();
  const data: any = {
    id: clientId,
    lastSeenAt: now,
  };
  if (init?.userAgent != null) data.userAgent = init.userAgent;
  if (init?.pushEndpoint != null) data.pushEndpoint = init.pushEndpoint;
  if (init?.ipHash != null) data.lastIpHash = init.ipHash;
  await db.client.upsert({
    where: { id: clientId },
    create: { id: clientId, ...data, createdAt: now },
    update: data,
  });
}

export function toDate(value: any): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return new Date();
}
