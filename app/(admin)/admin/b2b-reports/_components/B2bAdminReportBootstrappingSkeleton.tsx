import styles from "@/components/b2b/B2bUx.module.css";

export default function B2bAdminReportBootstrappingSkeleton() {
  return (
    <>
      <section className={styles.heroCard} aria-live="polite" aria-busy="true">
        <span
          className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
          style={{ width: 132 }}
          aria-hidden="true"
        />
        <span
          className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
          style={{ width: "52%", marginTop: 18 }}
          aria-hidden="true"
        />
        <span
          className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
          style={{ width: "74%", marginTop: 10 }}
          aria-hidden="true"
        />
        <div className={styles.actionRow} style={{ marginTop: 20 }}>
          <span
            className={`${styles.skeletonBlock} ${styles.input}`}
            style={{ minWidth: 260, height: 44 }}
            aria-hidden="true"
          />
          <span
            className={`${styles.skeletonBlock} ${styles.buttonPrimary}`}
            style={{ width: 88, height: 44 }}
            aria-hidden="true"
          />
        </div>
      </section>

      <div className={styles.splitLayout} aria-hidden="true">
        <section className={`${styles.sectionCard} ${styles.sidebarCard}`}>
          <div className={styles.skeletonRow}>
            <span
              className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
              style={{ width: "42%" }}
            />
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: 68 }}
            />
          </div>
          <span
            className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
            style={{ width: "56%", marginTop: 10 }}
          />
          <div className={`${styles.listWrap} ${styles.listWrapGrid}`} style={{ marginTop: 16 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <span
                key={`initial-side-skeleton-${index}`}
                className={styles.skeletonBlock}
                style={{ width: "100%", height: 92, borderRadius: 18 }}
              />
            ))}
          </div>
        </section>

        <div className={styles.stack}>
          <section className={styles.sectionCard}>
            <div className={styles.skeletonRow}>
              <span
                className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
                style={{ width: "44%" }}
              />
              <span
                className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                style={{ width: 96 }}
              />
            </div>
            <span
              className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
              style={{ width: "72%", marginTop: 10 }}
            />
            <div className={styles.loadingKpiRow}>
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={`initial-kpi-skeleton-${index}`}
                  className={`${styles.skeletonBlock} ${styles.loadingKpi}`}
                />
              ))}
            </div>
          </section>

          <section className={styles.reportCanvas}>
            <div className={styles.reportCanvasHeader}>
              <div>
                <span
                  className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
                  style={{ width: 220 }}
                />
                <span
                  className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                  style={{ width: 340, marginTop: 8 }}
                />
              </div>
              <span
                className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                style={{ width: 170, height: 30 }}
              />
            </div>
            <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
              <span
                className={styles.skeletonBlock}
                style={{ width: "100%", minHeight: 520, borderRadius: 20 }}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
