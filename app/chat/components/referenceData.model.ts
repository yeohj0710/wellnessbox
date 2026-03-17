import type { UserContextSummary } from "@/lib/chat/context";
import { resolvePersonalizedValueProposition } from "@/lib/value-proposition/engine";
import type {
  NormalizedAssessResult,
  NormalizedCheckAiResult,
  NormalizedHealthLinkSummary,
  NormalizedOrderSummary,
} from "../hooks/useChat.results";

type ReferenceDataModelInput = {
  summary: UserContextSummary;
  orders: NormalizedOrderSummary[];
  assessResult: NormalizedAssessResult | null;
  checkAiResult: NormalizedCheckAiResult | null;
  healthLink: NormalizedHealthLinkSummary | null;
};

type SecondaryActionTarget = NonNullable<
  ReturnType<typeof resolvePersonalizedValueProposition>["secondaryAction"]
>["target"];

const SECONDARY_ACTION_HREF_BY_TARGET: Partial<
  Record<SecondaryActionTarget, string>
> = {
  "my-data": "/my-data",
  explore: "/explore#home-products",
  trial: "/explore?package=7#home-products",
  assess: "/assess",
};

function toTimestamp(value: string | number | Date | null) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function buildReferenceDataModel({
  summary,
  orders,
  assessResult,
  checkAiResult,
  healthLink,
}: ReferenceDataModelInput) {
  const hasOrders = Array.isArray(orders) && orders.length > 0;
  const lastOrder = hasOrders
    ? [...orders].sort(
        (left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt)
      )[0]
    : null;
  const hasAssess =
    !!assessResult &&
    Array.isArray(assessResult.summary) &&
    assessResult.summary.length > 0;
  const hasQuick =
    !!checkAiResult &&
    Array.isArray(checkAiResult.labels) &&
    checkAiResult.labels.length > 0;
  const hasHealthLink =
    !!healthLink &&
    (healthLink.headline ||
      healthLink.summary ||
      healthLink.highlights.length > 0 ||
      healthLink.topMedicines.length > 0);
  const hasConsultationImpact =
    summary.previousConsultations.length > 0 || summary.recentOrders.length > 0;
  const hasJourneySegment = Boolean(summary.journeySegment.headline);

  return {
    hasOrders,
    lastOrder,
    hasAssess,
    assessSummary: hasAssess ? assessResult.summary.slice(0, 5) : [],
    hasQuick,
    quickLabels: hasQuick ? checkAiResult.labels.slice(0, 5) : [],
    hasHealthLink,
    healthLinkHighlights: hasHealthLink ? healthLink.highlights.slice(0, 3) : [],
    hasConsultationImpact,
    hasJourneySegment,
    show:
      hasOrders ||
      hasAssess ||
      hasQuick ||
      hasHealthLink ||
      hasConsultationImpact ||
      hasJourneySegment,
    valueProposition: resolvePersonalizedValueProposition({
      summary,
      surface: "chat",
    }),
  };
}

export function getReferenceSecondaryActionHref(target?: SecondaryActionTarget) {
  return target ? SECONDARY_ACTION_HREF_BY_TARGET[target] : undefined;
}
