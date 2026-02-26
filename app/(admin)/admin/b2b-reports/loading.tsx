import styles from "@/components/b2b/B2bUx.module.css";

export default function AdminB2bReportsLoading() {
  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
        <header className={styles.heroCard}>
          <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} />
        </header>
        <section className={styles.sectionCard}>
          <div className={styles.skeletonRow}>
            <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
            <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
          </div>
          <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} />
        </section>
        <section className={styles.sectionCard}>
          <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} />
        </section>
      </div>
    </div>
  );
}
