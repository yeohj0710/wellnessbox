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
  title: "케어 및 피드백",
  accent: "지속",
  accentFirst: true,
  description:
    "챗봇 기반 피드백 시스템과 복약 알림으로 복용을 돕고, 웹·앱에서 건강 변화를 모니터링합니다. 약사가 피드백을 받아 패키지를 조정하면서 진짜 나에게 맞는 조합을 찾아갑니다.",
  imageSrc: "/landingPage2/health-tracking-hero.png",
  imageAlt: "지속 케어 및 피드백",
  reverse: true,
  imageColumnClassName: "max-w-[35rem]",
  imageFrameClassName: "aspect-[596/637]",
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
