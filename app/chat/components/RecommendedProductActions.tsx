"use client";

import { useEffect, useMemo, useState } from "react";
import AddressModal from "@/components/modal/addressModal";
import {
  type ActionableRecommendation,
  hasSavedRoadAddress,
  normalizeKey,
  parseRecommendationLines,
  resolveRecommendations,
  toKrw,
  updateCartItems,
} from "./recommendedProductActions.utils";

type PendingCartAction = {
  items: ActionableRecommendation[];
  openCartAfterSave: boolean;
  successFeedback?: string;
} | null;

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  targets: ActionableRecommendation[];
  openCartAfterSave?: boolean;
  successFeedback?: string;
} | null;

export default function RecommendedProductActions({ content }: { content: string }) {
  const parsed = useMemo(() => parseRecommendationLines(content || ""), [content]);
  const [items, setItems] = useState<ActionableRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [showAddressGuideModal, setShowAddressGuideModal] = useState(false);
  const [pendingCartAction, setPendingCartAction] =
    useState<PendingCartAction>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    let alive = true;

    if (!parsed.length) {
      setItems([]);
      return;
    }

    setLoading(true);
    resolveRecommendations(parsed)
      .then((resolved) => {
        if (!alive) return;
        setItems(resolved);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [parsed]);

  if (!parsed.length) return null;
  if (!loading && items.length === 0) return null;

  const runCartAction = (
    targets: ActionableRecommendation[],
    options?: {
      openCartAfterSave?: boolean;
      successFeedback?: string;
    }
  ) => {
    if (!targets.length) return;

    const openCartAfterSave = options?.openCartAfterSave === true;
    if (!hasSavedRoadAddress()) {
      setPendingCartAction({
        items: targets,
        openCartAfterSave,
        successFeedback: options?.successFeedback,
      });
      setShowAddressGuideModal(true);
      return;
    }

    updateCartItems(targets);
    if (openCartAfterSave) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("wbGlobalCartOpen", "1");
        localStorage.setItem("openCart", "true");
        window.dispatchEvent(new Event("openCart"));
      }
      return;
    }

    if (options?.successFeedback) {
      setFeedback(options.successFeedback);
    }
  };

  const addSingle = (item: ActionableRecommendation) => {
    setConfirmDialog({
      title: "장바구니에 담을까요?",
      description: `'${item.productName}'을 장바구니에 추가합니다.`,
      confirmLabel: "담기",
      targets: [item],
      successFeedback: `장바구니에 담았어요: ${item.productName}`,
    });
  };

  const addAll = () => {
    if (!items.length) return;
    setConfirmDialog({
      title: `추천 제품 ${items.length}개 담기`,
      description: "추천된 제품을 장바구니에 한 번에 추가합니다.",
      confirmLabel: "전체 담기",
      targets: items,
      successFeedback: `추천 제품 ${items.length}개를 장바구니에 담았어요.`,
    });
  };

  const buyNow = (targets: ActionableRecommendation[]) => {
    if (!targets.length) return;
    runCartAction(targets, {
      openCartAfterSave: true,
    });
  };

  return (
    <div className="mt-3 ms-2 w-full max-w-[86%] sm:max-w-[74%] md:max-w-[70%] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-700">
          추천 제품 빠른 실행
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={addAll}
            disabled={loading || items.length === 0}
            className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            전체 담기
          </button>
          <button
            type="button"
            onClick={() => buyNow(items)}
            disabled={loading || items.length === 0}
            className="rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            전체 바로 구매
          </button>
        </div>
      </div>

      {feedback ? (
        <p className="mt-1 text-[11px] text-emerald-600">{feedback}</p>
      ) : null}

      <div className="mt-2 space-y-1.5">
        {loading
          ? parsed.map((item, index) => (
              <div
                key={`${normalizeKey(item.category)}-${normalizeKey(
                  item.productName
                )}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <p className="text-[11px] font-medium text-slate-500">
                  {item.category}
                </p>
                <p className="line-clamp-1 text-[12px] font-semibold text-slate-900">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {typeof item.sourcePrice === "number"
                    ? `7일 기준 ${toKrw(item.sourcePrice)}`
                    : "7일 기준 가격 확인"}
                </p>
                <div className="mt-1.5 h-6 w-28 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))
          : items.map((item, index) => (
              <div
                key={`${normalizeKey(item.category)}-${normalizeKey(
                  item.productName
                )}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <p className="text-[11px] font-medium text-slate-500">
                  {item.category}
                </p>
                <p className="line-clamp-1 text-[12px] font-semibold text-slate-900">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {typeof item.sourcePrice === "number"
                    ? `7일 기준 ${toKrw(item.sourcePrice)}`
                    : `7일 기준 ${toKrw(item.sevenDayPrice)}`}
                  {` · 패키지 ${toKrw(item.packagePrice)}`}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  옵션: {item.optionType}
                  {item.capacity ? ` (${item.capacity})` : ""}
                </p>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => addSingle(item)}
                    className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-white"
                  >
                    확인 후 담기
                  </button>
                  <button
                    type="button"
                    onClick={() => buyNow([item])}
                    className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-black"
                  >
                    바로 구매
                  </button>
                </div>
              </div>
            ))}
      </div>

      {showAddressGuideModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowAddressGuideModal(false);
            setPendingCartAction(null);
          }}
        >
          <div
            className="m-3 w-[min(32rem,calc(100%-1.5rem))] rounded-xl bg-white px-6 py-8 shadow-2xl sm:px-8"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              주소를 입력해 주세요!
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              해당 상품을 주문할 수 있는 약국을 보여드릴게요.
            </p>
            <p className="mb-6 mt-1 text-xs leading-relaxed text-gray-600">
              (주소는 주문 완료 전에는 어디에도 제공되지 않아요.)
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddressGuideModal(false);
                  setPendingCartAction(null);
                }}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                다른 추천 더 볼게요
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddressGuideModal(false);
                  setIsAddressModalOpen(true);
                }}
                className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-600"
              >
                주소를 입력할게요
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="m-3 w-[min(28rem,calc(100%-1.5rem))] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-100"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[16px] font-semibold text-slate-900">
              {confirmDialog.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {confirmDialog.description}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = confirmDialog;
                  setConfirmDialog(null);
                  runCartAction(next.targets, {
                    openCartAfterSave: next.openCartAfterSave,
                    successFeedback: next.successFeedback,
                  });
                }}
                className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-black"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddressModalOpen && (
        <AddressModal
          onClose={() => {
            setIsAddressModalOpen(false);
            setPendingCartAction(null);
          }}
          onSave={(roadAddress: string, detailAddress: string) => {
            localStorage.setItem("roadAddress", roadAddress);
            localStorage.setItem("detailAddress", detailAddress);
            window.dispatchEvent(new Event("addressUpdated"));

            const pending = pendingCartAction;
            setPendingCartAction(null);
            setIsAddressModalOpen(false);

            if (!pending || pending.items.length === 0) return;

            updateCartItems(pending.items);
            if (pending.openCartAfterSave) {
              sessionStorage.setItem("wbGlobalCartOpen", "1");
              localStorage.setItem("openCart", "true");
              window.dispatchEvent(new Event("openCart"));
              return;
            }

            if (pending.successFeedback) {
              setFeedback(pending.successFeedback);
            } else if (pending.items.length === 1) {
              setFeedback(`장바구니에 담았어요: ${pending.items[0].productName}`);
            } else {
              setFeedback(`추천 제품 ${pending.items.length}개를 장바구니에 담았어요.`);
            }
          }}
        />
      )}
    </div>
  );
}
