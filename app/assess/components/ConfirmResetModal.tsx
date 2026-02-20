"use client";

import { RefObject } from "react";
import { useDraggableModal } from "@/components/common/useDraggableModal";

interface Props {
  open: boolean;
  cancelBtnRef: RefObject<HTMLButtonElement>;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmResetModal({ open, cancelBtnRef, onCancel, onConfirm }: Props) {
  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(open, { resetOnOpen: true });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5"
        ref={panelRef}
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onPointerDown={handleDragPointerDown}
          className={`touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <h3 className="text-lg font-bold text-gray-900">처음부터 다시 시작할까요?</h3>
          <p className="mt-2 text-sm text-gray-600">입력한 답변은 모두 삭제돼요.</p>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          >
            처음부터
          </button>
        </div>
      </div>
    </div>
  );
}

