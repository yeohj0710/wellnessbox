"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { AgentDecision, AgentExecutionTrace, AgentObservation, AgentTask } from "@/lib/tips/agent-decision-engine";
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
  consentScopes: ["followup:write", "pro:write", "device:write", "ae:write", "plan:write"],
  simulateTimeout: false,
  evidenceStale: false,
  previousActionKeys: [],
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
  ["evidenceStale", "근거 유효기간 경과", "연결된 근거를 다시 조회해야 하는지"],
  ["simulateTimeout", "도구 응답 지연", "시간 초과 시 상태가 보존되는지 시험"],
];

async function requestAgent(action: "decide_next_action" | "execute_agent_task", observation: AgentObservation) {
  const init = await fetch("/api/tips/lab", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "initialize" }) });
  const initialized = await init.json();
  if (!init.ok) throw new Error(String(initialized.error ?? "initialize_failed"));
  const response = await fetch("/api/tips/lab", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action, stateToken: initialized.stateToken, payload: observation }) });
  const result = await response.json();
  if (!response.ok) throw new Error(String(result.error ?? "decision_failed"));
  return result as { decision?: AgentDecision; trace?: AgentExecutionTrace };
}

const SCENARIOS: Array<{ name: string; expected: AgentTask; input: Partial<AgentObservation> }> = [
  { name: "안전검사 우선", expected: "check_safety", input: {} },
  { name: "정상 추천 후보 계산", expected: "rank_ingredients", input: { safetyChecked: true } },
  { name: "근거 유효기간 경과", expected: "retrieve_evidence", input: { safetyChecked: true, candidateCount: 2, evidenceRetrieved: true, evidenceStale: true } },
  { name: "응급 중단", expected: "escalate_pharmacist", input: { urgentRedFlag: true, safetyChecked: true } },
  { name: "후속평가 도래", expected: "ingest_pro", input: { safetyChecked: true, candidateCount: 2, evidenceRetrieved: true, planActive: true, followupScheduled: true, followupDue: true } },
  { name: "순응도 저하", expected: "review_adjustment", input: { safetyChecked: true, candidateCount: 2, evidenceRetrieved: true, planActive: true, followupScheduled: true, proRecorded: true, proChangePercentile: 2, adherencePercent: 55 } },
  { name: "웨어러블 이상", expected: "ingest_wearable", input: { safetyChecked: true, candidateCount: 2, evidenceRetrieved: true, planActive: true, followupScheduled: true, wearableConnected: true, wearableAnomaly: true } },
];

