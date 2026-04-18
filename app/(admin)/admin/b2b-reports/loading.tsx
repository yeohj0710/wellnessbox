import styles from "@/components/b2b/B2bUx.module.css";

const employeeSkeletonItems = Array.from({ length: 6 });
const editorSkeletonRows = Array.from({ length: 3 });

export default function AdminB2bReportsLoading() {
  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.compactPage} ${styles.stack}`}>
        <header className={styles.heroCard}>
          <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 144 }} />
          <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} style={{ width: "42%" }} />
          <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "78%" }} />
          <div className={styles.actionRow}>
            <span className={styles.skeletonBlock} style={{ flex: "1 1 280px", height: 44, borderRadius: 12 }} />
            <span className={styles.skeletonBlock} style={{ width: 88, height: 44, borderRadius: 12 }} />
          </div>
        </header>

        <section className={`${styles.sectionCard} ${styles.employeeBrowserCard}`}>
          <div className={styles.employeeBrowserHead}>
            <div className={styles.skeletonRow}>
              <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: 132, height: 16 }} />
              <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 76, height: 24 }} />
            </div>
            <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: 220 }} />
          </div>

          <div className={styles.employeeBrowserSummaryRow}>
            <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 162, borderRadius: 20 }} />
            <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 162, borderRadius: 20 }} />
          </div>

          <div className={styles.employeeBrowserScroller}>
            <div className={`${styles.listWrap} ${styles.employeeBrowserGrid}`}>
              {employeeSkeletonItems.map((_, index) => (
                <span
                  key={`employee-loading-card-${index}`}
                  className={styles.skeletonBlock}
                  style={{ width: "100%", minHeight: 126, borderRadius: 18 }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.skeletonRow}>
            <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} style={{ width: "34%" }} />
            <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 104, height: 28 }} />
          </div>
          <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: "58%" }} />
          <div className={styles.actionRow}>
            <span className={styles.skeletonBlock} style={{ width: 150, height: 44, borderRadius: 12 }} />
            <span className={styles.skeletonBlock} style={{ width: 154, height: 44, borderRadius: 12 }} />
            <span className={styles.skeletonBlock} style={{ width: 120, height: 44, borderRadius: 12 }} />
          </div>
          <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 204, borderRadius: 18 }} />
        </section>

        <section className={styles.reportCanvas}>
          <div className={styles.reportCanvasHeader}>
            <div>
              <span className={`${styles.skeletonLine} ${styles.skeletonBlock}`} style={{ width: 248 }} />
              <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: 356, marginTop: 8 }} />
            </div>
            <span className={`${styles.skeletonPill} ${styles.skeletonBlock}`} style={{ width: 132, height: 30 }} />
          </div>
          <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
            <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 640, borderRadius: 20 }} />
          </div>
        </section>

        <section className={`${styles.optionalCard} ${styles.editorPanel}`}>
          <div className={styles.editorPanelMotion}>
            <div className={styles.editorPanelBody}>
              <div className={styles.skeletonRow}>
                <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: 136, height: 18 }} />
                <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: 180 }} />
              </div>
              <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 98, borderRadius: 18 }} />
              <div className={styles.actionRow}>
                <span className={styles.skeletonBlock} style={{ flex: "1 1 180px", height: 44, borderRadius: 12 }} />
                <span className={styles.skeletonBlock} style={{ flex: "1 1 180px", height: 44, borderRadius: 12 }} />
                <span className={styles.skeletonBlock} style={{ flex: "1 1 180px", height: 44, borderRadius: 12 }} />
              </div>
              <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 44, borderRadius: 12 }} />
              <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: 220, borderRadius: 18 }} />
            </div>
          </div>
        </section>

        {editorSkeletonRows.map((_, index) => (
          <section key={`ops-editor-loading-${index}`} className={`${styles.optionalCard} ${styles.editorPanel}`}>
            <div className={styles.editorPanelMotion}>
              <div className={styles.editorPanelBody}>
                <div className={styles.skeletonRow}>
                  <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: 148, height: 18 }} />
                  <span className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`} style={{ width: 188 }} />
                </div>
                <span className={styles.skeletonBlock} style={{ width: "100%", minHeight: index === 0 ? 240 : 180, borderRadius: 18 }} />
                <div className={styles.actionRow}>
                  <span className={styles.skeletonBlock} style={{ width: 138, height: 44, borderRadius: 12 }} />
                  <span className={styles.skeletonBlock} style={{ width: 120, height: 44, borderRadius: 12 }} />
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
