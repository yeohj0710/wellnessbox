"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
    payload: {
      meta: {
        employeeName: string;
        birthDateMasked: string;
        phoneMasked: string;
        generatedAt: string;
      };
      health: {
        fetchedAt: string | null;
        metrics: Array<{
          metric: string;
          value: string;
          unit: string | null;
        }>;
        medications: Array<{
          medicationName: string;
          hospitalName: string | null;
          date: string | null;
          dosageDay: string | null;
        }>;
      };
      survey: {
        selectedSections: string[];
      };
      analysis: {
        version: number | null;
      };
      pharmacist: {
        note: string | null;
        recommendations: string | null;
        cautions: string | null;
      };
    };
    updatedAt: string;
  };
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
  const hasTriedStoredLogin = useRef(false);

  const validIdentity = useMemo(() => {
    return (
      identity.name.trim().length > 0 &&
      /^\d{8}$/.test(normalizeDigits(identity.birthDate)) &&
      /^\d{10,11}$/.test(normalizeDigits(identity.phone))
    );
  }, [identity]);

  async function loadReport() {
    const data = await requestJson<EmployeeReportResponse>("/api/b2b/employee/report");
    if (!data.ok) throw new Error(data.error || "레포트 조회에 실패했습니다.");
    setReportData(data);
    setError("");
    if (validIdentity) {
      saveStoredIdentity({
        name: identity.name.trim(),
        birthDate: normalizeDigits(identity.birthDate),
        phone: normalizeDigits(identity.phone),
      });
    }
  }

  function getIdentityPayload() {
    return {
      name: identity.name.trim(),
      birthDate: normalizeDigits(identity.birthDate),
      phone: normalizeDigits(identity.phone),
    };
  }

  async function syncEmployeeReport() {
    const payload = getIdentityPayload();
    const syncResult = await requestJson<EmployeeSyncResponse>("/api/b2b/employee/sync", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    saveStoredIdentity(payload);
    await loadReport();
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
          const loginResult = await requestJson<{
            ok: boolean;
            found?: boolean;
          }>("/api/b2b/employee/session", {
            method: "POST",
            body: JSON.stringify(stored),
          });
          if (loginResult.found) {
            setNotice("이전 조회 정보를 불러왔습니다.");
            await loadReport();
            return;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "세션 확인에 실패했습니다.";
      setError(message);
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    void checkSessionAndMaybeAutoLogin();
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
      const payload = {
        name: identity.name.trim(),
        birthDate: normalizeDigits(identity.birthDate),
        phone: normalizeDigits(identity.phone),
      };
      const result = await requestJson<{
        ok: boolean;
        found: boolean;
        message?: string;
      }>("/api/b2b/employee/session", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!result.found) {
        setNotice(result.message || "기존 조회 이력이 없습니다. 카카오 인증 후 연동해 주세요.");
        return;
      }
      saveStoredIdentity(payload);
      setNotice("기존 레포트를 불러왔습니다.");
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
        const syncResult = await syncEmployeeReport();
        const reusedFromCache =
          initResult.reused ||
          initResult.source === "db-history" ||
          syncResult.sync?.source === "cache-valid" ||
          syncResult.sync?.source === "cache-history";
        setNotice(
          reusedFromCache
            ? "이전에 조회한 정보를 재사용해 레포트를 불러왔습니다."
            : "카카오 인증이 이미 완료되어 최신 데이터를 불러왔습니다."
        );
        return;
      }
      if (initResult.reused) {
        setNotice(
          "기존 카카오 인증 요청이 진행 중입니다. 카카오 앱에서 인증 후 '인증 완료 후 데이터 불러오기'를 눌러 주세요."
        );
        return;
      }
      setNotice("카카오 인증 요청이 접수되었습니다. 카카오 앱에서 인증 후 '인증 완료 후 데이터 불러오기'를 눌러 주세요.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "카카오 인증 요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignAndSync() {
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
        setNotice(
          "카카오 앱에서 인증을 완료한 뒤 다시 눌러 주세요. 인증이 아직 확인되지 않았습니다."
        );
        return;
      }

      const syncResult = await syncEmployeeReport();
      if (
        syncResult.sync?.source === "cache-valid" ||
        syncResult.sync?.source === "cache-history"
      ) {
        setNotice("이전에 조회한 정보를 재사용해 레포트를 불러왔습니다.");
      } else if (signResult.reused) {
        setNotice("기존 인증 상태를 재사용해 최신 데이터를 불러왔습니다.");
      } else {
        setNotice("건강 데이터 연동이 완료되었습니다.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터 연동에 실패했습니다.");
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
      setNotice("연동 세션을 해제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          임직원 건강 레포트 정보를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">임직원 개인 건강 레포트</h1>
        <p className="mt-2 text-sm text-slate-600">
          이름/생년월일/휴대폰 번호로 본인 확인 후 카카오 인증을 완료하면 건강검진/복약 이력을 자동으로 불러옵니다.
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
              onClick={handleSignAndSync}
              disabled={busy}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              인증 완료 후 데이터 불러오기
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {reportData.report.payload.meta.employeeName} 님 레포트
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                생성 시각: {new Date(reportData.report.payload.meta.generatedAt).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSignAndSync}
                disabled={busy}
                className="rounded-md border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                최신 정보 다시 연동
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={busy}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                다른 사람으로 조회하기
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800">최근 건강검진 지표</h3>
              <div className="mt-3 space-y-2">
                {reportData.report.payload.health.metrics.length === 0 && (
                  <p className="text-sm text-slate-500">표시할 검진 지표가 없습니다.</p>
                )}
                {reportData.report.payload.health.metrics.map((metric) => (
                  <div key={`${metric.metric}-${metric.value}`} className="text-sm text-slate-700">
                    <span className="font-semibold">{metric.metric}</span>: {metric.value}
                    {metric.unit ? ` ${metric.unit}` : ""}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800">최근 복약 이력(최신 3건)</h3>
              <div className="mt-3 space-y-2">
                {reportData.report.payload.health.medications.length === 0 && (
                  <p className="text-sm text-slate-500">복약 이력이 없습니다.</p>
                )}
                {reportData.report.payload.health.medications.map((medication) => (
                  <div
                    key={`${medication.medicationName}-${medication.date || "none"}`}
                    className="text-sm text-slate-700"
                  >
                    <div className="font-semibold">{medication.medicationName}</div>
                    <div className="text-slate-500">
                      {medication.date || "-"}
                      {medication.hospitalName ? ` / ${medication.hospitalName}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">약사 상담 코멘트</h3>
            <p className="mt-2 text-sm text-slate-700">
              {reportData.report.payload.pharmacist.note ||
                reportData.report.payload.pharmacist.recommendations ||
                "약사 코멘트가 아직 등록되지 않았습니다."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
