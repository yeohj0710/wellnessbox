import styles from "@/components/b2b/B2bUx.module.css";

export default function B2bAdminReportDetailSkeleton() {
  return (
    <>
      <section className={styles.sectionCard} aria-live="polite" aria-busy="true">
        <div className={styles.skeletonRow}>
          <span
            className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
            style={{ width: "36%" }}
            aria-hidden="true"
          />
          <span
            className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
            style={{ width: 110, height: 28 }}
            aria-hidden="true"
          />
        </div>
        <span
          className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
          style={{ width: "54%" }}
          aria-hidden="true"
        />
        <div className={styles.actionRow}>
          <span className={styles.skeletonBlock} style={{ width: 148, height: 44, borderRadius: 12 }} />
          <span className={styles.skeletonBlock} style={{ width: 152, height: 44, borderRadius: 12 }} />
          <span className={styles.skeletonBlock} style={{ width: 124, height: 44, borderRadius: 12 }} />
        </div>
        <span
          className={styles.skeletonBlock}
          style={{ width: "100%", minHeight: 196, borderRadius: 18 }}
          aria-hidden="true"
        />
      </section>

      <section className={styles.reportCanvas} aria-hidden="true">
        <div className={styles.reportCanvasHeader}>
          <div>
            <span
              className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
              style={{ width: 240 }}
            />
            <span
              className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
              style={{ width: 348, marginTop: 8 }}
            />
          </div>
          <span
            className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
            style={{ width: 132, height: 30 }}
          />
        </div>
        <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
          <span
            className={styles.skeletonBlock}
            style={{ width: "100%", minHeight: 640, borderRadius: 20 }}
          />
        </div>
      </section>

      <section className={`${styles.optionalCard} ${styles.editorPanel}`}>
        <div className={styles.editorPanelMotion}>
          <div className={styles.editorPanelBody}>
            <div className={styles.skeletonRow}>
              <span
                className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                style={{ width: 132, height: 18 }}
              />
              <span
                className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                style={{ width: 184 }}
              />
            </div>
            <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 96, borderRadius: 18 }} />
            <div className={styles.actionRow}>
              <span className={styles.skeletonBlock} style={{ flex: "1 1 180px", height: 44, borderRadius: 12 }} />
              <span className={styles.skeletonBlock} style={{ flex: "1 1 180px", height: 44, borderRadius: 12 }} />
              <span className={styles.skeletonBlock} style={{ flex: "1 1 180px", height: 44, borderRadius: 12 }} />
            </div>
            <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 44, borderRadius: 12 }} />
            <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 228, borderRadius: 18 }} />
          </div>
        </div>
      </section>

      {Array.from({ length: 3 }).map((_, index) => (
        <section key={`detail-panel-skeleton-${index}`} className={`${styles.optionalCard} ${styles.editorPanel}`}>
          <div className={styles.editorPanelMotion}>
            <div className={styles.editorPanelBody}>
              <div className={styles.skeletonRow}>
                <span
                  className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                  style={{ width: 144, height: 18 }}
                  aria-hidden="true"
                />
                <span
                  className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                  style={{ width: 196 }}
                  aria-hidden="true"
                />
              </div>
              <span
                className={styles.skeletonBlock}
                style={{
                  width: "100%",
                  minHeight: index === 0 ? 236 : 180,
                  borderRadius: 18,
                }}
                aria-hidden="true"
              />
              <div className={styles.actionRow}>
                <span className={styles.skeletonBlock} style={{ width: 136, height: 44, borderRadius: 12 }} />
                <span className={styles.skeletonBlock} style={{ width: 120, height: 44, borderRadius: 12 }} />
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
