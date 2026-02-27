"use client";

import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SyntheticEvent,
} from "react";

type ProfileImageEditorPreviewPaneProps = {
  objectUrl: string;
  isImageReady: boolean;
  isApplying: boolean;
  dragging: boolean;
  previewRef: RefObject<HTMLDivElement>;
  editorImageStyle: CSSProperties;
  livePreviewStyle: CSSProperties;
  onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event?: ReactPointerEvent<HTMLDivElement>) => void;
};

export function ProfileImageEditorPreviewPane({
  objectUrl,
  isImageReady,
  isApplying,
  dragging,
  previewRef,
  editorImageStyle,
  livePreviewStyle,
  onImageLoad,
  onDragStart,
  onDragMove,
  onDragEnd,
}: ProfileImageEditorPreviewPaneProps) {
  return (
    <div className="mt-4 flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
      <div
        ref={previewRef}
        className="relative h-[320px] w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 select-none"
        style={{ touchAction: "none" }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerLeave={onDragEnd}
      >
        {objectUrl ? (
          <>
            <img
              src={objectUrl}
              alt="편집 미리보기"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              onLoad={onImageLoad}
              style={editorImageStyle}
            />
            {!isImageReady ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                이미지 준비 중...
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            이미지 준비 중...
          </div>
        )}

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 rounded-2xl ring-2 ring-white/80" />
          <div
            className="absolute left-0 right-0 border-t border-white/40"
            style={{ top: "33.333%" }}
          />
          <div
            className="absolute left-0 right-0 border-t border-white/40"
            style={{ top: "66.666%" }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-white/40"
            style={{ left: "33.333%" }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-white/40"
            style={{ left: "66.666%" }}
          />
        </div>

        {dragging ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-sky-300/60" />
        ) : null}

        {isApplying ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/45 text-xs font-semibold text-sky-800">
            적용 중...
          </div>
        ) : null}
      </div>

      <div className="hidden sm:flex flex-col items-center gap-2 pt-2">
        <span className="text-xs font-semibold text-gray-700">최종 미리보기</span>
        <div className="relative h-32 w-32 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-sm">
          {objectUrl && isImageReady ? (
            <img
              src={objectUrl}
              alt="최종 적용 미리보기"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={livePreviewStyle}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 ring-2 ring-white/80" />
        </div>
        <p className="text-center text-[11px] leading-relaxed text-gray-500">
          오른쪽 원형 썸네일이 저장 결과에 그대로 반영됩니다.
        </p>
      </div>
    </div>
  );
}
