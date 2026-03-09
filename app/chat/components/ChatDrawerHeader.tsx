"use client";

import type { ChatDrawerHeaderProps } from "./ChatDrawer.types";

export default function ChatDrawerHeader({
  closeDrawer,
  newChat,
  resetMenu,
}: ChatDrawerHeaderProps) {
  return (
    <>
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
            resetMenu();
            closeDrawer();
          }}
        >
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none">
            +
          </span>
          <span className="pointer-events-none">새 상담</span>
        </button>
      </div>
    </>
  );
}
