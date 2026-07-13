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
      <p className={styles.sectionLabel}>3. 계산 과정 확인</p>
      <h2 id="inference-title" className={styles.sectionTitle}>{top ? `${top.label}이 ${((top.score) * 100).toFixed(1)}%로 계산된 이유` : "입력값이 추천 결과로 바뀌는 과정"}</h2>
      <p className={styles.sectionBody}>시험자가 입력한 조건 중 실제 계산에 사용된 항목, 각 항목이 점수에 미친 영향, 안전 규칙 적용 전후 결과를 순서대로 보여줍니다.</p>

      <div className={styles.pipeline}>
        <article><span>01</span><strong>입력 조건 정리</strong><p>전체 93개 조건 중 입력된 {inference.activeFeatures.length}개 사용</p></article>
        <i aria-hidden="true">→</i>
        <article><span>02</span><strong>개수 결정</strong><p>{inference.countDecision.predictedCount}개 후보 선택</p></article>
        <i aria-hidden="true">→</i>
        <article><span>03</span><strong>14개 성분 비교</strong><p>성분별 적합도 점수 계산</p></article>
        <i aria-hidden="true">→</i>
        <article><span>04</span><strong>안전 조건 확인</strong><p>후보 {inference.preSafetySelection.length}개 중 {inference.postSafetySelection.length}개 통과</p></article>
      </div>

      <div className={styles.formulaCard}>
        <span>MODEL EQUATION</span>
        <code>z = intercept + Σ(xᵢ × wᵢ)</code>
        <code>p = sigmoid(z) = 1 / (1 + e⁻ᶻ)</code>
        {top && <p>현재 1위 {top.label}: z={top.linearScore.toFixed(4)} → p={(top.score * 100).toFixed(2)}%</p>}
      </div>

      <div className={styles.explainGrid}>
        <div className={styles.researchPanel}>
          <div className={styles.panelHeading}><div><span>사용된 입력값</span><h3>이번 계산에 반영된 조건</h3></div><p>아래 항목만 이번 추천 점수 계산에 사용되었습니다.</p></div>
          <div className={styles.featureChips}>{inference.activeFeatures.map((item) => <span key={item.index}><b>#{item.index}</b>{featureLabel(item.token)}</span>)}</div>
        </div>
        <div className={styles.researchPanel}>
          <div className={styles.panelHeading}><div><span>추천 개수</span><h3>몇 개를 추천할지 결정</h3></div><p>1개·2개·3개 중 계산 점수가 가장 높은 개수를 선택합니다.</p></div>
          <div className={styles.countScores}>{countScores.map((item) => {
            const range = Math.max(0.0001, maxCountScore - minCountScore);
            const width = 18 + ((item.linearScore - minCountScore) / range) * 82;
            return <div key={item.rawClass}><span>{item.recommendationCount}개</span><i><b style={{ width: `${width}%` }} /></i><strong>{item.linearScore.toFixed(4)}</strong></div>;
          })}</div>
        </div>
      </div>

      {top && (
        <div className={styles.researchPanel}>
          <div className={styles.panelHeading}><div><span>조건별 영향</span><h3>1위 {top.label} 점수가 만들어진 과정</h3></div><p>양수는 추천 점수를 높이고, 음수는 낮춘 항목입니다.</p></div>
          <div className={styles.tableScroll}><table className={styles.researchTable}><thead><tr><th>활성 특징</th><th>Index</th><th>계수</th><th>점수 기여</th><th>방향</th></tr></thead><tbody>
            {top.contributions.map((item) => <tr key={item.index}><td>{featureLabel(item.token)}</td><td>#{item.index}</td><td>{signed(item.weight)}</td><td>{signed(item.contribution)}</td><td><span className={item.contribution >= 0 ? styles.positive : styles.negative}>{item.contribution >= 0 ? "추천↑" : "추천↓"}</span></td></tr>)}
          </tbody><tfoot><tr><td>절편 포함 합계</td><td /><td>{signed(top.intercept)}</td><td>{top.linearScore.toFixed(4)}</td><td>{(top.score * 100).toFixed(2)}%</td></tr></tfoot></table></div>
        </div>
      )}

      <div className={styles.researchPanel}>
        <div className={styles.panelHeading}><div><span>전체 비교 결과</span><h3>14개 성분의 계산 순위와 제외 여부</h3></div><p>모델이 선택한 후보가 안전 확인 단계에서 유지되거나 제외되는 과정을 보여줍니다.</p></div>
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
