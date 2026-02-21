"use client";

import { PencilSquareIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ChatSession } from "@/types/chat";
import type { MutableRefObject } from "react";

type DesktopChatDockSessionLayerProps = {
  sessionsLayerRef: MutableRefObject<HTMLDivElement | null>;
  sessionsOpen: boolean;
  sessions: ChatSession[];
  activeId: string | null;
  onClose: () => void;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onDeleteSession: (sessionId: string, title: string) => void;
};

export default function DesktopChatDockSessionLayer({
  sessionsLayerRef,
  sessionsOpen,
  sessions,
  activeId,
  onClose,
  onCreateSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
}: DesktopChatDockSessionLayerProps) {
  return (
    <div
      ref={sessionsLayerRef}
      className={`absolute inset-0 z-[80] transition-opacity duration-200 ${
        sessionsOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-[81] bg-slate-900/20"
        aria-label="대화목록 닫기"
      />

      <div
        className={`absolute inset-y-0 left-0 z-[82] w-[min(78%,260px)] border-r border-slate-200 bg-white transition-transform duration-200 ${
          sessionsOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-900">대화 목록</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="목록 닫기"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-slate-200 p-2">
          <button
            type="button"
            onClick={onCreateSession}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            + 새 상담 시작
          </button>
        </div>
        <ul className="max-h-[calc(100%-92px)] overflow-y-auto overscroll-contain p-2">
          {sessions.map((session) => (
            <li key={session.id} className="mb-1">
              <div
                className={`flex items-center gap-1 rounded-md border px-1 py-1 ${
                  activeId === session.id
                    ? "border-slate-200 bg-slate-100"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  className="min-w-0 flex-1 cursor-pointer rounded-md px-1.5 py-1 text-left"
                >
                  <span className="block truncate text-xs font-medium text-slate-800">
                    {session.title || "새 상담"}
                  </span>
                </button>

                {activeId === session.id && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                )}

                <button
                  type="button"
                  onClick={() => onRenameSession(session.id, session.title || "새 상담")}
                  className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100"
                  title="이름 변경"
                  aria-label="이름 변경"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSession(session.id, session.title || "새 상담")}
                  className="shrink-0 rounded p-1 text-rose-500 hover:bg-rose-50"
                  title="삭제"
                  aria-label="삭제"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
