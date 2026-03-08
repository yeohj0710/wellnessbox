function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = header.match(
    /filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i
  );
  const encoded = match?.[1] || match?.[2];
  if (!encoded) return fallback;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export async function downloadPdf(url: string, fallbackName: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as
      | {
          code?: string;
          reason?: string;
          error?: string;
          debugId?: string;
        }
      | null;
    throw new PdfDownloadError(response.status, data ?? {});
  }
  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get("content-disposition"),
    fallbackName
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export class PdfDownloadError extends Error {
  status: number;
  payload: {
    code?: string;
    reason?: string;
    error?: string;
    debugId?: string;
  };

  constructor(
    status: number,
    payload: {
      code?: string;
      reason?: string;
      error?: string;
      debugId?: string;
    }
  ) {
    super(payload.error || "PDF 다운로드에 실패했습니다.");
    this.name = "PdfDownloadError";
    this.status = status;
    this.payload = payload;
  }
}

export function isPdfEngineUnavailableFailure(input: {
  code?: string | null;
  reason?: string | null;
  error?: string | null;
}) {
  const code = (input.code || "").trim().toUpperCase();
  if (code === "PDF_ENGINE_MISSING") return true;

  const text = [input.reason, input.error]
    .map((value) => (value || "").toLowerCase())
    .join(" ");
  if (!text) return false;

  return (
    text.includes("playwright") ||
    text.includes("browsertype.launch") ||
    text.includes("executable doesn't exist") ||
    text.includes("download new browsers")
  );
}
