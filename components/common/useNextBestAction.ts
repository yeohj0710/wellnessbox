"use client";

import { useMemo } from "react";
import {
  resolveNextBestAction,
  type CheckoutNextBestActionState,
  type NextBestAction,
  type NextBestActionCategory,
  type NextBestActionSurface,
} from "@/lib/next-best-action/engine";
import { useRemoteUserContextSummary } from "./useRemoteUserContextSummary";

type UseNextBestActionParams = {
  surface: NextBestActionSurface;
  categories?: NextBestActionCategory[];
  checkoutState?: CheckoutNextBestActionState | null;
  enabled?: boolean;
};

export function useNextBestAction({
  surface,
  categories,
  checkoutState,
  enabled = true,
}: UseNextBestActionParams): {
  action: NextBestAction | null;
  loading: boolean;
} {
  const { loading, summary } = useRemoteUserContextSummary({ enabled });

  const action = useMemo(
    () =>
      resolveNextBestAction({
        surface,
        summary,
        categories,
        checkoutState,
      }),
    [surface, summary, categories, checkoutState]
  );

  return { action, loading };
}
