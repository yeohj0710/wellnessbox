import "server-only";

const ENGINE_UNAVAILABLE_PATTERNS = [
  "playwright is not available",
  "playwright browser launch failed",
  "browsertype.launch",
  "executable doesn't exist",
  "please run the following command to download new browsers",
  "host system is missing dependencies",
  "failed to launch browser",
  "error while loading shared libraries",
  "enoent",
  "no such file or directory",
  "not recognized",
  "soffice failed",
  "soffice fallback is disabled",
];

export function isReportExportEngineUnavailableReason(reason: string | null | undefined) {
  if (!reason) return false;
  const normalized = reason.toLowerCase();
  return ENGINE_UNAVAILABLE_PATTERNS.some((token) => normalized.includes(token));
}
