export type ApiJsonBase = {
  ok?: boolean;
  error?: string;
  message?: string;
  retryAfterSec?: number;
};

export type ApiJsonResult<T extends object> = {
  raw: string;
  data: T & ApiJsonBase;
};

export type ApiHttpResult<T extends object> = ApiJsonResult<T> & {
  status: number;
  ok: boolean;
};

export function parseApiJsonText<T extends object>(raw: string, status: number) {
  if (!raw) return {} as T & ApiJsonBase;

  try {
    return JSON.parse(raw) as T & ApiJsonBase;
  } catch {
    return { ok: false, error: raw || `HTTP ${status}` } as T & ApiJsonBase;
  }
}

export async function readApiJsonResponse<T extends object>(
  response: Response
): Promise<ApiJsonResult<T>> {
  const raw = await response.text();
  const data = parseApiJsonText<T>(raw, response.status);
  return { raw, data };
}

export async function readApiHttpResult<T extends object>(
  response: Response
): Promise<ApiHttpResult<T>> {
  const parsed = await readApiJsonResponse<T>(response);
  return {
    status: response.status,
    ok: response.ok && parsed.data.ok !== false,
    raw: parsed.raw,
    data: parsed.data,
  };
}

export async function postApiJson<T extends object>(
  url: string,
  body: unknown,
  init?: RequestInit
) {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return readApiHttpResult<T>(response);
}
