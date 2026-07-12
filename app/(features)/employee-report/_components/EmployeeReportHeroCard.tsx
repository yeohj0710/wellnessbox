import styles from "@/components/b2b/B2bUx.module.css";

type EmployeeReportHeroCardProps = {
  hasWorkspace: boolean;
  currentReportReady: boolean;
  statusBadge: string;
  periodKey: string;
};

export default function EmployeeReportHeroCard(
  props: EmployeeReportHeroCardProps
) {
  return (
    <header className={styles.heroCard}>
      <p className={styles.kicker}>EMPLOYEE REPORT</p>
      <h1 className={styles.title}>임직원 건강 리포트</h1>
      <p className={styles.description}>
        이름, 생년월일, 전화번호를 입력하면 먼저 확인 가능한 리포트를 보여드리고,
        필요한 다음 단계도 바로 이어서 진행할 수 있어요.
      </p>
      <div className={styles.statusRow}>
        {!props.hasWorkspace ? (
          <span className={styles.statusOff}>본인 확인 필요</span>
        ) : props.currentReportReady ? (
          <span className={styles.statusOn}>현재 주기 리포트 확인 가능</span>
        ) : (
          <span className={styles.statusWarn}>{props.statusBadge}</span>
        )}
        {props.periodKey ? (
          <span className={styles.pill}>{props.periodKey}</span>
        ) : null}
      </div>
    </header>
  );
}
