"use client";

import Image from "next/image";
import { getHyphenLoginOrgLabel } from "@/lib/shared/hyphen-login";
import { NHIS_WORKFLOW_STEPS } from "./constants";
import type { HealthLinkClientProps } from "./types";
import { useNhisHealthLink } from "./useNhisHealthLink";
import {
  describeFetchFailure,
  formatDateTime,
  formatYmd,
  mapTargetLabel,
  parseErrorMessage,
  toJsonPreview,
  toRiskFactorLines,
} from "./utils";
import styles from "./HealthLinkClient.module.css";

function SpinnerLabel({
  loading,
  label,
}: {
  loading: boolean;
  label: string;
}) {
  return (
    <span className={styles.spinnerLabel}>
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      <span>{label}</span>
    </span>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaCard}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={styles.metaValue}>{value}</div>
    </div>
  );
}

function RawJsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section className={styles.rawBlock}>
      <h4 className={styles.rawTitle}>{title}</h4>
      <pre className={styles.rawPre}>{toJsonPreview(value)}</pre>
    </section>
  );
}

function StepRail({ currentStep }: { currentStep: number }) {
  return (
    <div className={styles.stepRail}>
      {NHIS_WORKFLOW_STEPS.map((step, index) => {
        const active = currentStep >= index + 1;
        return (
          <div key={step.id} className={styles.stepItem}>
            <span className={`${styles.stepDot} ${active ? styles.stepDotOn : ""}`}>
              {index + 1}
            </span>
            <div className={styles.stepCopy}>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepSubtitle}>{step.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HealthLinkClient({ loggedIn }: HealthLinkClientProps) {
  const {
    status,
    statusError,
    statusLoading,
    resNm,
    setResNm,
    resNo,
    setResNo,
    mobileNo,
    setMobileNo,
    actionLoading,
    actionNotice,
    actionError,
    fetched,
    fetchFailures,
    canRequest,
    canSign,
    canFetch,
    currentStep,
    showHealthInPrereqGuide,
    loadStatus,
    handleInit,
    handleSign,
    handleFetch,
    handleUnlink,
  } = useNhisHealthLink(loggedIn);

  const statusLinked = !!status?.linked;
  const statusChipTone = statusLinked ? styles.statusChipLinked : styles.statusChipIdle;
  const statusChipLabel = statusLinked ? "연동 완료" : "미연동";

  const medicalSummary = fetched?.normalized?.medical?.summary;
  const medicationSummary = fetched?.normalized?.medication?.summary;
  const healthAge = fetched?.normalized?.healthAge;
  const riskFactorLines = toRiskFactorLines(healthAge?.riskFactorTable);
  const healthAgeFailure = fetchFailures.find((failure) => failure.target === "healthAge");
  const hasRawData =
    fetched?.raw?.medical !== undefined ||
    fetched?.raw?.medication !== undefined ||
    fetched?.raw?.healthAge !== undefined;

  return (
    <div className={styles.page}>
      <div className={styles.bgOrnamentA} aria-hidden />
      <div className={styles.bgOrnamentB} aria-hidden />

      <header className={styles.hero}>
        <div className={styles.heroTitleWrap}>
          <p className={styles.kicker}>HYPHEN CONNECT</p>
          <h1 className={styles.title}>국민건강보험 진료정보 연동</h1>
          <p className={styles.description}>
            카카오 인증으로 연동하고, 진료정보/투약정보/건강나이를 한 화면에서
            동기화합니다.
          </p>
          <div className={styles.heroChips}>
            <span className={styles.chip}>
              Provider: {status?.provider ?? "HYPHEN_NHIS"}
            </span>
            <span className={`${styles.chip} ${statusChipTone}`}>{statusChipLabel}</span>
          </div>
        </div>

        <aside className={styles.heroAside}>
          <div className={styles.kakaoBadge}>
            <Image src="/kakao.svg" width={17} height={17} alt="Kakao" />
            <span>KAKAO 인증 전용</span>
          </div>
          <StepRail currentStep={currentStep} />
        </aside>
      </header>

      {!loggedIn ? (
        <section className={styles.noticeCritical}>
          카카오 로그인 후 연동을 진행해 주세요.
        </section>
      ) : null}

      <section className={styles.mainGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>1) 연동 상태</h2>
            <button
              type="button"
              onClick={() => void loadStatus()}
              disabled={!loggedIn || statusLoading}
              className={styles.btnGhost}
            >
              <SpinnerLabel loading={statusLoading} label="새로고침" />
            </button>
          </div>

          {statusError ? <div className={styles.noticeError}>{statusError}</div> : null}

          <div className={styles.metaGrid}>
            <MetaField label="Linked" value={statusLinked ? "true" : "false"} />
            <MetaField label="Provider" value={status?.provider ?? "HYPHEN_NHIS"} />
            <MetaField label="Login Method" value={status?.loginMethod ?? "-"} />
            <MetaField
              label="Login Org"
              value={getHyphenLoginOrgLabel(status?.loginOrgCd)}
            />
            <MetaField label="Last Linked" value={formatDateTime(status?.lastLinkedAt)} />
            <MetaField label="Last Fetch" value={formatDateTime(status?.lastFetchedAt)} />
          </div>

          {status?.lastError?.message ? (
            <div className={styles.noticeWarn}>
              최근 오류: {parseErrorMessage(status.lastError.message, "연동 처리 오류")}
            </div>
          ) : null}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>2) EASY 인증</h2>
          </div>

          <div className={styles.inputGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>인증 채널</span>
              <div className={styles.kakaoField}>
                <Image src="/kakao.svg" width={16} height={16} alt="Kakao" />
                <span>KAKAO</span>
              </div>
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
          </div>

          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={() => void handleInit()}
              disabled={!canRequest}
              className={styles.btnPrimary}
            >
              <SpinnerLabel loading={actionLoading === "init"} label="인증 요청" />
            </button>

            <button
              type="button"
              onClick={() => void handleSign()}
              disabled={!canSign}
              className={styles.btnSuccess}
            >
              <SpinnerLabel loading={actionLoading === "sign"} label="인증 완료" />
            </button>

            <button
              type="button"
              onClick={() => void handleUnlink()}
              disabled={!canRequest}
              className={styles.btnDanger}
            >
              <SpinnerLabel loading={actionLoading === "unlink"} label="연동 해제" />
            </button>
          </div>

          <div className={styles.noticeStack}>
            {!canSign ? (
              <div className={styles.noticeInfo}>
                인증 완료 버튼은 인증 요청(init) 성공 후 활성화됩니다.
              </div>
            ) : null}

            {actionNotice ? <div className={styles.noticeSuccess}>{actionNotice}</div> : null}
            {actionError ? <div className={styles.noticeError}>{actionError}</div> : null}

            {showHealthInPrereqGuide ? (
              <div className={styles.prereqCard}>
                <strong>사전 설정 필요</strong>
                <p>
                  현재 계정은 국민건강보험 건강iN 검진현황서비스 사용자 연동이 선행되어야
                  조회가 가능합니다. 1회 연동 후 다시 시도해 주세요.
                </p>
                <a
                  href="https://www.nhis.or.kr/nhis/index.do"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.prereqLink}
                >
                  건강iN 홈페이지 바로가기
                </a>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>3) 데이터 동기화 / 결과</h2>
          <button
            type="button"
            onClick={() => void handleFetch()}
            disabled={!canFetch}
            className={styles.btnPrimary}
          >
            <SpinnerLabel loading={actionLoading === "fetch"} label="검진정보 불러오기" />
          </button>
        </div>

        {!status?.linked || fetchFailures.length > 0 ? (
          <div className={styles.noticeStack}>
            {!status?.linked ? (
              <div className={styles.noticeInfo}>
                데이터 조회는 연동 완료(sign 성공) 이후에만 가능합니다.
              </div>
            ) : null}
            {fetchFailures.length > 0 ? (
              <div className={styles.noticeWarn}>
                일부 조회 실패:
                {fetchFailures.map((failure) => (
                  <div key={failure.target} className={styles.noticeLine}>
                    {mapTargetLabel(failure.target)} -{" "}
                    {describeFetchFailure(failure)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.resultGrid}>
          <section className={styles.resultCard}>
            <h3 className={styles.resultTitle}>진료정보 요약</h3>
            <p className={styles.resultMeta}>조회 건수 {medicalSummary?.totalCount ?? 0}</p>
            {medicalSummary?.recentLines?.length ? (
              <ul className={styles.resultList}>
                {medicalSummary.recentLines.map((line, index) => (
                  <li key={`${line}-${index}`} className={styles.resultListItem}>
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyHint}>표시할 진료정보가 없습니다.</div>
            )}
          </section>

          <section className={styles.resultCard}>
            <h3 className={styles.resultTitle}>투약정보 요약</h3>
            <p className={styles.resultMeta}>
              조회 건수 {medicationSummary?.totalCount ?? 0}
            </p>
            {medicationSummary?.recentLines?.length ? (
              <ul className={styles.resultList}>
                {medicationSummary.recentLines.map((line, index) => (
                  <li key={`${line}-${index}`} className={styles.resultListItem}>
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyHint}>표시할 투약정보가 없습니다.</div>
            )}
          </section>

          <section className={styles.resultCard}>
            <h3 className={styles.resultTitle}>건강나이</h3>
            <div className={styles.healthAgeValue}>{healthAge?.healthAge ?? "-"}</div>
            <div className={styles.healthAgeMeta}>실제나이 {healthAge?.realAge ?? "-"}</div>
            <div className={styles.healthAgeMeta}>검진일 {formatYmd(healthAge?.checkupDate)}</div>
            {healthAge?.advice ? (
              <div className={styles.healthAgeAdvice}>{healthAge.advice}</div>
            ) : null}
            <div className={styles.resultSubTitle}>위험요인 요약</div>
            {riskFactorLines.length > 0 ? (
              <ul className={styles.resultList}>
                {riskFactorLines.map((line, index) => (
                  <li key={`${line}-${index}`} className={styles.resultListItem}>
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyHint}>
                {healthAgeFailure ? describeFetchFailure(healthAgeFailure) : "위험요인 데이터가 없습니다."}
              </div>
            )}
          </section>
        </div>

        {hasRawData ? (
          <details className={styles.rawSection}>
            <summary className={styles.rawSummary}>원본 응답(JSON) 보기</summary>
            <div className={styles.rawGrid}>
              <RawJsonBlock title="진료정보 raw" value={fetched?.raw?.medical ?? null} />
              <RawJsonBlock title="투약정보 raw" value={fetched?.raw?.medication ?? null} />
              <RawJsonBlock title="건강나이 raw" value={fetched?.raw?.healthAge ?? null} />
            </div>
          </details>
        ) : null}
      </article>
    </div>
  );
}
