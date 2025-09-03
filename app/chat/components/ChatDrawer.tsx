"use client";

import {
  ChatBubbleLeftRightIcon,
  TrashIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
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
      <aside
        className={`absolute inset-y-0 left-0 w-[280px] max-w-[72vw] transform border-r border-slate-200 bg-white transition-transform duration-200 sm:w-[300px] ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3">
          <div className="text-sm font-semibold text-slate-900">채팅</div>
          <button
            className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            onClick={closeDrawer}
          >
            닫기
          </button>
        </div>

        <div className="border-b border-slate-200 p-3">
          <button
            className="relative flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 active:bg-slate-100"
            onClick={() => {
              newChat();
              closeDrawer();
            }}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none">
              ＋
            </span>
            <span className="pointer-events-none">새 상담</span>
          </button>
        </div>

        <div className="flex h-[calc(100%-6rem)] flex-col">
          {sessions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              아직 대화 기록이 없습니다.
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto p-2">
              {sessions.map((s) => {
                const active = activeId === s.id;
                return (
                  <li key={s.id} className="relative">
                    <button
                      className={`group relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
                        active ? "bg-slate-50" : ""
                      }`}
                      onClick={() => {
                        setActiveId(s.id);
                        closeDrawer();
                      }}
                    >
                      <span
                        aria-hidden
                        className={`absolute left-0 top-0 h-full w-1 rounded-r ${
                          active ? "bg-violet-600" : "bg-transparent"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={`truncate text-sm ${
                            active
                              ? "font-semibold text-slate-900"
                              : "text-slate-800"
                          } ${highlightId === s.id ? "animate-pulse" : ""}`}
                        >
                          {s.title || "새 상담"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="메뉴"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              e.stopPropagation();
                          }}
                        >
                          <EllipsisHorizontalIcon className="h-5 w-5" />
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="삭제"
                          title="삭제"
                          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(s.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              deleteChat(s.id);
                            }
                          }}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
