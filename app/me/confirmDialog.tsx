"use client";

import { useEffect, useMemo, useRef } from "react";
import { useDraggableModal } from "@/components/common/useDraggableModal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  confirmLoading?: boolean;
  closeOnBackdrop?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${className} animate-spin rounded-full border-2 border-current border-t-transparent`}
    />
  );
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  tone = "default",
  confirmLoading = false,
  closeOnBackdrop = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(open, { resetOnOpen: true });

  const confirmBtnClass = useMemo(() => {
    if (tone === "danger") {
      return "bg-rose-100 text-rose-700 hover:bg-rose-200";
    }
    return "bg-gray-900 text-white hover:bg-gray-800";
  }, [tone]);

  useEffect(() => {
    if (!open) return;

    const t = window.setTimeout(() => cancelRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmLoading) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, confirmLoading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {closeOnBackdrop ? (
        <button
          type="button"
          aria-label="닫기"
          disabled={confirmLoading}
          onClick={() => {
            if (!confirmLoading) onClose();
          }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm disabled:cursor-not-allowed"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        ref={panelRef}
        style={panelStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`px-6 py-5 touch-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={handleDragPointerDown}
        >
          <div className="text-lg font-bold text-gray-900">{title}</div>
          {description ? (
            <div className="mt-2 text-sm text-gray-600">{description}</div>
          ) : null}
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => {
                if (!confirmLoading) onClose();
              }}
              disabled={confirmLoading}
              className="inline-flex h-8 min-w-[56px] items-center justify-center whitespace-nowrap rounded-full bg-gray-100 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmLoading}
              aria-busy={confirmLoading}
              className={`relative inline-flex h-8 min-w-[56px] items-center justify-center whitespace-nowrap rounded-full px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${confirmBtnClass}`}
            >
              <span className={confirmLoading ? "opacity-0" : "opacity-100"}>
                {confirmText}
              </span>

              {confirmLoading ? (
                <span className="absolute inset-0 grid place-items-center">
                  <Spinner />
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
