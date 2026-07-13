import researchJson from "@/data/tips/interim-research-summary.json";
import type { ResearchSummary } from "./research-types";
import styles from "./interim.module.css";

const research = researchJson as ResearchSummary;

export default function ResearchEvidencePanel() {
  return <section className={`${styles.section} ${styles.evidenceSection}`} aria-labelledby="evidence-title">
    <p className={styles.sectionLabel}>모델·에이전트 검증 결과</p>
    <h2 id="evidence-title" className={styles.sectionTitle}>추천 모델의 재현 성능과 에이전트의 작업 수행 성능을 구분해 확인합니다</h2>
    <p className={styles.sectionBody}>5,000건의 100%는 저장된 프록시 기준 추천을 현재 모델이 다시 계산했을 때의 일치율입니다. 대화형 에이전트 평가는 다음 작업 선택 정확도, 고위험 오동작 수와 작업 완료 여부로 별도 평가합니다.</p>
    <div className={styles.researchPanel}>
      <span className={styles.panelKicker}>학습 모델 요약 · 추천 모델 재현 평가</span><h3>학습에 사용하지 않은 프록시 시험 데이터 5,000건</h3>
      <dl className={styles.modelFacts}>
        <div><dt>모델 입력 조건</dt><dd>{research.model.featureCount}개</dd></div>
        <div><dt>추천 대상 성분</dt><dd>{research.model.ingredientClasses}개</dd></div>
        <div><dt>학습 데이터</dt><dd>{research.model.trainRecords.toLocaleString("ko-KR")}건</dd></div>
        <div><dt>독립 프록시 시험 데이터</dt><dd>{research.model.blindTestRecords.toLocaleString("ko-KR")}건</dd></div>
        <div><dt>성분별 프록시 기준 재현 F1</dt><dd>{(research.model.microF1 * 100).toFixed(2)}%</dd></div>
        <div><dt>추천 목록 프록시 기준 완전 일치율</dt><dd>{(research.model.exactMatch * 100).toFixed(2)}%</dd></div>
      </dl>
    </div>
    <div className={styles.researchPanel}>
      <span className={styles.panelKicker}>대화형 에이전트 평가</span><h3>상태를 읽고 다음 작업을 선택한 뒤 사후조건을 확인</h3>
      <dl className={styles.modelFacts}>
        <div><dt>평가 대상</dt><dd>다음 작업 선택·상태 전이</dd></div>
        <div><dt>허용 작업</dt><dd>10개 typed tool</dd></div>
        <div><dt>안전 우선순위</dt><dd>응급 전환 → 안전검사 → 추천·추적</dd></div>
        <div><dt>성공 기준</dt><dd>선택 작업의 사후조건 충족</dd></div>
        <div><dt>직접 재현</dt><dd>앞 단계에서 모든 관측값 수정 가능</dd></div>
        <div><dt>결과 해석</dt><dd>추천 모델의 100% 지표와 별도</dd></div>
      </dl>
    </div>
  </section>;
}
