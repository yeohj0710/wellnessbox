"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { AgentDecision, AgentObservation } from "@/lib/tips/agent-decision-engine";
import styles from "./interim.module.css";

export type AgentDecisionWorkbenchHandle = { evaluate: () => Promise<boolean> };

const DEFAULT_OBSERVATION: AgentObservation = {
  userMessage: "수면 관리용 추천을 시작하고 다음에 필요한 작업을 진행해 주세요.",
  sessionState: "NEW",
  urgentRedFlag: false,
  seriousAdverseEvent: false,
  safetyChecked: false,
  candidateCount: 0,
  evidenceRetrieved: false,
  planActive: false,
  followupScheduled: false,
  followupDue: false,
  proRecorded: false,
  proChangePercentile: 0,
  adherencePercent: 90,
  wearableConnected: false,
  wearableAnomaly: false,
};

const BOOLEAN_FIELDS: Array<[keyof AgentObservation, string, string]> = [
  ["urgentRedFlag", "응급 위험 신호", "흉통 등 즉시 검토가 필요한 신호"],
  ["seriousAdverseEvent", "중대한 이상사례", "복용 중 입원·응급 처치 수준의 사건"],
  ["safetyChecked", "안전검사 완료", "금기·상호작용 규칙 적용 여부"],
  ["evidenceRetrieved", "추천 근거 연결", "후보별 근거 문헌 조회 여부"],
  ["planActive", "복용 계획 확정", "추천 조합이 활성 계획으로 저장됐는지"],
  ["followupScheduled", "후속평가 예약", "2주 또는 4주 평가 일정 존재 여부"],
  ["followupDue", "후속평가 기한 도래", "현재가 후속 자료 수집 시점인지"],
  ["proRecorded", "PRO 기록 완료", "동일 설문의 후속 점수가 저장됐는지"],
  ["wearableConnected", "웨어러블 연결", "기기 측정값을 받을 수 있는지"],
  ["wearableAnomaly", "웨어러블 이상 신호", "기준 범위를 벗어난 측정값이 있는지"],
];

async function requestDecision(observation: AgentObservation) {
  const init = await fetch("/api/tips/lab", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "initialize", profile: { goals: ["sleep_quality"] } }) });
  const initialized = await init.json();
  if (!init.ok) throw new Error(String(initialized.error ?? "initialize_failed"));
  const response = await fetch("/api/tips/lab", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "decide_next_action", stateToken: initialized.stateToken, payload: observation }) });
  const result = await response.json();
  if (!response.ok) throw new Error(String(result.error ?? "decision_failed"));
  return result.decision as AgentDecision;
}

const AgentDecisionWorkbench = forwardRef<AgentDecisionWorkbenchHandle>(function AgentDecisionWorkbench(_, ref) {
  const [observation, setObservation] = useState(DEFAULT_OBSERVATION);
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof AgentObservation>(key: K, value: AgentObservation[K]) {
    setObservation(current => ({ ...current, [key]: value }));
  }

  async function evaluate() {
    setBusy(true); setError("");
    try { setDecision(await requestDecision(observation)); return true; }
    catch (caught) { setError(caught instanceof Error ? caught.message : "decision_failed"); return false; }
    finally { setBusy(false); }
  }

  useImperativeHandle(ref, () => ({ evaluate }), [observation]);

  return <section className={styles.agentEvaluator} aria-labelledby="agent-evaluator-title">
    <div className={styles.panelHeading}>
      <div><span>자기적응형 AI 평가</span><h3 id="agent-evaluator-title">현재 상태에서 에이전트가 어떤 작업을 다음으로 선택하는지 평가합니다</h3></div>
      <p>아래 관측값을 바꾸고 다시 실행하면 다음 작업, 호출 도구와 상태 전이가 함께 바뀝니다.</p>
    </div>

    <div className={styles.agentInputGrid}>
      <label className={styles.agentWideField}><span>사용자가 에이전트에게 보낸 메시지</span><textarea value={observation.userMessage} onChange={event=>set("userMessage",event.target.value)} /></label>
      <label><span>현재 세션 상태</span><select value={observation.sessionState} onChange={event=>set("sessionState",event.target.value)}>{["NEW","NEEDS_DATA","SAFETY_REVIEW","CANDIDATES_READY","ACTIVE_PLAN","FOLLOWUP_DUE","ADJUSTMENT_REVIEW"].map(value=><option key={value}>{value}</option>)}</select></label>
      <label><span>계산된 추천 후보 수</span><input type="number" min="0" max="14" value={observation.candidateCount} onChange={event=>set("candidateCount",+event.target.value)} /></label>
      <label><span>PRO 건강 백분위 변화</span><input type="number" min="-100" max="100" step="0.1" value={observation.proChangePercentile} onChange={event=>set("proChangePercentile",+event.target.value)} /><small>양수는 개선, 0 이하는 개선 없음</small></label>
      <label><span>복용 순응도</span><input type="range" min="0" max="100" value={observation.adherencePercent} onChange={event=>set("adherencePercent",+event.target.value)} /><b>{observation.adherencePercent}%</b></label>
    </div>

    <details className={styles.secondaryOptions} open>
      <summary>에이전트가 판단할 관측값 직접 수정</summary>
      <div className={styles.agentSignalGrid}>{BOOLEAN_FIELDS.map(([key,label,help])=><label key={key} data-selected={observation[key]===true}><input type="checkbox" checked={observation[key]===true} onChange={event=>set(key,event.target.checked as never)} /><span><strong>{label}</strong><small>{help}</small></span></label>)}</div>
    </details>

    <button type="button" className={styles.primaryButton} disabled={busy} onClick={evaluate}>{busy ? "다음 작업 계산 중…" : "현재 입력값으로 다음 작업 결정"}</button>
    {error&&<p className={styles.agentError}>실행 실패: {error}</p>}

    {decision&&<div className={styles.agentDecisionResult} aria-live="polite">
      <header><span>선택된 다음 작업</span><h3>{decision.selectedLabel}</h3><p>{decision.reason}</p></header>
      <div className={styles.agentTransition}><div><span>현재 상태</span><strong>{decision.currentState}</strong></div><i>→</i><div><span>실행 도구</span><strong>{decision.tool}</strong></div><i>→</i><div><span>다음 상태</span><strong>{decision.targetState}</strong></div></div>
      <p className={styles.postcondition}><strong>실행 성공 확인 기준</strong>{decision.expectedPostcondition}</p>
      <details className={styles.secondaryOptions}><summary>검토한 다음 작업 후보 {decision.candidates.length}개</summary><ol className={styles.agentCandidates}>{decision.candidates.map(item=><li key={item.task} data-selected={item.task===decision.selectedTask}><span>{item.priority}</span><div><strong>{item.label}</strong><small>{item.reason}</small></div><b>{item.task===decision.selectedTask?"선택":item.matched?"후순위":"조건 불충족"}</b></li>)}</ol></details>
    </div>}
  </section>;
});

export default AgentDecisionWorkbench;
