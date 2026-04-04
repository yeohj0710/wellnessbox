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
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(circle at top right, ${presentation.palette.accent} 0%, rgba(255,255,255,0) 42%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at bottom left, ${presentation.palette.accent} 0%, rgba(255,255,255,0) 46%)`,
          }}
        />
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
