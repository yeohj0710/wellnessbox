"use client";

import { BoltIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import {
  LandingFeatureSection,
  type LandingFeatureSectionConfig,
} from "./featureSection.shared";

interface HealthTrackingSectionProps {
  onSelect7Day: () => void;
}

const HEALTH_TRACKING_SECTION_CONFIG: LandingFeatureSectionConfig = {
  eyebrow: "HEALTH TRACKING",
  title: "지속",
  accent: "체크와 피드백",
  description:
    "체감 기반 피드백과 복용 알림으로 복용 흐름을 놓치지 않고, 쌓인 기록으로 건강 변화를 계속 점검합니다. 약사도 그 피드백을 바탕으로 구성을 조정할 수 있습니다.",
  imageSrc: "/landingPage2/health-tracking-hero.png",
  imageAlt: "건강 모니터링 이미지",
  reverse: true,
  sectionClassName: "bg-gradient-to-b from-[#F6F3FF] via-[#F6F3FF]/50 to-[#F3F6FF]",
  eyebrowClassName: "text-[#4B63E6]",
  accentClassName: "text-[#3B5BFF]",
  iconFrameClassName:
    "border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)]",
  iconClassName: "text-[#4F68FF]",
  buttonClassName:
    "text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]",
  icons: [BoltIcon, ChartBarIcon],
};

export default function HealthTrackingSection({
  onSelect7Day,
}: HealthTrackingSectionProps) {
  return (
    <LandingFeatureSection
      config={HEALTH_TRACKING_SECTION_CONFIG}
      onSelect7Day={onSelect7Day}
    />
  );
}
