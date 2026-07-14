import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import type { TipsLabAction } from "@/lib/server/tips-lab/runtime";
import type { TipsLabState } from "@/lib/server/tips-lab/state";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export async function createTipsLabSession(input: {
  state: TipsLabState;
  profile: unknown;
  consentScopes: string[];
}) {
  return db.tipsLabSession.create({
    data: {
      state: input.state,
      profile: json(input.profile),
      consentScopes: input.consentScopes,
    },
    select: { id: true },
  });
}

export async function appendTipsLabEvent(input: {
  sessionId: string;
  action: TipsLabAction;
  previousState: TipsLabState;
  nextState: TipsLabState;
  request: unknown;
  result: unknown;
  profile?: unknown;
  consentScopes?: string[];
  postconditionsMet?: boolean;
}) {
  return db.$transaction(async (tx) => {
    const aggregate = await tx.tipsLabEvent.aggregate({
      where: { sessionId: input.sessionId },
      _max: { sequence: true },
    });
    const sequence = (aggregate._max.sequence ?? 0) + 1;
    await tx.tipsLabEvent.create({
      data: {
        sessionId: input.sessionId,
        sequence,
        action: input.action,
        previousState: input.previousState,
        nextState: input.nextState,
        input: json(input.request),
        output: json(input.result),
        postconditionsMet: input.postconditionsMet,
      },
    });
    await tx.tipsLabSession.update({
      where: { id: input.sessionId },
      data: {
        state: input.nextState,
        ...(input.profile === undefined ? {} : { profile: json(input.profile) }),
        ...(input.consentScopes === undefined ? {} : { consentScopes: input.consentScopes }),
      },
    });
    const grouped = await tx.tipsLabEvent.groupBy({
      by: ["action"],
      where: { sessionId: input.sessionId },
      _count: { _all: true },
    });
    const actionCounts = Object.fromEntries(grouped.map((item) => [item.action, item._count._all]));
    return {
      connected: true,
      sessionId: input.sessionId,
      storedEventCount: sequence,
      profileStored: true,
      traceStored: sequence > 0,
      evidenceQueryCount: actionCounts.retrieve_evidence ?? 0,
      proRecordCount: actionCounts.ingest_pro ?? 0,
      deviceRecordCount: actionCounts.ingest_device ?? 0,
      adverseEventCount: actionCounts.log_adverse_event ?? 0,
      lastAction: input.action,
    };
  });
}
