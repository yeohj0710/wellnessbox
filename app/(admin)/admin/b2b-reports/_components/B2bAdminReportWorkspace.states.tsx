import styles from "@/components/b2b/B2bUx.module.css";

export function B2bAdminReportSelectionPlaceholder() {
  return (
    <section className={`${styles.sectionCard} ${styles.reportSelectionPlaceholder}`}>
      <p className={styles.reportSelectionPlaceholderText}>
        직원을 선택하면 리포트 미리보기와 편집 도구가 함께 열립니다.
      </p>
    </section>
  );
}

export function B2bAdminReportDetailMissingState() {
  return (
    <section className={`${styles.sectionCard} ${styles.reportSelectionPlaceholder}`}>
      <p className={styles.reportSelectionPlaceholderText}>
        아직 상세 데이터를 불러오지 못했습니다. 다시 시도해 주세요.
      </p>
    </section>
  );
}
