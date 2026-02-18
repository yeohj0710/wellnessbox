"use client";

import { useCallback, useEffect, useState } from "react";
import AddressModal from "@/components/modal/addressModal";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import {
  CHAT_CART_ACTION_REQUEST_EVENT,
  type ChatCartActionItem,
  type ChatCartActionRequestDetail,
} from "@/lib/chat/cart-action-events";
import {
  mergeClientCartItems,
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";

type PendingAction = {
  items: ChatCartActionItem[];
  openCartAfterSave: boolean;
} | null;

function normalizeActionItems(items: unknown): ChatCartActionItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const productId = Number(raw.productId);
      const productName =
        typeof raw.productName === "string" ? raw.productName.trim() : "";
      const optionType =
        typeof raw.optionType === "string" ? raw.optionType.trim() : "";
      const quantity = Number(raw.quantity);
      if (!Number.isFinite(productId) || productId <= 0) return null;
      if (!optionType) return null;
      return {
        productId: Math.floor(productId),
        productName,
        optionType,
        quantity:
          Number.isFinite(quantity) && quantity > 0
            ? Math.min(20, Math.floor(quantity))
            : 1,
      } as ChatCartActionItem;
    })
    .filter((item): item is ChatCartActionItem => item !== null);
}

function hasSavedRoadAddress() {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("roadAddress");
  return typeof saved === "string" && saved.trim().length > 0;
}

export default function ChatCartActionHost() {
  const [showAddressGuideModal, setShowAddressGuideModal] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const guideModalDrag = useDraggableModal(showAddressGuideModal, {
    resetOnOpen: true,
  });

  const applyCartAction = useCallback((action: PendingAction) => {
    if (!action || action.items.length === 0) return;
    if (typeof window === "undefined") return;

    const merged = mergeClientCartItems(readClientCartItems(), action.items);
    writeClientCartItems(merged);
    window.dispatchEvent(new Event("cartUpdated"));

    if (!action.openCartAfterSave) return;
    sessionStorage.setItem("wbGlobalCartOpen", "1");
    localStorage.setItem("openCart", "true");
    window.dispatchEvent(new Event("openCart"));
  }, []);

  useEffect(() => {
    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<ChatCartActionRequestDetail>).detail;
      const items = normalizeActionItems(detail?.items);
      if (items.length === 0) return;

      const action: PendingAction = {
        items,
        openCartAfterSave: detail?.openCartAfterSave === true,
      };

      if (!hasSavedRoadAddress()) {
        setPendingAction(action);
        setShowAddressGuideModal(true);
        return;
      }

      applyCartAction(action);
    };

    window.addEventListener(
      CHAT_CART_ACTION_REQUEST_EVENT,
      onRequest as EventListener
    );
    return () => {
      window.removeEventListener(
        CHAT_CART_ACTION_REQUEST_EVENT,
        onRequest as EventListener
      );
    };
  }, [applyCartAction]);

  return (
    <>
      {showAddressGuideModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowAddressGuideModal(false);
            setPendingAction(null);
          }}
        >
          <div
            className="relative m-3 w-[min(32rem,calc(100%-1.5rem))] rounded-xl bg-white px-6 py-8 shadow-2xl sm:px-8"
            ref={guideModalDrag.panelRef}
            style={guideModalDrag.panelStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              onPointerDown={guideModalDrag.handleDragPointerDown}
              className={`absolute left-0 right-0 top-0 h-10 touch-none ${
                guideModalDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              aria-hidden
            />
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
                  setPendingAction(null);
                }}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                나중에 할게요
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

      {isAddressModalOpen && (
        <AddressModal
          onClose={() => {
            setIsAddressModalOpen(false);
            setPendingAction(null);
          }}
          onSave={(roadAddress: string, detailAddress: string) => {
            if (typeof window === "undefined") return;
            localStorage.setItem("roadAddress", roadAddress);
            localStorage.setItem("detailAddress", detailAddress);
            window.dispatchEvent(new Event("addressUpdated"));

            const action = pendingAction;
            setPendingAction(null);
            setIsAddressModalOpen(false);
            applyCartAction(action);
          }}
        />
      )}
    </>
  );
}
