"use client";

import { useEffect, useMemo, useState } from "react";
import { buildUserContextSummary } from "@/lib/chat/context";
import {
  normalizeAllResultsPayload,
  type NormalizedAllResults,
  type NormalizedAssessResult,
  type NormalizedCheckAiResult,
  type NormalizedHealthLinkSummary,
  type NormalizedOrderSummary,
} from "@/app/chat/hooks/useChat.results";
import type { UserProfile } from "@/types/chat";

type RemoteUserContextOverrides = {
  profile?: UserProfile | null;
  orders?: NormalizedOrderSummary[] | null;
  assessResult?: NormalizedAssessResult | null;
  checkAiResult?: NormalizedCheckAiResult | null;
  healthLink?: NormalizedHealthLinkSummary | null;
  chatSessions?: NormalizedAllResults["chatSessions"] | null;
};

type UseRemoteUserContextSummaryParams = {
  enabled?: boolean;
  overrides?: RemoteUserContextOverrides;
};

function buildActorContext(remote: NormalizedAllResults | null) {
  if (!remote?.actor) return null;
  return {
    loggedIn: remote.actor.loggedIn,
    phoneLinked: remote.actor.phoneLinked,
  };
}

export function useRemoteUserContextSummary({
  enabled = true,
  overrides,
}: UseRemoteUserContextSummaryParams) {
  const [remoteResults, setRemoteResults] = useState<NormalizedAllResults | null>(
    null
  );
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let alive = true;
    setLoading(true);

    fetch("/api/user/all-results", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : {}))
      .then((payload) => {
        if (!alive) return;
        setRemoteResults(normalizeAllResultsPayload(payload));
      })
      .catch(() => {
        if (!alive) return;
        setRemoteResults(normalizeAllResultsPayload({}));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [enabled]);

  const summary = useMemo(
    () =>
      buildUserContextSummary({
        profile: overrides?.profile ?? remoteResults?.profile ?? null,
        orders: overrides?.orders ?? remoteResults?.orders ?? [],
        assessResult: overrides?.assessResult ?? remoteResults?.assessResult ?? null,
        checkAiResult:
          overrides?.checkAiResult ?? remoteResults?.checkAiResult ?? null,
        healthLink: overrides?.healthLink ?? remoteResults?.healthLink ?? null,
        chatSessions: overrides?.chatSessions ?? remoteResults?.chatSessions ?? [],
        actorContext: buildActorContext(remoteResults),
      }),
    [overrides, remoteResults]
  );

  return {
    loading,
    remoteResults,
    summary,
  };
}
