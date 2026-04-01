"use client";

import { ArrowUpIcon, PlusIcon, StopIcon } from "@heroicons/react/24/outline";
import { ChatInputActionAssist } from "./ChatInputActionAssist";
import type { ChatInputProps } from "./chatInput.types";
import { useChatInputController } from "./useChatInputController";

export default function ChatInput(props: ChatInputProps) {
  const {
    input,
    setInput,
    loading,
    disabled = false,
    quickActionLoading = false,
    onStop,
  } = props;
  const {
    taRef,
    canSend,
    align,
    isEmbedded,
    actionTrayOpen,
    showCoachmark,
    coachmarkDurationMs,
    showHintPill,
    hasActionOptions,
    quickActionDisabled,
    helperHint,
    unifiedActions,
    doSend,
    resizeToContent,
    dismissCoachmark,
    hideCoachmark,
    openActionTray,
    closeActionTray,
    toggleActionTray,
    runUnifiedAction,
  } = useChatInputController(props);

  return (
    <div
      className={
        isEmbedded
          ? "w-full px-2 py-2"
          : "mb-2 sm:mb-3 pointer-events-none fixed inset-x-0 bottom-0 z-10 px-3 sm:px-4"
      }
      style={isEmbedded ? undefined : { paddingBottom: `calc(6px + env(safe-area-inset-bottom))` }}
    >
      <div
        className={`pointer-events-auto w-full space-y-2 ${
          isEmbedded ? "" : "mx-auto max-w-[720px] sm:max-w-[740px] md:max-w-[760px]"
        } relative`}
      >
        <ChatInputActionAssist
          showCoachmark={showCoachmark}
          coachmarkDurationMs={coachmarkDurationMs}
          showHintPill={showHintPill}
          helperHint={helperHint}
          actionTrayOpen={actionTrayOpen}
          hasActionOptions={hasActionOptions}
          quickActionDisabled={quickActionDisabled}
          quickActionLoading={quickActionLoading}
          unifiedActions={unifiedActions}
          onOpenTray={openActionTray}
          onCloseTray={closeActionTray}
          onHideCoachmark={hideCoachmark}
          onDismissCoachmark={dismissCoachmark}
          onRunUnifiedAction={runUnifiedAction}
        />

        <div
          className={`rounded-[24px] border border-slate-300 bg-white shadow-sm focus-within:border-slate-400 ${
            isEmbedded ? "" : "mb-3"
          }`}
        >
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 px-2 py-1 sm:gap-2 sm:px-2.5">
            <button
              type="button"
              aria-label={actionTrayOpen ? "실행 예시 닫기" : "실행 예시 열기"}
              className={`relative grid h-8 w-8 place-items-center rounded-2xl text-slate-700 hover:bg-slate-100 ${align}`}
              onClick={toggleActionTray}
            >
              <PlusIcon className="h-4 w-4" />
              {hasActionOptions && !actionTrayOpen && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-500" />
              )}
            </button>

            <textarea
              ref={taRef}
              className="block w-full resize-none bg-transparent px-1.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              placeholder="메시지를 입력하세요"
              value={input}
              rows={1}
              disabled={disabled}
              onChange={(event) => setInput(event.target.value)}
              onInput={resizeToContent}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !loading) {
                  event.preventDefault();
                  doSend();
                }
              }}
            />

            {loading ? (
              <button
                className={`grid h-8 w-8 place-items-center rounded-full bg-black text-white hover:opacity-90 ${align}`}
                onClick={() => onStop?.()}
                title="정지"
              >
                <StopIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                className={`grid h-8 w-8 place-items-center rounded-full text-white ${
                  canSend ? "bg-black hover:opacity-90" : "cursor-not-allowed bg-slate-400"
                } ${align}`}
                onClick={doSend}
                disabled={!canSend}
                title="전송"
              >
                <ArrowUpIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {!input.trim() && (
            <div className="px-4 pb-2">
              <p className="truncate text-[11px] text-slate-400">{helperHint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
