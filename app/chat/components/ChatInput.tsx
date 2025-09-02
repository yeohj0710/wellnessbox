"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  loading: boolean;
}

export default function ChatInput({
  input,
  setInput,
  sendMessage,
  loading,
}: ChatInputProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full px-4 pointer-events-none">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 pointer-events-auto">
          <textarea
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-300 max-h-40 min-h-[48px]"
            placeholder="궁금한 내용을 입력하고 Enter로 전송"
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            title="전송"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
