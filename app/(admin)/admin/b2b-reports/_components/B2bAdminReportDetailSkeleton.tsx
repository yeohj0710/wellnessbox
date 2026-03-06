import styles from "@/components/b2b/B2bUx.module.css";

export default function B2bAdminReportDetailSkeleton() {
  return (
    <>
      <section className={styles.sectionCard} aria-live="polite" aria-busy="true">
        <div className={styles.skeletonRow}>
          <span
            className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
            style={{ width: "48%" }}
            aria-hidden="true"
          />
          <span
            className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
            style={{ width: 96 }}
            aria-hidden="true"
          />
        </div>
        <span
          className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
          style={{ width: "72%" }}
          aria-hidden="true"
        />
        <div className={styles.loadingKpiRow}>
          {Array.from({ length: 4 }).map((_, index) => (
            <span
              key={`overview-kpi-skeleton-${index}`}
              className={`${styles.skeletonBlock} ${styles.loadingKpi}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </section>

      <section className={styles.reportCanvas} aria-hidden="true">
        <div className={styles.reportCanvasHeader}>
          <div>
            <span
              className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
              style={{ width: 220 }}
            />
            <span
              className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
              style={{ width: 320, marginTop: 8 }}
            />
          </div>
          <span
            className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
            style={{ width: 160, height: 30 }}
          />
        </div>
        <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
          <span
            className={styles.skeletonBlock}
            style={{ width: "100%", minHeight: 560, borderRadius: 20 }}
          />
        </div>
      </section>

      {Array.from({ length: 3 }).map((_, index) => (
        <section key={`detail-panel-skeleton-${index}`} className={styles.sectionCard}>
          <div className={styles.skeletonRow}>
            <span
              className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
              style={{ width: "44%" }}
              aria-hidden="true"
            />
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: 88 }}
              aria-hidden="true"
            />
          </div>
          <span
            className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
            style={{ width: "84%" }}
            aria-hidden="true"
          />
          <span
            className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
            style={{ width: "68%" }}
            aria-hidden="true"
          />
        </section>
      ))}
    </>
  );
}
