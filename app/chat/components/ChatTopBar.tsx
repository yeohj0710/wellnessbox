"use client";

import {
  Bars3Icon,
  PlusIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type Props = {
  openDrawer: () => void;
  newChat: () => void;
  openSettings: () => void;
  title: string;
  titleLoading: boolean;
  titleError: boolean;
  retryTitle: () => void | Promise<void>;
  highlight: boolean;
};

export default function ChatTopBar({
  openDrawer,
  newChat,
  openSettings,
  title,
  titleLoading,
  titleError,
  retryTitle,
  highlight,
}: Props) {
  return (
    <div className="sticky top-14 flex h-12 items-center gap-2 border-b border-slate-200 bg-white/80 px-2 backdrop-blur-md sm:px-4">
      <button
        onClick={openDrawer}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
        aria-label="메뉴 열기"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
      <div
        className={`flex-1 truncate text-center text-sm font-semibold sm:text-base ${
          highlight ? "text-indigo-600" : "text-slate-700"
        }`}
      >
        {title}
      </div>
      <div className="flex items-center gap-1">
        {titleError && (
          <button
            onClick={retryTitle}
            className="rounded-md p-2 text-rose-600 hover:bg-rose-50"
            aria-label="제목 다시 시도"
          >
            <ExclamationTriangleIcon className="h-5 w-5" />
          </button>
        )}
        {titleLoading && (
          <ArrowPathIcon
            className="h-5 w-5 animate-spin text-slate-400"
            aria-hidden
          />
        )}
        <button
          onClick={newChat}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label="새 상담"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
        <button
          onClick={openSettings}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label="설정 열기"
        >
          <Cog6ToothIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
