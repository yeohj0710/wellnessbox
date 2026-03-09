"use client";

import { EllipsisHorizontalIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { ChatDrawerSessionItemProps } from "./ChatDrawer.types";

export default function ChatDrawerSessionItem({
  session,
  active,
  highlightId,
  menuOpen,
  editing,
  editingTitle,
  setEditingTitle,
  onSelect,
  onToggleMenu,
  onStartEdit,
  onStartDelete,
  onCommitRename,
  onCancelRename,
}: ChatDrawerSessionItemProps) {
  return (
    <li className="relative">
      <div
        className={`group relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
          active ? "bg-slate-50" : ""
        }`}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onSelect();
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
          {editing ? (
            <input
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCommitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelRename();
                }
              }}
              onBlur={onCommitRename}
              autoFocus
            />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`truncate text-sm ${
                  active ? "font-semibold text-slate-900" : "text-slate-800"
                } ${highlightId === session.id ? "animate-pulse" : ""}`}
              >
                {session.title || "새 상담"}
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {session.appUserId ? "계정" : "기기"}
              </span>
            </div>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <div
              role="button"
              tabIndex={0}
              aria-label="메뉴"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onToggleMenu();
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
                onStartDelete();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onStartDelete();
                }
              }}
            >
              <TrashIcon className="h-5 w-5" />
            </div>
          </div>
        )}

        {menuOpen && !editing && (
          <div className="absolute right-6 top-9 z-10 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <button
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
            >
              대화 제목 수정
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
