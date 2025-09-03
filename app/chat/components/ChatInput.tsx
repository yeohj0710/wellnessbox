"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpIcon, PlusIcon, StopIcon } from "@heroicons/react/24/outline";

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  loading: boolean;
  suggestions?: string[];
  onSelectSuggestion?: (q: string) => void;
  onStop?: () => void;
}

export default function ChatInput({
  input,
  setInput,
  sendMessage,
  loading,
  suggestions = [],
  onSelectSuggestion,
  onStop,
}: ChatInputProps) {
  const [isMultiline, setIsMultiline] = useState(false);
  const canSend = !!input.trim() && !loading;
  const baseH = 10;
  const maxH = useMemo(
    () =>
      typeof window !== "undefined" && window.innerWidth < 640 ? 120 : 180,
    []
  );
  useEffect(() => {
    const onResize = () => setIsMultiline((p) => p);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <div
      className="mb-2 sm:mb-4 pointer-events-none fixed inset-x-0 bottom-0 z-10 px-3 sm:px-4"
      style={{ paddingBottom: `calc(8px + env(safe-area-inset-bottom))` }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[720px] sm:max-w-[740px] md:max-w-[760px] space-y-2">
        {suggestions.length > 0 && (
          <div className="mx-auto flex max-w-[720px] flex-wrap justify-center gap-2 px-1">
            {suggestions.map((q, i) => (
              <button
                key={i}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm hover:bg-slate-50"
                onClick={() => onSelectSuggestion && onSelectSuggestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 rounded-[28px] border border-slate-300 bg-white shadow-sm focus-within:border-slate-400">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5">
            <button
              type="button"
              aria-label="추가기능"
              className={`grid h-9 w-9 place-items-center rounded-2xl text-slate-700 hover:bg-slate-100 ${
                isMultiline ? "self-end mb-1" : "self-center"
              }`}
            >
              <PlusIcon className="h-5 w-5" />
            </button>

            <textarea
              className="block w-full resize-none bg-transparent px-1.5 text-[15px] leading-[22px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              style={{ minHeight: baseH, paddingTop: 10, paddingBottom: 10 }}
              placeholder="무엇이든 물어보세요"
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "0px";
                const next = Math.min(Math.max(t.scrollHeight, baseH), maxH);
                t.style.height = `${next}px`;
                setIsMultiline(next > baseH + 2);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !loading) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            {loading ? (
              <button
                className="grid h-9 w-9 place-items-center self-center rounded-full bg-black text-white hover:opacity-90"
                onClick={() => onStop && onStop()}
                title="정지"
              >
                <StopIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                className={`grid h-9 w-9 place-items-center self-center rounded-full text-white ${
                  canSend
                    ? "bg-black hover:opacity-90"
                    : "bg-slate-400 cursor-not-allowed"
                }`}
                onClick={() => sendMessage()}
                disabled={!canSend}
                title="전송"
              >
                <ArrowUpIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
