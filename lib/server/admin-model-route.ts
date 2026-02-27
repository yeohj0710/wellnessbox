import "server-only";

import db from "@/lib/db";
import { requireAdminSession } from "@/lib/server/route-auth";

const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

function normalizeModel(raw: unknown) {
  return typeof raw === "string" && raw.trim().length > 0
    ? raw.trim()
    : DEFAULT_CHAT_MODEL;
}

export async function runAdminModelGetRoute() {
  const record = await db.config.findUnique({ where: { key: "chatModel" } });
  const model = normalizeModel(record?.value);
  return Response.json({ model });
}

export async function runAdminModelPostRoute(req: Request) {
  const body = await req.json().catch(() => null);
  const rawModel = (body as { model?: unknown } | null)?.model;
  const model = normalizeModel(rawModel);

  await db.config.upsert({
    where: { key: "chatModel" },
    update: { value: model },
    create: { key: "chatModel", value: model },
  });
  return Response.json({ model });
}

export async function runAdminModelAuthedGetRoute() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return runAdminModelGetRoute();
}

export async function runAdminModelAuthedPostRoute(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return runAdminModelPostRoute(req);
}
