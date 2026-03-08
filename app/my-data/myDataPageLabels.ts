export function formatActorSourceBadge(isKakaoLoggedIn: boolean) {
  return isKakaoLoggedIn ? "카카오 계정" : "세션 기준";
}

export function formatPhoneLinkedBadge(phoneLinked: boolean) {
  return phoneLinked ? "전화번호 인증 연결됨" : "전화번호 인증 미연결";
}

export function formatAppUserBadge(hasAppUser: boolean) {
  return hasAppUser ? "앱 계정 연결됨" : "앱 계정 미연결";
}

export function formatTechnicalIdBadge(input: {
  deviceClientId: string | null;
  appUserId: string | null;
}) {
  return `연결 ID · clientId: ${input.deviceClientId ?? "-"} / appUserId: ${
    input.appUserId ?? "-"
  }`;
}

export function formatProfileDataBadge(hasProfileData: boolean) {
  return hasProfileData ? "프로필 데이터 있음" : "프로필 데이터 없음";
}

export function formatChatScopeLabel(scope: "account" | "device") {
  return scope === "account" ? "계정" : "기기";
}

export function formatChatStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "active") return "진행 중";
  if (normalized === "archived") return "보관됨";
  if (normalized === "deleted") return "삭제됨";
  if (normalized === "draft") return "임시 저장";
  return status || "상태 미기록";
}

export function formatChatRoleLabel(role: string) {
  const normalized = role.trim().toLowerCase();
  if (normalized === "user") return "사용자";
  if (normalized === "assistant") return "AI";
  if (normalized === "system") return "시스템";
  if (normalized === "tool") return "도구";
  return role || "역할 미기록";
}
