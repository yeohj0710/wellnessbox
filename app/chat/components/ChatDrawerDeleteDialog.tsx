"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import type { ChatDrawerDeleteDialogProps } from "./ChatDrawer.types";

export default function ChatDrawerDeleteDialog({
  open,
  title,
  deleting,
  onCancel,
  onConfirm,
}: ChatDrawerDeleteDialogProps) {
  const drag = useDraggableModal(open, { resetOnOpen: true });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(2,6,23,0.25)]"
        ref={drag.panelRef}
        style={drag.panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`touch-none p-5 ${drag.isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerDown={drag.handleDragPointerDown}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 ring-1 ring-red-100">
              <TrashIcon className="h-5 w-5 text-red-600" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-900">대화를 삭제할까요?</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">{title}</span>
                <span> 대화를 삭제하면 복구할 수 없어요.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 bg-slate-50/60 p-3">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
            onClick={onCancel}
            disabled={deleting}
          >
            취소
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <InlineSpinnerLabel label="삭제 중" spinnerClassName="text-white" />
            ) : (
              "삭제"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
