import styles from "@/components/b2b/B2bUx.module.css";

export default function EmployeeReportBootSkeleton() {
  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.compactPage} ${styles.stack}`}>
        <header className={styles.heroCard}>
          <span
            className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
            style={{ width: "min(118px, 34%)" }}
          />
          <span
            className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
            style={{ width: "min(430px, 72%)" }}
          />
          <span
            className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
            style={{ width: "min(320px, 56%)" }}
          />
          <div className={styles.skeletonRow}>
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: "min(112px, 28%)" }}
            />
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: "min(128px, 32%)" }}
            />
          </div>
        </header>
        <section className={styles.sectionCard}>
          <div className={styles.skeletonRow}>
            <span
              className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
              style={{ width: "min(360px, 64%)" }}
            />
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: "min(104px, 28%)" }}
            />
          </div>
          <div className={styles.summaryControlPanel}>
            <span
              className={`${styles.skeletonBlock}`}
              style={{ width: "100%", height: 40, borderRadius: 10 }}
            />
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: "min(188px, 100%)", height: 38 }}
            />
          </div>
          <div className={`${styles.actionRow} ${styles.summarySecondaryActions}`}>
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: "min(132px, 34%)" }}
            />
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: "min(118px, 32%)" }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
