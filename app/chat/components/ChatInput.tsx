"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpIcon, PlusIcon, StopIcon } from "@heroicons/react/24/outline";

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  loading: boolean;
  suggestions?: string[];
  onSelectSuggestion?: (q: string) => void;
  onStop?: () => void;
  mode?: "fixed" | "embedded";
}

export default function ChatInput({
  input,
  setInput,
  sendMessage,
  loading,
  suggestions = [],
  onSelectSuggestion,
  onStop,
  mode = "fixed",
}: ChatInputProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [isMultiline, setIsMultiline] = useState(false);

  const lineH = 22;
  const padY = 10;
  const singleH = lineH + padY * 2;
  const maxLines = 6;
  const maxPx = useMemo(
    () => lineH * maxLines + padY * 2,
    [lineH, maxLines, padY]
  );

  const canSend = !!input.trim() && !loading;
  const align = isMultiline ? "self-end mb-1" : "self-center";
  const visibleSuggestions = suggestions.slice(0, 2);
  const isEmbedded = mode === "embedded";

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

  return (
    <div
      className={
        isEmbedded
          ? "w-full border-t border-slate-200 bg-white px-2 py-2"
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
        {visibleSuggestions.length > 0 && (
          <div
            className={
              isEmbedded
                ? "flex flex-wrap gap-1.5 px-1"
                : "mx-auto flex max-w-[720px] flex-wrap justify-center gap-2 px-1"
            }
          >
            {visibleSuggestions.map((q, i) => (
              <button
                key={i}
                className={`rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  isEmbedded ? "" : "sm:text-sm"
                }`}
                onClick={() => onSelectSuggestion && onSelectSuggestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div
          className={`rounded-[24px] border border-slate-300 bg-white shadow-sm focus-within:border-slate-400 ${
            isEmbedded ? "" : "mb-3"
          }`}
        >
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1">
            <button
              type="button"
              aria-label="추가기능"
              className={`grid h-8 w-8 place-items-center rounded-2xl text-slate-700 hover:bg-slate-100 ${align}`}
            >
              <PlusIcon className="h-4 w-4" />
            </button>

            <textarea
              ref={taRef}
              className="block w-full resize-none bg-transparent px-1.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              placeholder="무엇이든 물어보세요"
              value={input}
              rows={1}
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
                    : "bg-slate-400 cursor-not-allowed"
                } ${align}`}
                onClick={doSend}
                disabled={!canSend}
                title="전송"
              >
                <ArrowUpIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
