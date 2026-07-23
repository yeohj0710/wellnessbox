"use client";

import { useState } from "react";
import { getColumnThumbnailPresentation } from "../_lib/column-presentation";

type ColumnThumbnailVariant = "feature" | "card" | "list" | "detail";

type ColumnThumbnailProps = {
  slug: string;
  title: string;
  tags: string[];
  coverImageUrl: string | null;
  alt: string;
  variant?: ColumnThumbnailVariant;
};

function getFrameClasses(variant: ColumnThumbnailVariant) {
  switch (variant) {
    case "feature":
      return "h-full w-full";
    case "list":
      return "h-full w-full";
    case "detail":
      return "h-44 sm:h-72";
    case "card":
    default:
      return "aspect-[16/9] w-full";
  }
}

function getPosterLabelClasses(variant: ColumnThumbnailVariant) {
  switch (variant) {
    case "feature":
      return "text-[1.15rem] sm:text-[1.5rem]";
    case "list":
      return "text-[0.72rem] sm:text-[0.95rem]";
    case "detail":
      return "text-[1.35rem] sm:text-[1.9rem]";
    case "card":
    default:
      return "text-[1.05rem]";
  }
}

function getPosterPaddingClasses(variant: ColumnThumbnailVariant) {
  switch (variant) {
    case "list":
      return "p-2 sm:p-3";
    case "feature":
    case "detail":
      return "p-4 sm:p-6";
    case "card":
    default:
      return "p-3.5 sm:p-4";
  }
}

export default function ColumnThumbnail({
  slug,
  title,
  tags,
  coverImageUrl,
  alt,
  variant = "card",
}: ColumnThumbnailProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const presentation = getColumnThumbnailPresentation({
    slug,
    title,
    tags,
    coverImageUrl,
  });
  const usePoster = imageFailed || presentation.mode === "poster" || !coverImageUrl;
  const isCompact = variant === "list";

  if (usePoster) {
    return (
      <div
        className={`relative isolate overflow-hidden rounded-[inherit] border ${getFrameClasses(variant)}`}
        style={{
          background: presentation.palette.background,
          borderColor: presentation.palette.border,
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.12) 48%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px opacity-80"
          style={{
            background: `linear-gradient(90deg, transparent, ${presentation.palette.line}, transparent)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-70 transition-transform duration-700 group-hover:scale-110"
          style={{
            background: `radial-gradient(circle at top right, ${presentation.palette.accent} 0%, rgba(255,255,255,0) 42%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-60 transition-transform duration-700 group-hover:scale-110"
          style={{
            background: `radial-gradient(circle at bottom left, ${presentation.palette.accent} 0%, rgba(255,255,255,0) 46%)`,
          }}
        />

        <div
          className={`absolute inset-0 flex flex-col justify-end ${getPosterPaddingClasses(variant)}`}
        >
          {isCompact ? null : (
            <span
              className="mb-2 block h-px w-8 opacity-70"
              style={{ background: presentation.palette.chipText }}
            />
          )}
          <span
            className={`block font-black leading-tight tracking-[-0.01em] ${getPosterLabelClasses(variant)}`}
            style={{ color: presentation.palette.title }}
          >
            {presentation.eyebrow}
          </span>
          {isCompact ? null : (
            <span
              className="mt-1 block text-[0.62rem] font-semibold tracking-[0.16em]"
              style={{ color: presentation.palette.body }}
            >
              웰니스박스 칼럼
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-[inherit] ${getFrameClasses(variant)}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverImageUrl}
        alt={alt}
        className="block h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
        style={{ objectPosition: presentation.objectPosition }}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}
