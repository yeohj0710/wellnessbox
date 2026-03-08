"use client";

import Image from "next/image";
import { CheckIcon } from "@heroicons/react/24/outline";
import { pretendard } from "../fonts";
import TestimonialsSection from "./testimonialsSection";
import {
  BRAND_LOGOS,
  FEATURE_SECTIONS,
  MARQUEE_WORDS,
  PRICING_PLANS,
  PROCESS_STEPS,
  type FeatureSectionConfig,
  type PricingPlanConfig,
  type ProcessStepConfig,
} from "./landingSection2.content";

interface LandingSection2Props {
  onSelect7Day: () => void;
  onSubscribe: () => void;
}

type ActionKind = "trial" | "subscribe";

function ActionButton({
  label,
  className,
  onClick,
  fullWidth = false,
}: {
  label: string;
  className: string;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      className={`h-11 rounded-full px-6 text-sm font-semibold transition duration-300 hover:scale-105 sm:h-12 sm:px-7 sm:text-base ${fullWidth ? "w-full" : ""} ${className}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function BrandLogoCloud() {
  return (
    <div className="mt-10 sm:mt-14">
      <ul className="flex flex-wrap items-center justify-center gap-x-0 gap-y-5 sm:gap-y-6">
        {BRAND_LOGOS.map((logo) => (
          <li
            key={logo.id}
            className={`shrink-0 flex items-center justify-center ${logo.spacingClassName}`}
          >
            <Image
              src={`/landingPage2/logos/${logo.id}.svg`}
              alt=""
              width={0}
              height={0}
              sizes="100vw"
              unoptimized
              className={`block h-[20px] w-auto brightness-0 invert sm:h-[22px] md:h-6 lg:h-7 ${logo.scaleClassName}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarqueeRibbon({
  topClassName,
  innerClassName,
  textClassName,
}: {
  topClassName: string;
  innerClassName: string;
  textClassName: string;
}) {
  return (
    <div className={topClassName}>
      <div className={innerClassName}>
        <div className={textClassName}>
          {MARQUEE_WORDS.map((word, index) => (
            <span key={`${word}-${index}`}>{word}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProcessStepCard({ step }: { step: ProcessStepConfig }) {
  const { Icon, emphasis, stepLabel, title } = step;

  return (
    <div className="rounded-xl bg-[#EEF3FF] px-4 py-5 shadow-[0_10px_24px_rgba(80,110,230,0.12)] ring-1 ring-white/70 sm:px-5">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/70 sm:h-20 sm:w-20 md:h-24 md:w-24">
        <Icon className="h-8 w-8 text-[#4F68FF] md:h-10 md:w-10" />
      </div>
      <div className="mx-auto mb-2 flex h-6 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-[10px] font-semibold text-white">
        {stepLabel}
      </div>
      <p className="text-center text-[13px] text-[#5B5A74] sm:text-sm">
        {title}
        <br />
        <span className="font-semibold text-[#1E2A78]">{emphasis}</span>
      </p>
    </div>
  );
}

function FeatureIcons(section: FeatureSectionConfig) {
  return (
    <div className="mt-4 flex gap-3">
      {section.icons.map((Icon, index) => (
        <div
          key={`${Icon.displayName ?? Icon.name ?? "icon"}-${index}`}
          className={`grid h-12 w-12 place-items-center rounded-xl border ${section.iconFrameClassName} ${section.iconClassName}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      ))}
    </div>
  );
}

function FeatureSectionBlock({
  section,
  onSelect7Day,
}: {
  section: FeatureSectionConfig;
  onSelect7Day: () => void;
}) {
  const textColumnClassName = section.reverse
    ? "order-2 md:col-span-5 md:col-start-7"
    : "order-2 md:order-1 md:col-span-5 md:col-start-2";
  const imageColumnClassName = section.reverse
    ? "relative order-1 md:col-span-5 md:col-start-2"
    : "relative order-1 md:order-2 md:col-span-5 md:col-start-7";

  return (
    <section
      className={`relative w-full overflow-x-hidden ${section.sectionClassName} ${pretendard.className}`}
    >
      {section.dividerClassName ? (
        <div
          className={`pointer-events-none absolute -top-2 left-0 right-0 h-px ${section.dividerClassName}`}
        />
      ) : null}
      <div className="relative mx-auto max-w-[88rem] px-4 pb-10 pt-8 sm:px-6 md:px-8 md:pb-12 md:pt-10">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12 md:gap-8">
          <div className={textColumnClassName}>
            <p className={`text-[10px] font-semibold tracking-[0.18em] sm:text-xs ${section.eyebrowClassName}`}>
              {section.eyebrow}
            </p>
            <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F1222] sm:text-4xl md:text-5xl">
              {section.title} <span className={section.accentClassName}>{section.accent}</span>
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-[#6F7690] sm:text-sm md:text-base">
              {section.description}
            </p>
            {FeatureIcons(section)}
            <div className="mt-6 h-px w-full max-w-md bg-[#E7E5FF]" />
            <div className="mt-6">
              <ActionButton
                label="7일치 구매하기"
                className={section.buttonClassName}
                onClick={onSelect7Day}
              />
            </div>
          </div>

          <div className={imageColumnClassName}>
            <div className="relative aspect-[613/511] w-full overflow-hidden rounded-[28px]">
              <Image
                src={section.imageSrc}
                alt={section.imageAlt}
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

function PlanFeatureItem({
  text,
  plan,
}: {
  text: string;
  plan: PricingPlanConfig;
}) {
  return (
    <div className={`flex items-center gap-3 ${plan.featureTextClassName}`}>
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${plan.checkBadgeClassName}`}
      >
        <CheckIcon className={`h-4 w-4 ${plan.checkIconClassName}`} />
      </span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function PricingPlanCard({
  plan,
  onAction,
}: {
  plan: PricingPlanConfig;
  onAction: (action: ActionKind) => void;
}) {
  const isTrial = plan.ctaAction === "trial";

  return (
    <div
      className={`relative h-full w-[16rem] rounded-[28px] px-5 py-7 sm:w-[18rem] sm:px-6 sm:py-9 md:w-[19rem] md:px-7 md:py-10 lg:w-[20rem] ${plan.cardClassName} ${isTrial ? "flex flex-col" : ""}`}
    >
      <div
        className={`absolute -top-3 left-4 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${plan.badges.left.className}`}
      >
        {plan.badges.left.label}
      </div>
      <div
        className={`absolute -top-3 right-4 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${plan.badges.right.className}`}
      >
        {plan.badges.right.label}
      </div>

      <h3 className="text-base font-bold sm:text-lg">{plan.name}</h3>
      {isTrial ? (
        <div className="mt-2 flex items-end gap-2">
          <span className="text-[34px] font-extrabold leading-none tracking-tight sm:text-[38px] md:text-5xl">
            {plan.price}
          </span>
          <span className="pb-1 text-xl sm:text-2xl md:text-3xl">₩</span>
          {plan.unit ? (
            <span className={`pb-[6px] text-xs sm:text-sm ${plan.unitMuted ? "text-white/90" : ""}`}>
              {plan.unit}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 text-[34px] font-extrabold leading-none tracking-tight sm:text-[38px] md:text-5xl">
          {plan.price}
          <span className="align-top text-xl sm:text-2xl md:text-3xl">₩</span>
          {plan.unit ? (
            <span className="ml-1 text-xs font-bold text-[#5B5A74] sm:text-sm md:text-base">
              {plan.unit}
            </span>
          ) : null}
        </div>
      )}

      <div className={`mt-6 space-y-3 border-t pt-5 ${plan.dividerClassName}`}>
        {plan.features.map((feature) => (
          <PlanFeatureItem key={feature} text={feature} plan={plan} />
        ))}
      </div>

      <div className={isTrial ? "mt-auto pt-7" : "mt-7"}>
        <ActionButton
          label={plan.ctaLabel}
          className={plan.buttonClassName}
          fullWidth
          onClick={() => onAction(plan.ctaAction)}
        />
      </div>
    </div>
  );
}

export default function LandingSection2({
  onSelect7Day,
  onSubscribe,
}: LandingSection2Props) {
  const handlePricingAction = (action: ActionKind) => {
    if (action === "subscribe") {
      onSubscribe();
      return;
    }

    onSelect7Day();
  };

  return (
    <>
      <section
        className={`relative min-h-[86vh] w-full overflow-hidden bg-gradient-to-b from-white via-[#EEF2FF] to-[#C7D2FE] ${pretendard.className} sm:min-h-[90vh] md:min-h-screen`}
      >
        <div className="pointer-events-none absolute -left-1/3 -top-1/4 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(closest-side,rgba(99,140,255,0.18),transparent)] sm:h-[24rem] sm:w-[24rem] md:h-[32rem] md:w-[32rem]" />
        <div className="pointer-events-none absolute -right-1/4 bottom-[-15%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(142,122,255,0.22),transparent)] sm:h-[30rem] sm:w-[30rem] md:h-[40rem] md:w-[40rem]" />

        <div className="relative mx-auto max-w-[90rem] px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:px-10 md:pb-28 md:pt-36">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div className="flex">
              <div className="h-5 w-5 rounded-full bg-sky-400 sm:h-6 sm:w-6" />
              <div className="-ml-2 h-5 w-5 rounded-full bg-sky-500 sm:h-6 sm:w-6" />
              <div className="-ml-2 h-5 w-5 rounded-full bg-indigo-500 sm:h-6 sm:w-6" />
            </div>
            <span className="text-xs text-[#5B5A74] sm:text-sm md:text-base">
              웰니스박스, 당신만을 위한 프리미엄 맞춤 영양제
            </span>
          </div>

          <h1 className="mt-4 flex flex-col items-center gap-2 text-center font-extrabold tracking-tight text-[#0F1222] sm:mt-6 sm:gap-3 md:gap-4">
            <span className="block text-3xl leading-[1.4] sm:hidden">
              내 몸에 딱 맞는
              <br />
              “AI+약사 설계”
            </span>
            <span className="hidden text-4xl leading-none sm:block md:hidden">
              내 몸에 딱 맞는 “AI+약사 설계”
            </span>
            <span className="hidden text-5xl leading-none md:block lg:hidden">
              내 몸에 딱 맞는 “AI+약사 설계”
            </span>
            <span className="hidden text-7xl leading-none lg:block">
              내 몸에 딱 맞는 “AI+약사 설계”
            </span>
            <span className="bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF] bg-clip-text text-3xl leading-none text-transparent sm:text-4xl md:text-5xl lg:text-7xl">
              Premium 건강 솔루션
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-center text-[13px] text-[#7A8094] sm:mt-7 sm:max-w-2xl sm:text-sm md:text-base">
            웰니스박스(Wellnessbox)는 개인의 증상·복용약·검진 데이터를 기반으로
            필요한 <br className="hidden md:block" />
            영양성분을 추천해 안전하게 제공하는 서비스입니다.
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-11 items-center justify-center rounded-full bg-white px-5 text-center leading-tight text-[#3B5BFF] shadow-[0_6px_20px_rgba(67,103,230,0.20)] ring-1 ring-white transition duration-300 sm:h-12 sm:px-6">
              7일 단위 시작으로 부담 없이!
            </div>
            <ActionButton
              label="7일치 구매하기"
              className="text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]"
              onClick={onSelect7Day}
            />
          </div>

          <BrandLogoCloud />
        </div>
      </section>

      <section
        className={`relative isolate min-h-[90vh] w-full overflow-visible bg-gradient-to-b from-[#C7D2FE] via-[#DDE7FF] to-white ${pretendard.className} sm:min-h-[92vh] md:min-h-screen`}
      >
        <div className="absolute inset-x-0 z-10 -top-4 pointer-events-none overflow-visible">
          <div className="relative mx-auto min-h-[9.5rem] md:min-h-[11rem]">
            <MarqueeRibbon
              topClassName="absolute left-1/2 -translate-x-1/2 -top-2 w-[220vw] rotate-[-8deg]"
              innerClassName="mx-auto flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,120,255,0.35)] sm:h-12"
              textClassName="flex gap-10 whitespace-nowrap text-xs font-semibold tracking-widest text-white/95 sm:text-sm"
            />
            <MarqueeRibbon
              topClassName="absolute left-1/2 top-6 -translate-x-1/2 w-[230vw] rotate-[8deg] opacity-90"
              innerClassName="mx-auto flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-[#4AA8FF] to-[#6C4DFF] shadow-[0_8px_24px_rgba(86,120,255,0.28)] sm:h-11"
              textClassName="flex gap-10 whitespace-nowrap text-[11px] font-semibold tracking-widest text-white/95 sm:text-xs"
            />
          </div>
        </div>

        <div className="relative mx-auto max-w-[90rem] px-4 pb-12 pt-16 sm:px-6 sm:pb-14 sm:pt-20 md:px-10 md:pb-16 md:pt-24">
          <div className="relative mx-auto -mt-8 w-full max-w-[72rem] rounded-[28px] bg-white px-4 py-10 shadow-[0_24px_64px_-18px_rgba(67,103,230,0.22)] ring-1 ring-white/60 sm:-mt-12 sm:px-6 md:-mt-16 md:px-8 md:py-12">
            <div className="text-center">
              <p className="text-[11px] font-semibold tracking-widest text-[#4B63E6] sm:text-xs">
                PERSONALIZED PROCESS
              </p>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#0F1222] sm:text-2xl md:text-3xl">
                맞춤 프로세스 <span className="text-[#3B5BFF]">안내</span>
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
              {PROCESS_STEPS.map((step) => (
                <ProcessStepCard key={step.stepLabel} step={step} />
              ))}
            </div>

            <div className="mt-8 flex justify-center md:mt-10">
              <div className="h-7 w-7 rotate-45 rounded-[6px] border border-[#D3DBFF] bg-white shadow-[0_6px_18px_rgba(80,110,230,0.16)]" />
            </div>
          </div>
        </div>
      </section>

      {FEATURE_SECTIONS.map((section) => (
        <FeatureSectionBlock
          key={`${section.eyebrow}-${section.title}`}
          section={section}
          onSelect7Day={onSelect7Day}
        />
      ))}

      <section
        className={`relative isolate -mt-px w-full overflow-visible bg-gradient-to-b from-[#F3F6FF] via-[#E6ECFF] to-white pt-20 sm:pt-24 md:pt-28 ${pretendard.className}`}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-14 bg-gradient-to-b from-[#F3F6FF] to-transparent" />
        <div className="absolute inset-x-0 top-4 pointer-events-none overflow-visible sm:top-6 md:top-8">
          <div className="relative mx-auto h-[5.5rem]">
            <MarqueeRibbon
              topClassName="absolute left-1/2 -translate-x-1/2 -top-2 w-[230vw] rotate-[-8deg]"
              innerClassName="mx-auto flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,120,255,0.35)]"
              textClassName="flex gap-10 whitespace-nowrap text-xs font-semibold tracking-widest text-white/95 sm:text-sm"
            />
            <MarqueeRibbon
              topClassName="absolute left-1/2 top-5 -translate-x-1/2 w-[235vw] rotate-[7deg] opacity-95"
              innerClassName="mx-auto flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#4AA8FF] to-[#6C4DFF] shadow-[0_8px_24px_rgba(86,120,255,0.28)]"
              textClassName="flex gap-10 whitespace-nowrap text-xs font-semibold tracking-widest text-white/95 sm:text-sm"
            />
          </div>
        </div>

        <div className="relative mx-auto max-w-[48rem] px-4 pb-12 pt-12 sm:max-w-[50rem] sm:px-6 sm:pb-14 sm:pt-14 md:max-w-[52rem] md:px-8 md:pb-16 md:pt-16">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-[#4B63E6] sm:text-sm">
              START NOW
            </p>
            <h2 className="mt-2 text-2xl font-extrabold leading-[1.28] tracking-tight text-[#0F1222] sm:text-3xl sm:leading-[1.32] md:text-4xl md:leading-[1.36] lg:text-5xl">
              지금 시작하고,
              <br />
              <span className="bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF] bg-clip-text text-transparent">
                7일치 복용
              </span>
              을 경험해보세요!
            </h2>
            <p className="mt-4 text-[13px] text-[#6F7690] sm:text-sm md:text-base">
              7일 간편 체험 후, 나에게 꼭 맞으면 정기구독으로 건강 습관을
              이어가세요.
            </p>
          </div>

          <div className="relative mt-8 sm:mt-10">
            <div className="pointer-events-none absolute -left-10 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.6),transparent)] blur-sm" />
            <div className="pointer-events-none absolute -right-8 bottom-3 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.55),transparent)] blur-sm" />
            <div className="mx-auto grid grid-cols-1 items-center justify-center justify-items-center gap-6 md:grid-flow-col md:auto-cols-max md:grid-cols-none md:items-stretch md:justify-items-stretch md:gap-8">
              {PRICING_PLANS.map((plan) => (
                <PricingPlanCard
                  key={plan.name}
                  plan={plan}
                  onAction={(action) => {
                    if (action === "subscribe") {
                      onSubscribe();
                      return;
                    }

                    onSelect7Day();
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSection />
    </>
  );
}
