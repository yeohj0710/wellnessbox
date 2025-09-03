"use client";

import {
  ChatBubbleLeftRightIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type { ChatSession } from "@/types/chat";

interface ChatDrawerProps {
  sessions: ChatSession[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  deleteChat: (id: string) => void;
  newChat: () => void;
  drawerVisible: boolean;
  drawerOpen: boolean;
  closeDrawer: () => void;
  highlightId?: string | null;
}

export default function ChatDrawer({
  sessions,
  activeId,
  setActiveId,
  deleteChat,
  newChat,
  drawerVisible,
  drawerOpen,
  closeDrawer,
  highlightId,
}: ChatDrawerProps) {
  if (!drawerVisible) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-20"
      role="dialog"
      aria-modal="true"
      onClick={closeDrawer}
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute inset-y-0 left-0 w-72 max-w-[60vw] transform border-r border-slate-200 bg-white/90 shadow-xl backdrop-blur-md transition-transform duration-200 sm:w-80 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <ChatBubbleLeftRightIcon className="h-6 w-6" /> 대화 기록
          </div>
          <button
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
            onClick={closeDrawer}
          >
            닫기
          </button>
        </div>
        <div className="border-b border-slate-200 p-3">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-700 backdrop-blur hover:bg-slate-100"
            onClick={() => {
              newChat();
              closeDrawer();
            }}
          >
            <PlusIcon className="h-5 w-5" /> 새 상담
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              아직 대화 기록이 없습니다.
            </div>
          ) : (
            <ul className="p-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100 ${
                    activeId === s.id ? "bg-slate-100" : ""
                  }`}
                  onClick={() => {
                    setActiveId(s.id);
                    closeDrawer();
                  }}
                >
                  <span
                    className={`flex-1 truncate text-sm text-slate-800 ${
                      highlightId === s.id ? "animate-pulse" : ""
                    }`}
                  >
                    {s.title || "새 상담"}
                  </span>
                  <button
                    className="p-1 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(s.id);
                    }}
                    title="삭제"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
