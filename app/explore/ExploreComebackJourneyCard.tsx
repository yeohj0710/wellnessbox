"use client";

import ComebackJourneyCard from "@/components/common/ComebackJourneyCard";
import { useComebackJourney } from "@/components/common/useComebackJourney";

type ExploreComebackJourneyCardProps = {
  categories: Array<{ id: number; name: string }>;
};

export default function ExploreComebackJourneyCard({
  categories,
}: ExploreComebackJourneyCardProps) {
  const { action, loading } = useComebackJourney({
    surface: "explore",
    categories,
  });

  if (loading || !action) return null;

  return (
    <div className="mx-auto mt-6 w-full max-w-[640px] px-3 sm:px-4">
      <ComebackJourneyCard action={action} />
    </div>
  );
}
