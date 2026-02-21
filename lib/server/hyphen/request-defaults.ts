import "server-only";

const YYYYMMDD_REGEX = /^\d{8}$/;
const SUBJECT_TYPES = new Set(["00", "01", "02"]);

function formatDateToYmd(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function asValidYmd(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return YYYYMMDD_REGEX.test(trimmed) ? trimmed : null;
}

function resolveDateRange() {
  const now = new Date();
  const fallbackTo = formatDateToYmd(now);
  const fallbackFromDate = new Date(now);
  fallbackFromDate.setFullYear(fallbackFromDate.getFullYear() - 10);
  const fallbackFrom = formatDateToYmd(fallbackFromDate);

  const envFrom = asValidYmd(process.env.HYPHEN_NHIS_FROM_DATE);
  const envTo = asValidYmd(process.env.HYPHEN_NHIS_TO_DATE);

  const fromDate = envFrom ?? fallbackFrom;
  const toDate = envTo ?? fallbackTo;

  if (fromDate > toDate) {
    return { fromDate: fallbackFrom, toDate: fallbackTo };
  }

  return { fromDate, toDate };
}

function resolveSubjectType() {
  const value = process.env.HYPHEN_NHIS_SUBJECT_TYPE?.trim();
  return value && SUBJECT_TYPES.has(value) ? value : "00";
}

export function buildNhisRequestDefaults() {
  const { fromDate, toDate } = resolveDateRange();
  return {
    cloudCertYn: "N" as const,
    subjectType: resolveSubjectType(),
    fromDate,
    toDate,
  };
}

