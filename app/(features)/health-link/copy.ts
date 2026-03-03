export const HEALTH_LINK_COPY = {
  status: {
    linked: "연동 완료",
    authRequested: "인증 진행 중",
    notLinked: "미연동",
  },
  flow: {
    fetch: {
      title: "건강정보 확인",
      guide: "저장된 정보와 최신 정보를 순서대로 확인합니다.",
    },
    reauth: {
      title: "인증 시작",
      guide: "세션이 만료되었습니다. 아래 버튼을 눌러 인증을 진행해 주세요.",
    },
    sign: {
      title: "인증 확인",
      guide: "카카오 인증 후 `인증 완료 확인`을 눌러 주세요.",
    },
    init: {
      title: "인증 시작",
      guide: "본인정보를 입력하고 인증을 시작해 주세요.",
    },
  },
  action: {
    next: "인증 시작",
    confirmAuth: "인증 완료 확인",
    fetchNow: "최신 정보 확인",
    reload: "최신 정보 확인",
    retryAuth: "인증 시작",
    moreOptions: "추가 옵션",
    switchIdentity: "다른 사람 조회",
    switchIdentityConfirm:
      "현재 연동 정보를 정리하고 다른 사람 조회를 시작할까요?",
    unlink: "연동 해제",
    refreshStatus: "상태 새로고침",
  },
  header: {
    authKicker: "인증 단계",
    resultKicker: "결과 확인",
    title: "건강검진 연동",
    description:
      "인증이 완료되면 건강정보를 자동으로 불러와 한 화면에서 확인할 수 있어요.",
  },
  auth: {
    title: "인증 및 연동",
    channelTitle: "카카오 인증",
    channelDescription: "인증 채널은 카카오를 사용합니다.",
    requiredInitTitle: "필수 단계 1. 본인정보 입력",
    requiredInitDescription:
      "이름, 생년월일, 휴대폰 번호를 정확히 입력한 뒤 진행해 주세요.",
    requiredSignTitle: "필수 단계 2. 카카오 인증 확인",
    requiredSignDescription:
      "카카오에서 인증을 승인한 뒤 `인증 완료 확인`을 눌러 주세요.",
    requiredActionHintInit: "필수: 입력 후 `인증 시작`을 눌러 인증 요청",
    requiredActionHintSign: "필수: 카카오 승인 후 `인증 완료 확인`을 눌러 완료",
    optionalLoginSummary: "선택 옵션: 카카오 로그인 연동",
    optionalLoginDescription:
      "로그인하면 기기 변경 후에도 기록을 더 안정적으로 이어볼 수 있습니다.",
    optionalLoginHint:
      "빠른 조회만 필요하면 로그인 없이도 진행할 수 있습니다.",
    nameLabel: "이름",
    namePlaceholder: "홍길동",
    birthLabel: "생년월일 (YYYYMMDD)",
    birthPlaceholder: "19900101",
    phoneLabel: "휴대폰 번호",
    phonePlaceholder: "01012345678",
    currentStepPrefix: "현재 단계",
    pendingTitle: "카카오 인증을 완료해 주세요",
    pendingDescription:
      "카카오 인증 승인 후 `인증 완료 확인`을 누르면 결과를 자동으로 불러옵니다.",
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
      "현재 정책에서 일부 조회 항목이 제한되었습니다.",
    targetPolicyBlockedDefault:
      "현재 정책에서 일부 조회 항목이 제한되었습니다.",
    budgetRetrySuffixPrefix: "다시 시도까지",
    budgetRetrySuffixUnit: "초 남았습니다.",
    budgetExceededDetailedPrefix:
      "비용 보호 한도에 도달했습니다. 최근",
    budgetExceededDetailedMiddle: "시간 사용량",
    budgetExceededDetailedSuffix: "사용",
    budgetExceededFallback: "비용 보호 한도에 도달했습니다.",
    statusLoadFallback: "연동 상태를 불러오지 못했습니다.",
    inputNameRequired: "이름을 입력해 주세요.",
    inputBirthInvalid: "생년월일은 YYYYMMDD 형식으로 입력해 주세요.",
    inputPhoneInvalid: "휴대폰 번호는 숫자 10~11자리여야 합니다.",
    initFallback: "인증 요청에 실패했습니다.",
    initTimeout:
      "인증 요청 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    initNoticeReused:
      "인증 요청 상태를 확인했습니다. 카카오 인증 후 `인증 완료 확인`을 눌러 주세요.",
    initNoticeDbReused:
      "저장된 정보를 확인했습니다. 필요 시 최신 정보 확인을 진행해 주세요.",
    initNoticeCreated:
      "인증 요청을 보냈습니다. 카카오 인증 후 `인증 완료 확인`을 눌러 주세요.",
    signFallback: "인증 확인 처리에 실패했습니다.",
    signTimeout:
      "인증 확인 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    signNoticeReused: "인증 확인이 완료되었습니다.",
    signNoticeCompleted: "인증 확인이 완료되었습니다.",
    autoFetchAfterSignNotice: "건강정보를 불러오고 있어요.",
    autoFetchOnEntryNotice: "건강정보를 불러오고 있어요.",
    fetchTimeout: "응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    fetchDetailTimeout:
      "응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    requestTimeoutFallback:
      "응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    networkErrorFallback:
      "네트워크 연결이 불안정합니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.",
    detailAlreadyLoadedNotice:
      "상세 수치를 이미 불러왔습니다. 현재 결과를 재사용합니다.",
    sessionExpiredDetected:
      "세션이 만료되었습니다. 카카오 인증 후 다시 시도해 주세요.",
    unlinkFallback: "연동 해제에 실패했습니다.",
    unlinkNotice: "연동을 해제했습니다.",
  },
  workflow: {
    statusTitle: "연동 준비",
    statusSubtitle: "본인정보 입력 후 인증 요청",
    authTitle: "인증 확인",
    authSubtitle: "카카오 인증 후 상태 확인",
    syncTitle: "건강정보 조회",
    syncSubtitle: "저장 데이터 우선 확인 후 최신 정보 반영",
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
      "최근 건강검진과 복약 이력을 요약해 한 번에 확인할 수 있어요.",
    loadingTitle: "건강정보를 불러오는 중입니다",
    loadingStageInit: "연동 상태를 확인하고 조회를 준비하고 있어요.",
    loadingStageFetch: "건강정보를 조회하고 있어요. 잠시만 기다려 주세요.",
    loadingStageSlow: "응답이 지연되고 있어요. 완료되면 자동으로 보여드릴게요.",
    loadingElapsedUnit: "초 경과",
    loadingHint: "응답이 오래 걸리면 잠시 후 다시 시도해 주세요.",
    linkRequired: "먼저 인증을 완료한 뒤 데이터를 조회해 주세요.",
    partialFailureTitle: "일부 조회 실패",
    partialFailureHint:
      "일부 항목은 불러오지 못했지만 가능한 데이터부터 먼저 표시합니다.",
    partialFailureDetailSummary: "실패 항목 상세 보기",
    sessionExpiredTitle: "세션이 만료되었습니다",
    sessionExpiredGuide:
      "상단에서 인증 시작 버튼을 눌러 인증을 진행해 주세요.",
    switchIdentityHint: "새 인증이 필요할 때만 사용하세요.",
    summaryTitle: "핵심 요약",
    summaryFallbackHeadline: "결과를 간단히 정리했어요",
    summaryFallbackBody:
      "먼저 확인하면 좋은 항목을 중심으로 보여드릴게요.",
    metricExpandPrefix: "검진 항목 ",
    metricExpandSuffix: "개 더 보기",
    metricCollapseLabel: "검진 항목 접기",
    metricLead: "중요한 항목부터 빠르게 확인해 보세요.",
    medicationDetailsSummary: "복약 이력 보기",
    empty: "아직 불러온 검진 수치가 없습니다.",
    latestDateTitle: "최신 검진일",
    latestDateFallback: "검진일 정보 없음",
    latestAgencyTitle: "검진기관",
    latestAgencyNote: "최신 1회 기준",
    latestOverallTitle: "종합판정",
    latestOverallNote: "공단 제공 원문",
    medicationCountTitle: "복약 항목",
    medicationCountNotePrefix: "고유 약품",
    latestRowsTitle: "최신 검진 핵심 수치",
    cautionTitle: "주의 항목",
    cautionEmpty: "이번 검진에서는 주의 항목이 발견되지 않았습니다.",
    cautionLimitHint:
      "주의 항목은 최대 6건까지 우선 표시하고, 전체 목록에서 모두 확인할 수 있어요.",
    fullMetricsSummary: "전체 검진 수치 보기",
    statusNormal: "정상",
    statusCaution: "주의",
    statusUnknown: "확인 필요",
    medicationSummaryTitle: "복약 요약",
    medicationSummaryNote: "조회 가능한 정보 기준",
    medicationEmpty: "복약 데이터가 없습니다.",
    topMedicineTitle: "자주 복용한 약",
    topConditionTitle: "복용 목적(추정)",
    recentMedicationTitle: "최근 복용 이력",
    recentLinesSummary: "요약 라인 보기",
    limitedMetricInfo:
      "이번 응답에서는 일부 수치만 제공되어 요약 중심으로 표시하고 있습니다.",
    tableTitle: "검진 수치 테이블",
    tableEmpty: "표시할 수 있는 검진 수치가 없습니다.",
  },
  fetch: {
    cacheHitPrefix: "저장 데이터 (조회 시각",
    cacheHitInfix: ", 만료 시각",
    cacheHitSuffix: ")",
    liveResponse: "실시간 응답",
    forceRefreshBlockedPrefix: "강제 새로고침은",
    forceRefreshBlockedMiddle: "초 동안 제한됩니다. (해제 시각",
    forceRefreshBlockedSuffix: ")",
    forceRefreshBudgetBlockedPrefix:
      "이번 한도에서 강제 새로고침 예산을 모두 사용했습니다 (",
    forceRefreshBudgetBlockedMiddle: "/",
    forceRefreshBudgetBlockedSuffix: ")",
    forceRefreshBudgetBlockedWindowPrefix: "윈도우",
    forceRefreshBudgetBlockedWindowSuffix: "시간",
    forceRefreshDefault: "강제 새로고침 시 유료 API가 추가 호출될 수 있습니다.",
    confirmDetailSubject: "상세 수치",
    confirmSummarySubject: "요약 데이터",
    confirmLine1Prefix: "저장 정보를 무시하고",
    confirmLine1Suffix: "강제 새로고침합니다.",
    confirmLine2: "추가 API 비용이 발생할 수 있습니다. 계속할까요?",
    detailButton: "상세 조회",
    detailForceButton: "상세 강제 새로고침 (캐시 무시)",
    summaryForceButton: "강제 새로고침 (캐시 무시)",
    detailHint: "비용 한도 정책이 적용됩니다.",
    advancedSummary: "고급 옵션 보기",
    detailAlreadyLoadedHint:
      "상세 수치를 이미 불러왔습니다. 꼭 필요할 때만 강제 새로고침을 사용해 주세요.",
  },
  raw: {
    summary: "원본 응답 (JSON)",
  },
} as const;
