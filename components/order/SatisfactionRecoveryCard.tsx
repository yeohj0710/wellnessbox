"use client";

import { useMemo } from "react";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import {
  buildSatisfactionRecoveryFromOrder,
  buildSatisfactionRecoveryFromReviewDraft,
  type SatisfactionRecoveryModel,
} from "@/lib/order/satisfaction-recovery";
import type { OrderAccordionOrder, OrderMessage } from "./orderAccordion.types";

type SatisfactionRecoveryReviewOrder = {
  id: number;
  status?: string | null;
  orderItems?: Array<{
    quantity?: number | null;
    review?: {
      rate?: number | null;
      content?: string | null;
    } | null;
    pharmacyProduct?: {
      optionType?: string | null;
      product?: {
        name?: string | null;
        categories?: Array<{ name?: string | null } | null> | null;
      } | null;
    } | null;
  }> | null;
};

type SatisfactionRecoveryCardProps =
  | {
      mode: "order";
      order: OrderAccordionOrder;
      messages: OrderMessage[];
      className?: string;
      onPrimaryAction?: (draft: string) => void;
      hideBehindBeta?: boolean;
    }
  | {
      mode: "review";
      order: SatisfactionRecoveryReviewOrder;
      itemIndex: number;
      rate: number | null;
      content: string;
      className?: string;
      onPrimaryAction?: (draft: string) => void;
      primaryActionLoading?: boolean;
      primaryActionDone?: boolean;
      hideBehindBeta?: boolean;
    };

const toneClasses = {
  sky: {
    card: "border-sky-200 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]",
    badge: "bg-sky-100 text-sky-700",
    button: "bg-sky-500 text-white hover:bg-sky-600",
  },
  amber: {
    card: "border-amber-200 bg-[linear-gradient(180deg,#fff9f1_0%,#ffffff_100%)]",
    badge: "bg-amber-100 text-amber-700",
    button: "bg-amber-500 text-white hover:bg-amber-600",
  },
} as const;

function joinClassNames(...values: Array<string | null | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

function Section({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <ul className="mt-2 grid gap-2 pl-5 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function resolveModel(
  props: SatisfactionRecoveryCardProps
): SatisfactionRecoveryModel | null {
  if (props.mode === "order") {
    return buildSatisfactionRecoveryFromOrder({
      order: props.order,
      messages: props.messages,
    });
  }

  return buildSatisfactionRecoveryFromReviewDraft({
    order: props.order,
    itemIndex: props.itemIndex,
    rate: props.rate,
    content: props.content,
  });
}

export default function SatisfactionRecoveryCard(
  props: SatisfactionRecoveryCardProps
) {
  const model = useMemo(() => resolveModel(props), [props]);

  if (!model) return null;

  const tone = toneClasses[model.tone];
  const actionLoading =
    props.mode === "review" ? props.primaryActionLoading : false;
  const actionDone = props.mode === "review" ? props.primaryActionDone : false;

  const content = (
    <section
      className={joinClassNames(
        "rounded-2xl border p-4 shadow-sm",
        tone.card,
        props.className
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.02em]",
            tone.badge
          )}
        >
          {model.badge}
        </span>
        <strong className="text-sm font-bold text-slate-900">{model.title}</strong>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-700">{model.summary}</p>

      <div className="mt-4 space-y-3">
        <Section title={`왜 ${model.issueTypeLabel}로 느껴졌는지`} items={model.whyLines} />
        <Section title="이렇게 풀어가면 좋아요" items={model.recoveryLines} />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">{model.helper}</p>
        {props.onPrimaryAction ? (
          <button
            type="button"
            disabled={actionLoading || actionDone}
            onClick={() => props.onPrimaryAction?.(model.messageDraft)}
            className={joinClassNames(
              "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
              tone.button,
              actionLoading || actionDone ? "cursor-not-allowed opacity-60" : ""
            )}
          >
            {actionLoading ? (
              <InlineSpinnerLabel label="전달 중" />
            ) : actionDone ? (
              "설명 전달 완료"
            ) : (
              model.actionLabel
            )}
          </button>
        ) : null}
      </div>
    </section>
  );

  if (props.hideBehindBeta === false) {
    return content;
  }

  return <BetaFeatureGate title="Beta 만족 회복 가이드">{content}</BetaFeatureGate>;
}
