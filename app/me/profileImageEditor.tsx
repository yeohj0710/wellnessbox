"use client";

import { useEffect } from "react";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import { ProfileImageEditorControls } from "./profileImageEditor.controls";
import { ProfileImageEditorPreviewPane } from "./profileImageEditor.previewPane";
import { useProfileImageEditorController } from "./useProfileImageEditorController";

export type ProfileImageEditorProps = {
  file: File;
  onCancel: () => void;
  onApply: (blob: Blob, previewUrl: string) => void | Promise<void>;
};

export function ProfileImageEditor({
  file,
  onCancel,
  onApply,
}: ProfileImageEditorProps) {
  const previewSize = 320;
  const miniPreviewSize = 128;
  const canvasSize = 640;
  const minZoom = 1;
  const maxZoom = 3.2;
  const defaultZoom = 1.1;

  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(true);

  const {
    objectUrl,
    isImageReady,
    zoom,
    dragging,
    isApplying,
    previewRef,
    editorImageStyle,
    livePreviewStyle,
    resetView,
    handleApply,
    handleImageLoad,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleZoomChange,
    canApply,
  } = useProfileImageEditorController({
    file,
    previewSize,
    miniPreviewSize,
    canvasSize,
    minZoom,
    maxZoom,
    defaultZoom,
    onApply,
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="w-full max-w-[520px] rounded-2xl bg-white p-5 shadow-xl"
        ref={panelRef}
        style={panelStyle}
      >
        <div
          className={`flex items-start justify-between gap-3 touch-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={handleDragPointerDown}
        >
          <div>
            <h2 className="text-lg font-bold text-gray-900">프로필 이미지 편집</h2>
            <p className="mt-1 text-xs text-gray-600">
              드래그로 위치를 맞추고, 휠 또는 슬라이더로 확대/축소를 조절하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            닫기
          </button>
        </div>

        <ProfileImageEditorPreviewPane
          objectUrl={objectUrl}
          isImageReady={isImageReady}
          isApplying={isApplying}
          dragging={dragging}
          previewRef={previewRef}
          editorImageStyle={editorImageStyle}
          livePreviewStyle={livePreviewStyle}
          onImageLoad={handleImageLoad}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />

        <ProfileImageEditorControls
          minZoom={minZoom}
          maxZoom={maxZoom}
          zoom={zoom}
          isImageReady={isImageReady}
          isApplying={isApplying}
          canApply={canApply}
          onZoomChange={handleZoomChange}
          onReset={resetView}
          onCancel={onCancel}
          onApply={handleApply}
        />
      </div>
    </div>
  );
}
