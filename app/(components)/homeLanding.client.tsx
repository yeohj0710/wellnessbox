"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLoading } from "@/components/common/loadingContext.client";
import ComingSoonPopup from "@/components/modal/comingSoonPopup";
import LandingSection2 from "@/app/(components)/landingSection2";
import { navigateWithFallback } from "@/lib/client/navigation-fallback";

export default function HomeLanding() {
  const router = useRouter();
  const { showLoading } = useLoading();
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [, startTransition] = useTransition();

  const handle7Day = () => {
    showLoading();
    startTransition(() => {
      navigateWithFallback(router, "/?package=7#home-products");
    });
  };

  return (
    <>
      <ComingSoonPopup
        open={isComingSoonOpen}
        onClose={() => setIsComingSoonOpen(false)}
      />
      <LandingSection2
        onSelect7Day={handle7Day}
        onSubscribe={() => setIsComingSoonOpen(true)}
      />
    </>
  );
}
