"use client";

import SmartRefillActionCard from "@/components/common/SmartRefillActionCard";

export default function MyDataSmartRefillCard({ orders }: { orders: unknown[] }) {
  return (
    <SmartRefillActionCard
      orders={orders}
      surface="my-data"
      enableRemoteContext
      className="mt-6"
      hideBehindBeta={false}
    />
  );
}
