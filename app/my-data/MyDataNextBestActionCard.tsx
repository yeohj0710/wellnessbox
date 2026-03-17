"use client";

import NextBestActionCard from "@/components/common/NextBestActionCard";
import { useNextBestAction } from "@/components/common/useNextBestAction";

export default function MyDataNextBestActionCard() {
  const { action, loading } = useNextBestAction({
    surface: "my-data",
  });

  if (loading || !action) return null;

  return (
    <NextBestActionCard
      action={action}
      className="mt-6"
      hideBehindBeta={false}
    />
  );
}
