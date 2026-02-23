export const HEALTH_LINK_COPY = {
  status: {
    linked: "연동 완료",
    authRequested: "인증 요청됨",
    notLinked: "미연동",
  },
  flow: {
    fetch: {
      title: "최신 결과 불러오기",
      guide: "확인 후 최신 검진 1회차와 투약 요약을 바로 조회합니다.",
    },
    reauth: {
      title: "카카오 인증 다시 요청",
      guide:
        "세션 만료로 조회가 중단되었습니다. 인증을 다시 요청한 뒤 카카오에서 승인해 주세요.",
    },
    sign: {
      title: "카카오 인증 완료",
      guide: "카카오 앱에서 인증을 마친 뒤 다음을 눌러주세요.",
    },
    init: {
      title: "카카오 인증 요청",
      guide: "이름, 생년월일, 휴대폰 번호를 입력한 뒤 다음을 눌러주세요.",
    },
  },
  action: {
    next: "다음",
    reload: "최신 결과 다시 조회",
    retryAuth: "카카오 인증 다시 요청",
    unlink: "연동 해제",
    refreshStatus: "상태 새로고침",
  },
  header: {
    authKicker: "인증 단계",
    resultKicker: "결과 보기",
    title: "건강검진 연동",
    description:
      "한 화면에서 한 단계만 진행합니다. 인증 후 결과를 자동으로 불러옵니다.",
  },
  auth: {
    title: "인증 및 연동",
    channelTitle: "카카오 인증",
    channelDescription: "필수 인증 채널은 카카오입니다.",
    requiredInitTitle: "필수 단계 1. 본인정보 입력",
    requiredInitDescription:
      "이름, 생년월일, 휴대폰 번호를 정확히 입력하고 `다음`을 눌러 인증을 요청해 주세요.",
    requiredSignTitle: "필수 단계 2. 카카오 승인",
    requiredSignDescription:
      "카카오 앱에서 인증 요청을 승인한 뒤 이 화면으로 돌아와 `다음`을 눌러 완료해 주세요.",
    requiredActionHintInit: "필수: 입력 후 `다음`을 눌러 인증 요청",
    requiredActionHintSign: "필수: 카카오 승인 후 `다음`을 눌러 완료",
    optionalLoginSummary: "선택 옵션: 카카오 로그인 연동",
    optionalLoginDescription:
      "로그인하면 기기 변경 시 기존 기록을 더 안정적으로 이어볼 수 있습니다.",
    optionalLoginHint:
      "빠른 조회만 필요하면 로그인 없이 그대로 진행해도 됩니다.",
    nameLabel: "이름",
    namePlaceholder: "홍길동",
    birthLabel: "생년월일 (YYYYMMDD)",
    birthPlaceholder: "19900101",
    phoneLabel: "휴대폰 번호",
    phonePlaceholder: "01012345678",
    currentStepPrefix: "현재 단계",
    pendingTitle: "카카오 인증을 완료해 주세요",
    pendingDescription:
      "카카오 앱에서 인증 승인 후 확인을 누르면 결과를 자동으로 불러옵니다.",
    prerequisiteTitle: "사전 준비가 필요합니다",
    prerequisiteDescription:
      "건강iN에서 건강검진 서비스를 먼저 활성화한 뒤 다시 시도해 주세요.",
    prerequisiteLinkLabel: "건강iN 열기",
    statusLoadFallback: "연동 상태를 불러오지 못했습니다.",
  },
  hook: {
    forceRefreshCooldownFallback:
      "비용 보호 정책으로 강제 새로고침이 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.",
    targetPolicyBlockedPrefix:
      "현재 비용 정책에서는 검진 타깃만 허용됩니다. 차단된 타깃:",
    targetPolicyBlockedDefault: "현재 비용 정책에서는 검진 타깃만 허용됩니다.",
    budgetRetrySuffixPrefix: " 재시도 가능까지",
    budgetRetrySuffixUnit: "초 남았습니다.",
    budgetExceededDetailedPrefix: "비용 보호 윈도우 한도에 도달했습니다. 최근",
    budgetExceededDetailedMiddle: "시간 사용량:",
    budgetExceededDetailedSuffix: "사용됨.",
    budgetExceededFallback: "비용 보호 윈도우 한도에 도달했습니다.",
    statusLoadFallback: "연동 상태를 불러오지 못했습니다.",
    inputNameRequired: "이름을 입력해 주세요.",
    inputBirthInvalid: "생년월일은 YYYYMMDD 형식으로 입력해 주세요.",
    inputPhoneInvalid: "휴대폰 번호는 숫자 10~11자리여야 합니다.",
    initFallback: "인증 요청에 실패했습니다.",
    initNoticeReused:
      "기존 인증 요청 상태를 재사용했습니다. 카카오에서 인증 완료 후 다음 단계로 진행해 주세요.",
    initNoticeDbReused:
      "동일한 본인정보가 확인되어 저장된 검진 데이터를 DB에서 바로 불러옵니다.",
    initNoticeCreated:
      "카카오 인증 요청을 보냈습니다. 카카오에서 인증 완료 후 다음 단계로 진행해 주세요.",
    signFallback: "인증 완료 처리에 실패했습니다.",
    signNoticeReused: "이미 인증이 완료된 상태입니다.",
    signNoticeCompleted: "연동 인증이 완료되었습니다.",
    autoFetchAfterSignNotice:
      "인증 완료 후 최신 검진/투약 데이터를 자동으로 조회 중입니다.",
    autoFetchOnEntryNotice:
      "저장된 연동 상태를 확인해 최신 결과를 자동으로 불러오는 중입니다.",
    detailAlreadyLoadedNotice:
      "상세 수치를 이미 불러왔습니다. 추가 유료 호출 없이 현재 결과를 재사용합니다.",
    sessionExpiredDetected:
      "검진 서비스 세션이 만료되었습니다. 카카오 인증을 다시 요청한 뒤 인증 완료 후 다시 조회해 주세요.",
    unlinkFallback: "연동 해제에 실패했습니다.",
    unlinkNotice: "연동을 해제했습니다.",
  },
  workflow: {
    statusTitle: "연동 준비",
    statusSubtitle: "본인정보 입력 후 인증 요청",
    authTitle: "카카오 인증 완료",
    authSubtitle: "카카오에서 승인 후 자동 조회 시작",
    syncTitle: "검진 수치 조회",
    syncSubtitle: "최신 1회차 + 투약 요약 자동 정리",
  },
  table: {
    rowUnit: "건",
    previewHintPrefix: "총",
    previewHintMiddle: "중",
    previewHintSuffix: "건을 미리 보여주고 있습니다.",
  },
  statusMeta: {
    detailSummary: "연동 상태 상세 보기",
    lastErrorFallback: "연동 오류",
  },
  result: {
    title: "검진 수치",
    description:
      "최근 건강검진 1회차 핵심 수치와 투약 이력을 한 화면에서 확인할 수 있습니다.",
    linkRequired: "먼저 연동 인증을 완료한 뒤 데이터를 조회해 주세요.",
    partialFailureTitle: "일부 조회 실패",
    partialFailureHint:
      "핵심 정보는 표시했지만 일부 항목은 가져오지 못했습니다. 자세한 내용은 아래에서 확인하세요.",
    partialFailureDetailSummary: "실패 항목 자세히 보기",
    sessionExpiredTitle: "세션이 만료되었습니다",
    sessionExpiredGuide:
      "상단 1번 영역에서 `카카오 인증 다시 요청`을 눌러 재인증을 시작해 주세요.",
    empty: "아직 불러온 검진 수치가 없습니다.",
    latestDateTitle: "최신 검진일",
    latestDateFallback: "검진일 정보 없음",
    latestAgencyTitle: "검진기관",
    latestAgencyNote: "최근 1회차 기준",
    latestOverallTitle: "종합소견",
    latestOverallNote: "공단 제공 판정",
    medicationCountTitle: "투약 항목",
    medicationCountNotePrefix: "고유 약품",
    latestRowsTitle: "최신 검진 핵심 수치",
    cautionTitle: "주의 항목",
    cautionEmpty: "이번 검진에서 주의 항목이 발견되지 않았습니다.",
    cautionLimitHint:
      "주의 항목은 핵심 6건만 먼저 표시합니다. 아래 전체 항목 보기에서 모두 확인할 수 있습니다.",
    fullMetricsSummary: "전체 검진 수치 보기",
    statusNormal: "정상",
    statusCaution: "주의",
    statusUnknown: "확인 필요",
    medicationSummaryTitle: "투약 요약",
    medicationSummaryNote: "진료 조회 없이 비용 절약",
    medicationEmpty: "투약 데이터가 없습니다.",
    topMedicineTitle: "자주 복용한 약",
    topConditionTitle: "복용 목적(추정)",
    recentMedicationTitle: "최근 복용 이력",
    recentLinesSummary: "요약 라인 보기",
    limitedMetricInfo:
      "이번 응답에서 지표형 값이 제한적으로 제공되어 요약 데이터를 표시하고 있습니다.",
    tableTitle: "핵심 검진 수치 테이블",
    tableEmpty: "표시할 수 있는 검진 수치가 없습니다.",
  },
  fetch: {
    cacheHitPrefix: "캐시 결과 (조회 시각",
    cacheHitInfix: ", 만료 시각",
    cacheHitSuffix: ")",
    liveResponse: "실시간 응답",
    forceRefreshBlockedPrefix: "강제 새로고침은",
    forceRefreshBlockedMiddle: "초 동안 제한됩니다. (해제 시각",
    forceRefreshBlockedSuffix: ")",
    forceRefreshBudgetBlockedPrefix:
      "이번 윈도우에서 강제 새로고침 예산을 모두 사용했습니다 (",
    forceRefreshBudgetBlockedMiddle: "/",
    forceRefreshBudgetBlockedSuffix: ")",
    forceRefreshBudgetBlockedWindowPrefix: "윈도우",
    forceRefreshBudgetBlockedWindowSuffix: "시간",
    forceRefreshDefault: "강제 새로고침 시 유료 API가 추가 호출될 수 있습니다.",
    confirmDetailSubject: "상세 수치",
    confirmSummarySubject: "요약 데이터",
    confirmLine1Prefix: "캐시를 무시하고",
    confirmLine1Suffix: "강제 새로고침합니다.",
    confirmLine2: "추가 API 비용이 발생할 수 있습니다. 계속할까요?",
    detailButton: "상세 조회 (비용 제한: 최근 1년)",
    detailForceButton: "상세 강제 새로고침 (캐시 무시)",
    summaryForceButton: "최신 결과 강제 새로고침 (캐시 무시)",
    detailHint: "비용 제한 정책이 적용됩니다.",
    advancedSummary: "고급 옵션 보기",
    detailAlreadyLoadedHint:
      "상세 수치를 이미 불러왔습니다. 지금 즉시 갱신이 필요할 때만 강제 새로고침을 사용해 주세요.",
  },
  raw: {
    summary: "원본 응답 (JSON)",
  },
} as const;
