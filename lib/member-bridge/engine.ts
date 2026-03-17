import type { UserContextSummary } from "@/lib/chat/context";

type BridgeTone = "slate" | "sky" | "emerald" | "amber";

export type GuestMemberBridgeSurface = "check-ai-result" | "my-data-guest";

export type GuestMemberBridgeModel = {
  tone: BridgeTone;
  badgeLabel: string;
  title: string;
  description: string;
  helper: string;
  reasonLines: string[];
  primaryActionLabel: string;
  secondaryAction?: {
    href: string;
    label: string;
  };
};

function uniqueStrings(items: string[], limit = items.length) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }

  return out;
}

export function resolveGuestMemberBridge(input: {
  surface: GuestMemberBridgeSurface;
  summary: UserContextSummary;
}) {
  const { surface, summary } = input;
  const topGoal = summary.profile?.goals[0] ?? "";
  const quickLabel = summary.latestQuick?.findings[0] ?? "";
  const assessLabel = summary.latestAssess?.findings[0] ?? "";
  const fitReason = summary.explainability.fitReasons[0] ?? "";
  const evidence = summary.consultationImpact.evidence[0] ?? "";
  const recentOrderCount = summary.recentOrders.length;

  if (surface === "check-ai-result") {
    return {
      tone: "sky",
      badgeLabel: "지금 저장해 두기",
      title: "이 결과를 그냥 닫기보다 계정에 이어 두면 다음 선택이 훨씬 덜 헷갈립니다",
      description:
        quickLabel || assessLabel
          ? `${quickLabel || assessLabel} 흐름이 이미 보였기 때문에, 로그인만 해두면 다음에 돌아와도 같은 고민에서 다시 시작하지 않아도 됩니다.`
          : "지금 막 확인한 결과와 답변 흐름은 회원으로 이어 두는 순간 다음 탐색, 상담, 재방문이 모두 훨씬 매끄러워집니다.",
      helper:
        "카카오로 이어 두면 지금 기기에서 본 검사 결과와 이후 상담 흐름이 계정 기준으로 묶여 다시 찾기 쉬워져요.",
      reasonLines: uniqueStrings(
        [
          quickLabel ? `방금 빠른검사에서 ${quickLabel} 방향이 보였어요.` : "",
          topGoal ? `현재 목표가 ${topGoal}라 다음 추천 맥락도 같이 이어 붙는 편이 좋아요.` : "",
          fitReason,
          evidence,
        ],
        3
      ),
      primaryActionLabel: "카카오로 이어서 저장하기",
      secondaryAction: {
        href: "/my-data",
        label: "로그인 후 내 데이터에서 이어보기",
      },
    } satisfies GuestMemberBridgeModel;
  }

  return {
    tone: recentOrderCount > 0 ? "emerald" : "amber",
    badgeLabel: "게스트 기록 이어 붙이기",
    title:
      recentOrderCount > 0
        ? "지금 보고 있는 주문·검사 기록을 계정에 붙여 두면 다른 기기에서도 그대로 이어집니다"
        : "지금까지 쌓인 검사·상담 흐름을 계정에 붙여 두면 다시 찾을 이유가 분명해집니다",
    description:
      recentOrderCount > 0
        ? "비회원으로도 여기까지는 볼 수 있지만, 로그인해 두면 주문 확인과 결과 흐름이 계정 기준으로 정리돼 다음 방문이 훨씬 안정적입니다."
        : "게스트 상태에서는 현재 기기 기준으로만 흐름이 이어질 수 있어요. 카카오로 연결해 두면 검사, 상담, 앞으로의 결과가 한 흐름으로 모입니다.",
    helper:
      "지금 로그인하는 이유는 가입 자체가 아니라, 이미 얻은 결과와 앞으로의 선택을 같은 계정 아래서 잃지 않고 이어가기 위해서예요.",
    reasonLines: uniqueStrings(
      [
        recentOrderCount > 0
          ? `최근 주문 ${recentOrderCount}건과 결과 흐름이 같이 보이고 있어요.`
          : "",
        quickLabel ? `빠른검사 결과 ${quickLabel} 흐름이 남아 있어요.` : "",
        assessLabel ? `정밀검사 결과 ${assessLabel} 축도 이어서 볼 수 있어요.` : "",
        fitReason,
      ],
      3
    ),
    primaryActionLabel: "카카오로 이어서 내 기록 만들기",
    secondaryAction: {
      href: "/chat?from=/my-data",
      label: "로그인 후 상담까지 이어보기",
    },
  } satisfies GuestMemberBridgeModel;
}
