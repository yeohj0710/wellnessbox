"use client";

import Link from "next/link";
import { mergeClientCartItems } from "@/lib/client/cart-storage";
import {
  buildCartStockIntelligenceModel,
  type CartStockRecovery,
} from "@/lib/cart-stock-intelligence";
import type { UserContextSummary } from "@/lib/chat/context";
import type { ResolvedCartItemRow } from "./cartItemsSection.view-model";
import type { CartLineItem, CartProduct } from "./cart.types";

type CartStockIntelligenceCardProps = {
  items: ResolvedCartItemRow[];
  cartItems: CartLineItem[];
  allProducts: CartProduct[];
  selectedPharmacyId: number | null | undefined;
  summary: UserContextSummary | null | undefined;
  recovery?: CartStockRecovery | null;
  isAddressMissing?: boolean;
  onUpdateCart: (items: CartLineItem[]) => void;
  onBulkChange: (target: string) => void;
  onRetryResolve?: () => void;
  onOpenAddressModal?: () => void;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(tone: "amber" | "sky" | "emerald") {
  if (tone === "amber") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
      badge: "bg-amber-100 text-amber-800",
      accent: "bg-amber-600 hover:bg-amber-700 text-white",
      subtle: "bg-white/90 ring-amber-100",
    };
  }

  if (tone === "sky") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50",
      badge: "bg-sky-100 text-sky-800",
      accent: "bg-sky-600 hover:bg-sky-700 text-white",
      subtle: "bg-white/90 ring-sky-100",
    };
  }

  return {
    shell:
      "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50",
    badge: "bg-emerald-100 text-emerald-800",
    accent: "bg-emerald-600 hover:bg-emerald-700 text-white",
    subtle: "bg-white/90 ring-emerald-100",
  };
}

function Section({
  title,
  items,
  subtleClassName,
}: {
  title: string;
  items: string[];
  subtleClassName: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={joinClassNames(
        "rounded-2xl px-4 py-3 ring-1",
        subtleClassName
      )}
    >
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <p key={`${title}-${item}`} className="text-xs leading-5 text-slate-600">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function replaceItemOption(
  cartItems: CartLineItem[],
  productId: number,
  fromOptionType: string,
  toOptionType: string
) {
  const target = cartItems.find(
    (item) => item.productId === productId && item.optionType === fromOptionType
  );
  if (!target) return cartItems;

  const remainder = cartItems.filter(
    (item) => !(item.productId === productId && item.optionType === fromOptionType)
  );

  return mergeClientCartItems(remainder, [
    {
      ...target,
      optionType: toOptionType,
    },
  ]);
}

export default function CartStockIntelligenceCard({
  items,
  cartItems,
  allProducts,
  selectedPharmacyId,
  summary,
  recovery = null,
  isAddressMissing = false,
  onUpdateCart,
  onBulkChange,
  onRetryResolve,
  onOpenAddressModal,
}: CartStockIntelligenceCardProps) {
  const model = buildCartStockIntelligenceModel({
    rows: items,
    cartItems,
    allProducts,
    selectedPharmacyId: selectedPharmacyId ?? null,
    summary,
    recovery,
    isAddressMissing,
  });

  if (!model) return null;

  const tone = resolveTone(model.tone);

  return (
    <div
      className={joinClassNames(
        "rounded-[1.75rem] border px-4 py-5 shadow-sm",
        tone.shell
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={joinClassNames(
                "rounded-full px-3 py-1 text-[11px] font-semibold",
                tone.badge
              )}
            >
              {model.badgeLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              품절이 경험 손실로 바로 이어지지 않게
            </span>
          </div>
          <h3 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
            {model.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {model.description}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Section
          title="재고 때문에 바뀐 부분"
          items={model.recoveryLines}
          subtleClassName={tone.subtle}
        />
        <Section
          title="지금 끊기기 쉬운 지점"
          items={model.riskLines}
          subtleClassName={tone.subtle}
        />
        <Section
          title="지금 이어갈 수 있는 경로"
          items={model.pathLines}
          subtleClassName={tone.subtle}
        />
      </div>

      {model.actions.length > 0 ? (
        <div className="mt-4 space-y-2">
          {model.actions.map((action) => {
            if (action.type === "consult") {
              return (
                <div
                  key={`${action.type}:${action.label}`}
                  className="flex flex-col gap-2 rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {action.label}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {action.helper}
                    </div>
                  </div>
                  <Link
                    href={action.href}
                    className={joinClassNames(
                      "inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
                      tone.accent
                    )}
                  >
                    상담 이어가기
                  </Link>
                </div>
              );
            }

            return (
              <div
                key={`${action.type}:${action.label}`}
                className="flex flex-col gap-2 rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {action.label}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {action.helper}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (action.type === "swap_option") {
                      onUpdateCart(
                        replaceItemOption(
                          cartItems,
                          action.productId,
                          action.fromOptionType,
                          action.toOptionType
                        )
                      );
                      return;
                    }

                    if (action.type === "add_alternative") {
                      onUpdateCart(mergeClientCartItems(cartItems, [action.item]));
                      return;
                    }

                    if (action.type === "bulk_change") {
                      onBulkChange(action.targetOptionKeyword);
                      return;
                    }

                    if (action.type === "retry_pharmacy") {
                      onRetryResolve?.();
                      return;
                    }

                    if (action.type === "open_address") {
                      onOpenAddressModal?.();
                    }
                  }}
                  className={joinClassNames(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                    tone.accent
                  )}
                >
                  {action.type === "swap_option"
                    ? "옵션 바꾸기"
                    : action.type === "add_alternative"
                    ? "대체안 담기"
                    : action.type === "bulk_change"
                    ? "가볍게 다시 맞추기"
                    : action.type === "retry_pharmacy"
                    ? "약국 다시 보기"
                    : "주소 다시 입력"}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
