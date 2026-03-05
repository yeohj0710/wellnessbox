import styles from "@/components/b2b/B2bUx.module.css";

const sidebarSkeletonItems = Array.from({ length: 6 });
const detailPanelSkeletonItems = Array.from({ length: 4 });

export default function AdminB2bReportsLoading() {
  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
        <header className={`${styles.heroCard} ${styles.reportHeroShell}`}>
          <div className={styles.reportHeroMain}>
            <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 138 }} />
            <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} style={{ width: "58%" }} />
            <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "76%" }} />
            <div className={styles.reportHeroSearchRow}>
              <span className={styles.skeletonBlock} style={{ width: "100%", height: 44, borderRadius: 12 }} />
              <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: "100%", maxWidth: 90, height: 38 }} />
              <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: "100%", maxWidth: 116, height: 38 }} />
            </div>
          </div>
          <aside className={styles.reportHeroSide}>
            <div className={styles.kvRow}>
              <span className={`${styles.skeletonBlock}`} style={{ minHeight: 56 }} />
              <span className={`${styles.skeletonBlock}`} style={{ minHeight: 56 }} />
            </div>
            <div className={styles.kvRow}>
              <span className={`${styles.skeletonBlock}`} style={{ minHeight: 56 }} />
              <span className={`${styles.skeletonBlock}`} style={{ minHeight: 56 }} />
            </div>
            <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "64%" }} />
          </aside>
        </header>

        <div className={styles.splitLayout}>
          <section className={`${styles.sectionCard} ${styles.sidebarCard}`}>
            <div className={styles.skeletonRow}>
              <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "56%", height: 16 }} />
              <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 74, height: 22 }} />
            </div>
            <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "72%" }} />
            <div className={styles.stack}>
              {sidebarSkeletonItems.map((_, index) => (
                <span
                  key={`sidebar-skeleton-${index}`}
                  className={styles.skeletonBlock}
                  style={{ width: "100%", minHeight: 72, borderRadius: 14 }}
                />
              ))}
            </div>
          </section>

          <div className={styles.stack}>
            <section className={styles.sectionCard}>
              <div className={styles.skeletonRow}>
                <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} style={{ width: "48%" }} />
                <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 96 }} />
              </div>
              <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "72%" }} />
              <div className={styles.loadingKpiRow}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <span
                    key={`overview-kpi-skeleton-${index}`}
                    className={`${styles.skeletonBlock} ${styles.loadingKpi}`}
                  />
                ))}
              </div>
            </section>

            <section className={styles.reportCanvas}>
              <div className={styles.reportCanvasHeader}>
                <div>
                  <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} style={{ width: 220 }} />
                  <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: 320, marginTop: 8 }} />
                </div>
                <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 160, height: 30 }} />
              </div>
              <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
                <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 560, borderRadius: 20 }} />
              </div>
            </section>

            {detailPanelSkeletonItems.map((_, index) => (
              <section key={`detail-panel-skeleton-${index}`} className={styles.sectionCard}>
                <div className={styles.skeletonRow}>
                  <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} style={{ width: "44%" }} />
                  <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 88 }} />
                </div>
                <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "84%" }} />
                <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "68%" }} />
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
