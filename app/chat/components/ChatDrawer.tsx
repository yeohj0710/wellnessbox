"use client";

import {
  ChatBubbleLeftRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { ChatSession } from "@/types/chat";

interface ChatDrawerProps {
  sessions: ChatSession[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  deleteChat: (id: string) => void;
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
  drawerVisible,
  drawerOpen,
  closeDrawer,
  highlightId,
}: ChatDrawerProps) {
  if (!drawerVisible) return null;
  return (
    <div
      className="fixed left-0 right-0 bottom-0 top-14 z-50"
      role="dialog"
      aria-modal="true"
      onClick={closeDrawer}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl border-r border-slate-200 transform transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <ChatBubbleLeftRightIcon className="h-6 w-6" /> 대화 기록
          </div>
          <button className="p-2 rounded-md hover:bg-slate-100" onClick={closeDrawer}>
            닫기
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">아직 대화 기록이 없습니다.</div>
          ) : (
            <ul className="p-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer hover:bg-slate-100 ${
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-600"
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
