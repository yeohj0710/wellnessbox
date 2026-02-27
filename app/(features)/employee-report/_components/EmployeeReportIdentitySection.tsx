import styles from "@/components/b2b/B2bUx.module.css";
import type { IdentityInput } from "../_lib/client-types";

type EmployeeReportIdentitySectionProps = {
  identity: IdentityInput;
  busy: boolean;
  showSignAction: boolean;
  hideActionRow?: boolean;
  onNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onRestartAuth: () => void;
  onSignAndSync: () => void;
  onFindExisting: () => void;
};

export default function EmployeeReportIdentitySection({
  identity,
  busy,
  showSignAction,
  hideActionRow = false,
  onNameChange,
  onBirthDateChange,
  onPhoneChange,
  onRestartAuth,
  onSignAndSync,
  onFindExisting,
}: EmployeeReportIdentitySectionProps) {
  return (
    <section className={styles.sectionCard} aria-busy={busy}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>1. 본인 정보 입력</h2>
          <p className={styles.sectionDescription}>
            리포트 조회를 위해 이름, 생년월일, 휴대폰 번호를 입력해 주세요.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>이름</span>
          <input
            className={styles.input}
            value={identity.name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="홍길동"
            disabled={busy}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>생년월일 (8자리)</span>
          <input
            className={styles.input}
            value={identity.birthDate}
            onChange={(event) => onBirthDateChange(event.target.value)}
            placeholder="19900101"
            disabled={busy}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>휴대폰 번호</span>
          <input
            className={styles.input}
            value={identity.phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            placeholder="01012345678"
            disabled={busy}
          />
        </label>
      </div>

      {!hideActionRow ? (
        <div className={styles.actionRow}>
          <button
            type="button"
            onClick={onRestartAuth}
            disabled={busy}
            data-testid="employee-report-restart-auth"
            className={styles.buttonPrimary}
          >
            {busy ? "처리 중..." : "인증 다시하기"}
          </button>
          {showSignAction ? (
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
        </div>
      ) : null}

      <details className={styles.optionalCard}>
        <summary>기존 조회 기록이 있으면 바로 불러오기</summary>
        <div className={styles.optionalBody}>
          <p className={styles.optionalText}>
            이전에 같은 이름/생년월일/휴대폰 번호로 조회한 기록이 있으면 인증 없이
            리포트를 바로 불러올 수 있습니다.
          </p>
          <div className={styles.actionRow}>
            <button
              type="button"
              onClick={onFindExisting}
              disabled={busy}
              className={styles.buttonGhost}
            >
              {busy ? "불러오는 중..." : "기존 조회 정보 불러오기"}
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