const AgentDecisionWorkbench = forwardRef<AgentDecisionWorkbenchHandle>(function AgentDecisionWorkbench(_, ref) {
  const [observation, setObservation] = useState(DEFAULT_OBSERVATION);
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [trace, setTrace] = useState<AgentExecutionTrace | null>(null);
  const [scenarioResults, setScenarioResults] = useState<Array<{ name: string; pass: boolean; trace: AgentExecutionTrace }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof AgentObservation>(key: K, value: AgentObservation[K]) {
    setObservation(current => ({ ...current, [key]: value }));
  }

  async function evaluate() {
    setBusy(true); setError("");
    try { const result = await requestAgent("execute_agent_task", observation); setTrace(result.trace ?? null); setDecision(result.trace?.decision ?? null); return result.trace?.postconditionsMet === true; }
    catch (caught) { setError(caught instanceof Error ? caught.message : "decision_failed"); return false; }
    finally { setBusy(false); }
  }

  async function runScenarios() {
    setBusy(true); setError("");
    try {
      const rows = [];
      for (const scenario of SCENARIOS) {
        const input = { ...DEFAULT_OBSERVATION, ...scenario.input, sessionState: scenario.input.sessionState ?? "NEW" };
        const result = await requestAgent("execute_agent_task", input);
        if (result.trace) rows.push({ name: scenario.name, trace: result.trace, pass: result.trace.decision.selectedTask === scenario.expected && (result.trace.postconditionsMet || result.trace.status === "BLOCKED") });
      }
      setScenarioResults(rows);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "scenario_failed"); }
    finally { setBusy(false); }
  }

  useImperativeHandle(ref, () => ({ evaluate }), [observation]);

  return <section className={styles.agentEvaluator} aria-labelledby="agent-evaluator-title">
    <div className={styles.panelHeading}>
      <div><span>자기적응형 AI 평가</span><h3 id="agent-evaluator-title">현재 상태에서 에이전트가 어떤 작업을 다음으로 선택하는지 평가합니다</h3></div>
      <p>관측값에 따라 다음 작업, 호출 도구, 상태 전이와 사후조건 충족 여부를 산출합니다.</p>
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

    <div className={styles.agentActionRow}><button type="button" className={styles.primaryButton} disabled={busy} onClick={evaluate}>{busy ? "결정·실행 중…" : "다음 작업 결정·실행"}</button><button type="button" disabled={busy} onClick={runScenarios}>주요 시나리오 일괄 평가</button></div>
    {error&&<p className={styles.agentError}>실행 실패: {error}</p>}

    {decision&&trace&&<div className={styles.agentDecisionResult} aria-live="polite">
      <header><span>선택된 다음 작업</span><h3>{decision.selectedLabel}</h3><p>{decision.reason}</p></header>
      <div className={styles.agentTransition}><div><span>현재 상태</span><strong>{decision.currentState}</strong></div><i>→</i><div><span>실행 도구</span><strong>{decision.tool}</strong></div><i>→</i><div><span>다음 상태</span><strong>{decision.targetState}</strong></div></div>
      <p className={styles.postcondition}><strong>실행 성공 확인 기준</strong>{decision.expectedPostcondition}</p>
      <dl className={styles.caseAudit}><div><dt>실행 결과</dt><dd>{trace.status === "SUCCEEDED" ? "실행 완료" : trace.status === "TIMED_OUT" ? "시간 초과·상태 보존" : "실행 차단"}</dd></div><div><dt>사후조건</dt><dd>{trace.postconditionsMet ? "충족" : "미충족"}</dd></div><div><dt>상태 전이</dt><dd>{trace.previousState} → {trace.nextState}</dd></div></dl>
      {trace.blockedReason&&<p className={styles.agentError}>차단 사유: {trace.blockedReason}</p>}
      <details className={styles.secondaryOptions}><summary>검토한 다음 작업 후보 {decision.candidates.length}개</summary><ol className={styles.agentCandidates}>{decision.candidates.map(item=><li key={item.task} data-selected={item.task===decision.selectedTask}><span>{item.priority}</span><div><strong>{item.label}</strong><small>{item.reason}</small></div><b>{item.task===decision.selectedTask?"선택":item.matched?"후순위":"조건 불충족"}</b></li>)}</ol></details>
    </div>}
    {scenarioResults&&<div className={styles.agentDecisionResult}><header><span>Agent 전용 KPI</span><h3>다음 작업 선택·실행 시나리오 평가</h3></header><div className={styles.replaySummary}><div><span>다음 작업 선택 정확도</span><strong>{scenarioResults.filter(row=>row.pass).length} / {scenarioResults.length}</strong></div><div><span>사후조건 충족률</span><strong>{Math.round(100*scenarioResults.filter(row=>row.trace.postconditionsMet).length/scenarioResults.length)}%</strong></div><div><span>고위험 오동작</span><strong>{scenarioResults.filter(row=>row.trace.blockedReason==="HIGH_RISK_RECOMMENDATION_BLOCKED").length}건</strong></div></div><ol className={styles.agentCandidates}>{scenarioResults.map(row=><li key={row.name} data-selected={row.pass}><span>{row.pass?"✓":"!"}</span><div><strong>{row.name}</strong><small>{row.trace.decision.selectedLabel} · {row.trace.status}</small></div><b>{row.pass?"PASS":"FAIL"}</b></li>)}</ol></div>}
  </section>;
});

export default AgentDecisionWorkbench;
