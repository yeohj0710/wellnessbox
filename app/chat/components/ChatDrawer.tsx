"use client";

import { useState } from "react";
import { TrashIcon, PlusIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import type { ChatSession } from "@/types/chat";

const TOP_OFFSET =
  "var(--wb-top-offset, calc(3.5rem + var(--wb-safe-area-top, 0px)))";

interface ChatDrawerProps {
  sessions: ChatSession[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
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
  renameChat,
  newChat,
  drawerVisible,
  drawerOpen,
  closeDrawer,
  highlightId,
}: ChatDrawerProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  function commitRename() {
    if (editingId && editingTitle.trim()) {
      renameChat(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  }

  function cancelRename() {
    setEditingId(null);
    setEditingTitle("");
  }

  if (!drawerVisible) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-20"
      style={{ top: TOP_OFFSET }}
      role="dialog"
      aria-modal="true"
      onClick={() => {
        setMenuOpenId(null);
        closeDrawer();
      }}
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
              setMenuOpenId(null);
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
                    <div
                      className={`group relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
                        active ? "bg-slate-50" : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setMenuOpenId(null);
                        setActiveId(s.id);
                        closeDrawer();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setMenuOpenId(null);
                          setActiveId(s.id);
                          closeDrawer();
                        }
                      }}
                    >
                      <span
                        aria-hidden
                        className={`absolute left-0 top-0 h-full w-1 rounded-r ${
                          active ? "bg-violet-600" : "bg-transparent"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        {editingId === s.id ? (
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitRename();
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelRename();
                              }
                            }}
                            onBlur={() => commitRename()}
                            autoFocus
                          />
                        ) : (
                          <span
                            className={`truncate text-sm ${
                              active
                                ? "font-semibold text-slate-900"
                                : "text-slate-800"
                            } ${highlightId === s.id ? "animate-pulse" : ""}`}
                          >
                            {s.title || "새 상담"}
                          </span>
                        )}
                      </div>
                      {editingId !== s.id && (
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="메뉴"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === s.id ? null : s.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === s.id ? null : s.id);
                              }
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
                              setMenuOpenId(null);
                              deleteChat(s.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                setMenuOpenId(null);
                                deleteChat(s.id);
                              }
                            }}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </div>
                        </div>
                      )}
                      {menuOpenId === s.id && editingId !== s.id && (
                        <div className="absolute right-6 top-9 z-10 w-36 rounded-md border border-slate-200 bg-white shadow-md">
                          <button
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(s.id);
                              setEditingTitle(s.title || "");
                              setMenuOpenId(null);
                            }}
                          >
                            대화 제목 수정
                          </button>
                        </div>
                      )}
                    </div>
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
