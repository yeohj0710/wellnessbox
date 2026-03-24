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
  const textColumnClassName = config.reverse ? "order-2 md:order-2" : "order-2 md:order-1";
  const imageColumnClassName = config.reverse ? "order-1 md:order-1" : "order-1 md:order-2";

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
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className={`${textColumnClassName} mx-auto w-full max-w-[31rem]`}>
            <p
              className={`text-[10px] font-semibold tracking-[0.18em] sm:text-xs ${config.eyebrowClassName}`}
            >
              {config.eyebrow}
            </p>
            <h3 className="mt-2 text-[2.15rem] font-extrabold tracking-tight text-[#0F1222] sm:text-[2.6rem] md:text-[3rem]">
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
            <p className="mt-4 max-w-[29rem] text-[13px] leading-7 text-[#6F7690] sm:text-sm md:text-[15px]">
              {config.description}
            </p>

            <div className="mt-5">
              <FeatureIcons
                icons={config.icons}
                iconFrameClassName={config.iconFrameClassName}
                iconClassName={config.iconClassName}
              />
            </div>

            <div className="mt-6 h-px w-full max-w-[18.5rem] bg-[#E7E5FF]" />

            <div className="mt-6">
              <button
                className={`h-11 rounded-full px-6 text-sm font-semibold transition duration-300 hover:scale-105 sm:h-12 sm:px-7 sm:text-base ${config.buttonClassName}`}
                onClick={onSelect7Day}
              >
                7일 체험하기
              </button>
            </div>
          </div>

          <div className={`${imageColumnClassName} relative mx-auto w-full max-w-[36rem]`}>
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
