"use client";

type ProfileImageEditorControlsProps = {
  minZoom: number;
  maxZoom: number;
  zoom: number;
  isImageReady: boolean;
  isApplying: boolean;
  canApply: boolean;
  onZoomChange: (value: number) => void;
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
};

export function ProfileImageEditorControls({
  minZoom,
  maxZoom,
  zoom,
  isImageReady,
  isApplying,
  canApply,
  onZoomChange,
  onReset,
  onCancel,
  onApply,
}: ProfileImageEditorControlsProps) {
  return (
    <>
      <div className="mt-4 flex w-full items-center gap-3">
        <span className="text-xs text-gray-600">확대</span>
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={0.01}
          value={zoom}
          onChange={(event) => onZoomChange(parseFloat(event.target.value))}
          className="flex-1 accent-sky-500"
          disabled={!isImageReady || isApplying}
        />
        <span className="text-xs text-gray-600">{zoom.toFixed(1)}x</span>
      </div>

      <div className="mt-4 flex w-full items-center justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={!isImageReady || isApplying}
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isApplying}
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply}
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:opacity-60"
        >
          {isApplying ? "적용 중..." : "적용"}
        </button>
      </div>
    </>
  );
}
