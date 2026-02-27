import styles from "@/components/b2b/B2bUx.module.css";
import type { SyncGuidance } from "../_lib/client-types";
import { formatDateTime } from "../_lib/client-utils";

type EmployeeReportSyncGuidanceNoticeProps = {
  guidance: SyncGuidance;
  busy: boolean;
  showActions?: boolean;
  onRestartAuth: () => void;
  onSignAndSync: () => void;
};

export default function EmployeeReportSyncGuidanceNotice({
  guidance,
  busy,
  showActions = true,
  onRestartAuth,
  onSignAndSync,
}: EmployeeReportSyncGuidanceNoticeProps) {
  return (
    <section className={styles.noticeInfo}>
      <p className={styles.optionalText}>{guidance.message}</p>

      {showActions ? (
        <div className={`${styles.actionRow} ${styles.mt8}`}>
          {guidance.nextAction === "init" ? (
            <button
              type="button"
              onClick={onRestartAuth}
              disabled={busy}
              data-testid="employee-report-restart-auth"
              className={styles.buttonPrimary}
            >
              {busy ? "처리 중..." : "인증 다시하기"}
            </button>
          ) : null}

          {guidance.nextAction === "sign" ? (
            <>
              <button
                type="button"
                onClick={onSignAndSync}
                disabled={busy}
                data-testid="employee-report-sign-sync"
                className={styles.buttonSecondary}
              >
                {busy ? "확인 중..." : "연동 완료 확인"}
              </button>
              <button
                type="button"
                onClick={onRestartAuth}
                disabled={busy}
                data-testid="employee-report-restart-auth-from-sign"
                className={styles.buttonGhost}
              >
                {busy ? "요청 중..." : "인증 다시 요청"}
              </button>
            </>
          ) : null}

          {guidance.nextAction === "retry" ? (
            <button
              type="button"
              onClick={onSignAndSync}
              disabled={busy}
              data-testid="employee-report-sign-sync"
              className={styles.buttonSecondary}
            >
              {busy ? "재시도 중..." : "다시 시도"}
            </button>
          ) : null}
        </div>
      ) : null}

      {guidance.availableAt ? (
        <p className={styles.inlineHint}>
          다시 시도 가능 시각: {formatDateTime(guidance.availableAt)}
        </p>
      ) : null}
    </section>
  );
}
