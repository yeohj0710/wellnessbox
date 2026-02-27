"use client";

import { useState } from "react";
import AddressModal from "@/components/modal/addressModal";
import { useDraggableModal } from "@/components/common/useDraggableModal";

export default function FirstModal({
  product,
  selectedOption,
  quantity,
  onAddToCart,
  onClose,
  onProductDetailClose,
  onAddressSaved,
}: any) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSaving] = useState(false);
  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(!isAddressModalOpen, { resetOnOpen: true });

  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <>
      {!isAddressModalOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-[1.5px] sm:items-center sm:p-5"
          onClick={handleBackgroundClick}
        >
          <section
            className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.28)] sm:p-6"
            ref={panelRef}
            style={panelStyle}
            role="dialog"
            aria-modal="true"
            aria-label="주소 입력 안내"
          >
            <div
              onPointerDown={handleDragPointerDown}
              className={`absolute left-0 right-0 top-0 h-10 touch-none ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              aria-hidden
            />
            <div className="mb-3 flex justify-center">
              <span className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">주소를 먼저 입력해 주세요</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              주소를 입력하면 배송 가능한 약국을 확인하고 상품을 바로 담을 수 있어요.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              주소 정보는 주문을 진행하기 전에는 외부에 제공되지 않아요.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                나중에 입력할게요
              </button>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
              >
                주소 입력하기
              </button>
            </div>
          </section>
        </div>
      ) : (
        <AddressModal
          onClose={() => {
            setIsAddressModalOpen(false);
            onClose();
          }}
          onSave={(roadAddress: string, detailAddress: string) => {
            localStorage.setItem("roadAddress", roadAddress);
            localStorage.setItem("detailAddress", detailAddress);

            if (typeof onAddressSaved === "function") {
              onAddressSaved(roadAddress);
            }

            const cartItem = {
              productId: product.id,
              productName: product.name,
              optionType: selectedOption,
              quantity,
            };

            onAddToCart(cartItem);

            setIsAddressModalOpen(false);
            onClose();
            onProductDetailClose();
          }}
        />
      )}
      {isSaving && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      )}
    </>
  );
}
