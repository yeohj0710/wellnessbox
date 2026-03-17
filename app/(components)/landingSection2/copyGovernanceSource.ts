export type LandingCopyGovernanceSource = {
  source: string;
  surface: string;
  text: string;
};

export const LANDING_COPY_GOVERNANCE_SOURCES: LandingCopyGovernanceSource[] = [
  {
    source: "랜딩 소개 · 히어로",
    surface: "랜딩 소개",
    text: [
      "내 몸에 딱 맞는 AI+약사 설계형 Premium 건강 구독",
      "개인별 건강 데이터와 복용 이력을 바탕으로 필요한 영양 성분을 추천하고 안전하게 안내합니다.",
      "7일 단위 시작으로 부담 없이 시작하기",
    ].join(" "),
  },
  {
    source: "랜딩 소개 · AI 분석",
    surface: "랜딩 소개",
    text: [
      "건강 데이터 분석",
      "건강검진 결과와 복용 중인 약 정보를 입력하면 필요한 영양 축을 먼저 정리합니다.",
    ].join(" "),
  },
  {
    source: "랜딩 소개 · 약사 검토",
    surface: "랜딩 소개",
    text: [
      "전문가 상담 검토",
      "추천 영양소는 약국 소속 약사가 한 번 더 확인하고 1:1 상담으로 최종 구성을 검토합니다.",
    ].join(" "),
  },
  {
    source: "랜딩 소개 · 맞춤 패키지",
    surface: "랜딩 소개",
    text: [
      "맞춤 소분 패키지",
      "7일치부터 가볍게 시작하고 사용 흐름에 맞춰 구성을 이어갑니다.",
    ].join(" "),
  },
  {
    source: "요금제 · 7일치",
    surface: "요금제",
    text: [
      "간편한 체험",
      "7일치 구매",
      "7일 이내 취소 가능",
      "필요하면 정기구독으로 전환",
    ].join(" "),
  },
  {
    source: "요금제 · 정기구독",
    surface: "요금제",
    text: [
      "첫 달 75% 할인",
      "정기구독",
      "필요한 날짜에 맞춰 구독",
      "AI 기반 상담과 약사 검토",
      "정기 배송 편의",
    ].join(" "),
  },
];
