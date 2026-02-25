"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import styles from "@/components/b2b/B2bUx.module.css";

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
    forceRefresh?: boolean;
    cooldown?: {
      cooldownSeconds: number;
      remainingSeconds: number;
      availableAt: string | null;
    };
  };
  report?: {
    id: string;
  };
};

const LS_KEY = "wb:b2b:employee:last-input:v2";
const IDENTITY_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type ApiErrorPayload = {
  error?: string;
  code?: string;
  reason?: string;
  nextAction?: "init" | "sign" | "retry" | "wait";
  retryAfterSec?: number;
  availableAt?: string;
  cooldown?: {
    cooldownSeconds?: number;
    remainingSeconds?: number;
    availableAt?: string | null;
  };
};

class ApiRequestError extends Error {
  status: number;
  payload: ApiErrorPayload;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.error || "요청 처리에 실패했습니다.");
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function readStoredIdentity(): IdentityInput | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || "null") as
      | {
          schemaVersion?: number;
          savedAt?: string;
          identity?: IdentityInput;
          name?: string;
          birthDate?: string;
          phone?: string;
        }
      | null;
    if (!parsed) return null;
    const savedAtMs = parsed.savedAt ? new Date(parsed.savedAt).getTime() : Date.now();
    if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > IDENTITY_TTL_MS) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    const candidate = parsed.identity ?? {
      name: parsed.name || "",
      birthDate: parsed.birthDate || "",
      phone: parsed.phone || "",
    };
    if (!candidate.name || !candidate.birthDate || !candidate.phone) return null;
    return {
      name: candidate.name,
      birthDate: normalizeDigits(candidate.birthDate),
      phone: normalizeDigits(candidate.phone),
    };
  } catch {
    return null;
  }
}

