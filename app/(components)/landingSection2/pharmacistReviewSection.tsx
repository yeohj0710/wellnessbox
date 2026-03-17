"use client";

import {
  BeakerIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  LandingFeatureSection,
  type LandingFeatureSectionConfig,
} from "./featureSection.shared";

interface PharmacistReviewSectionProps {
  onSelect7Day: () => void;
}

const PHARMACIST_REVIEW_SECTION_CONFIG: LandingFeatureSectionConfig = {
  eyebrow: "PHARMACIST-APPROVED",
  title: "전문가",
  accent: "상담 검토",
  description:
    "추천 영양소는 약국 소속 약사가 한 번 더 확인하고, 1:1 상담을 통해 최종 구성을 검토합니다.",
  imageSrc: "/landingPage2/pharmacist-review-hero.png",
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
};

export default function PharmacistReviewSection({
  onSelect7Day,
}: PharmacistReviewSectionProps) {
  return (
    <LandingFeatureSection
      config={PHARMACIST_REVIEW_SECTION_CONFIG}
      onSelect7Day={onSelect7Day}
    />
  );
}
