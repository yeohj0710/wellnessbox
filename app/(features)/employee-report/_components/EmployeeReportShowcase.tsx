import styles from "@/components/b2b/B2bUx.module.css";

export default function EmployeeReportShowcase() {
  return (
    <section className={styles.showcaseShell}>
      <header className={styles.showcaseHeader}>
        <p className={styles.showcaseKicker}>리포트 미리보기</p>
        <h2 className={styles.showcaseTitle}>인증이 끝나면 월간 건강 브리핑이 즉시 열립니다</h2>
        <p className={styles.showcaseDescription}>
          점수, 위험도, 실천 가이드, 코멘트를 한 번에 확인하고 같은 내용으로 PDF를 바로
          내려받을 수 있어요.
        </p>
      </header>

      <article className={styles.showcaseHeroCard}>
        <div className={styles.showcaseHeroMain}>
          <p className={styles.showcaseHeroLabel}>월간 리포트 타임라인</p>
          <h3 className={styles.showcaseHeroTitle}>이번 달 건강 전략 브리핑</h3>
          <ul className={styles.showcaseHeroTags}>
            <li>핵심 이슈 3개</li>
            <li>점수 추이 차트</li>
            <li>실천 체크리스트</li>
          </ul>
        </div>
        <div className={styles.showcaseHeroScore}>
          <strong>82점</strong>
          <span>주의 단계</span>
        </div>
      </article>

      <section className={styles.showcaseKpiGrid}>
        <article className={styles.showcaseKpiCard}>
          <span>설문 응답률</span>
          <strong>91%</strong>
          <p>10문항 중 9문항 완료</p>
        </article>
        <article className={styles.showcaseKpiCard}>
          <span>검진 위험 신호</span>
          <strong>주의 3개</strong>
          <p>혈당/지질 지표 집중 모니터링</p>
        </article>
        <article className={styles.showcaseKpiCard}>
          <span>복약 이력</span>
          <strong>3건</strong>
          <p>최근 90일 기준</p>
        </article>
        <article className={styles.showcaseKpiCard}>
          <span>데이터 신뢰도</span>
          <strong>87%</strong>
          <p>설문/검진/복약 동시 반영</p>
        </article>
      </section>

      <section className={styles.showcaseGrid}>
        <article className={styles.showcasePanel}>
          <h3>점수 트렌드</h3>
          <div className={styles.showcaseChart}>
            <span style={{ height: "36%" }} />
            <span style={{ height: "46%" }} />
            <span style={{ height: "57%" }} />
            <span style={{ height: "61%" }} />
            <span style={{ height: "73%" }} />
            <span style={{ height: "82%" }} />
          </div>
          <p>최근 6개월 점수 흐름과 개선 방향을 한 번에 확인합니다.</p>
        </article>

        <article className={styles.showcasePanel}>
          <h3>이번 달 실행 우선순위</h3>
          <ul className={styles.showcaseList}>
            <li>취침 2시간 전 카페인 섭취 제한</li>
            <li>주 3회 30분 유산소 루틴 유지</li>
            <li>복약 시간 고정 및 누락 방지</li>
          </ul>
        </article>

        <article className={styles.showcasePanel}>
          <h3>검진 지표 상태</h3>
          <ul className={styles.showcaseTable}>
            <li>
              <span>혈당</span>
              <strong>주의</strong>
            </li>
            <li>
              <span>HDL</span>
              <strong>정상</strong>
            </li>
            <li>
              <span>LDL</span>
              <strong>주의</strong>
            </li>
            <li>
              <span>중성지방</span>
              <strong>정상</strong>
            </li>
          </ul>
        </article>
      </section>
    </section>
  );
}
