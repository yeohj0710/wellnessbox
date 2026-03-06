"use client";

import { useState } from "react";
import { useDraggableModal } from "@/components/common/useDraggableModal";

type CartBulkChangeControlsProps = {
  isVisible: boolean;
  onBulkChange: (target: string) => void;
};

const BULK_CHANGE_ACTIONS = [
  { key: "\u0037\uC77C\uCE58", label: "\uC804\uCCB4 \u0037\uC77C\uCE58" },
  { key: "\u0033\u0030\uC77C\uCE58", label: "\uC804\uCCB4 \u0033\u0030\uC77C\uCE58" },
  { key: "\uC77C\uBC18", label: "\uC804\uCCB4 \uD1B5\uC0C1" },
] as const;

const BULK_CHANGE_COPY = {
  title: "\uBCC0\uACBD \uD655\uC778",
  descriptionPrefix:
    "\uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uAE34 \uBAA8\uB4E0 \uC601\uC591\uC81C\uAC00",
  descriptionSuffix: "\uC0C1\uD488\uC73C\uB85C \uBCC0\uACBD\uB429\uB2C8\uB2E4.",
  cancelLabel: "\uCDE8\uC18C",
  confirmLabel: "\uBCC0\uACBD",
} as const;

export default function CartBulkChangeControls({
  isVisible,
  onBulkChange,
}: CartBulkChangeControlsProps) {
  const [confirmType, setConfirmType] = useState<string | null>(null);
  const confirmModalDrag = useDraggableModal(Boolean(confirmType), {
    resetOnOpen: true,
  });

  if (!isVisible) return null;

  return (
    <>
      <div className="justify-end px-4 mt-3 mb-2 flex gap-2">
        {BULK_CHANGE_ACTIONS.map((action) => (
          <button
            key={action.key}
            onClick={() => setConfirmType(action.key)}
            className="px-3 py-1 text-sm bg-sky-400 text-white rounded hover:bg-sky-500"
          >
            {action.label}
          </button>
        ))}
      </div>

      {confirmType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmType(null)}
        >
          <div
            className="relative bg-gradient-to-br from-sky-400/90 via-indigo-500/90 to-fuchsia-500/90 rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-scaleIn"
            ref={confirmModalDrag.panelRef}
            style={confirmModalDrag.panelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onPointerDown={confirmModalDrag.handleDragPointerDown}
              className={`absolute left-0 right-0 top-0 h-10 touch-none ${
                confirmModalDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              aria-hidden
            />
            <div className="p-6 bg-white/90 rounded-2xl text-center">
              <h2 className="text-lg font-bold text-gray-800 mb-3">
                {BULK_CHANGE_COPY.title}
              </h2>
              <p className="mb-6 text-sm text-gray-600">
                {BULK_CHANGE_COPY.descriptionPrefix}{" "}
                <span className="font-semibold text-sky-500">{confirmType}</span>{" "}
                {BULK_CHANGE_COPY.descriptionSuffix}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setConfirmType(null)}
                  className="px-5 py-2 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                >
                  {BULK_CHANGE_COPY.cancelLabel}
                </button>
                <button
                  onClick={() => {
                    onBulkChange(confirmType);
                    setConfirmType(null);
                  }}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 text-white font-semibold shadow-md hover:scale-105 transition-transform"
                >
                  {BULK_CHANGE_COPY.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
