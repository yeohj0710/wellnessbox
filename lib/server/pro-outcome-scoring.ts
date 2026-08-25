/**
 * KPI-2 (효과 개선도, SCGI) 계산.
 *
 * 순수 계산만 하는 모듈이라 "server-only" 를 붙이지 않는다. 집계 스크립트에서
 * 그대로 불러 쓸 수 있어야 하고, 서버 자원에 손대지 않는다.
 *
 * 계획서 수식을 그대로 옮긴다.
 *
 *   p_i  = 100 * [ Φ(z_post,i) - Φ(z_pre,i) ]
 *   SCGI = N개 사용자의 p_i 평균
 *
 * 통과 조건은 유효한 복용 전후 쌍 100개 이상, 평균 0pp 초과다.
 * 분모는 제품 수나 문항 수가 아니라 짝이 지어진 사용자 수 N이다.
 *
 * 표준화에서 실수하기 쉬운 곳이 하나 있다. 전과 후를 각각 그 시점의 평균과
 * 표준편차로 표준화하면 안 된다. 그렇게 하면 전체가 다 같이 좋아져도 백분위는
 * 그대로라 개선이 0으로 나온다. 두 시점을 하나의 기준 분포(복용 전 분포)로
 * 표준화해야 변화가 변화로 남는다.
 */

export type ProPair = {
  participantToken: string;
  goalKey: string;
  preScore: number;
  postScore: number;
};

export type ScgiResult = {
  pairCount: number;
  meanPercentilePointChange: number;
  perPair: { participantToken: string; percentilePointChange: number }[];
  referenceMean: number;
  referenceStdDev: number;
  meetsMinimumSample: boolean;
  meanAboveZero: boolean;
  targetMet: boolean;
};

export const KPI2_MINIMUM_PAIR_COUNT = 100;

/**
 * 표준정규분포 누적분포함수 Φ.
 *
 * Abramowitz & Stegun 7.1.26 의 erf 근사를 쓴다. 절대오차가 1.5e-7 이하라
 * 백분위 포인트로 바꾸면 소수 다섯째 자리까지 안정적이다.
 */
export function standardNormalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absX);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-absX * absX);
  return sign * y;
}

/**
 * 복용 전 점수 분포로 기준 평균과 표준편차를 구한다.
 *
 * 표본이 하나뿐이거나 모두 같은 값이면 표준편차가 0이 되어 z 를 만들 수 없다.
 * 그때는 계산을 멈춘다. 0 을 임의의 값으로 바꿔 넣으면 없는 개선이 생긴다.
 */
export function referenceDistribution(preScores: number[]): {
  mean: number;
  stdDev: number;
} {
  if (preScores.length < 2) {
    throw new Error("pro_reference_distribution_requires_two_or_more_baselines");
  }
  const mean = preScores.reduce((sum, value) => sum + value, 0) / preScores.length;
  // 표본 표준편차(n-1)를 쓴다. 모집단이 아니라 표본이다.
  const variance =
    preScores.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (preScores.length - 1);
  const stdDev = Math.sqrt(variance);
  if (!Number.isFinite(stdDev) || stdDev === 0) {
    throw new Error("pro_reference_distribution_has_no_spread");
  }
  return { mean, stdDev };
}

export function computeScgi(pairs: ProPair[]): ScgiResult {
  if (pairs.length === 0) {
    throw new Error("pro_pairs_required");
  }
  const { mean, stdDev } = referenceDistribution(pairs.map((pair) => pair.preScore));

  const perPair = pairs.map((pair) => {
    const zPre = (pair.preScore - mean) / stdDev;
    const zPost = (pair.postScore - mean) / stdDev;
    const percentilePointChange =
      100 * (standardNormalCdf(zPost) - standardNormalCdf(zPre));
    return { participantToken: pair.participantToken, percentilePointChange };
  });

  const meanChange =
    perPair.reduce((sum, item) => sum + item.percentilePointChange, 0) / perPair.length;

  const meetsMinimumSample = pairs.length >= KPI2_MINIMUM_PAIR_COUNT;
  const meanAboveZero = meanChange > 0;
  return {
    pairCount: pairs.length,
    meanPercentilePointChange: meanChange,
    perPair,
    referenceMean: mean,
    referenceStdDev: stdDev,
    meetsMinimumSample,
    meanAboveZero,
    // 두 조건이 모두 맞아야 통과다. 평균이 양수여도 100쌍이 안 되면 미달이다.
    targetMet: meetsMinimumSample && meanAboveZero,
  };
}
