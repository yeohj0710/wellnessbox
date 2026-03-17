"use client";

import AdherenceLoopCard from "@/components/common/AdherenceLoopCard";
import type { OrderRecord } from "./orderComplete.types";

export default function OrderCompleteAdherenceLoopCard({
  order,
}: {
  order: OrderRecord;
}) {
  return (
    <AdherenceLoopCard
      orders={[order]}
      surface="order-complete"
      enableRemoteContext
      className="mt-4 mx-2 sm:mx-0"
      hideBehindBeta={false}
    />
  );
}
