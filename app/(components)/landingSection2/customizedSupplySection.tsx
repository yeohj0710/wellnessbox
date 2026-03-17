"use client";

import { ChartBarIcon, CubeIcon } from "@heroicons/react/24/outline";
import {
  LandingFeatureSection,
  type LandingFeatureSectionConfig,
} from "./featureSection.shared";

interface CustomizedSupplySectionProps {
  onSelect7Day: () => void;
}

const CUSTOMIZED_SUPPLY_SECTION_CONFIG: LandingFeatureSectionConfig = {
  eyebrow: "CUSTOMIZED 7-DAY SUPPLY",
  title: "맞춤",
  accent: "소분 패키지",
  description:
    "일주일 복용을 기준으로 7일치씩 소분 포장해 보내드립니다. 처음 시작하는 분도 최소 단위로 부담 없이 시도할 수 있습니다.",
  imageSrc: "/landingPage2/customized-supply-hero.png",
  imageAlt: "맞춤 소분 패키지",
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
};

export default function CustomizedSupplySection({
  onSelect7Day,
}: CustomizedSupplySectionProps) {
  return (
    <LandingFeatureSection
      config={CUSTOMIZED_SUPPLY_SECTION_CONFIG}
      onSelect7Day={onSelect7Day}
    />
  );
}
