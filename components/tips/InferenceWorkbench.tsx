import type { InferenceExplanation } from "./research-types";
import styles from "./interim.module.css";

function featureLabel(token: string) {
  const [group, value = ""] = token.includes(":") ? token.split(":", 2) : token.split("=", 2);
  const groups: Record<string, string> = {
    age: "연령대", sex: "성별", pregnancy: "임신", goals: "목표", conditions: "질환",
    medication_classes: "약물", allergies: "알레르기", current_supplements: "기복용", risk_flags: "위험신호",
    budget: "예산", pill_limit: "복용 개수", form: "제형",
  };
  return `${groups[group] ?? group}: ${value}`;
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}`;
}

export default function InferenceWorkbench({ inference }: { inference: InferenceExplanation }) {
  const top = inference.candidateScores[0];
  const countScores = inference.countDecision.classScores;
  const minCountScore = Math.min(...countScores.map((item) => item.linearScore));
  const maxCountScore = Math.max(...countScores.map((item) => item.linearScore));

  return (
    <section className={`${styles.section} ${styles.inferenceSection}`} aria-labelledby="inference-title">
      <p className={styles.sectionLabel}>3. 모델 추론 해부</p>
      <h2 id="inference-title" className={styles.sectionTitle}>{top ? `${top.label} ${(top.score * 100).toFixed(1)}%가 나온 계산을 펼쳐봐요` : "모델 계산을 단계별로 펼쳐봐요"}</h2>

      <div className={styles.pipeline}>
        <article><span>01</span><strong>입력 벡터화</strong><p>93개 vocabulary 중 {inference.activeFeatures.length}개 활성</p></article>
        <i aria-hidden="true">→</i>
        <article><span>02</span><strong>개수 결정</strong><p>{inference.countDecision.predictedCount}개 후보 선택</p></article>
        <i aria-hidden="true">→</i>
        <article><span>03</span><strong>14개 성분 순위화</strong><p>OVR logistic 확률 비교</p></article>
        <i aria-hidden="true">→</i>
        <article><span>04</span><strong>안전 필터</strong><p>{inference.preSafetySelection.length}개 → {inference.postSafetySelection.length}개</p></article>
      </div>

      <div className={styles.formulaCard}>
        <span>MODEL EQUATION</span>
        <code>z = intercept + Σ(xᵢ × wᵢ)</code>
        <code>p = sigmoid(z) = 1 / (1 + e⁻ᶻ)</code>
        {top && <p>현재 1위 {top.label}: z={top.linearScore.toFixed(4)} → p={(top.score * 100).toFixed(2)}%</p>}
      </div>

      <div className={styles.explainGrid}>
        <div className={styles.researchPanel}>
          <div className={styles.panelHeading}><div><span>ACTIVE VECTOR</span><h3>현재 활성 특징</h3></div><p>입력값 1, 나머지 vocabulary는 0으로 계산됩니다.</p></div>
          <div className={styles.featureChips}>{inference.activeFeatures.map((item) => <span key={item.index}><b>#{item.index}</b>{featureLabel(item.token)}</span>)}</div>
        </div>
        <div className={styles.researchPanel}>
          <div className={styles.panelHeading}><div><span>COUNT CLASSIFIER</span><h3>추천 개수 결정</h3></div><p>가장 큰 선형점수의 class가 선택됩니다.</p></div>
          <div className={styles.countScores}>{countScores.map((item) => {
            const range = Math.max(0.0001, maxCountScore - minCountScore);
            const width = 18 + ((item.linearScore - minCountScore) / range) * 82;
            return <div key={item.rawClass}><span>{item.recommendationCount}개</span><i><b style={{ width: `${width}%` }} /></i><strong>{item.linearScore.toFixed(4)}</strong></div>;
          })}</div>
        </div>
      </div>

      {top && (
        <div className={styles.researchPanel}>
          <div className={styles.panelHeading}><div><span>FEATURE CONTRIBUTION</span><h3>1위 {top.label} 점수 구성</h3></div><p>절편 {signed(top.intercept)}에 활성 특징 계수를 더한 값입니다.</p></div>
          <div className={styles.tableScroll}><table className={styles.researchTable}><thead><tr><th>활성 특징</th><th>Index</th><th>계수</th><th>점수 기여</th><th>방향</th></tr></thead><tbody>
            {top.contributions.map((item) => <tr key={item.index}><td>{featureLabel(item.token)}</td><td>#{item.index}</td><td>{signed(item.weight)}</td><td>{signed(item.contribution)}</td><td><span className={item.contribution >= 0 ? styles.positive : styles.negative}>{item.contribution >= 0 ? "추천↑" : "추천↓"}</span></td></tr>)}
          </tbody><tfoot><tr><td>절편 포함 합계</td><td /><td>{signed(top.intercept)}</td><td>{top.linearScore.toFixed(4)}</td><td>{(top.score * 100).toFixed(2)}%</td></tr></tfoot></table></div>
        </div>
      )}

      <div className={styles.researchPanel}>
        <div className={styles.panelHeading}><div><span>FULL RANKING</span><h3>14개 전체 후보와 안전 필터 전후</h3></div><p>카드에 보이지 않던 전체 모델 출력을 순위대로 표시합니다.</p></div>
        <div className={styles.tableScroll}><table className={styles.researchTable}><thead><tr><th>순위</th><th>성분</th><th>선형점수 z</th><th>확률</th><th>모델 선택</th><th>안전 필터</th><th>최종</th></tr></thead><tbody>
          {inference.candidateScores.map((item) => {
            const final = inference.postSafetySelection.some((candidate) => candidate.ingredientId === item.ingredientId);
            return <tr key={item.ingredientId}><td>#{item.rank}</td><td><strong>{item.label}</strong><small>{item.ingredientId}</small></td><td>{item.linearScore.toFixed(4)}</td><td><div className={styles.probability}><i><b style={{ width: `${Math.max(2, item.score * 100)}%` }} /></i><span>{(item.score * 100).toFixed(2)}%</span></div></td><td>{item.selectedByModel ? "선택" : "—"}</td><td>{item.blockedBySafety ? <span className={styles.blocked}>제외</span> : "통과"}</td><td>{final ? <span className={styles.finalPick}>추천</span> : "—"}</td></tr>;
          })}
        </tbody></table></div>
      </div>
    </section>
  );
}
