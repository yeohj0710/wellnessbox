import type { ComponentType, SVGProps } from "react";
import {
  BeakerIcon,
  BoltIcon,
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  CpuChipIcon,
  CubeIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

export type LandingIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type BrandLogoConfig = {
  id: number;
  spacingClassName: string;
  scaleClassName: string;
};

export type ProcessStepConfig = {
  stepLabel: string;
  title: string;
  emphasis: string;
  Icon: LandingIcon;
};

export type FeatureSectionConfig = {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  reverse: boolean;
  sectionClassName: string;
  dividerClassName: string;
  eyebrowClassName: string;
  accentClassName: string;
  iconFrameClassName: string;
  iconClassName: string;
  buttonClassName: string;
  icons: LandingIcon[];
};

export type PricingPlanConfig = {
  name: string;
  price: string;
  unit?: string;
  unitMuted?: boolean;
  badges: {
    left: {
      label: string;
      className: string;
    };
    right: {
      label: string;
      className: string;
    };
  };
  cardClassName: string;
  dividerClassName: string;
  checkBadgeClassName: string;
  checkIconClassName: string;
  featureTextClassName: string;
  buttonClassName: string;
  features: string[];
  ctaLabel: string;
  ctaAction: "trial" | "subscribe";
};

export const BRAND_LOGOS: BrandLogoConfig[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  spacingClassName: [2, 3].includes(index) ? "-mx-2 sm:-mx-1 md:mx-0" : "mx-4 sm:mx-6 md:mx-8",
  scaleClassName: [2, 3].includes(index) ? "scale-75" : "scale-125",
}));

export const MARQUEE_WORDS = Array.from({ length: 10 }, () => "WELLNESS BOX");

export const PROCESS_STEPS: ProcessStepConfig[] = [
  { stepLabel: "STEP 01", title: "건강 데이터", emphasis: "분석", Icon: ChartBarIcon },
  {
    stepLabel: "STEP 02",
    title: "전문가 상담",
    emphasis: "검토",
    Icon: ChatBubbleBottomCenterTextIcon,
  },
  { stepLabel: "STEP 03", title: "맞춤 소분", emphasis: "패키징", Icon: CubeIcon },
  { stepLabel: "STEP 04", title: "지속 케어", emphasis: "피드백", Icon: BoltIcon },
];

