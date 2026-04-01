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
  gridClassName?: string;
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
    <div className="mt-5 flex gap-3 sm:gap-4">
      {icons.map((Icon, index) => (
        <div
          key={`${Icon.displayName ?? Icon.name ?? "icon"}-${index}`}
          className={`grid h-[3.35rem] w-[3.35rem] place-items-center rounded-[1.15rem] border ${iconFrameClassName} ${iconClassName} sm:h-[3.65rem] sm:w-[3.65rem]`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
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
  const gridClassName =
    config.gridClassName ??
    "grid grid-cols-1 items-center gap-7 md:grid-cols-2 md:gap-6 lg:gap-7 xl:gap-8";
  const imageColumnClassName = config.imageColumnClassName ?? "max-w-[29rem]";
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

      <div className="relative mx-auto max-w-[1000px] px-5 pb-9 pt-7 sm:px-6 md:px-7 md:pb-11 md:pt-9">
        <div className={gridClassName}>
          <div
            className={`${textColumnClassName} ${textColumnPositionClassName} mx-auto w-full max-w-[23.25rem]`}
          >
            <p
              className={`text-[10px] font-semibold tracking-[0.08em] sm:text-[0.8rem] ${config.eyebrowClassName}`}
            >
              {config.eyebrow}
            </p>
            <h3 className="mt-3 max-w-[22rem] text-balance text-[2rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#0F1222] sm:text-[2.35rem] md:text-[2.6rem]">
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
            <p className="mt-5 max-w-[24rem] text-pretty text-[14px] leading-[1.8] text-[#6F7690] sm:text-[14.5px] md:text-[15px]">
              {config.description}
            </p>

            <div className="mt-1">
              <FeatureIcons
                icons={config.icons}
                iconFrameClassName={config.iconFrameClassName}
                iconClassName={config.iconClassName}
              />
            </div>

            <div className="mt-6 h-px w-full max-w-[24rem] bg-[#D8E3FF]" />

            <div className="mt-6">
              <button
                className={`h-10 rounded-full px-5 text-[13px] font-semibold transition duration-300 hover:scale-105 sm:h-11 sm:px-6 sm:text-[14px] ${config.buttonClassName}`}
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
