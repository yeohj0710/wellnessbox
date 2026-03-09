"use client";

import type {
  CSSProperties,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { RecommendedProductActionConfirmDialog } from "./recommendedProductActions.controller-support";

type RecommendedProductConfirmDialogProps = {
  dialog: RecommendedProductActionConfirmDialog;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  panelStyle: CSSProperties;
  isDragging: boolean;
  onDragPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function RecommendedProductConfirmDialog({
  dialog,
  panelRef,
  panelStyle,
  isDragging,
  onDragPointerDown,
  onCancel,
  onConfirm,
}: RecommendedProductConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="relative m-3 w-[min(28rem,calc(100%-1.5rem))] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-100"
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
        <h3 className="text-[16px] font-semibold text-slate-900">
          {dialog.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {dialog.description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-black"
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
