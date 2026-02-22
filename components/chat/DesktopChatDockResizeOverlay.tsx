"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { DockResizeEdge } from "./DesktopChatDock.layout";

type DesktopChatDockResizeOverlayProps = {
  showResizeHint: boolean;
  onDismissResizeHint: () => void;
  onStartResize: (
    event: ReactPointerEvent<HTMLElement>,
    edge: DockResizeEdge
  ) => void;
};

export default function DesktopChatDockResizeOverlay({
  showResizeHint,
  onDismissResizeHint,
  onStartResize,
}: DesktopChatDockResizeOverlayProps) {
  return (
    <>
      {showResizeHint ? (
        <div className="pointer-events-none absolute left-3 top-14 z-[65] hidden sm:block">
          <div className="pointer-events-auto relative max-w-[250px] rounded-xl border border-sky-200 bg-white px-3 py-2 shadow-[0_14px_32px_rgba(15,23,42,0.16)]">
            <p className="text-[12px] font-semibold text-slate-800">
              채팅창이 좁으면 늘려서 사용해보세요!
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-600">
              왼쪽 위 모서리를 드래그하면 대화와 추천 목록이 더 잘 보여요.
            </p>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={onDismissResizeHint}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
              >
                확인
              </button>
            </div>
            <span className="absolute -left-1 top-5 h-2.5 w-2.5 rotate-45 border-b border-l border-sky-200 bg-white" />
          </div>
        </div>
      ) : null}
      <div
        aria-hidden
        onPointerDown={(event) => onStartResize(event, "left")}
        className="absolute -left-1 top-0 z-40 hidden h-full w-3 cursor-ew-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => onStartResize(event, "right")}
        className="absolute -right-1 top-0 z-40 hidden h-full w-3 cursor-ew-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => onStartResize(event, "top")}
        className="absolute left-0 -top-1 z-40 hidden h-3 w-full cursor-ns-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => onStartResize(event, "bottom")}
        className="absolute -bottom-1 left-0 z-40 hidden h-3 w-full cursor-ns-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => onStartResize(event, "top-left")}
        className="absolute -left-1 -top-1 z-50 hidden h-4 w-4 cursor-nwse-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => onStartResize(event, "top-right")}
        className="absolute -right-1 -top-1 z-50 hidden h-4 w-4 cursor-nesw-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => onStartResize(event, "bottom-left")}
        className="absolute -bottom-1 -left-1 z-50 hidden h-4 w-4 cursor-nesw-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => onStartResize(event, "bottom-right")}
        className="absolute -bottom-1 -right-1 z-50 hidden h-4 w-4 cursor-nwse-resize touch-none sm:block"
      />
    </>
  );
}
