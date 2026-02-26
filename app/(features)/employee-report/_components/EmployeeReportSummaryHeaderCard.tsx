import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeReportResponse } from "../_lib/client-types";
import { formatRelativeTime } from "../_lib/client-utils";

type EmployeeReportSummaryHeaderCardProps = {
  reportData: EmployeeReportResponse;
  selectedPeriodKey: string;
  periodOptions: string[];
  busy: boolean;
  syncNextAction: "init" | "sign" | "retry" | null;
  canUseForceSync: boolean;
  forceSyncRemainingSec: number;
  onPeriodChange: (nextPeriod: string) => void;
  onDownloadPdf: () => void;
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
  canUseForceSync,
  forceSyncRemainingSec,
  onPeriodChange,
  onDownloadPdf,
  onRestartAuth,
  onSignAndSync,
  onLogout,
  onOpenForceSync,
}: EmployeeReportSummaryHeaderCardProps) {
  if (!reportData.report) return null;

  return (
    <section className={styles.sectionCard} data-testid="employee-report-summary-section">
      <div className={styles.sectionHeader}>
        <div className={styles.summaryTitleBlock}>
          <h2 className={styles.sectionTitle}>
            {(reportData.report.payload?.meta?.employeeName ||
              reportData.employee?.name ||
              "대상자")}
            님 레포트
          </h2>
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
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={busy}
          data-testid="employee-report-download-pdf"
          className={`${styles.buttonPrimary} ${styles.summaryPrimaryButton}`}
        >
          {busy ? "PDF 생성 중..." : "PDF 다운로드"}
        </button>
      </div>
      <div className={`${styles.actionRow} ${styles.summarySecondaryActions}`}>
        <button
          type="button"
          onClick={onRestartAuth}
          disabled={busy}
          data-testid="employee-report-restart-auth"
          className={styles.buttonSecondary}
        >
          {busy ? "처리 중..." : "인증 다시하기"}
        </button>
        {syncNextAction === "sign" ? (
          <button
            type="button"
            onClick={onSignAndSync}
            disabled={busy}
            data-testid="employee-report-sign-sync"
            className={styles.buttonSecondary}
          >
            {busy ? "확인 중..." : "연동 완료 확인"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLogout}
          disabled={busy}
          className={styles.buttonGhost}
        >
          {busy ? "세션 해제 중..." : "다른 이름 조회"}
        </button>
      </div>
      {forceSyncRemainingSec > 0 ? (
        <p className={styles.inlineHint}>
          재연동 가능까지 약 {Math.ceil(forceSyncRemainingSec / 60)}분 남았습니다.
        </p>
      ) : null}

      {canUseForceSync ? (
        <details className={styles.optionalCard} data-testid="employee-report-force-sync-panel">
          <summary data-testid="employee-report-force-sync-summary">
            운영자 도구 (비용 발생)
          </summary>
          <div className={styles.optionalBody}>
            <p className={styles.optionalText}>
              강제 재조회는 캐시를 무시하고 외부 조회를 시도합니다. 비용이 발생할 수
              있으므로 운영자 점검 시에만 사용하세요.
            </p>
            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={onOpenForceSync}
                disabled={busy || forceSyncRemainingSec > 0}
                data-testid="employee-report-force-sync-open"
                className={styles.buttonDanger}
              >
                {busy ? "강제 재조회 중..." : "강제 재조회 실행"}
              </button>
            </div>
            {forceSyncRemainingSec > 0 ? (
              <p className={styles.inlineHint}>
                강제 재조회 가능까지 약 {Math.ceil(forceSyncRemainingSec / 60)}분
                남았습니다.
              </p>
            ) : null}
            <p className={styles.inlineHint}>
              노출 조건: 관리자 로그인 또는 `?debug=1` 플래그
            </p>
          </div>
        </details>
      ) : null}
    </section>
  );
}
