"use client";

import Link from "next/link";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";
import type { GuestMemberBridgeModel } from "@/lib/member-bridge/engine";

type GuestMemberBridgeCardProps = {
  model: GuestMemberBridgeModel;
  className?: string;
  hideBehindBeta?: boolean;
  compact?: boolean;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(tone: GuestMemberBridgeModel["tone"]) {
  if (tone === "emerald") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50",
      badge: "bg-emerald-100 text-emerald-800",
    };
  }

  if (tone === "sky") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50",
      badge: "bg-sky-100 text-sky-800",
    };
  }

  if (tone === "amber") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
      badge: "bg-amber-100 text-amber-800",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50",
    badge: "bg-slate-200 text-slate-700",
  };
}

export default function GuestMemberBridgeCard({
  model,
  className,
  hideBehindBeta = true,
  compact = false,
}: GuestMemberBridgeCardProps) {
  const tone = resolveTone(model.tone);

  const content = (
    <section
      className={joinClassNames(
        compact
          ? "rounded-[1.5rem] border p-4 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.22)]"
          : "rounded-[1.75rem] border p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
        tone.shell,
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "rounded-full px-2.5 py-1 text-[12px] font-semibold",
            tone.badge
          )}
        >
          {model.badgeLabel}
        </span>
        <span className="text-[12px] font-medium text-slate-500 sm:text-[13px]">
          계정에 연결해 두기
        </span>
      </div>

      <h2
        className={joinClassNames(
          compact
            ? "mt-2.5 text-[1.45rem] font-extrabold tracking-tight text-slate-900 sm:text-[1.55rem]"
            : "mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
        )}
      >
        {model.title}
      </h2>
      <p
        className={joinClassNames(
          compact
            ? "mt-2 text-[14px] leading-6 text-slate-700"
            : "mt-2 text-sm leading-6 text-slate-700"
        )}
      >
        {model.description}
      </p>
      <p
        className={joinClassNames(
          compact
            ? "mt-1.5 text-[13px] leading-5 text-slate-500"
            : "mt-2 text-xs leading-5 text-slate-500"
        )}
      >
        {model.helper}
      </p>

      {model.reasonLines.length > 0 ? (
        <div className={joinClassNames(compact ? "mt-3 space-y-1.5" : "mt-4 space-y-1.5")}>
          {model.reasonLines.map((line) => (
            <p key={line} className={compact ? "text-[13px] leading-6 text-slate-600" : "text-xs leading-5 text-slate-600"}>
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div
        className={joinClassNames(
          compact ? "mt-4 grid gap-2.5" : "mt-5 grid gap-2 sm:grid-cols-2"
        )}
      >
        <KakaoLoginButton className="justify-center" fullWidth compact={compact} />
        {model.secondaryAction ? (
          <Link
            href={model.secondaryAction.href}
            className={joinClassNames(
              "inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 text-center text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50",
              compact ? "py-3 leading-5" : "py-3"
            )}
          >
            {model.secondaryAction.label}
          </Link>
        ) : null}
      </div>

      <p className={joinClassNames("mt-3 text-slate-500", compact ? "text-[13px] leading-5" : "text-[11px]")}>
        {model.primaryActionLabel}
      </p>
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return (
    <BetaFeatureGate
      title="Beta 이어보기"
      helper="로그인해 두면 다음에 다시 보기 쉬워요."
      contentViewportClassName={
        compact ? "max-h-[min(42vh,24rem)] overflow-y-auto pr-1" : undefined
      }
    >
      {content}
    </BetaFeatureGate>
  );
}
