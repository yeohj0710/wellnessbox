"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpIcon,
  ChevronUpIcon,
  PlusIcon,
  StopIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { ChatActionType } from "@/lib/chat/agent-actions";

type ChatQuickAction = {
  type: ChatActionType;
  label: string;
  reason?: string;
};

type ChatAgentExample = {
  id: string;
  label: string;
  prompt: string;
};

type UnifiedAction = {
  id: string;
  label: string;
  title?: string;
  kind: "quick" | "agent" | "suggestion";
  run: () => void;
};

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  loading: boolean;
  disabled?: boolean;
  quickActionLoading?: boolean;
  suggestions?: string[];
  onSelectSuggestion?: (q: string) => void;
  showAgentGuide?: boolean;
  agentExamples?: ChatAgentExample[];
  onSelectAgentExample?: (prompt: string) => void;
  onStop?: () => void;
  mode?: "fixed" | "embedded";
  quickActions?: ChatQuickAction[];
  onSelectQuickAction?: (type: ChatActionType) => void;
}

const AGENT_COACHMARK_DISMISS_KEY = "wb_chat_agent_coachmark_dismissed_v1";

function normalizeActionKey(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function trimChipLabel(label: string) {
  const text = label.trim();
  if (text.length <= 18) return text;
  return `${text.slice(0, 18)}...`;
}

export default function ChatInput({
  input,
  setInput,
  sendMessage,
  loading,
  disabled = false,
  quickActionLoading = false,
  suggestions = [],
  onSelectSuggestion,
  showAgentGuide = false,
  agentExamples = [],
  onSelectAgentExample,
  onStop,
  mode = "fixed",
  quickActions = [],
  onSelectQuickAction,
}: ChatInputProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [isMultiline, setIsMultiline] = useState(false);
  const [actionTrayOpen, setActionTrayOpen] = useState(false);
  const [coachmarkDismissed, setCoachmarkDismissed] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(false);

  const lineH = 22;
  const padY = 10;
  const singleH = lineH + padY * 2;
  const maxLines = 6;
  const maxPx = useMemo(
    () => lineH * maxLines + padY * 2,
    [lineH, maxLines, padY]
  );

  const canSend = !!input.trim() && !loading && !disabled;
  const align = isMultiline ? "self-end mb-1" : "self-center";
  const isEmbedded = mode === "embedded";
  const quickActionDisabled = loading || disabled || quickActionLoading;

  const unifiedActions = useMemo<UnifiedAction[]>(() => {
    const rows: UnifiedAction[] = [];
    const seen = new Set<string>();
    const pushUnique = (item: UnifiedAction) => {
      const key = normalizeActionKey(item.label);
      if (!key || seen.has(key)) return;
      seen.add(key);
      rows.push(item);
    };

    quickActions.slice(0, 4).forEach((action) => {
      pushUnique({
        id: `quick-${action.type}`,
        label: action.label,
        title: action.reason || action.label,
        kind: "quick",
        run: () => onSelectQuickAction?.(action.type),
      });
    });

    agentExamples.slice(0, 4).forEach((example) => {
      pushUnique({
        id: `agent-${example.id}`,
        label: example.label,
        title: example.prompt,
        kind: "agent",
        run: () => onSelectAgentExample?.(example.prompt),
      });
    });

    suggestions.slice(0, 2).forEach((suggestion, index) => {
      pushUnique({
        id: `suggest-${index}-${suggestion}`,
        label: trimChipLabel(suggestion),
        title: suggestion,
        kind: "suggestion",
        run: () => onSelectSuggestion?.(suggestion),
      });
    });

    return rows.slice(0, 8);
  }, [
    quickActions,
    agentExamples,
    suggestions,
    onSelectQuickAction,
    onSelectAgentExample,
    onSelectSuggestion,
  ]);

  const hasActionOptions = unifiedActions.length > 0;
  const shouldOfferAgentHint = showAgentGuide && hasActionOptions && !actionTrayOpen;
  const helperHint = useMemo(() => {
    if (input.trim().length > 0) return "";
    if (agentExamples[0]?.prompt) return `예: ${agentExamples[0].prompt}`;
    if (suggestions[0]) return `예: ${suggestions[0]}`;
    if (quickActions[0]?.label) return `예: ${quickActions[0].label} 해줘`;
    return "예: 장바구니 열어줘";
  }, [agentExamples, input, quickActions, suggestions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setCoachmarkDismissed(
        window.localStorage.getItem(AGENT_COACHMARK_DISMISS_KEY) === "1"
      );
    } catch {}
  }, []);

  useEffect(() => {
    if (!shouldOfferAgentHint || coachmarkDismissed || quickActionDisabled) {
      setShowCoachmark(false);
      return;
    }
    setShowCoachmark(true);
    const timer = window.setTimeout(() => setShowCoachmark(false), 9000);
    return () => window.clearTimeout(timer);
  }, [coachmarkDismissed, quickActionDisabled, shouldOfferAgentHint]);

  useEffect(() => {
    if (!loading) return;
    setActionTrayOpen(false);
  }, [loading]);

  useEffect(() => {
    const t = taRef.current;
    if (!t) return;
    t.style.lineHeight = `${lineH}px`;
    t.style.paddingTop = `${padY}px`;
    t.style.paddingBottom = `${padY}px`;
    t.style.height = `${singleH}px`;
    t.style.overflowY = "hidden";
  }, [singleH, lineH, padY]);

  useEffect(() => {
    const onResize = () => resizeToContent();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dismissCoachmark = () => {
    setShowCoachmark(false);
    setCoachmarkDismissed(true);
    try {
      window.localStorage.setItem(AGENT_COACHMARK_DISMISS_KEY, "1");
    } catch {}
  };

  const resizeToContent = () => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = "auto";
    const next = Math.min(t.scrollHeight, maxPx);
    t.style.height = `${next}px`;
    t.style.overflowY = t.scrollHeight > maxPx ? "auto" : "hidden";
    if (t.scrollHeight > maxPx) t.scrollTop = t.scrollHeight;
    setIsMultiline(next > singleH + 1);
  };

  const resetBox = () => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = `${singleH}px`;
    t.style.overflowY = "hidden";
    t.scrollTop = 0;
    setIsMultiline(false);
  };

  const doSend = () => {
    if (!canSend) return;
    sendMessage();
    resetBox();
  };

  const runUnifiedAction = (action: UnifiedAction) => {
    if (quickActionDisabled) return;
    action.run();
    setActionTrayOpen(false);
    setShowCoachmark(false);
  };

  return (
    <div
      className={
        isEmbedded
          ? "w-full px-2 py-2"
          : "mb-2 sm:mb-3 pointer-events-none fixed inset-x-0 bottom-0 z-10 px-3 sm:px-4"
      }
      style={
        isEmbedded
          ? undefined
          : { paddingBottom: `calc(6px + env(safe-area-inset-bottom))` }
      }
    >
      <div
        className={`pointer-events-auto w-full space-y-2 ${
          isEmbedded
            ? ""
            : "mx-auto max-w-[720px] sm:max-w-[740px] md:max-w-[760px]"
        }`}
      >
        {showCoachmark && (
          <div className="mx-auto flex max-w-[760px] justify-end px-1">
            <div className="relative max-w-[300px] rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-[0_14px_28px_rgba(15,23,42,0.35)]">
              <p className="text-[12px] font-semibold">
                말로 지시하면 실행까지 바로 도와드려요.
              </p>
              <p className="mt-0.5 text-[11px] text-slate-200">{helperHint}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium hover:bg-white/25"
                  onClick={() => {
                    setActionTrayOpen(true);
                    dismissCoachmark();
                  }}
                >
                  예시 보기
                </button>
                <button
                  type="button"
                  className="rounded-full p-0.5 text-slate-200 hover:bg-white/15 hover:text-white"
                  onClick={dismissCoachmark}
                  aria-label="힌트 닫기"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 bg-slate-900" />
            </div>
          </div>
        )}

        {!showCoachmark && shouldOfferAgentHint && (
          <div className="mx-auto max-w-[760px] px-1">
            <div className="flex items-center justify-between gap-2 rounded-full border border-sky-200 bg-sky-50/90 px-3 py-1.5">
              <p className="truncate text-[11px] font-medium text-sky-800">
                장바구니/주문/화면 이동까지 대화로 실행할 수 있어요
              </p>
              <button
                type="button"
                onClick={() => {
                  setActionTrayOpen(true);
                  setShowCoachmark(false);
                }}
                className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
              >
                예시
              </button>
            </div>
          </div>
        )}

        {actionTrayOpen && hasActionOptions && (
          <div className="mx-auto max-w-[760px] rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Quick Actions
              </p>
              <button
                type="button"
                onClick={() => setActionTrayOpen(false)}
                className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                aria-label="액션 닫기"
              >
                <ChevronUpIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {unifiedActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`max-w-[11rem] truncate rounded-full border px-3 py-1.5 text-xs font-medium sm:text-sm ${
                    action.kind === "quick"
                      ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                      : action.kind === "agent"
                        ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  } ${
                    quickActionDisabled ? "cursor-not-allowed opacity-60" : ""
                  }`}
                  onClick={() => runUnifiedAction(action)}
                  title={action.title || action.label}
                  disabled={quickActionDisabled}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {quickActionLoading && (
              <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
                요청 동작을 실행 중이에요...
              </p>
            )}
          </div>
        )}

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
              onClick={() => setActionTrayOpen((prev) => !prev)}
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
              onChange={(e) => setInput(e.target.value)}
              onInput={resizeToContent}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !loading) {
                  e.preventDefault();
                  doSend();
                }
              }}
            />

            {loading ? (
              <button
                className={`grid h-8 w-8 place-items-center rounded-full bg-black text-white hover:opacity-90 ${align}`}
                onClick={() => onStop && onStop()}
                title="정지"
              >
                <StopIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                className={`grid h-8 w-8 place-items-center rounded-full text-white ${
                  canSend
                    ? "bg-black hover:opacity-90"
                    : "cursor-not-allowed bg-slate-400"
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
