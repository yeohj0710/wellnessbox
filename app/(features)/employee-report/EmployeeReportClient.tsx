"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";

type IdentityInput = {
  name: string;
  birthDate: string;
  phone: string;
};

type EmployeeReportResponse = {
  ok: boolean;
  employee?: {
    id: string;
    name: string;
    lastSyncedAt: string | null;
  };
  report?: {
    id: string;
    variantIndex: number;
    status: string;
    pageSize: string;
    periodKey?: string;
    payload: any;
    exportAudit?: {
      validation?: Array<{ issues?: Array<{ code?: string; detail?: string }> }>;
    } | null;
    updatedAt: string;
  };
  periodKey?: string;
  availablePeriods?: string[];
  error?: string;
};

type NhisInitResponse = {
  ok: boolean;
  nextStep?: "sign" | "fetch";
  linked?: boolean;
  reused?: boolean;
  source?: string;
};

type EmployeeSyncResponse = {
  ok: boolean;
  sync?: {
    source?: "fresh" | "cache-valid" | "cache-history";
  };
  report?: {
    id: string;
  };
};

const LS_KEY = "wb:b2b:employee:last-input:v1";

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function readStoredIdentity(): IdentityInput | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || "null") as
      | IdentityInput
      | null;
    if (!parsed) return null;
    if (!parsed.name || !parsed.birthDate || !parsed.phone) return null;
    return {
      name: parsed.name,
      birthDate: normalizeDigits(parsed.birthDate),
      phone: normalizeDigits(parsed.phone),
    };
  } catch {
    return null;
  }
}

function saveStoredIdentity(identity: IdentityInput) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(identity));
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const message =
      (data as { error?: string })?.error || "요청을 처리하지 못했습니다.";
    throw new Error(message);
  }
  return data;
}

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

async function downloadPdf(url: string, fallbackName: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "PDF 다운로드에 실패했습니다.");
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

function resolveMedicationStatusMessage(reportData: EmployeeReportResponse | null) {
  const status = reportData?.report?.payload?.health?.medicationStatus;
  if (!status) return null;
  if (status.type === "fetch_failed") {
    return {
      tone: "error" as const,
      text:
        status.message ||
        "복약 데이터 조회에 실패했습니다. 잠시 후 다시 연동해 주세요.",
    };
  }
  if (status.type === "none") {
    return {
      tone: "warn" as const,
      text: "복약 이력이 없습니다.",
    };
  }
  if (status.type === "unknown") {
    return {
      tone: "warn" as const,
      text:
        status.message ||
        "복약 상태를 확정할 수 없습니다. 최신 정보 다시 연동을 시도해 주세요.",
    };
  }
  return null;
}

