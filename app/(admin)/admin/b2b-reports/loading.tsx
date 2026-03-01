import styles from "@/components/b2b/B2bUx.module.css";

const sidebarSkeletonItems = Array.from({ length: 5 });

export default function AdminB2bReportsLoading() {
  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
        <header className={styles.heroCard}>
          <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} />
          <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} style={{ width: "42%" }} />
          <span
            className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
            style={{ width: "68%" }}
          />
          <div className={styles.reportHeroSearchRow}>
            <span
              className={`${styles.skeletonBlock}`}
              style={{ width: "100%", height: 44, borderRadius: 12 }}
            />
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: "100%", maxWidth: 90, height: 38 }}
            />
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: "100%", maxWidth: 116, height: 38 }}
            />
          </div>
        </header>
        <div className={styles.splitLayout}>
          <section className={`${styles.sectionCard} ${styles.sidebarCard}`}>
            <div className={styles.skeletonRow}>
              <span
                className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                style={{ width: "54%", height: 16 }}
              />
              <span
                className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                style={{ width: 74, height: 22 }}
              />
            </div>
            <span
              className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
              style={{ width: "66%" }}
            />
            <div className={styles.stack}>
              {sidebarSkeletonItems.map((_, index) => (
                <span
                  key={`sidebar-skeleton-${index}`}
                  className={`${styles.skeletonBlock}`}
                  style={{ width: "100%", minHeight: 72, borderRadius: 14 }}
                />
              ))}
            </div>
          </section>
          <div className={styles.stack}>
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
              <span
                className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                style={{ width: "42%" }}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
