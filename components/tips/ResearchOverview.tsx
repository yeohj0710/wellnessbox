import researchJson from "@/data/tips/interim-research-summary.json";
import type { ResearchSummary } from "./research-types";
import styles from "./interim.module.css";

const research = researchJson as ResearchSummary;
const splits = [
  ["학습", research.dataset.splits.train, "train"],
  ["검증", research.dataset.splits.validation, "validation"],
  ["보정", research.dataset.splits.calibration, "calibration"],
  ["Blind D", research.dataset.splits.blindTest, "blind"],
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export default function ResearchOverview() {
  return (
    <section className={`${styles.section} ${styles.researchOverview}`} aria-labelledby="research-overview-title">
      <p className={styles.sectionLabel}>연구 전체 결과</p>
      <h2 id="research-overview-title" className={styles.sectionTitle}>무엇을 만들고, 어디까지 검증했는지 먼저 봐요</h2>
      <div className={styles.researchStats}>
        <article><strong>{formatNumber(research.dataset.total)}</strong><span>Proxy gold 전체 데이터</span></article>
        <article><strong>7 / 7</strong><span>계획서 Proxy KPI 통과</span></article>
        <article><strong>{formatNumber(research.dataset.splits.blindTest)}</strong><span>독립 teacher D blind 평가</span></article>
        <article><strong>{research.provenance.fileCount}</strong><span>SHA-256 증적 파일</span></article>
      </div>

      <div className={styles.researchPanel}>
        <div className={styles.panelHeading}>
          <div><span>DATASET</span><h3>15만 건이 학습과 평가에 이렇게 나뉘었어요</h3></div>
          <p>41개 시나리오군 · 생성/검증 불일치 {formatNumber(research.dataset.generatorVerifierDisagreements)}건 · 전건 adjudication</p>
        </div>
        <div className={styles.splitBar} aria-label="데이터셋 분할 비율">
          {splits.map(([label, value, key]) => (
            <span key={key} className={styles[key]} style={{ width: `${(value / research.dataset.total) * 100}%` }} title={`${label} ${formatNumber(value)}건`} />
          ))}
        </div>
        <div className={styles.splitLegend}>
          {splits.map(([label, value, key]) => <div key={key}><i className={styles[key]} /><strong>{label}</strong><span>{formatNumber(value)}건</span></div>)}
        </div>
        <div className={styles.teacherFlow}>
          <span>A/B 생성</span><b>→</b><span>C 검증</span><b>→</b><span>C2 중재</span><b>→</b><span>D 독립 blind</span>
        </div>
      </div>

      <div className={styles.kpiHeading}>
        <div><span>PLAN KPI</span><h3>7개 지표의 수치와 표본을 함께 공개해요</h3></div>
      </div>
      <div className={styles.kpiGrid}>
        {research.kpis.map((kpi) => (
          <article key={kpi.id} className={styles.kpiCard}>
            <div className={styles.kpiTop}><span>{kpi.id}</span><b>PROXY PASS</b></div>
            <h3>{kpi.name}</h3>
            <strong className={styles.kpiValue}>{kpi.displayValue}</strong>
            <dl>
              <div><dt>표본</dt><dd>n={formatNumber(kpi.n)}</dd></div>
              <div><dt>95% CI</dt><dd>{kpi.ci95 ? `${kpi.ci95[0].toFixed(2)}–${kpi.ci95[1].toFixed(2)}` : "해당 없음"}</dd></div>
              <div><dt>내부 기준</dt><dd>{kpi.guardband}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
