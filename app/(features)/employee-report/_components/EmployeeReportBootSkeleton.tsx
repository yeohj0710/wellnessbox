import styles from "@/components/b2b/B2bUx.module.css";

export default function EmployeeReportBootSkeleton() {
  return (
    <div className={`${styles.page} ${styles.reportPage} ${styles.stack}`}>
      <header className={styles.heroCard}>
        <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
        <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
        <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} />
        <div className={styles.skeletonRow}>
          <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
        </div>
      </header>
      <section className={styles.sectionCard}>
        <div className={styles.skeletonRow}>
          <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
        </div>
        <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
        <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} />
      </section>
    </div>
  );
}
