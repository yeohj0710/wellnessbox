"use client";

import { useEffect, useState } from "react";

type BootstrapResponse =
  | {
      ok: true;
      enabled: true;
      timeoutMs: number;
      serviceConfigured: boolean;
      samplePayload: unknown;
    }
  | {
      ok: false;
      enabled: false;
      reason: string;
      timeoutMs: number;
      samplePayload: unknown;
    };

type PreviewResponse = {
  ok: boolean;
  enabled?: boolean;
  source?: "rnd" | "fallback";
  usedFallback?: boolean;
  fallbackReason?: string | null;
  timeoutMs?: number;
  serviceConfigured?: boolean;
  upstreamStatus?: number | null;
  requestedAt?: string;
  response?: unknown;
  error?: string;
};

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function RndPreviewClient() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [payloadText, setPayloadText] = useState("");
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadBootstrap() {
      const response = await fetch("/api/internal/rnd/recommend-preview", {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as BootstrapResponse | null;
      if (!active || !json) return;
      setBootstrap(json);
      setPayloadText(stringify(json.samplePayload));
      setResultText(stringify(json));
    }

    void loadBootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    let payload: unknown;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setLoading(false);
      setError("JSON 형식이 올바르지 않습니다.");
      return;
    }

    try {
      const response = await fetch("/api/internal/rnd/recommend-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = (await response.json().catch(() => null)) as PreviewResponse | null;
      setResultText(stringify(json ?? { ok: false, error: "empty_response" }));
      if (!response.ok) {
        setError(`HTTP ${response.status}`);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error && submitError.message
          ? submitError.message
          : "preview 요청에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  const disabled = bootstrap?.enabled === false;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          wellnessbox-rnd recommend preview
        </h1>
        <p className="text-sm text-slate-600">
          dev-only preview 화면이다. `wellnessbox` 서버가 `wellnessbox-rnd`
          의 `/v1/recommend` 를 프록시하고 raw JSON 을 그대로 보여준다.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          <span>
            enabled:{" "}
            <strong>{bootstrap ? String(bootstrap.enabled) : "loading"}</strong>
          </span>
          <span>
            timeoutMs:{" "}
            <strong>{bootstrap ? String(bootstrap.timeoutMs) : "-"}</strong>
          </span>
          <span>
            serviceConfigured:{" "}
            <strong>
              {bootstrap && "serviceConfigured" in bootstrap
                ? String(bootstrap.serviceConfigured)
                : "-"}
            </strong>
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="rnd-preview-payload"
              >
                request payload
              </label>
              <textarea
                id="rnd-preview-payload"
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                className="min-h-[520px] w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs text-slate-100 outline-none"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || disabled}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "요청 중..." : "preview 실행"}
              </button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-slate-700">raw response</h2>
          <pre className="min-h-[580px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
            {resultText || "응답 대기 중"}
          </pre>
        </section>
      </div>
    </main>
  );
}
