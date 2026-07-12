import researchJson from "@/data/tips/interim-research-summary.json";
import type { ResearchSummary } from "./research-types";
import styles from "./interim.module.css";

const research = researchJson as ResearchSummary;

export default function ResearchEvidencePanel() {
  return (
    <section className={`${styles.section} ${styles.evidenceSection}`} aria-labelledby="evidence-title">
      <p className={styles.sectionLabel}>5. 모델 카드와 증적</p>
      <h2 id="evidence-title" className={styles.sectionTitle}>모델 구조와 산출물 계보를 확인해요</h2>
      <div className={styles.researchPanel}>
          <span className={styles.panelKicker}>MODEL CARD</span><h3>{research.model.type}</h3>
          <dl className={styles.modelFacts}>
            <div><dt>입력 특징</dt><dd>{research.model.featureCount}개</dd></div>
            <div><dt>성분 분류기</dt><dd>{research.model.ingredientClasses}개</dd></div>
            <div><dt>학습 레코드</dt><dd>{research.model.trainRecords.toLocaleString("ko-KR")}건</dd></div>
            <div><dt>Blind test</dt><dd>{research.model.blindTestRecords.toLocaleString("ko-KR")}건</dd></div>
            <div><dt>Micro F1</dt><dd>{(research.model.microF1 * 100).toFixed(2)}%</dd></div>
            <div><dt>Exact match</dt><dd>{(research.model.exactMatch * 100).toFixed(2)}%</dd></div>
          </dl>
      </div>
      <div className={styles.researchPanel}>
        <div className={styles.panelHeading}><div><span>LINEAGE</span><h3>산출물 무결성과 provenance</h3></div><p>원본 interim package에서 검증된 해시를 고정해 표시합니다.</p></div>
        <dl className={styles.hashList}>
          <div><dt>Bundled manifest</dt><dd><code>{research.provenance.bundledEvidenceManifest}</code></dd></div>
          <div><dt>Evidence manifest</dt><dd><code>{research.provenance.manifestSha256}</code></dd></div>
          <div><dt>Model artifact</dt><dd><code>{research.provenance.modelArtifactSha256}</code></dd></div>
          <div><dt>KPI report</dt><dd><code>{research.provenance.proxyKpiReportSha256}</code></dd></div>
        </dl>
      </div>
    </section>
  );
}
