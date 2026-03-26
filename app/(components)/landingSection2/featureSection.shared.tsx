"use client";

import type { ComponentType, SVGProps } from "react";
import Image from "next/image";
import { pretendard } from "@/app/fonts";

type LandingFeatureIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type LandingFeatureSectionConfig = {
  eyebrow: string;
  title: string;
  accent: string;
  accentFirst?: boolean;
  description: string;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
  imageColumnClassName?: string;
  imageFrameClassName?: string;
  imageClassName?: string;
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
    <div className="mt-6 flex gap-4 sm:gap-5">
      {icons.map((Icon, index) => (
        <div
          key={`${Icon.displayName ?? Icon.name ?? "icon"}-${index}`}
          className={`grid h-14 w-14 place-items-center rounded-2xl border ${iconFrameClassName} ${iconClassName} sm:h-[4.5rem] sm:w-[4.5rem]`}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
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
  const textColumnClassName = config.reverse ? "order-2 md:order-2" : "order-2 md:order-1";
  const textColumnPositionClassName = config.reverse
    ? "md:ml-auto md:mr-0"
    : "md:mr-auto md:ml-0";
  const imageOrderClassName = config.reverse ? "order-1 md:order-1" : "order-1 md:order-2";
  const imageColumnClassName = config.imageColumnClassName ?? "max-w-[36rem]";
  const imageFrameClassName = config.imageFrameClassName ?? "aspect-[613/511]";
  const imageClassName = config.imageClassName ?? "object-contain";

  return (
    <section
      className={`relative w-full overflow-x-hidden ${config.sectionClassName} ${pretendard.className}`}
    >
      {config.dividerClassName ? (
        <div
          className={`pointer-events-none absolute -top-2 left-0 right-0 h-px ${config.dividerClassName}`}
        />
      ) : null}

      <div className="relative mx-auto max-w-[1200px] px-6 pb-10 pt-8 sm:px-8 md:px-10 md:pb-12 md:pt-10">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14 lg:gap-16 xl:gap-20">
          <div
            className={`${textColumnClassName} ${textColumnPositionClassName} mx-auto w-full max-w-[28rem]`}
          >
            <p
              className={`text-[11px] font-semibold tracking-[0.04em] sm:text-[0.95rem] ${config.eyebrowClassName}`}
            >
              {config.eyebrow}
            </p>
            <h3 className="mt-4 max-w-[24rem] text-balance text-[2.35rem] font-extrabold leading-[1.06] tracking-[-0.045em] text-[#0F1222] sm:text-[2.85rem] md:text-[3.12rem]">
              {config.accentFirst ? (
                <>
                  <span className={config.accentClassName}>{config.accent}</span>{" "}
                  <span>{config.title}</span>
                </>
              ) : (
                <>
                  <span>{config.title}</span>{" "}
                  <span className={config.accentClassName}>{config.accent}</span>
                </>
              )}
            </h3>
            <p className="mt-6 max-w-[26.5rem] text-pretty text-[15px] leading-[1.9] text-[#6F7690] sm:text-[1.02rem] md:text-[1.08rem]">
              {config.description}
            </p>

            <div className="mt-1">
              <FeatureIcons
                icons={config.icons}
                iconFrameClassName={config.iconFrameClassName}
                iconClassName={config.iconClassName}
              />
            </div>

            <div className="mt-8 h-px w-full max-w-[27rem] bg-[#D8E3FF]" />

            <div className="mt-8">
              <button
                className={`h-11 rounded-full px-6 text-sm font-semibold transition duration-300 hover:scale-105 sm:h-12 sm:px-7 sm:text-base ${config.buttonClassName}`}
                onClick={onSelect7Day}
              >
                7일 체험하기
              </button>
            </div>
          </div>

          <div className={`${imageOrderClassName} relative mx-auto w-full ${imageColumnClassName}`}>
            <div className={`relative w-full overflow-hidden rounded-[28px] ${imageFrameClassName}`}>
              <Image
                src={config.imageSrc}
                alt={config.imageAlt}
                fill
                sizes="(min-width:1280px) 560px, (min-width:1024px) 520px, 80vw"
                className={imageClassName}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
