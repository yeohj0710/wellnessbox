type PdfFilenameInput = {
  employeeName?: string | null;
  periodKey?: string | null;
};

export function normalizeFilenameToken(
  value: string | null | undefined,
  fallback: string
) {
  const text = (value ?? "")
    .trim()
    .replace(/[\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : fallback;
}

export function buildEmployeeReportPdfFilename(input: PdfFilenameInput) {
  const employeeLabel = normalizeFilenameToken(input.employeeName, "임직원");
  const periodLabel = normalizeFilenameToken(input.periodKey, "최근");
  return `웰니스박스_건강리포트_${employeeLabel}_${periodLabel}.pdf`;
}

export function buildPdfCaptureQuery(
  captureWidthPx: number,
  viewportWidthPx: number
) {
  const query = new URLSearchParams();
  if (captureWidthPx > 0) query.set("w", String(captureWidthPx));
  if (viewportWidthPx > 0) query.set("vw", String(viewportWidthPx));
  return query.toString();
}

