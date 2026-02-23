export function resolveProgressMessage(
  answeredCount: number,
  totalCount: number
): string {
  if (totalCount <= 0) return "";

  const remainingCount = Math.max(totalCount - answeredCount, 0);
  const progressRatio = answeredCount / totalCount;

  if (remainingCount === 0) return "";
  if (remainingCount === 1) return "마지막 문항이에요!";
  if (remainingCount === 2) return "거의 끝! 2문항만 더 하면 돼요.";
  if (remainingCount <= 3) return "마무리 단계예요. 조금만 더 힘내요!";

  if (progressRatio === 0) return "시작해볼까요?";
  if (progressRatio < 0.2) return "좋은 출발이에요!";
  if (progressRatio < 0.35) return "순조롭게 진행 중이에요.";
  if (progressRatio < 0.5) return "잘하고 있어요, 곧 절반이에요.";
  if (progressRatio < 0.55) return "절반 넘겼어요! 계속 가볼까요?";
  if (progressRatio < 0.7) return "벌써 절반을 넘겼어요.";
  if (progressRatio < 0.85) return "많이 왔어요! 막바지로 가는 중이에요.";
  return "거의 다 왔어요! 페이스 그대로 가면 돼요.";
}
