import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import type { RequestActor } from "@/lib/server/actor";
import { assignAiExperimentVariant } from "./assignment";
import {
  AI_EXPERIMENTS,
  getAiExperimentDefinition,
  type AiExperimentEventName,
  type AiExperimentKey,
} from "./config";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((item) =>
      isJsonValue(item)
    );
  }
  return false;
}

function sanitizePayload(value: unknown): Prisma.InputJsonValue | undefined {
  if (!isJsonValue(value)) return undefined;
  if (value === null) return undefined;
  return value as Prisma.InputJsonValue;
}

function isMissingExperimentTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

export function resolveAiExperimentVariant(input: {
  experimentKey: string;
  actor: Pick<RequestActor, "appUserId" | "deviceClientId">;
  variantKey?: string | null;
}) {
  const definition = getAiExperimentDefinition(input.experimentKey);
  if (!definition) {
    throw new Error(`Unknown experiment: ${input.experimentKey}`);
  }

  const allowedVariant = definition.variants.some(
    (variant) => variant.key === input.variantKey
  )
    ? input.variantKey
    : null;

  const actorSeed = input.actor.appUserId ?? input.actor.deviceClientId ?? null;
  const assignedVariant =
    allowedVariant ??
    assignAiExperimentVariant({
      definition,
      actorSeed,
    });

  return { definition, variantKey: assignedVariant };
}

export async function trackAiExperimentEvent(input: {
  actor: RequestActor;
  experimentKey: string;
  eventName: AiExperimentEventName;
  variantKey?: string | null;
  surface?: string | null;
  route?: string | null;
  sessionKey?: string | null;
  payload?: unknown;
}) {
  const { definition, variantKey } = resolveAiExperimentVariant({
    experimentKey: input.experimentKey,
    actor: input.actor,
    variantKey: input.variantKey,
  });

  if (!definition.allowedEvents.includes(input.eventName)) {
    throw new Error(`Invalid event for experiment: ${input.eventName}`);
  }

  try {
    await db.aiExperimentEvent.create({
      data: {
        experimentKey: definition.key,
        variantKey,
        eventName: input.eventName,
        surface: input.surface?.trim() || definition.surface,
        route: input.route?.trim() || null,
        sessionKey: input.sessionKey?.trim() || null,
        appUserId: input.actor.appUserId,
        clientId: input.actor.deviceClientId,
        payload: sanitizePayload(input.payload),
      },
    });

    return {
      ok: true as const,
      tracked: true,
      variantKey,
      definition,
    };
  } catch (error) {
    if (!isMissingExperimentTableError(error)) {
      console.error("[ai-experiments] failed to persist event", error);
    }
    return {
      ok: true as const,
      tracked: false,
      variantKey,
      definition,
    };
  }
}

export type AiExperimentSummary = {
  definition: (typeof AI_EXPERIMENTS)[AiExperimentKey];
  windowDays: number;
  totalImpressions: number;
  totalSuccessEvents: number;
  winningVariantKey: string | null;
  recommendation: string;
  variants: Array<{
    key: string;
    label: string;
    impressions: number;
    successEvents: number;
    primaryClicks: number;
    secondaryClicks: number;
    articleClicks: number;
    ctrPercent: number;
  }>;
};

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export async function loadAiExperimentSummary(input: {
  experimentKey: AiExperimentKey;
  windowDays?: number;
}): Promise<AiExperimentSummary | null> {
  const definition = AI_EXPERIMENTS[input.experimentKey];
  const windowDays = Math.max(1, input.windowDays ?? 14);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  try {
    const rows = await db.aiExperimentEvent.groupBy({
      by: ["variantKey", "eventName"],
      where: {
        experimentKey: definition.key,
        createdAt: { gte: since },
      },
      _count: {
        _all: true,
      },
    });

    const variants = definition.variants.map((variant) => {
      const successEventSet = new Set<string>(definition.successEvents);
      const impressions =
        rows.find(
          (row) => row.variantKey === variant.key && row.eventName === "impression"
        )?._count._all ?? 0;
      const primaryClicks =
        rows.find(
          (row) =>
            row.variantKey === variant.key && row.eventName === "primary_cta_click"
        )?._count._all ?? 0;
      const secondaryClicks =
        rows.find(
          (row) =>
            row.variantKey === variant.key && row.eventName === "secondary_cta_click"
        )?._count._all ?? 0;
      const articleClicks =
        rows.find(
          (row) => row.variantKey === variant.key && row.eventName === "article_click"
        )?._count._all ?? 0;
      const successEvents = rows
        .filter(
          (row) =>
            row.variantKey === variant.key &&
            successEventSet.has(row.eventName)
        )
        .reduce((sum, row) => sum + row._count._all, 0);

      return {
        key: variant.key,
        label: variant.label,
        impressions,
        successEvents,
        primaryClicks,
        secondaryClicks,
        articleClicks,
        ctrPercent: toPercent(successEvents, impressions),
      };
    });

    const totalImpressions = variants.reduce(
      (sum, variant) => sum + variant.impressions,
      0
    );
    const totalSuccessEvents = variants.reduce(
      (sum, variant) => sum + variant.successEvents,
      0
    );
    const winningVariant =
      [...variants]
        .filter((variant) => variant.impressions > 0)
        .sort((left, right) => {
          if (right.ctrPercent !== left.ctrPercent) {
            return right.ctrPercent - left.ctrPercent;
          }
          return right.impressions - left.impressions;
        })[0] ?? null;

    return {
      definition,
      windowDays,
      totalImpressions,
      totalSuccessEvents,
      winningVariantKey: winningVariant?.key ?? null,
      recommendation: winningVariant
        ? `${winningVariant.label} 변형이 최근 ${windowDays}일 기준 CTR ${winningVariant.ctrPercent}%로 가장 강합니다.`
        : "아직 표본이 적어 승자를 정하기 이릅니다.",
      variants,
    };
  } catch (error) {
    if (!isMissingExperimentTableError(error)) {
      console.error("[ai-experiments] failed to load summary", error);
    }
    return null;
  }
}
