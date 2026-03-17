import GuestMemberBridgeCard from "@/components/common/GuestMemberBridgeCard";
import type { UserContextSummary } from "@/lib/chat/context";
import { resolveGuestMemberBridge } from "@/lib/member-bridge/engine";

export default function MyDataGuestConversionCard({
  summary,
  isKakaoLoggedIn,
}: {
  summary: UserContextSummary;
  isKakaoLoggedIn: boolean;
}) {
  if (isKakaoLoggedIn) return null;

  const model = resolveGuestMemberBridge({
    surface: "my-data-guest",
    summary,
  });

  return (
    <GuestMemberBridgeCard
      model={model}
      className="mt-6"
      hideBehindBeta={false}
    />
  );
}
