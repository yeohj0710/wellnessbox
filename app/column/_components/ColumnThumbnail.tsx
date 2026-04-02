"use client";

import { useState } from "react";
import { getColumnThumbnailPresentation } from "../_lib/column-presentation";

type ColumnThumbnailProps = {
  slug: string;
  title: string;
  tags: string[];
  coverImageUrl: string | null;
  alt: string;
  variant?: "feature" | "card" | "list" | "detail";
};

function getFrameClasses(variant: NonNullable<ColumnThumbnailProps["variant"]>) {
  switch (variant) {
    case "feature":
      return "aspect-[5/4] w-full";
    case "list":
      return "aspect-[4/3] w-full";
    case "detail":
      return "h-44 sm:h-72";
    case "card":
    default:
      return "aspect-[16/9] w-full";
  }
}

function getTitleClasses(variant: NonNullable<ColumnThumbnailProps["variant"]>) {
  switch (variant) {
    case "feature":
      return "text-base font-black leading-[1.22] sm:text-[1.28rem]";
    case "detail":
      return "text-lg font-black leading-[1.18] sm:text-[1.9rem]";
    case "list":
      return "text-[0.95rem] font-black leading-[1.3] [display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:3]";
    case "card":
    default:
      return "text-lg font-black leading-[1.22] sm:text-xl";
  }
}

function getPosterPadding(variant: NonNullable<ColumnThumbnailProps["variant"]>) {
  switch (variant) {
    case "detail":
      return "p-4 sm:p-6";
    case "feature":
      return "p-3.5 sm:p-[1.125rem]";
    case "list":
      return "p-3";
    case "card":
    default:
      return "p-3.5 sm:p-4";
  }
}

function getPosterMeta(tags: string[], compact: boolean) {
  const visibleTags = tags.filter(Boolean).slice(0, compact ? 2 : 3);

  if (visibleTags.length > 1) {
    return visibleTags.join(" / ");
  }

  if (visibleTags.length === 1) {
    return `웰니스박스 ${visibleTags[0]}`;
  }

  return compact
    ? "웰니스박스 칼럼"
    : "복용 팁 / 생활 습관 / 성분 포인트";
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
  const isCompactPoster = variant === "list";
  const posterMeta = getPosterMeta(tags, isCompactPoster);

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
              "linear-gradient(145deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div
          className="absolute right-3 top-2 h-16 w-16 rounded-full blur-2xl sm:right-4 sm:top-3 sm:h-24 sm:w-24"
          style={{ backgroundColor: presentation.palette.accent }}
        />
        <div
          className="absolute -bottom-6 left-0 h-20 w-20 rounded-full blur-2xl sm:h-28 sm:w-28"
          style={{ backgroundColor: presentation.palette.accent }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${presentation.palette.line}, transparent)`,
          }}
        />
        <div
          className={`relative flex h-full flex-col justify-between ${getPosterPadding(variant)}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span
              className={`max-w-[70%] truncate rounded-full font-semibold ${
                isCompactPoster ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]"
              }`}
              style={{
                backgroundColor: presentation.palette.chipBackground,
                color: presentation.palette.chipText,
              }}
            >
              {presentation.eyebrow}
            </span>
            <span
              className={`rounded-full border px-2 py-1 font-semibold ${
                isCompactPoster ? "text-[9px]" : "text-[10px]"
              }`}
              style={{
                borderColor: presentation.palette.line,
                color: presentation.palette.body,
                background: "rgba(255,255,255,0.38)",
              }}
            >
              칼럼
            </span>
          </div>

          <div
            className={`relative overflow-hidden rounded-[1.15rem] border ${
              isCompactPoster ? "p-3" : "p-4 sm:p-[1.125rem]"
            }`}
            style={{
              background: presentation.palette.panel,
              borderColor: presentation.palette.line,
              boxShadow: "0 16px 34px -30px rgba(15,23,42,0.32)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${presentation.palette.line}, transparent)`,
              }}
            />
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: presentation.palette.chipText }}
              />
              <span
                className={`font-medium ${isCompactPoster ? "text-[10px]" : "text-[11px]"}`}
                style={{ color: presentation.palette.body }}
              >
                웰니스박스 에디토리얼
              </span>
            </div>

            <p className={`mt-3 ${getTitleClasses(variant)}`} style={{ color: presentation.palette.title }}>
              {title}
            </p>

            <p
              className={`mt-3 font-medium ${isCompactPoster ? "text-[10px] leading-4" : "text-[11px] leading-5"}`}
              style={{ color: presentation.palette.body }}
            >
              {posterMeta}
            </p>
          </div>
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
        className="block h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        style={{ objectPosition: presentation.objectPosition }}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}
