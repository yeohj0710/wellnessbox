"use client";

import { useDraggableModal } from "@/components/common/useDraggableModal";
import ModalSpinner from "./modalSpinner";
import { useNicknameChangeModalState } from "./useNicknameChangeModalState";

type NicknameChangeModalProps = {
  open: boolean;
  onClose: () => void;
  initialNickname?: string;
  onChanged: (nickname: string) => void;
  onSaveNickname: (nickname: string) => Promise<void>;
};

export default function NicknameChangeModal({
  open,
  onClose,
  initialNickname,
  onChanged,
  onSaveNickname,
}: NicknameChangeModalProps) {
  const {
    nickname,
    checking,
    saving,
    statusMessage,
    error,
    busy,
    checkDisabled,
    saveDisabled,
    handleNicknameChange,
    handleCheck,
    handleSave,
  } = useNicknameChangeModalState({
    open,
    initialNickname,
    onClose,
    onChanged,
    onSaveNickname,
  });

  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(open, { resetOnOpen: true });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        ref={panelRef}
        style={panelStyle}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 sm:px-7 py-5">
          <div
            className={`flex items-center justify-between gap-3 touch-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onPointerDown={handleDragPointerDown}
          >
            <div className="text-xl font-bold text-gray-900">닉네임 변경</div>

            <button
              type="button"
              onClick={() => {
                if (busy) return;
                onClose();
              }}
              disabled={busy}
              className="inline-flex min-w-[56px] items-center justify-center whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              닫기
            </button>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            원하는 닉네임을 입력하고 중복 검사를 진행해 주세요.
          </div>
        </div>

        <div className="space-y-4 border-t border-gray-200 px-6 py-5 sm:px-7">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">닉네임</div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={nickname}
                disabled={busy}
                onChange={(event) => handleNicknameChange(event.target.value)}
                placeholder="예: 상큼한 수달"
                maxLength={60}
                className="min-w-0 h-10 flex-1 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={handleCheck}
                disabled={checkDisabled}
                aria-busy={checking}
                className="h-10 w-28 shrink-0 rounded-lg bg-sky-100 text-sm font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
              >
                <span className="grid h-full w-full place-items-center">
                  {checking ? (
                    <ModalSpinner className="text-sky-700" />
                  ) : (
                    "중복 검사"
                  )}
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              2~60자의 한글, 영문, 숫자를 사용할 수 있어요. 공백은 앞뒤만 제거돼요.
            </p>
          </div>

          {statusMessage ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
              {statusMessage}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (busy) return;
                onClose();
              }}
              disabled={busy}
              className="inline-flex h-10 min-w-[96px] items-center justify-center whitespace-nowrap rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveDisabled}
              aria-busy={saving}
              className="inline-flex h-10 min-w-[120px] items-center justify-center whitespace-nowrap rounded-lg bg-sky-400 px-4 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
            >
              <span className="grid h-full w-full place-items-center">
                {saving ? <ModalSpinner className="text-white" /> : "변경"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
