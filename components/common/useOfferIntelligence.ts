"use client";

import { useRemoteUserContextSummary } from "./useRemoteUserContextSummary";

export function useOfferIntelligence(enabled = true) {
  const { loading, remoteResults, summary } = useRemoteUserContextSummary({
    enabled,
  });

  return {
    loading,
    remoteResults,
    summary,
  };
}
