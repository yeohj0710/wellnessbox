export const AGENT_TASKS = [
  "escalate_pharmacist",
  "check_safety",
  "rank_ingredients",
  "retrieve_evidence",
  "optimize_regimen",
  "create_followup",
  "ingest_pro",
  "ingest_wearable",
  "review_adjustment",
  "continue_monitoring",
] as const;

export type AgentTask = (typeof AGENT_TASKS)[number];

export type AgentObservation = {
  userMessage: string;
  sessionState: string;
  urgentRedFlag: boolean;
  seriousAdverseEvent: boolean;
  safetyChecked: boolean;
  candidateCount: number;
  evidenceRetrieved: boolean;
  planActive: boolean;
  followupScheduled: boolean;
  followupDue: boolean;
  proRecorded: boolean;
  proChangePercentile: number;
  adherencePercent: number;
  wearableConnected: boolean;
  wearableAnomaly: boolean;
};

export type AgentTaskCandidate = {
  task: AgentTask;
  label: string;
  priority: number;
  matched: boolean;
  reason: string;
};

export type AgentDecision = {
  selectedTask: AgentTask;
  selectedLabel: string;
  reason: string;
  currentState: string;
  targetState: string;
  tool: string;
  expectedPostcondition: string;
  candidates: AgentTaskCandidate[];
  evaluatedSignals: Array<{ label: string; value: string }>;
};

const DEFINITIONS: Record<AgentTask, { label: string; tool: string; targetState: string; postcondition: string }> = {
  escalate_pharmacist: { label: "약사 긴급 검토로 전환", tool: "escalate_pharmacist", targetState: "ESCALATED", postcondition: "추가 추천 중단 및 긴급 검토 건 생성" },
  check_safety: { label: "금기·상호작용 안전검사", tool: "check_safety", targetState: "SAFETY_REVIEW", postcondition: "안전 판정과 제외 성분 목록 저장" },
  rank_ingredients: { label: "추천 후보와 효과점수 계산", tool: "rank_ingredients", targetState: "CANDIDATES_READY", postcondition: "성분별 점수와 추천 후보 목록 생성" },
  retrieve_evidence: { label: "추천 근거 검색", tool: "retrieve_evidence", targetState: "CANDIDATES_READY", postcondition: "추천 후보별 근거 문헌 연결" },
  optimize_regimen: { label: "복용 조합 최적화", tool: "optimize_regimen", targetState: "ACTIVE_PLAN", postcondition: "안전·효과·비용·복용편의 조건을 만족하는 계획 확정" },
  create_followup: { label: "2주 후속평가 예약", tool: "create_followup", targetState: "FOLLOWUP_DUE", postcondition: "후속평가 일정과 수집 항목 생성" },
  ingest_pro: { label: "자가보고 결과(PRO) 수집", tool: "ingest_pro", targetState: "ADJUSTMENT_REVIEW", postcondition: "동일 설문의 후속 점수와 변화량 저장" },
  ingest_wearable: { label: "웨어러블 측정값 수집", tool: "ingest_wearable", targetState: "ADJUSTMENT_REVIEW", postcondition: "기기 이상 신호를 현재 계획과 연결" },
  review_adjustment: { label: "복용 계획 재조정", tool: "optimize_regimen", targetState: "ACTIVE_PLAN", postcondition: "효과·순응도·기기 신호를 반영한 새 계획 생성" },
  continue_monitoring: { label: "현재 계획 유지 및 모니터링", tool: "create_followup", targetState: "ACTIVE_PLAN", postcondition: "현재 계획 유지와 다음 관찰 시점 기록" },
};

function boundedNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeAgentObservation(value: Partial<AgentObservation>): AgentObservation {
  const userMessage = String(value.userMessage ?? "추천을 시작하고 다음에 필요한 작업을 진행해 주세요.").slice(0, 500);
  const urgentFromMessage = /(흉통|가슴\s*통증|호흡\s*곤란|의식\s*저하|응급)/.test(userMessage);
  const seriousAeFromMessage = /(중대한\s*이상사례|입원|응급실|심각한\s*부작용)/.test(userMessage);
  return {
    userMessage,
    sessionState: String(value.sessionState ?? "NEW").slice(0, 40),
    urgentRedFlag: value.urgentRedFlag === true || urgentFromMessage,
    seriousAdverseEvent: value.seriousAdverseEvent === true || seriousAeFromMessage,
    safetyChecked: value.safetyChecked === true,
    candidateCount: Math.round(boundedNumber(value.candidateCount, 0, 14, 0)),
    evidenceRetrieved: value.evidenceRetrieved === true,
    planActive: value.planActive === true,
    followupScheduled: value.followupScheduled === true,
    followupDue: value.followupDue === true,
    proRecorded: value.proRecorded === true,
    proChangePercentile: boundedNumber(value.proChangePercentile, -100, 100, 0),
    adherencePercent: boundedNumber(value.adherencePercent, 0, 100, 100),
    wearableConnected: value.wearableConnected === true,
    wearableAnomaly: value.wearableAnomaly === true,
  };
}

export function decideNextAgentTask(value: Partial<AgentObservation>): AgentDecision {
  const observation = normalizeAgentObservation(value);
  const rules: Array<{ task: AgentTask; matched: boolean; reason: string }> = [
    { task: "escalate_pharmacist", matched: observation.urgentRedFlag || observation.seriousAdverseEvent, reason: "응급 위험 신호 또는 중대한 이상사례가 입력됨" },
    { task: "check_safety", matched: !observation.safetyChecked, reason: "추천 전에 금기·상호작용 안전검사가 필요함" },
    { task: "rank_ingredients", matched: observation.safetyChecked && observation.candidateCount === 0, reason: "안전검사는 끝났지만 추천 후보가 아직 계산되지 않음" },
    { task: "retrieve_evidence", matched: observation.candidateCount > 0 && !observation.evidenceRetrieved, reason: "추천 후보는 있으나 근거 문헌이 연결되지 않음" },
    { task: "optimize_regimen", matched: observation.candidateCount > 0 && observation.evidenceRetrieved && !observation.planActive, reason: "근거가 확인된 후보를 복용 조합으로 확정해야 함" },
    { task: "create_followup", matched: observation.planActive && !observation.followupScheduled, reason: "활성 복용 계획의 후속평가 일정이 없음" },
    { task: "ingest_pro", matched: observation.planActive && observation.followupDue && !observation.proRecorded, reason: "후속평가 시점이 되었지만 자가보고 결과가 없음" },
    { task: "ingest_wearable", matched: observation.planActive && observation.wearableConnected && observation.wearableAnomaly, reason: "웨어러블에서 현재 계획 검토가 필요한 이상 신호가 감지됨" },
    { task: "review_adjustment", matched: observation.planActive && observation.proRecorded && (observation.proChangePercentile <= 0 || observation.adherencePercent < 70), reason: "효과 개선이 없거나 복용 순응도가 70% 미만임" },
    { task: "continue_monitoring", matched: true, reason: "즉시 처리할 위험·누락·재조정 조건이 없음" },
  ];
  const selectedIndex = rules.findIndex((rule) => rule.matched);
  const selected = rules[selectedIndex];
  const definition = DEFINITIONS[selected.task];
  return {
    selectedTask: selected.task,
    selectedLabel: definition.label,
    reason: selected.reason,
    currentState: observation.sessionState,
    targetState: definition.targetState,
    tool: definition.tool,
    expectedPostcondition: definition.postcondition,
    candidates: rules.map((rule, index) => ({ task: rule.task, label: DEFINITIONS[rule.task].label, priority: index + 1, matched: rule.matched, reason: rule.reason })),
    evaluatedSignals: [
      { label: "사용자 요청", value: observation.userMessage },
      { label: "현재 상태", value: observation.sessionState },
      { label: "안전검사", value: observation.safetyChecked ? "완료" : "미완료" },
      { label: "추천 후보", value: `${observation.candidateCount}개` },
      { label: "근거 연결", value: observation.evidenceRetrieved ? "완료" : "미완료" },
      { label: "활성 계획", value: observation.planActive ? "있음" : "없음" },
      { label: "후속평가", value: observation.followupDue ? "기한 도래" : observation.followupScheduled ? "예약됨" : "미예약" },
      { label: "PRO 변화", value: `${observation.proChangePercentile >= 0 ? "+" : ""}${observation.proChangePercentile.toFixed(1)}pp` },
      { label: "복용 순응도", value: `${observation.adherencePercent.toFixed(0)}%` },
    ],
  };
}
