"use client";

import type { UserContextSummary } from "@/lib/chat/context";
import {
  type NormalizedAssessResult,
  type NormalizedCheckAiResult,
  type NormalizedHealthLinkSummary,
  type NormalizedOrderSummary,
} from "@/app/chat/hooks/useChat.results";
import { useRemoteUserContextSummary } from "./useRemoteUserContextSummary";

type UsePersonalizedTrustSummaryParams = {
  enabled?: boolean;
  orders?: NormalizedOrderSummary[] | null;
  assessResult?: NormalizedAssessResult | null;
  checkAiResult?: NormalizedCheckAiResult | null;
  healthLink?: NormalizedHealthLinkSummary | null;
};

export function usePersonalizedTrustSummary(
  params: UsePersonalizedTrustSummaryParams
): UserContextSummary {
  return useRemoteUserContextSummary({
    enabled: params.enabled !== false,
    overrides: {
      orders: params.orders ?? undefined,
      assessResult: params.assessResult ?? undefined,
      checkAiResult: params.checkAiResult ?? undefined,
      healthLink: params.healthLink ?? undefined,
    },
  }).summary;
}
