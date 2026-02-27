"use client";

import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { UserProfile } from "@/types/chat";
import { useProfileModalState } from "./useProfileModalState";
import { ProfileModalForm } from "./ProfileModalForm";

type ProfileModalProps = {
  profile?: UserProfile;
  onClose: () => void;
  onChange: (profile?: UserProfile) => void;
};

export default function ProfileModal({
  profile,
  onClose,
  onChange,
}: ProfileModalProps) {
  const {
    local,
    setField,
    confirmReset,
    setConfirmReset,
    isMounted,
    modalDrag,
    resetDialogDrag,
  } = useProfileModalState({
    profile,
    onClose,
  });

  const modal = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,860px)] w-[min(100vw-24px,620px)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        ref={modalDrag.panelRef}
        style={modalDrag.panelStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 touch-none ${
            modalDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={modalDrag.handleDragPointerDown}
        >
          <div className="text-lg font-semibold text-slate-900">프로필 설정</div>
          <button
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="isolate flex-1 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-gutter:stable] [will-change:scroll-position] sm:px-6">
          <ProfileModalForm local={local} setField={setField} />
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="text-sm text-rose-600 hover:text-rose-700"
              onClick={() => setConfirmReset(true)}
            >
              초기화
            </button>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={onClose}
              >
                취소
              </button>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90 active:opacity-95"
                onClick={() => {
                  onChange(local);
                  onClose();
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmReset ? (
        <div
          className="absolute inset-0 z-[60] grid place-items-center p-4"
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="w-[min(100%,420px)] rounded-2xl bg-white shadow-xl border border-slate-200 p-5"
            ref={resetDialogDrag.panelRef}
            style={resetDialogDrag.panelStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`text-base font-semibold text-slate-900 touch-none ${
                resetDialogDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              onPointerDown={resetDialogDrag.handleDragPointerDown}
            >
              초기화하시겠어요?
            </div>
            <p className="mt-2 text-sm text-slate-600">
              입력한 프로필 정보가 모두 삭제됩니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmReset(false)}
              >
                취소
              </button>
              <button
                className="rounded-full bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
                onClick={() => {
                  onChange(undefined);
                  setConfirmReset(false);
                }}
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return isMounted ? createPortal(modal, document.body) : null;
}
