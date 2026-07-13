import researchJson from "@/data/tips/interim-research-summary.json";
import type { ResearchSummary } from "./research-types";
import styles from "./interim.module.css";

const research = researchJson as ResearchSummary;

export default function ResearchEvidencePanel() {
  return (
    <section className={`${styles.section} ${styles.evidenceSection}`} aria-labelledby="evidence-title">
      <p className={styles.sectionLabel}>5. 학습 모델과 검증 파일</p>
      <h2 id="evidence-title" className={styles.sectionTitle}>어떤 모델을 학습했고, 무엇으로 확인했는가</h2>
      <p className={styles.sectionBody}>입력 조건 93개를 이용해 14개 영양성분의 적합도를 계산하는 분류 모델입니다. 학습에 쓰지 않은 5,000건으로 최종 성능을 다시 확인했습니다.</p>
      <div className={styles.researchPanel}>
          <span className={styles.panelKicker}>학습 모델 요약</span><h3>영양성분별 적합도 분류 모델</h3>
          <dl className={styles.modelFacts}>
            <div><dt>판단에 사용하는 조건</dt><dd>{research.model.featureCount}개</dd></div>
            <div><dt>판단 대상 영양성분</dt><dd>{research.model.ingredientClasses}개</dd></div>
            <div><dt>모델 학습 데이터</dt><dd>{research.model.trainRecords.toLocaleString("ko-KR")}건</dd></div>
            <div><dt>학습 후 별도 시험 데이터</dt><dd>{research.model.blindTestRecords.toLocaleString("ko-KR")}건</dd></div>
            <div><dt>성분별 판정 정확도(F1)</dt><dd>{(research.model.microF1 * 100).toFixed(2)}%</dd></div>
            <div><dt>추천 목록 전체 일치율</dt><dd>{(research.model.exactMatch * 100).toFixed(2)}%</dd></div>
          </dl>
      </div>
      <details className={styles.researchPanel}>
        <summary className={styles.advancedProfileSummary}><span><b>검증 파일 식별정보</b><small>기관 검토 시 모델과 결과 파일이 바뀌지 않았는지 대조하는 값</small></span></summary>
        <dl className={styles.hashList}>
          <div><dt>검증 파일 목록</dt><dd><code>{research.provenance.bundledEvidenceManifest}</code></dd></div>
          <div><dt>전체 증적 파일 식별값</dt><dd><code>{research.provenance.manifestSha256}</code></dd></div>
          <div><dt>학습 모델 식별값</dt><dd><code>{research.provenance.modelArtifactSha256}</code></dd></div>
          <div><dt>성과지표 결과 식별값</dt><dd><code>{research.provenance.proxyKpiReportSha256}</code></dd></div>
        </dl>
      </details>
    </section>
  );
}