function saveStoredIdentity(identity: IdentityInput) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: new Date().toISOString(),
      identity,
    })
  );
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
    throw new ApiRequestError(response.status, data as ApiErrorPayload);
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
        "복약 데이터를 가져오지 못했습니다. 잠시 후 다시 연동해 주세요.",
    };
  }
  if (status.type === "none") {
    return {
      tone: "warn" as const,
      text: "최근 3회 복약 이력이 없습니다.",
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "방금";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "방금";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 172800) return "어제";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`;
  return date.toLocaleDateString("ko-KR");
}

function resolveCooldownUntilFromPayload(payload: ApiErrorPayload) {
  const availableAt = payload.availableAt || payload.cooldown?.availableAt;
  if (availableAt) {
    const parsed = new Date(availableAt).getTime();
    if (Number.isFinite(parsed) && parsed > Date.now()) return parsed;
  }
  const retryAfter = payload.retryAfterSec ?? payload.cooldown?.remainingSeconds;
  if (typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter > 0) {
    return Date.now() + retryAfter * 1000;
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
  const [syncNextAction, setSyncNextAction] = useState<
    "init" | "sign" | "retry" | null
  >(null);
  const [forceSyncCooldownUntil, setForceSyncCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
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

  const forceSyncRemainingSec = useMemo(() => {
    if (!forceSyncCooldownUntil) return 0;
    const remainingMs = forceSyncCooldownUntil - cooldownNow;
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }, [cooldownNow, forceSyncCooldownUntil]);

  const periodOptions = useMemo(() => {
    const options = reportData?.availablePeriods ?? [];
    if (options.length > 0) return options;
    if (selectedPeriodKey) return [selectedPeriodKey];
    if (reportData?.periodKey) return [reportData.periodKey];
    return [];
  }, [reportData?.availablePeriods, reportData?.periodKey, selectedPeriodKey]);

  useEffect(() => {
    if (!forceSyncCooldownUntil) return;
    if (forceSyncCooldownUntil <= Date.now()) {
      setForceSyncCooldownUntil(null);
      return;
    }
    const timer = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forceSyncCooldownUntil]);

  useEffect(() => {
    if (forceSyncRemainingSec <= 0 && forceSyncCooldownUntil) {
      setForceSyncCooldownUntil(null);
    }
  }, [forceSyncCooldownUntil, forceSyncRemainingSec]);

  function getIdentityPayload() {
    return {
      name: identity.name.trim(),
      birthDate: normalizeDigits(identity.birthDate),
      phone: normalizeDigits(identity.phone),
    };
  }

  function applyForceSyncCooldown(payload: ApiErrorPayload | null | undefined) {
    if (!payload) return;
    const until = resolveCooldownUntilFromPayload(payload);
    if (until) {
      setForceSyncCooldownUntil(until);
      setCooldownNow(Date.now());
    }
  }

  async function loadReport(periodKey?: string) {
    const query = periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
    const data = await requestJson<EmployeeReportResponse>(
      `/api/b2b/employee/report${query}`
    );
    if (!data.ok) throw new Error(data.error || "레포트 조회에 실패했습니다.");
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
    const syncResult = await requestJson<EmployeeSyncResponse>(
      "/api/b2b/employee/sync",
      {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          forceRefresh,
        }),
      }
    );
    saveStoredIdentity(payload);
    if (syncResult.sync?.cooldown) {
      applyForceSyncCooldown({ cooldown: syncResult.sync.cooldown });
    }
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
            setNotice("이전에 조회한 정보로 자동 로그인했습니다.");
            await loadReport();
            return;
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "세션 확인 중 오류가 발생했습니다.";
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
        setNotice(
          result.message ||
            "조회 가능한 기록이 없습니다. 카카오 인증 후 연동해 주세요."
        );
        return;
      }
      saveStoredIdentity(payload);
      setNotice("기존 레포트를 불러왔습니다.");
      setSyncNextAction(null);
      await loadReport();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "기존 정보 조회에 실패했습니다."
      );
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
    setSyncNextAction(null);
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
            ? "기존 연동 데이터를 사용해 레포트를 불러왔습니다."
            : "카카오 인증이 완료되어 최신 데이터를 불러왔습니다."
        );
        setSyncNextAction(null);
        return;
      }
      setSyncNextAction("sign");
      setNotice(
        "카카오톡에서 인증을 완료한 뒤, 아래의 '인증 완료 후 연동' 버튼을 눌러 주세요."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "카카오 인증 요청에 실패했습니다."
      );
    } finally {
      setBusy(false);
    }
  }

  async function ensureNhisReadyForSync() {
    try {
      const signResult = await requestJson<{
        ok: boolean;
        linked?: boolean;
        reused?: boolean;
      }>("/api/health/nhis/sign", {
        method: "POST",
        body: JSON.stringify({}),
      });
      return {
        linked: signResult.linked === true,
        reused: signResult.reused === true,
      };
    } catch (err) {
      if (!(err instanceof ApiRequestError) || err.status !== 409) throw err;
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
        return {
          linked: true,
          reused: initResult.reused === true || initResult.source === "db-history",
        };
      }
      setNotice(
        "카카오톡에서 인증 승인을 완료한 뒤 '인증 완료 후 연동' 버튼을 다시 눌러 주세요."
      );
      return { linked: false, reused: false };
    }
  }

  async function handleSignAndSync(forceRefresh = false) {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    if (forceRefresh && forceSyncRemainingSec > 0) {
      const availableAtIso = new Date(Date.now() + forceSyncRemainingSec * 1000).toISOString();
      setNotice(`재연동은 ${formatDateTime(availableAtIso)} 이후 가능합니다.`);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const ready = await ensureNhisReadyForSync();
      if (!ready.linked) {
        setSyncNextAction("sign");
        setNotice("카카오톡 인증을 완료한 뒤 다시 시도해 주세요.");
        return;
      }

      const syncResult = await syncEmployeeReport(forceRefresh);
      if (
        syncResult.sync?.source === "cache-valid" ||
        syncResult.sync?.source === "cache-history"
      ) {
        setNotice("캐시 데이터를 사용해 레포트를 갱신했습니다.");
      } else if (ready.reused) {
        setNotice("기존 인증 상태를 사용해 레포트를 갱신했습니다.");
      } else {
        setNotice("최신 정보를 연동해 레포트를 갱신했습니다.");
      }
      setSyncNextAction(null);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        applyForceSyncCooldown(err.payload);
        if (err.payload.nextAction === "init") {
          setSyncNextAction("init");
          setNotice("연동 초기화가 필요합니다. 아래 '인증 다시 시작'을 눌러 주세요.");
          return;
        }
        if (err.payload.nextAction === "sign") {
          setSyncNextAction("sign");
          setNotice(
            "카카오 인증 승인이 필요합니다. '인증 다시 시작' 후 '인증 완료 후 연동'을 눌러 주세요."
          );
          return;
        }
        if (err.status === 429) {
          const cooldownUntil = resolveCooldownUntilFromPayload(err.payload);
          if (cooldownUntil) {
            setNotice(
              `재연동은 ${formatDateTime(new Date(cooldownUntil).toISOString())} 이후 가능합니다.`
            );
            return;
          }
        }
      }
      setSyncNextAction("retry");
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
      setSyncNextAction(null);
      setNotice("현재 연결된 조회 세션을 해제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return (
      <div className={`${styles.page} ${styles.compactPage} ${styles.stack}`}>
        <header className={styles.heroCard}>
          <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} />
          <div className={styles.skeletonRow}>
            <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
            <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
          </div>
        </header>
        <section className={styles.sectionCard}>
          <div className={styles.skeletonRow}>
            <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
            <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
          </div>
          <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} />
        </section>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.compactPage} ${styles.stack}`}>
      <header className={styles.heroCard}>
        <p className={styles.kicker}>EMPLOYEE REPORT</p>
        <h1 className={styles.title}>임직원 건강 레포트</h1>
        <p className={styles.description}>
          레포트는 화면에서 읽기 쉽게 제공되며, 공식 제출은 PDF 다운로드로 진행합니다.
        </p>
        <div className={styles.statusRow}>
          {reportData?.report ? (
            <span className={styles.statusOn}>레포트 준비 완료</span>
          ) : (
            <span className={styles.statusOff}>본인 확인 필요</span>
          )}
          {selectedPeriodKey ? <span className={styles.pill}>{selectedPeriodKey}</span> : null}
        </div>
      </header>

      {error ? <div className={styles.noticeError}>{error}</div> : null}
      {notice ? <div className={styles.noticeSuccess}>{notice}</div> : null}

      {!reportData ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>1. 본인 정보 입력</h2>
              <p className={styles.sectionDescription}>
                레포트 조회를 위해 이름, 생년월일, 휴대폰 번호를 입력해 주세요.
              </p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>이름</span>
              <input
                className={styles.input}
                value={identity.name}
                onChange={(event) =>
                  setIdentity((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="홍길동"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>생년월일 (8자리)</span>
              <input
                className={styles.input}
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
            <label className={styles.field}>
              <span className={styles.fieldLabel}>휴대폰 번호</span>
              <input
                className={styles.input}
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

          <div className={styles.actionRow}>
            <button
              type="button"
              onClick={handleInitKakao}
              disabled={busy}
              className={styles.buttonPrimary}
            >
              카카오 인증 요청
            </button>
            <button
              type="button"
              onClick={() => handleSignAndSync(false)}
              disabled={busy}
              className={styles.buttonSecondary}
            >
              인증 완료 후 연동
            </button>
          </div>

          <details className={styles.optionalCard}>
            <summary>기존 조회 기록이 있으면 바로 불러오기</summary>
            <div className={styles.optionalBody}>
              <p className={styles.optionalText}>
                이전에 같은 이름/생년월일/휴대폰 번호로 조회한 기록이 있으면 인증 없이
                레포트를 바로 불러올 수 있습니다.
              </p>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  onClick={handleFindExisting}
                  disabled={busy}
                  className={styles.buttonGhost}
                >
                  기존 조회 정보 불러오기
                </button>
              </div>
            </div>
          </details>
        </section>
      ) : null}

      {reportData?.report ? (
        <>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  {(reportData.report.payload?.meta?.employeeName ||
                    reportData.employee?.name ||
                    "대상자")}
                  님 레포트
                </h2>
                <p className={styles.sectionDescription}>
                  최근 연동:{" "}
                  {formatRelativeTime(
                    reportData.employee?.lastSyncedAt || reportData.report.updatedAt
                  )}
                </p>
                <details className={styles.optionalCard}>
                  <summary>상세 정보</summary>
                  <div className={styles.optionalBody}>
                    <p className={styles.optionalText}>
                      생성 시각:{" "}
                      {formatDateTime(
                        reportData.report.payload?.meta?.generatedAt ||
                          reportData.report.updatedAt
                      )}
                    </p>
                    <p className={styles.optionalText}>
                      최근 연동 시각: {formatDateTime(reportData.employee?.lastSyncedAt)}
                    </p>
                  </div>
                </details>
              </div>
            </div>

            <div className={styles.actionRow}>
              <select
                className={styles.select}
                value={selectedPeriodKey}
                disabled={periodOptions.length === 0}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedPeriodKey(next);
                  void loadReport(next);
                }}
              >
                {periodOptions.length === 0 ? (
                  <option value="">기간 없음</option>
                ) : (
                  periodOptions.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={busy}
                className={styles.buttonPrimary}
              >
                PDF 다운로드
              </button>
            </div>

            <details className={styles.optionalCard}>
              <summary>고급 옵션 보기</summary>
              <div className={styles.optionalBody}>
                <p className={styles.optionalText}>
                  최신 정보 재연동은 필요할 때만 사용해 주세요. 기본 조회는 캐시 데이터를
                  우선 사용합니다.
                </p>
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => handleSignAndSync(true)}
                    disabled={busy || forceSyncRemainingSec > 0}
                    className={styles.buttonSecondary}
                  >
                    최신 정보 다시 연동
                  </button>
                  <button
                    type="button"
                    onClick={handleInitKakao}
                    disabled={busy}
                    className={styles.buttonGhost}
                  >
                    인증 다시 시작
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={busy}
                    className={styles.buttonGhost}
                  >
                    다른 이름 조회
                  </button>
                </div>
                {forceSyncRemainingSec > 0 ? (
                  <p className={styles.inlineHint}>
                    재연동 가능까지 약 {Math.ceil(forceSyncRemainingSec / 60)}분 남았습니다.
                  </p>
                ) : null}
                {syncNextAction === "init" ? (
                  <p className={styles.inlineHint}>
                    현재 상태: 연동 초기화 필요. 인증 다시 시작을 먼저 진행해 주세요.
                  </p>
                ) : null}
                {syncNextAction === "sign" ? (
                  <p className={styles.inlineHint}>
                    현재 상태: 카카오 인증 승인 필요. 인증 완료 후 연동 버튼을 눌러 주세요.
                  </p>
                ) : null}
              </div>
            </details>
          </section>

          {reportData.report.payload?.meta?.isMockData ? (
            <div className={styles.noticeWarn}>
              현재 레포트는 데모 데이터 기반으로 생성되었습니다.
            </div>
          ) : null}

          {medicationStatus ? (
            <div
              className={
                medicationStatus.tone === "error"
                  ? styles.noticeError
                  : styles.noticeWarn
              }
            >
              {medicationStatus.text}
            </div>
          ) : null}

          <ReportSummaryCards payload={reportData.report.payload} viewerMode="employee" />
        </>
      ) : null}
    </div>
  );
}
