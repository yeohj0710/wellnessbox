"use client";

import Link from "next/link";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";
import type { GuestMemberBridgeModel } from "@/lib/member-bridge/engine";

type GuestMemberBridgeCardProps = {
  model: GuestMemberBridgeModel;
  className?: string;
  hideBehindBeta?: boolean;
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
}: GuestMemberBridgeCardProps) {
  const tone = resolveTone(model.tone);

  const content = (
    <section
      className={joinClassNames(
        "rounded-[1.75rem] border p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
        tone.shell,
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            tone.badge
          )}
        >
          {model.badgeLabel}
        </span>
        <span className="text-[11px] font-medium text-slate-500">
          계정으로 이어 붙이기
        </span>
      </div>

      <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
        {model.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{model.description}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{model.helper}</p>

      {model.reasonLines.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {model.reasonLines.map((line) => (
            <p key={line} className="text-xs leading-5 text-slate-600">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <KakaoLoginButton className="justify-center" fullWidth />
        {model.secondaryAction ? (
          <Link
            href={model.secondaryAction.href}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            {model.secondaryAction.label}
          </Link>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">{model.primaryActionLabel}</p>
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return <BetaFeatureGate title="Beta 이어보기">{content}</BetaFeatureGate>;
}
