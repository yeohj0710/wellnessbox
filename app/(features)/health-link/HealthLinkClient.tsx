"use client";

import Image from "next/image";
import { getHyphenLoginOrgLabel } from "@/lib/shared/hyphen-login";
import { NHIS_WORKFLOW_STEPS } from "./constants";
import type { HealthLinkClientProps, NhisDataRow, NhisListSummary } from "./types";
import { useNhisHealthLink } from "./useNhisHealthLink";
import {
  describeFetchFailure,
  filterCheckupMetricRows,
  formatDataCell,
  formatDateTime,
  mapFieldLabel,
  mapTargetLabel,
  parseErrorMessage,
  pickTableColumns,
  toJsonPreview,
} from "./utils";
import styles from "./HealthLinkClient.module.css";

type PrimaryFlow = {
  kind: "init" | "sign" | "fetch";
  step: 1 | 2 | 3;
  title: string;
  guide: string;
};

function SpinnerLabel({ loading, label }: { loading: boolean; label: string }) {
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
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <section className={styles.metricCard}>
      <h3 className={styles.metricTitle}>{title}</h3>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricNote}>{note}</p>
    </section>
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

function StepStrip({ activeStep, completedStep }: { activeStep: number; completedStep: number }) {
  return (
    <div className={styles.stepStrip}>
      {NHIS_WORKFLOW_STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const done = completedStep >= stepNumber;
        const current = !done && activeStep === stepNumber;
        const stateClass = done ? styles.stepDone : current ? styles.stepCurrent : styles.stepPending;
        return (
          <div key={step.id} className={`${styles.stepItem} ${stateClass}`}>
            <span className={styles.stepNumber}>{stepNumber}</span>
            <div className={styles.stepCopy}>
              <strong>{step.title}</strong>
              <span>{step.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DataTablePanel({
  title,
  summary,
  rows,
  emptyText,
  maxRows = 18,
}: {
  title: string;
  summary?: NhisListSummary;
  rows: NhisDataRow[];
  emptyText: string;
  maxRows?: number;
}) {
  const columns = pickTableColumns(rows, 8);
  const previewRows = rows.slice(0, maxRows);
  const hasRows = previewRows.length > 0 && columns.length > 0;

  return (
    <section className={styles.dataPanel}>
      <div className={styles.dataPanelHeader}>
        <h3 className={styles.dataPanelTitle}>{title}</h3>
        <span className={styles.dataPanelCount}>{summary?.totalCount ?? rows.length}건</span>
      </div>

      {!hasRows ? (
        <div className={styles.emptyHint}>{emptyText}</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col">
                      {mapFieldLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {columns.map((column) => (
                      <td key={`${rowIndex}-${column}`}>{formatDataCell(row[column])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > previewRows.length ? (
            <p className={styles.tableHint}>
              전체 {rows.length}건 중 {previewRows.length}건만 표시합니다.
            </p>
          ) : null}
        </>
      )}
    </section>
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

  const hasAuthRequested = !!(status?.pendingAuthReady || status?.hasStepData);
  const statusLinked = !!status?.linked;
  const statusChipLabel = statusLinked ? "연동 완료" : hasAuthRequested ? "인증 대기" : "미연동";
  const statusChipTone = statusLinked
    ? styles.statusOn
    : hasAuthRequested
      ? styles.statusPending
      : styles.statusOff;

  const primaryFlow: PrimaryFlow = statusLinked
    ? {
        kind: "fetch",
        step: 3,
        title: "건강검진 수치 불러오기",
        guide: "연결된 계정에서 건강검진 핵심 수치만 조회합니다.",
      }
    : hasAuthRequested
      ? {
          kind: "sign",
          step: 2,
          title: "카카오 인증 완료 확인",
          guide: "카카오 앱에서 인증을 완료했다면 다음을 눌러 연동을 확정해 주세요.",
        }
      : {
          kind: "init",
          step: 1,
          title: "카카오 인증 요청",
          guide: "이름, 생년월일, 휴대폰 번호를 확인한 뒤 다음으로 진행합니다.",
        };

  const checkupOverviewRows = fetched?.normalized?.checkup?.overview ?? [];
  const checkupSummary = fetched?.normalized?.checkup?.summary;
  const checkupMetricRows = filterCheckupMetricRows(checkupOverviewRows);
  const displayRows = checkupMetricRows.length > 0 ? checkupMetricRows : checkupOverviewRows;
  const hasFetchResult = displayRows.length > 0;
  const hasRawData = fetched?.raw?.checkupOverview !== undefined;

  const primaryLoading = actionLoading === primaryFlow.kind;
  const primaryButtonLabel =
    primaryFlow.kind === "fetch" && hasFetchResult ? "다시 불러오기" : "다음";
  const primaryDisabled =
    !loggedIn ||
    !canRequest ||
    (primaryFlow.kind === "sign" && !canSign) ||
    (primaryFlow.kind === "fetch" && !canFetch);

  const handlePrimaryAction = () => {
    if (primaryFlow.kind === "init") {
      void handleInit();
      return;
    }
    if (primaryFlow.kind === "sign") {
      void handleSign();
      return;
    }
    void handleFetch();
  };

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <p className={styles.kicker}>HYPHEN CONNECT</p>
        <h1 className={styles.title}>건강검진 수치 간편 연동</h1>
        <p className={styles.description}>
          진료/투약 이력은 제외하고, 건강검진의 핵심 수치만 최소 호출로 가져옵니다.
        </p>
        <div className={styles.statusRow}>
          <span className={`${styles.statusBadge} ${statusChipTone}`}>{statusChipLabel}</span>
          <span className={styles.infoPill}>기관 {getHyphenLoginOrgLabel(status?.loginOrgCd)}</span>
          <span className={styles.infoPill}>최근 연동 {formatDateTime(status?.lastLinkedAt)}</span>
        </div>
      </header>

      {!loggedIn ? (
        <section className={styles.noticeCritical}>카카오 로그인 후 연동을 진행해 주세요.</section>
      ) : null}

      <article className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>1. 인증 및 연동</h2>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={!loggedIn || statusLoading}
            className={styles.ghostButton}
          >
            <SpinnerLabel loading={statusLoading} label="상태 새로고침" />
          </button>
        </div>

        <StepStrip activeStep={primaryFlow.step} completedStep={currentStep} />

        <div className={styles.formGrid}>
          <div className={styles.kakaoOnly}>
            <Image src="/kakao.svg" width={18} height={18} alt="Kakao" />
            <div>
              <strong>카카오로 인증하기</strong>
              <p>인증 채널은 카카오로 고정되어 있습니다.</p>
            </div>
          </div>

          <label className={styles.field}>
            <span>이름</span>
            <input
              value={resNm}
              onChange={(event) => setResNm(event.target.value)}
              className={styles.input}
              placeholder="홍길동"
              disabled={!canRequest}
            />
          </label>

          <label className={styles.field}>
            <span>생년월일 (YYYYMMDD)</span>
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
            <span>휴대폰 번호</span>
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

        <div className={styles.nextPanel}>
          <p className={styles.nextStepText}>
            현재 단계 {primaryFlow.step}/3 · {primaryFlow.title}
          </p>
          <p className={styles.nextGuideText}>{primaryFlow.guide}</p>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={primaryDisabled}
            className={styles.nextButton}
          >
            <SpinnerLabel loading={primaryLoading} label={primaryButtonLabel} />
          </button>
          <button
            type="button"
            onClick={() => void handleUnlink()}
            disabled={!canRequest}
            className={styles.unlinkButton}
          >
            연동 해제
          </button>
        </div>

        <div className={styles.noticeStack}>
          {statusError ? (
            <div className={styles.noticeError}>
              {parseErrorMessage(statusError, "연동 상태를 불러오지 못했습니다.")}
            </div>
          ) : null}
          {actionNotice ? <div className={styles.noticeSuccess}>{actionNotice}</div> : null}
          {actionError ? <div className={styles.noticeError}>{actionError}</div> : null}

          {showHealthInPrereqGuide ? (
            <div className={styles.prereqCard}>
              <strong>사전 설정이 필요합니다</strong>
              <p>건강iN 검진현황 서비스 연동 후 다시 시도해 주세요.</p>
              <a
                href="https://www.nhis.or.kr/nhis/index.do"
                target="_blank"
                rel="noreferrer"
                className={styles.prereqLink}
              >
                건강iN 바로가기
              </a>
            </div>
          ) : null}
        </div>

        <details className={styles.statusDetails}>
          <summary>연동 상세 정보</summary>
          <div className={styles.metaGrid}>
            <MetaField label="Linked" value={statusLinked ? "true" : "false"} />
            <MetaField label="Provider" value={status?.provider ?? "HYPHEN_NHIS"} />
            <MetaField label="Login Method" value={status?.loginMethod ?? "-"} />
            <MetaField label="Login Org" value={getHyphenLoginOrgLabel(status?.loginOrgCd)} />
            <MetaField label="Last Linked" value={formatDateTime(status?.lastLinkedAt)} />
            <MetaField label="Last Fetch" value={formatDateTime(status?.lastFetchedAt)} />
            <MetaField
              label="Last Error"
              value={
                status?.lastError?.message
                  ? parseErrorMessage(status.lastError.message, "연동 오류")
                  : "-"
              }
            />
          </div>
        </details>
      </article>

      <article className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>2. 건강검진 수치 결과</h2>
        </div>
        <p className={styles.sectionDescription}>
          기관명/장소 정보는 제외하고, 키·체중·혈압 같은 수치형 데이터만 우선 표시합니다.
        </p>

        {!status?.linked ? (
          <div className={styles.noticeInfo}>연동이 완료된 뒤 다음 버튼으로 데이터를 불러와 주세요.</div>
        ) : null}

        {fetchFailures.length > 0 ? (
          <div className={styles.noticeWarn}>
            일부 조회 실패
            {fetchFailures.map((failure) => (
              <div key={failure.target} className={styles.noticeLine}>
                {mapTargetLabel(failure.target)} - {describeFetchFailure(failure)}
              </div>
            ))}
          </div>
        ) : null}

        {!hasFetchResult ? (
          <div className={styles.emptyPanel}>아직 조회된 검진 수치가 없습니다.</div>
        ) : (
          <>
            <div className={styles.metricGrid}>
              <MetricCard
                title="수치 행"
                value={`${checkupMetricRows.length.toLocaleString("ko-KR")}건`}
                note="필터링된 핵심 수치"
              />
              <MetricCard
                title="원본 개요 행"
                value={`${checkupOverviewRows.length.toLocaleString("ko-KR")}건`}
                note="checkupOverview 원본 행 수"
              />
            </div>

            {checkupMetricRows.length === 0 ? (
              <div className={styles.noticeInfo}>
                수치형 필터 결과가 없어 원본 개요 데이터를 그대로 표시합니다.
              </div>
            ) : null}

            <DataTablePanel
              title="건강검진 핵심 수치"
              rows={displayRows}
              summary={{
                totalCount: displayRows.length,
                recentLines: checkupSummary?.recentLines ?? [],
              }}
              emptyText="표시할 수치 데이터가 없습니다."
              maxRows={24}
            />
          </>
        )}

        {hasRawData ? (
          <details className={styles.rawSection}>
            <summary>원본 응답(JSON)</summary>
            <div className={styles.rawGrid}>
              <RawJsonBlock title="checkupOverview raw" value={fetched?.raw?.checkupOverview ?? null} />
            </div>
          </details>
        ) : null}
      </article>
    </div>
  );
}
