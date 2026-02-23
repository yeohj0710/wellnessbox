export function normalizeKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

export function toKrw(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

export function extractDayCount(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();

  const dayMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:\uC77C|day|days)/i);
  if (dayMatch) {
    const parsed = Number.parseFloat(dayMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const packageLike = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:capsules?|caps?|tablets?|tabs?|\uCEA1\uC290|\uC815|\uD3EC|\uAC1C)/i
  );
  if (packageLike) {
    const parsed = Number.parseFloat(packageLike[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 365) return parsed;
  }

  return null;
}

export function isExact7DayOption(
  optionType: string | null,
  capacity: string | null
) {
  const option = optionType || "";
  const cap = capacity || "";
  if (/7\s*(?:\uC77C|day|days)/i.test(option) || /7\s*(?:\uC77C|day|days)/i.test(cap)) {
    return true;
  }
  if (extractDayCount(option) === 7) return true;
  if (extractDayCount(cap) === 7) return true;
  return false;
}

export function toSevenDayPrice(option: {
  price: number;
  optionType: string | null;
  capacity: string | null;
}) {
  const days =
    extractDayCount(option.optionType) ?? extractDayCount(option.capacity) ?? null;
  if (!days) return option.price;
  return Math.max(1, Math.round((option.price / days) * 7));
}
