import "server-only";

import {
  buildAiGovernancePreview,
  getAiGovernanceTaskOptions,
} from "@/lib/ai/governance";
import {
  CHAT_MODEL_CONFIG_KEY,
  getChatModelOptions,
  getDefaultModel,
  isSupportedChatModel,
  MODEL_PRICING_REFERENCE,
} from "@/lib/ai/models";
import db from "@/lib/db";
import { requireAdminSession } from "@/lib/server/route-auth";

type ModelBody = { model?: unknown } | null;

export async function runAdminModelGetRoute() {
  const model = await getDefaultModel();
  return Response.json({
    model,
    options: getChatModelOptions(),
    pricingReference: MODEL_PRICING_REFERENCE,
    governancePreview: buildAiGovernancePreview(model),
    governanceTasks: getAiGovernanceTaskOptions(),
  });
}

export async function runAdminModelPostRoute(req: Request) {
  const body = await req.json().catch(() => null);
  const rawModel = (body as ModelBody)?.model;
  const model = typeof rawModel === "string" ? rawModel.trim() : "";

  if (!isSupportedChatModel(model)) {
    return Response.json(
      {
        error: "지원되지 않는 모델입니다.",
        supportedModels: getChatModelOptions().map((option) => option.id),
      },
      { status: 400 }
    );
  }

  await db.config.upsert({
    where: { key: CHAT_MODEL_CONFIG_KEY },
    update: { value: model },
    create: { key: CHAT_MODEL_CONFIG_KEY, value: model },
  });

  return Response.json({
    model,
    selected: getChatModelOptions().find((option) => option.id === model) ?? null,
    governancePreview: buildAiGovernancePreview(model),
    governanceTasks: getAiGovernanceTaskOptions(),
  });
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
