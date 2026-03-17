"use client";

import AdherenceLoopCard from "@/components/common/AdherenceLoopCard";

export default function MyDataAdherenceLoopCard({ orders }: { orders: unknown[] }) {
  return (
    <AdherenceLoopCard
      orders={orders}
      surface="my-data"
      enableRemoteContext
      className="mt-6"
      hideBehindBeta={false}
    />
  );
}
