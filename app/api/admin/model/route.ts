import { NextRequest } from "next/server";
import db from "@/lib/db";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const record = await db.config.findUnique({ where: { key: "chatModel" } });
  const model = record?.value || "gpt-4o-mini";
  return Response.json({ model });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { model } = await req.json();
  const value = model || "gpt-4o-mini";
  await db.config.upsert({
    where: { key: "chatModel" },
    update: { value },
    create: { key: "chatModel", value },
  });
  return Response.json({ model: value });
}
