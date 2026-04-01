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
      return "max-w-[12.5rem] text-base font-black leading-tight sm:max-w-[13rem] sm:text-[1.32rem]";
    case "detail":
      return "max-w-[18rem] text-lg font-black leading-tight sm:text-[1.85rem]";
    case "list":
      return "max-w-[13rem] text-base font-black leading-tight sm:text-lg";
    case "card":
    default:
      return "max-w-[14rem] text-lg font-black leading-tight sm:text-xl";
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

  if (usePoster) {
    return (
      <div
        className={`relative overflow-hidden rounded-[inherit] border ${getFrameClasses(variant)}`}
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
              "radial-gradient(circle at top right, rgba(255,255,255,0.22), transparent 36%), radial-gradient(circle at bottom left, rgba(255,255,255,0.14), transparent 30%)",
          }}
        />
        <div
          className="absolute -right-8 top-6 h-28 w-28 rounded-full blur-2xl"
          style={{ backgroundColor: presentation.palette.accent }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 top-auto h-20"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.38) 100%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-3.5 text-white sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em]"
              style={{
                backgroundColor: presentation.palette.chipBackground,
                color: presentation.palette.chipText,
              }}
            >
              {presentation.eyebrow.toUpperCase()}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">
              WellnessBox
            </span>
          </div>
          <div>
            <p className={getTitleClasses(variant)}>{title}</p>
            {tags.length > 1 ? (
              <p className="mt-3 text-xs font-medium text-white/78">
                {tags.slice(0, 3).join(" · ")}
              </p>
            ) : null}
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
