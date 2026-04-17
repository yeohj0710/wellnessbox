"use client";

import { useEffect, useMemo, useState } from "react";
import { buildUserContextSummary } from "@/lib/chat/context";
import {
  type NormalizedAllResults,
  type NormalizedAssessResult,
  type NormalizedCheckAiResult,
  type NormalizedHealthLinkSummary,
  type NormalizedOrderSummary,
} from "@/app/chat/hooks/useChat.results";
import {
  fetchRemoteUserContext,
  getCachedRemoteUserContext,
} from "@/lib/client/remote-user-context";
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
  const [remoteResults, setRemoteResults] = useState<NormalizedAllResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setRemoteResults(null);
      setLoading(false);
      return;
    }

    let alive = true;
    const cached = getCachedRemoteUserContext();
    if (cached) {
      setRemoteResults(cached);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchRemoteUserContext()
      .then((results) => {
        if (!alive) return;
        setRemoteResults(results);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
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
