"use client";

import { useMemo } from "react";
import {
  resolveComebackJourneyAction,
  type ComebackJourneyAction,
  type ComebackJourneySurface,
} from "@/lib/comeback-journey/engine";
import { useRemoteUserContextSummary } from "./useRemoteUserContextSummary";

type JourneyCategory = {
  id: number;
  name: string;
};

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function resolveMatchedCategories(
  labels: string[],
  categories: JourneyCategory[]
): JourneyCategory[] {
  if (!labels.length || !categories.length) return [];
  const byName = new Map(
    categories.map((category) => [normalizeLabel(category.name), category])
  );

  const seen = new Set<number>();
  const matched: JourneyCategory[] = [];
  for (const label of labels) {
    const found = byName.get(normalizeLabel(label));
    if (!found || seen.has(found.id)) continue;
    seen.add(found.id);
    matched.push(found);
  }
  return matched.slice(0, 3);
}

export function useComebackJourney(params: {
  surface: ComebackJourneySurface;
  categories: JourneyCategory[];
  enabled?: boolean;
}) {
  const { loading, remoteResults, summary } = useRemoteUserContextSummary({
    enabled: params.enabled !== false,
  });

  const matchedCategories = useMemo(
    () =>
      resolveMatchedCategories(summary.recommendedNutrients, params.categories),
    [summary.recommendedNutrients, params.categories]
  );

  const action: ComebackJourneyAction | null = useMemo(
    () =>
      resolveComebackJourneyAction({
        surface: params.surface,
        orderCount: remoteResults?.orders.length ?? 0,
        hasAssess: Boolean(remoteResults?.assessResult),
        hasQuick: Boolean(remoteResults?.checkAiResult),
        hasChat: (remoteResults?.chatSessions.length ?? 0) > 0,
        lastOrderAt: remoteResults?.orders[0]?.createdAt,
        lastAssessAt: remoteResults?.assessResult?.createdAt,
        lastQuickAt: remoteResults?.checkAiResult?.createdAt,
        lastChatAt: remoteResults?.chatSessions[0]?.updatedAt,
        latestChatTitle: remoteResults?.chatSessions[0]?.title || undefined,
        matchedCategoryIds: matchedCategories.map((category) => category.id),
        matchedCategoryNames: matchedCategories.map((category) => category.name),
        summary,
      }),
    [matchedCategories, params.surface, remoteResults, summary]
  );

  return { action, loading };
}
