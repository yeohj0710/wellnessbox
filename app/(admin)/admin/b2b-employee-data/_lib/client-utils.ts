export function formatDateTime(raw: string | null | undefined) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("ko-KR");
}

export function formatRelativeTime(raw: string | null | undefined) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "방금";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "방금";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 172800) return "어제";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export function compactJson(value: unknown, maxLength = 280) {
  let text = "";
  try {
    text = JSON.stringify(value);
  } catch {
    return "(JSON 직렬화 실패)";
  }
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "(JSON 직렬화 실패)";
  }
}
