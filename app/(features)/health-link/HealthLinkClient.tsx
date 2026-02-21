"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getHyphenLoginOrgLabel,
  HYPHEN_EASY_LOGIN_ORG_OPTIONS,
  HYPHEN_PASS_MOBILE_CO_OPTIONS,
  type HyphenEasyLoginOrg,
  type HyphenPassMobileCo,
} from "@/lib/shared/hyphen-login";
import styles from "./HealthLinkClient.module.css";

type StatusResponse = {
  ok: boolean;
  status?: {
    linked: boolean;
    provider: string;
    loginMethod: string | null;
    loginOrgCd: string | null;
    lastLinkedAt: string | null;
    lastFetchedAt: string | null;
    lastError: { code: string | null; message: string | null } | null;
    hasStepData: boolean;
    hasCookieData: boolean;
    pendingAuthReady: boolean;
  };
  error?: string;
};

type FetchResponse = {
  ok: boolean;
  partial?: boolean;
  failed?: Array<{ target: string; errCd?: string; errMsg?: string }>;
  data?: {
    normalized?: {
      checkup?: {
        summary?: {
          measuredAt: string | null;
          bloodPressure: string | null;
          fastingGlucose: string | null;
          totalCholesterol: string | null;
          hdl: string | null;
          ldl: string | null;
          triglyceride: string | null;
          weight: string | null;
          waist: string | null;
        };
      };
      lifestyle?: {
        highlights?: string[];
      };
      healthAge?: {
        healthAge: string | number | null;
        riskFactorTable: unknown;
      };
    };
  };
  error?: string;
  errCd?: string | null;
  errMsg?: string | null;
};

type ActionResponse = {
  ok: boolean;
  error?: string;
  errCd?: string | null;
  errMsg?: string | null;
};

type HealthLinkClientProps = {
  loggedIn: boolean;
};

const STEP_ITEMS = [
  { key: "status", title: "Status", subtitle: "linked state check" },
  { key: "auth", title: "Auth", subtitle: "init + sign flow" },
  { key: "fetch", title: "Fetch", subtitle: "0977 / 0981 / 0982" },
] as const;

type ActionKind = null | "init" | "sign" | "fetch" | "unlink";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function parseErrorMessage(text: string | undefined, fallback: string) {
  const raw = (text || "").trim();
  if (!raw) return fallback;
  return raw.replace(/\[[A-Z]+-\d+\]\s*/g, "");
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

function toCompactLine(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 4)
      .map(([key, entryValue]) => `${key}: ${String(entryValue ?? "-")}`);
    return entries.join(" | ");
  }
  return String(value);
}

function renderRiskFactors(riskFactorTable: unknown) {
  if (Array.isArray(riskFactorTable)) {
    if (riskFactorTable.length === 0) {
      return <div className={styles.emptyHint}>위험요인 데이터가 없습니다.</div>;
    }
    return (
      <ul className={styles.listStack}>
        {riskFactorTable.slice(0, 5).map((row, index) => (
          <li key={index} className={styles.listItem}>
            {toCompactLine(row) ?? "-"}
          </li>
        ))}
      </ul>
    );
  }
  if (riskFactorTable && typeof riskFactorTable === "object") {
    return (
      <ul className={styles.listStack}>
        {Object.entries(riskFactorTable as Record<string, unknown>)
          .slice(0, 8)
          .map(([key, value]) => (
            <li key={key} className={styles.listItem}>
              {key}: {String(value ?? "-")}
            </li>
          ))}
      </ul>
    );
  }
  return <div className={styles.emptyHint}>위험요인 데이터가 없습니다.</div>;
}

function StatusMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.metaItem}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={styles.metaValue}>{value}</div>
    </div>
  );
}

