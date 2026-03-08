"use client";

import type {
  CSSProperties,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from "react";

type RecommendedProductAddressGuideModalProps = {
  open: boolean;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  panelStyle: CSSProperties;
  isDragging: boolean;
  onDragPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onClose: () => void;
  onOpenAddressModal: () => void;
};

export default function RecommendedProductAddressGuideModal({
  open,
  panelRef,
  panelStyle,
  isDragging,
  onDragPointerDown,
  onClose,
  onOpenAddressModal,
}: RecommendedProductAddressGuideModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative m-3 w-[min(32rem,calc(100%-1.5rem))] rounded-xl bg-white px-6 py-8 shadow-2xl sm:px-8"
        ref={panelRef}
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          onPointerDown={onDragPointerDown}
          className={`absolute left-0 right-0 top-0 h-10 touch-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          aria-hidden
        />
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          주소를 입력해 주세요
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">
          해당 상품은 주문 전에 받을 주소를 먼저 확인해야 해요.
        </p>
        <p className="mb-6 mt-1 text-xs leading-relaxed text-gray-600">
          (주소는 주문 완료 전까지는 어디에도 공개되지 않아요.)
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            다른 추천 더 볼게요
          </button>
          <button
            type="button"
            onClick={onOpenAddressModal}
            className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-600"
          >
            주소를 입력할게요
          </button>
        </div>
      </div>
    </div>
  );
}
