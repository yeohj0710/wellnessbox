"use client";

import type { ComponentType, SVGProps } from "react";
import Image from "next/image";
import { pretendard } from "@/app/fonts";

type LandingFeatureIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type LandingFeatureSectionConfig = {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
  sectionClassName: string;
  dividerClassName?: string;
  eyebrowClassName: string;
  accentClassName: string;
  iconFrameClassName: string;
  iconClassName: string;
  buttonClassName: string;
  icons: LandingFeatureIcon[];
};

function FeatureIcons({
  icons,
  iconFrameClassName,
  iconClassName,
}: Pick<
  LandingFeatureSectionConfig,
  "icons" | "iconFrameClassName" | "iconClassName"
>) {
  return (
    <div className="mt-4 flex gap-3">
      {icons.map((Icon, index) => (
        <div
          key={`${Icon.displayName ?? Icon.name ?? "icon"}-${index}`}
          className={`grid h-12 w-12 place-items-center rounded-xl border ${iconFrameClassName} ${iconClassName}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      ))}
    </div>
  );
}

export function LandingFeatureSection({
  config,
  onSelect7Day,
}: {
  config: LandingFeatureSectionConfig;
  onSelect7Day: () => void;
}) {
  const textColumnClassName = config.reverse
    ? "order-2 md:col-span-5 md:col-start-7"
    : "order-2 md:order-1 md:col-span-5 md:col-start-2";
  const imageColumnClassName = config.reverse
    ? "relative order-1 md:col-span-5 md:col-start-2"
    : "relative order-1 md:order-2 md:col-span-5 md:col-start-7";

  return (
    <section
      className={`relative w-full overflow-x-hidden ${config.sectionClassName} ${pretendard.className}`}
    >
      {config.dividerClassName ? (
        <div
          className={`pointer-events-none absolute -top-2 left-0 right-0 h-px ${config.dividerClassName}`}
        />
      ) : null}

      <div className="relative mx-auto max-w-[88rem] px-4 pb-10 pt-8 sm:px-6 md:px-8 md:pb-12 md:pt-10">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12 md:gap-8">
          <div className={textColumnClassName}>
            <p
              className={`text-[10px] font-semibold tracking-[0.18em] sm:text-xs ${config.eyebrowClassName}`}
            >
              {config.eyebrow}
            </p>
            <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F1222] sm:text-4xl md:text-5xl">
              {config.title} <span className={config.accentClassName}>{config.accent}</span>
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-[#6F7690] sm:text-sm md:text-base">
              {config.description}
            </p>

            <FeatureIcons
              icons={config.icons}
              iconFrameClassName={config.iconFrameClassName}
              iconClassName={config.iconClassName}
            />

            <div className="mt-6 h-px w-full max-w-md bg-[#E7E5FF]" />

            <div className="mt-6">
              <button
                className={`h-11 rounded-full px-6 text-sm font-semibold transition duration-300 hover:scale-105 sm:h-12 sm:px-7 sm:text-base ${config.buttonClassName}`}
                onClick={onSelect7Day}
              >
                7일치 구매하기
              </button>
            </div>
          </div>

          <div className={imageColumnClassName}>
            <div className="relative aspect-[613/511] w-full overflow-hidden rounded-[28px]">
              <Image
                src={config.imageSrc}
                alt={config.imageAlt}
                fill
                sizes="(min-width:1280px) 560px, (min-width:1024px) 520px, 80vw"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
