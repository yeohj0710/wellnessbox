"use client";

import { useMemo } from "react";
import {
  resolveAdherenceLoopAction,
  type AdherenceLoopAction,
  type AdherenceLoopSurface,
} from "@/lib/adherence-loop/engine";
import { useRemoteUserContextSummary } from "./useRemoteUserContextSummary";

export function useAdherenceLoop(params: {
  surface: AdherenceLoopSurface;
  orders: unknown[];
  enableRemoteContext?: boolean;
}) {
  const { loading, summary } = useRemoteUserContextSummary({
    enabled: params.enableRemoteContext === true,
  });

  const action: AdherenceLoopAction | null = useMemo(
    () =>
      resolveAdherenceLoopAction({
        surface: params.surface,
        orders: params.orders,
        summary: params.enableRemoteContext ? summary : null,
      }),
    [params.surface, params.orders, params.enableRemoteContext, summary]
  );

  return { action, loading };
}
