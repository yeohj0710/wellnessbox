"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type DesktopChatDockPanelHeaderProps = {
  activeTitle: string;
  sessionsOpen: boolean;
  isDragging: boolean;
  titleLoading: boolean;
  titleError: boolean;
  onToggleSessions: () => void;
  onRetryTitle: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenFullscreen: () => void;
  onCloseDock: () => void;
  onStartDrag: (event: ReactPointerEvent<HTMLElement>) => void;
};

export default function DesktopChatDockPanelHeader({
  activeTitle,
  sessionsOpen,
  isDragging,
  titleLoading,
  titleError,
  onToggleSessions,
  onRetryTitle,
  onNewChat,
  onOpenSettings,
  onOpenFullscreen,
  onCloseDock,
  onStartDrag,
}: DesktopChatDockPanelHeaderProps) {
  return (
    <header
      onPointerDown={onStartDrag}
      className={`flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSessions}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="대화 목록"
          title="대화 목록"
        >
          {sessionsOpen ? (
            <XMarkIcon className="h-4 w-4" />
          ) : (
            <Bars3Icon className="h-4 w-4" />
          )}
        </button>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{activeTitle}</p>
          <p className="text-[11px] text-slate-500">건강·구매 흐름 통합 실행 어시스턴트</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {titleLoading && (
          <ArrowPathIcon className="h-4 w-4 animate-spin text-slate-500" aria-hidden />
        )}
        {titleError && (
          <button
            type="button"
            onClick={onRetryTitle}
            className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
            title="제목 다시 생성"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="새 상담"
          title="새 상담"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="설정"
          title="설정"
        >
          <Cog6ToothIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpenFullscreen}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="채팅 전체 화면"
          title="전체 화면 열기"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCloseDock}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="채팅 닫기"
          title="닫기"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