export default function HealthLinkClient({ loggedIn }: HealthLinkClientProps) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<StatusResponse["status"]>();
  const [statusError, setStatusError] = useState<string | null>(null);

  const [loginOrgCd, setLoginOrgCd] = useState<HyphenEasyLoginOrg>("pass");
  const [resNm, setResNm] = useState("");
  const [resNo, setResNo] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [mobileCo, setMobileCo] = useState<HyphenPassMobileCo>("SKT");

  const [actionLoading, setActionLoading] = useState<ActionKind>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [fetched, setFetched] = useState<FetchResponse["data"] | null>(null);
  const [fetchFailures, setFetchFailures] = useState<
    Array<{ target: string; errCd?: string; errMsg?: string }>
  >([]);

  const canRequest = loggedIn && actionLoading === null;
  const isPassOrg = loginOrgCd === "pass";

  const loadStatus = useCallback(async () => {
    if (!loggedIn) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/health/nhis/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = await readJson<StatusResponse>(res);
      if (!res.ok || !data.ok) {
        setStatusError(parseErrorMessage(data.error, "연동 상태를 불러오지 못했습니다."));
        return;
      }
      setStatus(data.status);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : String(error));
    } finally {
      setStatusLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runRequest = useCallback(
    async <T extends ActionResponse | FetchResponse>(options: {
      kind: Exclude<ActionKind, null>;
      url: string;
      body?: unknown;
      fallbackError: string;
      onSuccess?: (payload: T) => void | Promise<void>;
      onFailure?: (payload: T) => void | Promise<void>;
    }) => {
      if (!canRequest) return;
      setActionLoading(options.kind);
      setActionNotice(null);
      setActionError(null);
      try {
        const res = await fetch(options.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.body ?? {}),
        });
        const data = await readJson<T>(res);
        if (!res.ok || !data.ok) {
          const msg = parseErrorMessage(
            (data as ActionResponse).errMsg || (data as ActionResponse).error,
            options.fallbackError
          );
          setActionError(msg);
          if (options.onFailure) {
            await options.onFailure(data);
          }
          return;
        }
        if (options.onSuccess) {
          await options.onSuccess(data);
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setActionLoading(null);
      }
    },
    [canRequest]
  );

  const handleInit = useCallback(async () => {
    if (!resNm.trim()) {
      setActionError("이름을 입력해 주세요.");
      return;
    }
    if (!/^\d{8}$/.test(resNo)) {
      setActionError("생년월일은 YYYYMMDD 형식으로 입력해 주세요.");
      return;
    }
    if (!/^\d{10,11}$/.test(mobileNo)) {
      setActionError("휴대폰 번호는 숫자 10~11자리로 입력해 주세요.");
      return;
    }

    await runRequest<ActionResponse>({
      kind: "init",
      url: "/api/health/nhis/init",
      fallbackError: "인증 요청에 실패했습니다.",
      body: {
        loginMethod: "EASY",
        loginOrgCd,
        resNm: resNm.trim(),
        resNo,
        mobileNo,
        mobileCo: isPassOrg ? mobileCo : undefined,
      },
      onSuccess: async () => {
        setActionNotice("인증 요청을 전송했습니다. 휴대폰에서 승인한 뒤 인증 완료를 눌러주세요.");
        await loadStatus();
      },
    });
  }, [isPassOrg, loadStatus, loginOrgCd, mobileCo, mobileNo, resNm, resNo, runRequest]);

  const handleSign = useCallback(async () => {
    await runRequest<ActionResponse>({
      kind: "sign",
      url: "/api/health/nhis/sign",
      fallbackError: "인증 완료 처리에 실패했습니다.",
      onSuccess: async () => {
        setActionNotice("연동 인증이 완료되었습니다.");
        await loadStatus();
      },
    });
  }, [loadStatus, runRequest]);

  const handleFetch = useCallback(async () => {
    await runRequest<FetchResponse>({
      kind: "fetch",
      url: "/api/health/nhis/fetch",
      fallbackError: "데이터 조회에 실패했습니다.",
      onFailure: async (payload) => {
        setFetchFailures(payload.failed ?? []);
      },
      onSuccess: async (payload) => {
        setFetched(payload.data ?? null);
        setFetchFailures(payload.failed ?? []);
        setActionNotice(
          payload.partial
            ? "일부 항목만 동기화되었습니다. 실패 항목을 확인해 주세요."
            : "검진 데이터를 성공적으로 불러왔습니다."
        );
        await loadStatus();
      },
    });
  }, [loadStatus, runRequest]);

  const handleUnlink = useCallback(async () => {
    await runRequest<ActionResponse>({
      kind: "unlink",
      url: "/api/health/nhis/unlink",
      fallbackError: "연동 해제에 실패했습니다.",
      onSuccess: async () => {
        setFetched(null);
        setFetchFailures([]);
        setActionNotice("연동이 해제되었습니다.");
        await loadStatus();
      },
    });
  }, [loadStatus, runRequest]);

  const currentStep = useMemo(() => {
    if (fetched) return 3;
    if (status?.linked) return 2;
    if (status?.pendingAuthReady || status?.hasStepData) return 1;
    return 0;
  }, [fetched, status?.hasStepData, status?.linked, status?.pendingAuthReady]);

  const summary = fetched?.normalized?.checkup?.summary;
  const lifestyleHighlights = fetched?.normalized?.lifestyle?.highlights ?? [];
  const healthAge = fetched?.normalized?.healthAge;

  const statusChipClass = status?.linked ? styles.chipSuccess : styles.chipWarn;
  const statusChipLabel = status?.linked ? "연동 완료" : "미연동";

  return (
    <div className={styles.pageShell}>
      <div className={styles.glowA} aria-hidden />
      <div className={styles.glowB} aria-hidden />

      <header className={styles.hero}>
        <div className={styles.heroKicker}>WellnessBox x HYPHEN</div>
        <h1 className={styles.heroTitle}>국민건강보험 진료정보2 연동 센터</h1>
        <p className={styles.heroSub}>
          연동 상태 확인, EASY 인증(init/sign), 데이터 동기화(0977/0981/0982)를 한 화면에서 진행합니다.
        </p>
        <div className={styles.heroChips}>
          <span className={styles.chip}>Provider: {status?.provider ?? "HYPHEN_NHIS"}</span>
          <span className={`${styles.chip} ${statusChipClass}`}>{statusChipLabel}</span>
        </div>
      </header>

      {!loggedIn ? (
        <section className={styles.block}>
          <div className={styles.warnBox}>카카오 로그인 후 연동을 진행해 주세요.</div>
        </section>
      ) : null}

      <section className={styles.block}>
        <div className={styles.stepRow}>
          {STEP_ITEMS.map((step, index) => {
            const active = currentStep >= index + 1;
            return (
              <div key={step.key} className={styles.stepItem}>
                <div className={`${styles.stepDot} ${active ? styles.stepDotActive : ""}`}>
                  {index + 1}
                </div>
                <div className={styles.stepText}>
                  <div className={styles.stepTitle}>{step.title}</div>
                  <div className={styles.stepSub}>{step.subtitle}</div>
                </div>
                {index < STEP_ITEMS.length - 1 ? (
                  <div className={`${styles.stepLine} ${currentStep > index + 1 ? styles.stepLineActive : ""}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.block}>
          <div className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>1) 연동 상태</h2>
            <button
              type="button"
              onClick={() => void loadStatus()}
              disabled={!loggedIn || statusLoading}
              className={styles.ghostButton}
            >
              {statusLoading ? "조회 중..." : "새로고침"}
            </button>
          </div>

          {statusError ? <div className={styles.errorInline}>{statusError}</div> : null}

          <div className={styles.metaGrid}>
            <StatusMeta label="Linked" value={status?.linked ? "true" : "false"} />
            <StatusMeta label="Login Method" value={status?.loginMethod ?? "-"} />
            <StatusMeta label="Login Org" value={getHyphenLoginOrgLabel(status?.loginOrgCd)} />
            <StatusMeta label="Last Linked" value={formatDateTime(status?.lastLinkedAt)} />
            <StatusMeta label="Last Fetch" value={formatDateTime(status?.lastFetchedAt)} />
            <StatusMeta
              label="Session"
              value={status?.pendingAuthReady ? "init ready" : "idle"}
            />
          </div>

          {status?.lastError?.message ? (
            <div className={styles.warnBox}>
              최근 오류: {parseErrorMessage(status.lastError.message, "하이픈 처리 오류")}
            </div>
          ) : null}
        </section>

        <section className={styles.block}>
          <div className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>2) EASY 인증</h2>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>인증 기관</span>
              <select
                value={loginOrgCd}
                onChange={(event) => setLoginOrgCd(event.target.value as HyphenEasyLoginOrg)}
                className={styles.input}
                disabled={!canRequest}
              >
                {HYPHEN_EASY_LOGIN_ORG_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>이름</span>
              <input
                value={resNm}
                onChange={(event) => setResNm(event.target.value)}
                className={styles.input}
                placeholder="홍길동"
                disabled={!canRequest}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>생년월일 (YYYYMMDD)</span>
              <input
                value={resNo}
                onChange={(event) => setResNo(event.target.value.replace(/\D/g, ""))}
                className={styles.input}
                placeholder="19900101"
                maxLength={8}
                disabled={!canRequest}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>휴대폰 번호</span>
              <input
                value={mobileNo}
                onChange={(event) => setMobileNo(event.target.value.replace(/\D/g, ""))}
                className={styles.input}
                placeholder="01012345678"
                maxLength={11}
                disabled={!canRequest}
              />
            </label>

            {isPassOrg ? (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>통신사 (PASS)</span>
                <select
                  value={mobileCo}
                  onChange={(event) => setMobileCo(event.target.value as HyphenPassMobileCo)}
                  className={styles.input}
                  disabled={!canRequest}
                >
                  {HYPHEN_PASS_MOBILE_CO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className={styles.helperCard}>
                {getHyphenLoginOrgLabel(loginOrgCd)} 인증은 통신사 입력이 필요하지 않습니다.
              </div>
            )}
          </div>

          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={() => void handleInit()}
              disabled={!canRequest}
              className={styles.primaryButton}
            >
              {actionLoading === "init" ? "요청 중..." : "인증 요청"}
            </button>
            <button
              type="button"
              onClick={() => void handleSign()}
              disabled={!canRequest}
              className={styles.successButton}
            >
              {actionLoading === "sign" ? "처리 중..." : "인증 완료"}
            </button>
            <button
              type="button"
              onClick={() => void handleUnlink()}
              disabled={!canRequest}
              className={styles.dangerButton}
            >
              {actionLoading === "unlink" ? "해제 중..." : "연동 해제"}
            </button>
          </div>

          {actionNotice ? <div className={styles.noticeInline}>{actionNotice}</div> : null}
          {actionError ? <div className={styles.errorInline}>{actionError}</div> : null}
        </section>
      </div>

      <section className={styles.block}>
        <div className={styles.blockHeader}>
          <h2 className={styles.blockTitle}>3) 데이터 동기화 / 표시</h2>
          <button
            type="button"
            onClick={() => void handleFetch()}
            disabled={!canRequest}
            className={styles.primaryButton}
          >
            {actionLoading === "fetch" ? "동기화 중..." : "검진정보 불러오기"}
          </button>
        </div>

        {fetchFailures.length > 0 ? (
          <div className={styles.warnBox}>
            일부 조회 실패:
            {fetchFailures.map((failure) => (
              <div key={failure.target}>
                {failure.target} - {parseErrorMessage(failure.errMsg, "요청 실패")}
              </div>
            ))}
          </div>
        ) : null}

        <div className={styles.resultGrid}>
          <article className={styles.resultCard}>
            <h3 className={styles.resultTitle}>최근 검진 요약</h3>
            <div className={styles.resultBody}>
              <div>검진일: {summary?.measuredAt ?? "-"}</div>
              <div>혈압: {summary?.bloodPressure ?? "-"}</div>
              <div>공복혈당: {summary?.fastingGlucose ?? "-"}</div>
              <div>총콜레스테롤: {summary?.totalCholesterol ?? "-"}</div>
              <div>
                HDL / LDL: {summary?.hdl ?? "-"} / {summary?.ldl ?? "-"}
              </div>
              <div>중성지방: {summary?.triglyceride ?? "-"}</div>
              <div>
                체중 / 허리둘레: {summary?.weight ?? "-"} / {summary?.waist ?? "-"}
              </div>
            </div>
          </article>

          <article className={styles.resultCard}>
            <h3 className={styles.resultTitle}>생활습관 요약</h3>
            {lifestyleHighlights.length === 0 ? (
              <div className={styles.emptyHint}>생활습관 데이터가 없습니다.</div>
            ) : (
              <ul className={styles.listStack}>
                {lifestyleHighlights.slice(0, 6).map((line, index) => (
                  <li key={`${line}-${index}`} className={styles.listItem}>
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.resultCard}>
            <h3 className={styles.resultTitle}>건강나이</h3>
            <div className={styles.healthAge}>{healthAge?.healthAge ?? "-"}</div>
            <div className={styles.resultSubTitle}>위험요인 요약</div>
            {renderRiskFactors(healthAge?.riskFactorTable)}
          </article>
        </div>
      </section>
    </div>
  );
}
