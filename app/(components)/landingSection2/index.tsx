"use client";

import HeroSection from "./heroSection";
import ProcessSection from "./processSection";
import AiAnalysisSection from "./aiAnalysisSection";
import PharmacistReviewSection from "./pharmacistReviewSection";
import CustomizedSupplySection from "./customizedSupplySection";
import HealthTrackingSection from "./healthTrackingSection";
import PricingSection from "./pricingSection";
import TestimonialsSection from "../testimonialsSection";

interface LandingSection2Props {
  onSelect7Day: () => void;
  onSubscribe: () => void;
}

export default function LandingSection2({ onSelect7Day, onSubscribe }: LandingSection2Props) {
  return (
    <>
      <HeroSection onSelect7Day={onSelect7Day} />
      <ProcessSection />
      <AiAnalysisSection onSelect7Day={onSelect7Day} />
      <PharmacistReviewSection onSelect7Day={onSelect7Day} />
      <CustomizedSupplySection onSelect7Day={onSelect7Day} />
      <HealthTrackingSection onSelect7Day={onSelect7Day} />
      <PricingSection onSelect7Day={onSelect7Day} onSubscribe={onSubscribe} />
      <TestimonialsSection />
    </>
  );
}
