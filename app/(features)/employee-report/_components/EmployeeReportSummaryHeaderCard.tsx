"use client";

import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeReportResponse } from "../_lib/client-types";
import { formatRelativeTime } from "../_lib/client-utils.format";

type EmployeeReportSummaryHeaderCardProps = {
  reportData: EmployeeReportResponse;
  selectedPeriodKey: string;
  periodOptions: string[];
  busy: boolean;
  syncNextAction: "init" | "sign" | "retry" | null;
  primarySyncActionLabel?: string;
  canUseForceSync: boolean;
  forceSyncRemainingSec: number;
  onPeriodChange: (nextPeriod: string) => void;
  onDownloadPdf: () => void;
  onDownloadLegacyPdf: () => void;
  onRestartAuth: () => void;
  onSignAndSync: () => void;
  onLogout: () => void;
  onOpenForceSync: () => void;
};

export default function EmployeeReportSummaryHeaderCard({
  reportData,
  selectedPeriodKey,
  periodOptions,
  busy,
  syncNextAction,
  primarySyncActionLabel,
  canUseForceSync,
  forceSyncRemainingSec,
  onPeriodChange,
  onDownloadPdf,
  onDownloadLegacyPdf,
  onRestartAuth,
  onSignAndSync,
  onLogout,
  onOpenForceSync,
}: EmployeeReportSummaryHeaderCardProps) {
  if (!reportData.report) return null;

  const employeeName =
    reportData.report.payload?.meta?.employeeName || reportData.employee?.name || "이용자";
  const showSyncRetryButton = syncNextAction === "sign" || syncNextAction === "retry";
  const defaultPrimarySyncActionLabel =
    primarySyncActionLabel?.trim() || "최신 정보 확인";
  const syncRetryButtonLabel =
    syncNextAction === "sign" ? "카카오톡 인증 완료 후 확인" : "다시 시도";
  const syncRetryBusyLabel = syncNextAction === "sign" ? "확인 중" : "재시도 중";
  const showPdfDownloadButton = true;

  return (
    <section className={styles.sectionCard} data-testid="employee-report-summary-section">
      <div className={styles.sectionHeader}>
        <div className={styles.summaryTitleBlock}>
          <h2 className={styles.sectionTitle}>{employeeName}님 리포트</h2>
          <p className={styles.sectionDescription}>
            마지막 업데이트:{" "}
            {formatRelativeTime(
              reportData.employee?.lastSyncedAt || reportData.report.updatedAt
            )}
          </p>
        </div>
        <div className={`${styles.statusRow} ${styles.summaryStatusRow}`}>
          {selectedPeriodKey ? <span className={styles.pill}>{selectedPeriodKey}</span> : null}
          {reportData.report.payload?.meta?.isMockData ? (
            <span className={styles.statusWarn}>데모 데이터</span>
          ) : null}
        </div>
      </div>

      <div className={styles.summaryControlPanel}>
        <select
          className={`${styles.select} ${styles.summaryPeriodSelect}`}
          value={selectedPeriodKey}
          disabled={busy || periodOptions.length === 0}
          onChange={(event) => onPeriodChange(event.target.value)}
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
        {showPdfDownloadButton ? (
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={busy}
            data-testid="employee-report-download-pdf"
            className={`${styles.buttonPrimary} ${styles.summaryPrimaryButton}`}
          >
            {busy ? <InlineSpinnerLabel label="PDF 생성 중" /> : "PDF 다운로드"}
          </button>
        ) : null}
      </div>

      <p className={styles.inlineHint}>이 리포트는 진단과 조제 이력을 함께 반영합니다.</p>

      <div className={`${styles.actionRow} ${styles.summarySecondaryActions}`}>
        {showSyncRetryButton ? (
          <button
            type="button"
            onClick={onSignAndSync}
            disabled={busy}
            data-testid="employee-report-sign-sync"
            className={styles.buttonSecondary}
          >
            {busy ? <InlineSpinnerLabel label={syncRetryBusyLabel} /> : syncRetryButtonLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRestartAuth}
            disabled={busy}
            data-testid="employee-report-restart-auth"
            className={styles.buttonSecondary}
          >
            {busy ? <InlineSpinnerLabel label="처리 중" /> : defaultPrimarySyncActionLabel}
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          disabled={busy}
          className={styles.buttonGhost}
        >
          {busy ? <InlineSpinnerLabel label="세션 해제 중" /> : "다른 이름 조회"}
        </button>
      </div>

      {forceSyncRemainingSec > 0 ? (
        <p className={styles.inlineHint}>
          강제 조회까지 약 {Math.ceil(forceSyncRemainingSec / 60)}분 남아 있어요.
        </p>
      ) : null}

      {canUseForceSync ? (
        <details className={styles.optionalCard} data-testid="employee-report-force-sync-panel">
          <summary data-testid="employee-report-force-sync-summary">
            운영자용 강제 조회 (비용 발생)
          </summary>
          <div className={styles.optionalBody}>
            <p className={styles.optionalText}>
              캐시를 무시하고 원본 API를 다시 조회합니다. 추가 비용이 발생하므로 꼭
              필요한 경우에만 사용해 주세요.
            </p>
            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={onOpenForceSync}
                disabled={busy || forceSyncRemainingSec > 0}
                data-testid="employee-report-force-sync-open"
                className={styles.buttonDanger}
              >
                {busy ? <InlineSpinnerLabel label="강제 조회 중" /> : "강제 조회 실행"}
              </button>
              <button
                type="button"
                onClick={onDownloadLegacyPdf}
                disabled={busy}
                className={styles.buttonGhost}
              >
                {busy ? (
                  <InlineSpinnerLabel label="기존 PDF 생성 중" />
                ) : (
                  "기존 PDF 엔진 다운로드"
                )}
              </button>
            </div>
            {forceSyncRemainingSec > 0 ? (
              <p className={styles.inlineHint}>
                강제 조회까지 약 {Math.ceil(forceSyncRemainingSec / 60)}분 남아 있어요.
              </p>
            ) : null}
            <p className={styles.inlineHint}>노출 조건: 관리자 로그인 또는 `?debug=1`</p>
          </div>
        </details>
      ) : null}
    </section>
  );
}