export const FEATURE_SECTIONS: FeatureSectionConfig[] = [
  {
    eyebrow: "AI DATA ANALYSIS",
    title: "건강 데이터",
    accent: "분석",
    description:
      "건강검진 결과·복용중인 약·증상 등을 입력하면 AI가 필요한 영양소를 추천합니다.",
    imageSrc: "/landingPage2/ai-analysis-hero.png?v=20260217",
    imageAlt: "AI 건강 데이터 분석",
    reverse: false,
    sectionClassName: "bg-gradient-to-b from-white via-[#F3F6FF] to-white",
    dividerClassName:
      "bg-gradient-to-r from-transparent via-[#9DB7FF] to-transparent opacity-70",
    eyebrowClassName: "text-[#4B63E6]",
    accentClassName: "text-[#3B5BFF]",
    iconFrameClassName:
      "border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)]",
    iconClassName: "text-[#4F68FF]",
    buttonClassName:
      "text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]",
    icons: [HeartIcon, CpuChipIcon],
  },
  {
    eyebrow: "PHARMACIST-APPROVED",
    title: "전문가",
    accent: "상담 검토",
    description:
      "추천된 영양제를 약국 소속 약사가 이중 확인하고, 1:1 상담을 통해 최종 처방합니다.",
    imageSrc: "/landingPage2/pharmacist-review-hero.png?v=20260217",
    imageAlt: "전문가 상담 검토",
    reverse: true,
    sectionClassName: "bg-gradient-to-b from-white via-[#F6F3FF] to-white",
    dividerClassName:
      "bg-gradient-to-r from-transparent via-[#B7A9FF] to-transparent opacity-70",
    eyebrowClassName: "text-[#7A68FF]",
    accentClassName: "text-[#6C4DFF]",
    iconFrameClassName:
      "border-[#E6E1FF] bg-white shadow-[0_8px_22px_rgba(108,77,255,0.15)]",
    iconClassName: "text-[#6C4DFF]",
    buttonClassName:
      "text-white bg-gradient-to-r from-[#6C4DFF] to-[#8A6BFF] shadow-[0_10px_28px_rgba(108,77,255,0.30)]",
    icons: [BeakerIcon, UserCircleIcon, MagnifyingGlassIcon],
  },
  {
    eyebrow: "CUSTOMIZED 7-DAY SUPPLY",
    title: "맞춤",
    accent: "소분 패키징",
    description:
      "하루 복용량 기준으로 7일치씩 소분 포장해 배송합니다. 사용자는 최소 7일부터 부담 없이 시작할 수 있습니다.",
    imageSrc: "/landingPage2/customized-supply-hero.png?v=20260217",
    imageAlt: "맞춤 소분 패키징",
    reverse: false,
    sectionClassName: "bg-gradient-to-b from-white via-[#F6F3FF]/60 to-[#F6F3FF]",
    dividerClassName:
      "bg-gradient-to-r from-transparent via-[#B7A9FF] to-transparent opacity-70",
    eyebrowClassName: "text-[#4B63E6]",
    accentClassName: "text-[#3B5BFF]",
    iconFrameClassName:
      "border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)]",
    iconClassName: "text-[#4F68FF]",
    buttonClassName:
      "text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]",
    icons: [CubeIcon, ChartBarIcon],
  },
  {
    eyebrow: "HEALTH TRACKING",
    title: "지속",
    accent: "케어 및 피드백",
    description:
      "챗봇 기반 피드백과 복약 알림으로 복용을 돕고, 앱에서 건강 변화를 모니터링합니다. 약사가 피드백을 받아 패키지를 조정합니다.",
    imageSrc: "/landingPage2/health-tracking-hero.png?v=20260217",
    imageAlt: "건강 모니터링 이미지",
    reverse: true,
    sectionClassName: "bg-gradient-to-b from-[#F6F3FF] via-[#F6F3FF]/50 to-[#F3F6FF]",
    dividerClassName: "",
    eyebrowClassName: "text-[#4B63E6]",
    accentClassName: "text-[#3B5BFF]",
    iconFrameClassName:
      "border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)]",
    iconClassName: "text-[#4F68FF]",
    buttonClassName:
      "text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]",
    icons: [BoltIcon, ChartBarIcon],
  },
];

export const PRICING_PLANS: PricingPlanConfig[] = [
  {
    name: "7일치 구매",
    price: "700",
    unit: "부터",
    unitMuted: true,
    badges: {
      left: { label: "간편한 체험", className: "bg-white/90 text-[#5A46FF] shadow-sm" },
      right: { label: "베스트", className: "bg-[#7C6CFF] text-white" },
    },
    cardClassName:
      "bg-gradient-to-b from-[#5B4BFF] to-[#5637FF] text-white shadow-[0_28px_80px_-20px_rgba(77,76,220,0.55)]",
    dividerClassName: "border-white/20",
    checkBadgeClassName: "bg-white/15",
    checkIconClassName: "text-white",
    featureTextClassName: "text-white",
    buttonClassName:
      "bg-white text-[#3B2BFF] shadow-[0_8px_22px_rgba(255,255,255,0.35)]",
    features: ["7일치 구매하기", "7일 이내로 취소 가능", "언제든지 정기구독 전환"],
    ctaLabel: "구매하기",
    ctaAction: "trial",
  },
  {
    name: "스탠다드",
    price: "19,000",
    unit: "/ 월",
    badges: {
      left: { label: "첫 달 75% 할인", className: "bg-[#EAF0FF] text-[#3B5BFF]" },
      right: { label: "정기구독", className: "bg-[#6C4DFF] text-white" },
    },
    cardClassName:
      "bg-white text-[#0F1222] shadow-[0_28px_80px_-22px_rgba(67,103,230,0.35)] ring-1 ring-[#E7E9FF]",
    dividerClassName: "border-[#E9ECFF]",
    checkBadgeClassName: "bg-[#EEF3FF]",
    checkIconClassName: "text-[#3B5BFF]",
    featureTextClassName: "text-[#28314A]",
    buttonClassName:
      "bg-white text-[#0F1222] ring-1 ring-[#E7E9FF] shadow-[0_8px_22px_rgba(20,30,60,0.08)]",
    features: [
      "첫 달 75% 파격적 할인",
      "원하는 날짜에 맞춰 구독",
      "무료 AI 약사 상담",
      "정기 구독자를 위한 배송 편의",
    ],
    ctaLabel: "구독하기",
    ctaAction: "subscribe",
  },
];
