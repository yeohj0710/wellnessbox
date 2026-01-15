"use client";

import { useState } from "react";
import { TrashIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import type { ChatSession } from "@/types/chat";

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  function startDelete(session: ChatSession) {
    setMenuOpenId(null);
    setConfirmDeleteId(session.id);
    setConfirmDeleteTitle(session.title || "새 상담");
  }

  function cancelDelete() {
    if (deleting) return;
    setConfirmDeleteId(null);
    setConfirmDeleteTitle("");
  }

  async function confirmDelete() {
    if (!confirmDeleteId || deleting) return;
    setDeleting(true);
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setConfirmDeleteTitle("");
    try {
      await deleteChat(id);
    } finally {
      setDeleting(false);
    }
  }

  if (!drawerVisible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-20"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (confirmDeleteId) return;
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
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`truncate text-sm ${
                                active
                                  ? "font-semibold text-slate-900"
                                  : "text-slate-800"
                              } ${highlightId === s.id ? "animate-pulse" : ""}`}
                            >
                              {s.title || "새 상담"}
                            </span>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {s.appUserId ? "account" : "device"}
                            </span>
                          </div>
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
                                setMenuOpenId(
                                  menuOpenId === s.id ? null : s.id
                                );
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
                              startDelete(s);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                startDelete(s);
                              }
                            }}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </div>
                        </div>
                      )}

                      {menuOpenId === s.id && editingId !== s.id && (
                        <div className="absolute right-6 top-9 z-10 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
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

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={cancelDelete}
        >
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(2,6,23,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 ring-1 ring-red-100">
                  <TrashIcon className="h-5 w-5 text-red-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-slate-900">
                    대화를 삭제할까요?
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-800">
                      {confirmDeleteTitle}
                    </span>
                    <span> 을(를) 삭제하면 복구할 수 없습니다.</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 bg-slate-50/60 p-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
                onClick={cancelDelete}
                disabled={deleting}
              >
                취소
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden
                    />
                    <span>삭제</span>
                  </>
                ) : (
                  "삭제"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
