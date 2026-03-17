"use client";

import { mergeClientCartItems } from "@/lib/client/cart-storage";
import { buildCartIntelligenceSummary } from "@/lib/cart-intelligence";
import type { ResolvedCartItemRow } from "./cartItemsSection.view-model";
import type { CartLineItem, CartPharmacy, CartProduct } from "./cart.types";

type CartBundleIntelligenceCardProps = {
  items: ResolvedCartItemRow[];
  cartItems: CartLineItem[];
  allProducts: CartProduct[];
  selectedPharmacy: CartPharmacy | null;
  onUpdateCart: (items: CartLineItem[]) => void;
  onBulkChange: (target: string) => void;
};

export default function CartBundleIntelligenceCard({
  items,
  cartItems,
  allProducts,
  selectedPharmacy,
  onUpdateCart,
  onBulkChange,
}: CartBundleIntelligenceCardProps) {
  const summary = buildCartIntelligenceSummary({
    rows: items,
    allProducts,
    selectedPharmacyId: selectedPharmacy?.id,
  });

  if (!summary) return null;

  const handleAction = (action: (typeof summary.actions)[number]) => {
    if (action.type === "remove_overlap") {
      onUpdateCart(
        cartItems.filter(
          (item) =>
            !(
              item.productId === action.productId &&
              item.optionType === action.optionType
            )
        )
      );
      return;
    }

    if (action.type === "add_complement") {
      onUpdateCart(mergeClientCartItems(cartItems, [action.item]));
      return;
    }

    if (action.type === "starterize") {
      onBulkChange(action.targetOptionKeyword);
    }
  };

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 px-4 py-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
            구성 인텔리전스
          </div>
          <h3 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
            {summary.headline}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {summary.description}
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          {summary.stageLabel}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {summary.themes.map((theme) => (
          <span
            key={theme}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            {theme}
          </span>
        ))}
      </div>

      {summary.risks.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-slate-200">
          <div className="text-sm font-bold text-slate-900">구성 체크 포인트</div>
          <div className="mt-2 space-y-1.5">
            {summary.risks.map((risk) => (
              <p key={risk} className="text-xs leading-5 text-slate-600">
                {risk}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {summary.actions.length > 0 ? (
        <div className="mt-4 space-y-2">
          {summary.actions.map((action) => (
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
                onClick={() => handleAction(action)}
                className="shrink-0 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                {action.type === "remove_overlap"
                  ? "덜어내기"
                  : action.type === "add_complement"
                  ? "같이 담기"
                  : "7일치로 변경"}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
