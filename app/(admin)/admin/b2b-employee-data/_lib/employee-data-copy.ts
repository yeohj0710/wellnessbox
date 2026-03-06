export const EMPLOYEE_DATA_COPY = {
  hero: {
    kicker: "B2B DATA OPS",
    title: "임직원 데이터 운영 콘솔",
    description:
      "/employee-report, /health-link, /survey, /admin/b2b-reports에서 사용하는 임직원 데이터의 연동/캐시/리포트 상태를 한 곳에서 관리할 수 있습니다.",
    searchPlaceholder: "이름, 생년월일, 휴대폰 번호 검색",
    searchButton: "검색",
    refreshButton: "새로고침",
    busyPrefix: "현재 작업",
  },
  sidebar: {
    title: "임직원 목록",
    totalPrefix: "총",
    selectedPrefix: "선택",
    selectGuide: "임직원을 선택해 주세요.",
    healthSnapshotPrefix: "스냅샷",
    reportPrefix: "리포트",
    empty: "조회된 임직원 데이터가 없습니다.",
  },
  workspace: {
    emptySelection: "직원을 선택하면 운영 데이터를 조회할 수 있습니다.",
  },
  createForm: {
    summary: "신규 임직원 등록",
    namePlaceholder: "이름",
    birthDatePlaceholder: "생년월일 8자리 (YYYYMMDD)",
    phonePlaceholder: "휴대폰 번호 10~11자리",
    appUserIdPlaceholder: "연결 AppUser ID (선택)",
    providerPlaceholder: "연동 제공자 (기본: HYPHEN_NHIS)",
    submitLabel: "신규 임직원 등록",
  },
  profile: {
    syncPrefix: "마지막 연동",
    viewedPrefix: "마지막 조회",
    namePlaceholder: "이름",
    birthDatePlaceholder: "생년월일 8자리",
    phonePlaceholder: "휴대폰 번호 10~11자리",
    appUserIdPlaceholder: "AppUser ID (비우면 연결 해제)",
    providerPlaceholder: "연동 제공자",
    saveButton: "기본 정보 저장",
  },
  operations: {
    title: "운영 작업",
    resetPeriodButton: "기간 데이터 초기화",
    resetAllButton: "전체 B2B 결과 데이터 초기화",
    includeAccessLogs: "접속 로그 삭제",
    includeAdminLogs: "관리자 로그 삭제",
    clearLink: "하이픈 링크 세션 초기화",
    clearFetchCache: "하이픈 캐시 삭제",
    clearFetchAttempts: "하이픈 조회 이력 삭제",
    clearHyphenCacheButton: "하이픈 캐시/세션 정리",
    deleteGuide:
      "직원 전체 삭제가 필요하면 확인 입력란에 직원명을 정확하게 입력해 주세요.",
    deleteConfirmPlaceholderPrefix: "삭제 확인",
    deleteEmployeeButton: "직원 전체 삭제",
  },
  sectionTitle: {
    healthSnapshots: "건강 스냅샷",
    surveyResponses: "설문 응답",
    analysisResults: "분석 결과",
    pharmacistNotes: "의사 코멘트",
    reports: "리포트",
    accessLogs: "접속 로그 기록",
    adminActionLogs: "관리자 작업 기록",
  },
  summary: {
    title: "데이터 현황",
    healthSnapshotsLabel: "스냅샷",
    surveyResponsesLabel: "설문",
    analysisResultsLabel: "분석",
    pharmacistNotesLabel: "코멘트",
    reportsLabel: "리포트",
    fetchCacheLabel: "하이픈 캐시(유효/전체)",
    periodPrefix: "가용 기간",
    noPeriod: "기간 데이터 없음",
  },
  healthLink: {
    summary: "하이픈 캐시/조회이력",
    fetchCachesTitle: "하이픈 캐시 레코드",
    fetchAttemptsTitle: "하이픈 조회 시도",
    empty:
      "appUserId가 연결되지 않아 하이픈 연동 정보를 조회할 수 없습니다.",
  },
  recordList: {
    deleteButton: "삭제",
    jsonPreview: "JSON 보기",
    empty: "데이터가 없습니다.",
  },
  action: {
    search: {
      message: "임직원 목록을 검색하고 있습니다.",
      fallbackError: "검색 중 오류가 발생했습니다.",
      successNotice: "임직원 목록을 갱신했습니다.",
    },
    createEmployee: {
      message: "신규 임직원을 등록하고 있습니다.",
      fallbackError: "임직원 등록에 실패했습니다.",
      successNotice: "신규 임직원을 등록했습니다.",
    },
    saveEmployeeProfile: {
      message: "임직원 기본 정보를 저장하고 있습니다.",
      fallbackError: "임직원 정보 저장에 실패했습니다.",
      successNotice: "임직원 기본 정보를 저장했습니다.",
    },
    refreshOpsData: {
      message: "운영 데이터를 새로고침하고 있습니다.",
      fallbackError: "새로고침에 실패했습니다.",
      successNotice: "운영 데이터를 새로고침했습니다.",
    },
    resetAllData: {
      confirm:
        "이 임직원의 B2B 결과 데이터를 모두 초기화하시겠습니까?\n\n설문/분석/의사코멘트/리포트가 모두 삭제됩니다.",
      message: "임직원 결과 데이터를 초기화하고 있습니다.",
      fallbackError: "데이터 초기화에 실패했습니다.",
      successNotice: "임직원 결과 데이터 초기화를 완료했습니다.",
    },
    resetPeriodData: {
      invalidPeriod: "기간은 YYYY-MM 형식으로 입력해 주세요.",
      confirmTemplate:
        "{periodKey} 기간 데이터를 초기화하시겠습니까?\n\n설문/분석/의사코멘트/리포트가 모두 삭제됩니다.",
      message: "기간 데이터를 초기화하고 있습니다.",
      fallbackError: "기간 데이터 초기화에 실패했습니다.",
      successNoticeTemplate: "{periodKey} 기간 데이터를 초기화했습니다.",
    },
    clearHyphenCache: {
      confirm:
        "하이픈 연동 세션/캐시/조회 이력을 정리합니다.\n다음 조회 시 본인인증 또는 추가 동의가 필요할 수 있습니다.\n진행할까요?",
      message: "하이픈 연동 캐시를 정리하고 있습니다.",
      fallbackError: "하이픈 캐시 정리에 실패했습니다.",
      successNotice: "하이픈 연동 캐시 정리를 완료했습니다.",
    },
    deleteEmployee: {
      nameMismatch: "삭제 확인 입력란에 직원명을 정확하게 입력해 주세요.",
      confirmTemplate:
        "{employeeName} 임직원을 완전히 삭제합니다.\n결과 데이터도 함께 삭제됩니다.\n계속할까요?",
      message: "임직원 데이터를 삭제하고 있습니다.",
      fallbackError: "임직원 삭제에 실패했습니다.",
      successNotice: "임직원 데이터를 삭제했습니다.",
    },
    deleteRecord: {
      confirm: "선택한 레코드를 삭제하시겠습니까?",
      message: "레코드를 삭제하고 있습니다.",
      fallbackError: "레코드 삭제에 실패했습니다.",
      successNotice: "레코드를 삭제했습니다.",
    },
  },
} as const;

export function withTemplate(raw: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), value),
    raw
  );
}
