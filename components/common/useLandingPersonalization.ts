"use client";

import { useMemo } from "react";
import {
  resolveLandingPersonalizationFocus,
  type LandingCategory,
  type LandingPersonalizationFocus,
} from "@/lib/landing-personalization/engine";
import { useRemoteUserContextSummary } from "./useRemoteUserContextSummary";

export function useLandingPersonalization(categories: LandingCategory[]) {
  const { loading, remoteResults, summary } = useRemoteUserContextSummary({
    enabled: categories.length > 0,
  });

  const focus: LandingPersonalizationFocus = useMemo(
    () =>
      resolveLandingPersonalizationFocus({
        summary,
        remoteResults,
        categories,
      }),
    [categories, remoteResults, summary]
  );

  return { focus, loading, remoteResults, summary };
}