export default function EmployeeReportClient() {
  const [identity, setIdentity] = useState<IdentityInput>({
    name: "",
    birthDate: "",
    phone: "",
  });
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState<EmployeeReportResponse | null>(null);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const hasTriedStoredLogin = useRef(false);

  const validIdentity = useMemo(() => {
    return (
      identity.name.trim().length > 0 &&
      /^\d{8}$/.test(normalizeDigits(identity.birthDate)) &&
      /^\d{10,11}$/.test(normalizeDigits(identity.phone))
    );
  }, [identity]);

  const medicationStatus = useMemo(
    () => resolveMedicationStatusMessage(reportData),
    [reportData]
  );

  const validationIssueCount = useMemo(() => {
    const entries = reportData?.report?.exportAudit?.validation ?? [];
    return entries.reduce((sum, entry) => sum + (entry.issues?.length ?? 0), 0);
  }, [reportData?.report?.exportAudit]);

  function getIdentityPayload() {
    return {
      name: identity.name.trim(),
      birthDate: normalizeDigits(identity.birthDate),
      phone: normalizeDigits(identity.phone),
    };
  }

  async function loadReport(periodKey?: string) {
    const query = periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
    const data = await requestJson<EmployeeReportResponse>(`/api/b2b/employee/report${query}`);
    if (!data.ok) throw new Error(data.error || "리포트 조회에 실패했습니다.");
    setReportData(data);
    setSelectedPeriodKey(data.periodKey || periodKey || "");
    setError("");
    if (validIdentity) {
      saveStoredIdentity({
        name: identity.name.trim(),
        birthDate: normalizeDigits(identity.birthDate),
        phone: normalizeDigits(identity.phone),
      });
    }
  }

  async function syncEmployeeReport(forceRefresh = false) {
    const payload = getIdentityPayload();
    const syncResult = await requestJson<EmployeeSyncResponse>("/api/b2b/employee/sync", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        forceRefresh,
      }),
    });
    saveStoredIdentity(payload);
    await loadReport(selectedPeriodKey || undefined);
    return syncResult;
  }

  async function checkSessionAndMaybeAutoLogin() {
    setBooting(true);
    try {
      const session = await requestJson<{
        ok: boolean;
        authenticated?: boolean;
        employee?: { name: string; birthDate: string; phoneNormalized: string };
      }>("/api/b2b/employee/session");

      if (session.authenticated) {
        if (session.employee) {
          setIdentity({
            name: session.employee.name,
            birthDate: session.employee.birthDate,
            phone: session.employee.phoneNormalized,
          });
        }
        await loadReport();
        return;
      }

      if (!hasTriedStoredLogin.current) {
        hasTriedStoredLogin.current = true;
        const stored = readStoredIdentity();
        if (stored) {
          setIdentity(stored);
          const loginResult = await requestJson<{ ok: boolean; found?: boolean }>(
            "/api/b2b/employee/session",
            {
              method: "POST",
              body: JSON.stringify(stored),
            }
          );
          if (loginResult.found) {
            setNotice("이전 조회 정보로 자동 로그인했습니다.");
            await loadReport();
            return;
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "세션 확인에 실패했습니다.";
      setError(message);
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    void checkSessionAndMaybeAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFindExisting() {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = getIdentityPayload();
      const result = await requestJson<{
        ok: boolean;
        found: boolean;
        message?: string;
      }>("/api/b2b/employee/session", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!result.found) {
        setNotice(result.message || "조회 이력이 없습니다. 카카오 인증 후 연동해 주세요.");
        return;
      }
      saveStoredIdentity(payload);
      setNotice("기존 리포트를 불러왔습니다.");
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "기존 정보 조회에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleInitKakao() {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const initResult = await requestJson<NhisInitResponse>("/api/health/nhis/init", {
        method: "POST",
        body: JSON.stringify({
          loginMethod: "EASY",
          loginOrgCd: "kakao",
          resNm: identity.name.trim(),
          resNo: normalizeDigits(identity.birthDate),
          mobileNo: normalizeDigits(identity.phone),
        }),
      });
      if (initResult.linked || initResult.nextStep === "fetch") {
        const syncResult = await syncEmployeeReport(false);
        const reusedFromCache =
          initResult.reused ||
          initResult.source === "db-history" ||
          syncResult.sync?.source === "cache-valid" ||
          syncResult.sync?.source === "cache-history";
        setNotice(
          reusedFromCache
            ? "기존 연동 데이터를 활용해 리포트를 불러왔습니다."
            : "카카오 인증이 완료되어 최신 데이터를 불러왔습니다."
        );
        return;
      }
      setNotice(
        "카카오 인증 요청을 보냈습니다. 카카오톡에서 승인 후 '인증 완료 후 연동' 버튼을 눌러 주세요."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "카카오 인증 요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignAndSync(forceRefresh = false) {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const signResult = await requestJson<{ ok: boolean; linked?: boolean; reused?: boolean }>(
        "/api/health/nhis/sign",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      if (!signResult.linked) {
        setNotice("카카오톡 승인 완료 후 다시 시도해 주세요.");
        return;
      }

      const syncResult = await syncEmployeeReport(forceRefresh);
      if (
        syncResult.sync?.source === "cache-valid" ||
        syncResult.sync?.source === "cache-history"
      ) {
        setNotice("캐시된 데이터를 사용해 리포트를 갱신했습니다.");
      } else if (signResult.reused) {
        setNotice("기존 인증 상태를 재사용해 리포트를 갱신했습니다.");
      } else {
        setNotice("최신 데이터를 연동해 리포트를 갱신했습니다.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터 연동에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    if (!reportData?.report?.id) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const periodQuery = selectedPeriodKey
        ? `?period=${encodeURIComponent(selectedPeriodKey)}`
        : "";
      await downloadPdf(
        `/api/b2b/employee/report/export/pdf${periodQuery}`,
        "employee-report.pdf"
      );
      setNotice("PDF 다운로드가 완료되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await requestJson("/api/b2b/employee/session", { method: "DELETE" });
      await fetch("/api/health/nhis/unlink", { method: "POST" }).catch(() => null);
      setReportData(null);
      setSelectedPeriodKey("");
      setNotice("연동 세션을 해제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          임직원 건강 리포트 정보를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">임직원 건강 리포트</h1>
        <p className="mt-2 text-sm text-slate-600">
          웹 화면은 읽기용으로 제공되며, 공식 산출물은 PDF 다운로드로 받으실 수 있습니다.
        </p>
      </div>

      {!reportData && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-slate-700">
              이름
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={identity.name}
                onChange={(event) =>
                  setIdentity((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="홍길동"
              />
            </label>
            <label className="text-sm text-slate-700">
              생년월일(8자리)
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={identity.birthDate}
                onChange={(event) =>
                  setIdentity((prev) => ({
                    ...prev,
                    birthDate: normalizeDigits(event.target.value).slice(0, 8),
                  }))
                }
                placeholder="19900101"
              />
            </label>
            <label className="text-sm text-slate-700">
              휴대폰 번호
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={identity.phone}
                onChange={(event) =>
                  setIdentity((prev) => ({
                    ...prev,
                    phone: normalizeDigits(event.target.value).slice(0, 11),
                  }))
                }
                placeholder="01012345678"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleFindExisting}
              disabled={busy}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              기존 조회 정보 불러오기
            </button>
            <button
              type="button"
              onClick={handleInitKakao}
              disabled={busy}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              카카오 인증 요청
            </button>
            <button
              type="button"
              onClick={() => handleSignAndSync(false)}
              disabled={busy}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              인증 완료 후 연동
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {reportData?.report && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {reportData.report.payload?.meta?.employeeName || reportData.employee?.name} 리포트
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  생성 시각:{" "}
                  {new Date(reportData.report.payload?.meta?.generatedAt || reportData.report.updatedAt).toLocaleString(
                    "ko-KR"
                  )}
                </p>
                {reportData.employee?.lastSyncedAt ? (
                  <p className="mt-1 text-xs text-slate-500">
                    최근 동기화: {new Date(reportData.employee.lastSyncedAt).toLocaleString("ko-KR")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  value={selectedPeriodKey}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSelectedPeriodKey(next);
                    void loadReport(next);
                  }}
                >
                  {(reportData.availablePeriods?.length ? reportData.availablePeriods : [selectedPeriodKey]).map(
                    (period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    )
                  )}
                </select>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={busy}
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  PDF 다운로드
                </button>
                <button
                  type="button"
                  onClick={() => handleSignAndSync(true)}
                  disabled={busy}
                  className="rounded-md border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  최신 정보 다시 연동
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={busy}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  다른 사람 조회
                </button>
              </div>
            </div>
          </div>

          {reportData.report.payload?.meta?.isMockData && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              MOCK 데이터를 사용 중입니다. 현재 리포트는 테스트 fixture 기반입니다.
            </div>
          )}

          {medicationStatus && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                medicationStatus.tone === "error"
                  ? "border border-rose-200 bg-rose-50 text-rose-700"
                  : "border border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {medicationStatus.text}
            </div>
          )}

          {validationIssueCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              현재 export 검증 이슈가 {validationIssueCount}건 있습니다. 관리자에게 확인 요청해 주세요.
            </div>
          )}

          <ReportSummaryCards payload={reportData.report.payload} />
        </div>
      )}
    </div>
  );
}
