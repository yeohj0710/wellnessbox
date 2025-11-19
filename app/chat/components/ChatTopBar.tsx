"use client";

import {
  Bars3Icon,
  PencilSquareIcon,
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

function Hint({ label, kbd }: { label: string; kbd?: string }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-50 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-black px-3 py-1 text-xs text-white shadow-lg opacity-0 mt-2 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <span className="font-semibold">{label}</span>
      {kbd && <span className="ml-2 text-slate-300">{kbd}</span>}
    </div>
  );
}

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
    <div className="sticky top-14 z-30 h-12 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="relative flex h-full items-center px-2 sm:px-4">
        <div className="relative group">
          <button
            onClick={openDrawer}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:bg-slate-100"
            aria-label="메뉴 열기"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <Hint label="메뉴" />
        </div>

        <div
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 truncate text-center text-sm font-semibold sm:text-base ${
            highlight ? "text-indigo-600" : "text-slate-700"
          } max-w-[60%] sm:max-w-[70%]`}
        >
          {title}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {titleError && (
            <div className="relative group">
              <button
                onClick={retryTitle}
                className="rounded-md p-2 text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50"
                aria-label="제목 다시 시도"
              >
                <ExclamationTriangleIcon className="h-5 w-5" />
              </button>
              <Hint label="제목 다시 시도" />
            </div>
          )}
          {titleLoading && (
            <ArrowPathIcon
              className="h-4 w-4 animate-spin text-slate-400"
              aria-hidden
            />
          )}
          <div className="relative group">
            <button
              onClick={newChat}
              className="rounded-md p-2 text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100"
              aria-label="새 채팅"
            >
              <PencilSquareIcon className="h-5 w-5" />
            </button>
            <Hint label="새 채팅" />
          </div>
          <div className="relative group">
            <button
              onClick={openSettings}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:bg-slate-100"
              aria-label="설정 열기"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
            <Hint label="설정" />
          </div>
        </div>
      </div>
    </div>
  );
}
