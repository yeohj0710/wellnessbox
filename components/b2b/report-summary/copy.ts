export const REPORT_SUMMARY_OVERVIEW_TEXT = {
  pageKicker: "WellnessBox 개인 건강 리포트",
  title: "이번 달 건강 상태 요약과 우선 실천 항목",
  subtitle:
    "먼저 전체 점수를 확인하고, 지금 바로 시작할 수 있는 실천 항목을 간단히 정리했습니다.",
  employeeLabel: "대상자",
  periodLabel: "기간",
  generatedLabel: "생성",
  scoreTitle: "건강점수",
  scoreAriaLabel: "건강점수 원형 차트",
  scoreFormula: "건강점수 = 100 - ((생활습관 위험도 + 건강관리 필요도 평균) / 2)",
  lifestyleRiskTitle: "생활습관 위험도",
  lifestyleRiskAriaLabel: "생활습관 위험도 레이더 그래프",
  lifestyleRiskOverallLabel: "종합 위험도",
  healthNeedTitle: "건강관리 필요도",
  healthNeedEmpty: "선택 영역 데이터가 없습니다.",
  healthNeedAverageLabel: "평균 위험도",
  healthNeedMoreLabel: "추가 영역 {count}개는 다음 페이지에서 확인 가능합니다.",
} as const;

export const REPORT_SUMMARY_HEALTH_PAGE_TEXT = {
  pageKicker: "{page}페이지 상세 데이터",
  title: "건강검진 데이터 상세",
  subtitle:
    "건강검진에서 측정한 지표를 모두 확인하고 현재 상태를 빠르게 읽을 수 있도록 정리했습니다.",
  metricsTitle: "건강검진 전체 수치",
  metricsEmpty: "확인 가능한 건강검진 전달 수치가 없습니다.",
  insightTitle: "건강검진 데이터 해석",
} as const;

export const REPORT_SUMMARY_FINAL_COMMENT_PAGE_TEXT = {
  pageKicker: "{page}페이지 마무리 코멘트",
  title: "약사님 최종 코멘트",
  subtitle:
    "자동 생성 문구보다 실제 상담 맥락을 우선해, 담당 약사가 직접 남긴 최종 코멘트를 그대로 담았습니다.",
  bodyTitle: "담당 약사 코멘트",
  footerLabel: "개인별 안내 메모",
} as const;

export const REPORT_SUMMARY_MEDICATION_PAGE_TEXT = {
  pageKicker: "{page}페이지 상세 데이터",
  title: "복약 이력 및 약사 코멘트",
  subtitle:
    "복약 이력을 기준으로 언제 어떤 처방과 조제를 받았는지 확인할 수 있도록 구성했습니다.",
  medicationTitle: "복약 이력 상세",
  medicationEmpty: "복약 이력이 없습니다.",
  pharmacistTitle: "약사 코멘트",
  pharmacistEmpty: "등록된 약사 코멘트가 없습니다.",
  recommendationLabel: "권장사항:",
  cautionLabel: "주의사항:",
  generatedLabel: "생성 시각",
  employeeLabel: "대상자",
  periodLabel: "기간",
  mockSuffix: " / 데모 데이터",
} as const;

export const REPORT_SUMMARY_HEALTH_INSIGHT_EMPTY_MESSAGE = "내용이 없습니다.";
