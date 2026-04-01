"use client";

import { CpuChipIcon, HeartIcon } from "@heroicons/react/24/outline";
import {
  LandingFeatureSection,
  type LandingFeatureSectionConfig,
} from "./featureSection.shared";

interface AiAnalysisSectionProps {
  onSelect7Day: () => void;
}

const AI_ANALYSIS_SECTION_CONFIG: LandingFeatureSectionConfig = {
  eyebrow: "AI DATA ANALYSIS",
  title: "건강 데이터",
  accent: "분석",
  description:
    "건강검진 결과·복용중인 약·증상 등을 입력하면 AI가 필요한 영양소를 추천합니다.",
  imageSrc: "/landingPage2/ai-analysis-hero.png",
  imageAlt: "AI 건강 데이터 분석",
  gridClassName:
    "grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-7 lg:gap-8 xl:gap-10",
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
};

export default function AiAnalysisSection({
  onSelect7Day,
}: AiAnalysisSectionProps) {
  return (
    <LandingFeatureSection
      config={AI_ANALYSIS_SECTION_CONFIG}
      onSelect7Day={onSelect7Day}
    />
  );
}
