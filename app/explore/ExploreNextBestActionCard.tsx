"use client";

import NextBestActionCard from "@/components/common/NextBestActionCard";
import { useNextBestAction } from "@/components/common/useNextBestAction";
import type { NextBestActionCategory } from "@/lib/next-best-action/engine";

type ExploreNextBestActionCardProps = {
  categories: NextBestActionCategory[];
};

export default function ExploreNextBestActionCard({
  categories,
}: ExploreNextBestActionCardProps) {
  const { action, loading } = useNextBestAction({
    surface: "explore",
    categories,
  });

  if (loading || !action) return null;

  return (
    <div className="mx-auto mt-6 w-full max-w-[640px] px-3 sm:px-4">
      <NextBestActionCard action={action} />
    </div>
  );
}
