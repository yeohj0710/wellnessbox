import "server-only";

export const B2B_PERIOD_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toPeriodKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${pad2(month)}`;
}

export function normalizePeriodKey(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!B2B_PERIOD_KEY_REGEX.test(trimmed)) return null;
  return trimmed;
}

export function resolveCurrentPeriodKey(now = new Date()) {
  return toPeriodKey(now);
}

export function periodKeyToCycle(periodKey: string) {
  const normalized = normalizePeriodKey(periodKey);
  if (!normalized) return null;
  const [yearText, monthText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return year * 12 + month;
}

export function comparePeriodKeyDesc(a: string, b: string) {
  const cycleA = periodKeyToCycle(a) ?? 0;
  const cycleB = periodKeyToCycle(b) ?? 0;
  return cycleB - cycleA;
}

export function monthRangeFromPeriodKey(periodKey: string) {
  const normalized = normalizePeriodKey(periodKey);
  if (!normalized) return null;
  const [yearText, monthText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { from, to };
}

export function listRecentPeriodKeys(input: {
  latestPeriodKey: string;
  count: number;
}) {
  const normalized = normalizePeriodKey(input.latestPeriodKey);
  const safeCount = Math.max(1, Math.floor(input.count));
  if (!normalized) return [];
  const [yearText, monthText] = normalized.split("-");
  let year = Number(yearText);
  let month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return [];

  const out: string[] = [];
  for (let index = 0; index < safeCount; index += 1) {
    out.push(`${year}-${pad2(month)}`);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}
