import styles from "@/components/b2b/B2bUx.module.css";

type EmployeeReportHeroCardProps = {
  reportReady: boolean;
  adminOnlyBlocked: boolean;
  adminOnlyStatusLabel: string;
  selectedPeriodKey: string;
};

export default function EmployeeReportHeroCard(
  props: EmployeeReportHeroCardProps
) {
  return (
    <header className={styles.heroCard}>
      <p className={styles.kicker}>EMPLOYEE REPORT</p>
      <h1 className={styles.title}>임직원 건강 리포트</h1>
      <p className={styles.description}>
        본인 확인을 마치면 선택한 기간의 건강 리포트를 바로 조회할 수 있어요.
      </p>
      <div className={styles.statusRow}>
        {props.reportReady ? (
          <span className={styles.statusOn}>리포트 준비 완료</span>
        ) : props.adminOnlyBlocked ? (
          <span className={styles.statusWarn}>{props.adminOnlyStatusLabel}</span>
        ) : (
          <span className={styles.statusOff}>본인 확인 필요</span>
        )}
        {props.selectedPeriodKey ? (
          <span className={styles.pill}>{props.selectedPeriodKey}</span>
        ) : null}
      </div>
    </header>
  );
}
