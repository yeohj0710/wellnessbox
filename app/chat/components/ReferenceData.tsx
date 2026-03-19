"use client";

import { useMemo } from "react";
import type { UserContextSummary } from "@/lib/chat/context";
import type {
  NormalizedAssessResult,
  NormalizedCheckAiResult,
  NormalizedHealthLinkSummary,
  NormalizedOrderSummary,
} from "../hooks/useChat.results";
import {
  buildReferenceDataModel,
  getReferenceSecondaryActionHref,
} from "./referenceData.model";
import {
  ReferenceDataAssessSection,
  ReferenceDataConsultationImpactSection,
  ReferenceDataHealthLinkSection,
  ReferenceDataJourneySegmentSection,
  ReferenceDataOrderSection,
  ReferenceDataQuickSection,
  ReferenceDataTrustSection,
  ReferenceDataValuePropositionSection,
} from "./ReferenceData.sections";

export interface ReferenceDataProps {
  summary: UserContextSummary;
  orders: NormalizedOrderSummary[];
  assessResult: NormalizedAssessResult | null;
  checkAiResult: NormalizedCheckAiResult | null;
  healthLink: NormalizedHealthLinkSummary | null;
  onRunPrompt?: (prompt: string) => void;
}

export default function ReferenceData({
  summary,
  orders,
  assessResult,
  checkAiResult,
  healthLink,
  onRunPrompt,
}: ReferenceDataProps) {
  const {
    hasOrders,
    lastOrder,
    hasAssess,
    assessSummary,
    hasQuick,
    quickLabels,
    hasHealthLink,
    healthLinkHighlights,
    hasConsultationImpact,
    hasJourneySegment,
    show,
    valueProposition,
  } = useMemo(
    () =>
      buildReferenceDataModel({
        summary,
        orders,
        assessResult,
        checkAiResult,
        healthLink,
      }),
    [summary, orders, assessResult, checkAiResult, healthLink]
  );

  const secondaryActionHref = valueProposition.secondaryAction
    ? getReferenceSecondaryActionHref(valueProposition.secondaryAction.target)
    : undefined;
  const handleSecondaryAction = secondaryActionHref
    ? () => {
        window.location.href = secondaryActionHref;
      }
    : undefined;

  if (!show) return null;

  return (
    <div className="mb-1 pl-2">
      <details className="group text-[13px] text-slate-500 sm:text-sm">
        <summary className="inline-flex cursor-pointer items-center gap-1 hover:text-slate-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 group-open:bg-slate-400" />
          참고 데이터
        </summary>

        <div
          className="
            overflow-hidden
            max-h-0
            opacity-0
            translate-y-1
            transition-[max-height,opacity,transform]
            duration-300
            ease-out
            [will-change:max-height,opacity,transform]
            group-open:max-h-[1200px]
            group-open:opacity-100
            group-open:translate-y-0
          "
        >
          <div className="mb-2 mt-1 inline-block w-auto max-w-[720px] space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 shadow-sm">
            {hasOrders && lastOrder ? (
              <ReferenceDataOrderSection order={lastOrder} />
            ) : null}

            {hasAssess && assessResult ? (
              <ReferenceDataAssessSection
                assessResult={assessResult}
                assessSummary={assessSummary}
              />
            ) : null}

            {hasQuick && checkAiResult ? (
              <ReferenceDataQuickSection
                checkAiResult={checkAiResult}
                quickLabels={quickLabels}
              />
            ) : null}

            {hasHealthLink && healthLink ? (
              <ReferenceDataHealthLinkSection
                healthLink={healthLink}
                highlights={healthLinkHighlights}
              />
            ) : null}

            {hasConsultationImpact ? (
              <ReferenceDataConsultationImpactSection
                summary={summary}
                onRunPrompt={onRunPrompt}
              />
            ) : null}

            {hasJourneySegment ? (
              <ReferenceDataValuePropositionSection
                valueProposition={valueProposition}
                onRunPrompt={onRunPrompt}
                onSecondaryAction={handleSecondaryAction}
              />
            ) : null}

            {hasJourneySegment ? (
              <ReferenceDataJourneySegmentSection
                summary={summary}
                onRunPrompt={onRunPrompt}
              />
            ) : null}

            <ReferenceDataTrustSection summary={summary} />
          </div>
        </div>
      </details>
    </div>
  );
}
