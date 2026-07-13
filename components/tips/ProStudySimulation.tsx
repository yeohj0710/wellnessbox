"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  PRO_INSTRUMENTS, baselineReference, cohortKpis, emptyProAnswers, participantResult,
  proScore, standardizedImprovement, type ProAnswers, type ProInstrumentId, type StudyParticipant,
} from "@/lib/tips/pro-study-engine";
import styles from "./interim.module.css";

const STORAGE_KEY = "wellnessbox.tips.pro-study.v2";
const GOALS: Record<string, string> = { sleep_quality: "수면의 질", stress_management: "스트레스 관리", energy: "활력", immune_support: "면역 건강" };
const INGREDIENTS: Record<string, string> = { "ING:MAGNESIUM": "마그네슘", "ING:VITAMIN_D": "비타민 D", "ING:VITAMIN_B12": "비타민 B12", "ING:ZINC": "아연" };

async function recommend(age: number, goal: string) {
  const profile = { age, sex: "unknown", pregnant: false, goals: [goal], conditions: [], medicationClasses: [], allergies: [], currentSupplements: [], riskFlags: [] };
  const init = await fetch("/api/tips/lab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "initialize", profile }) });
  const initialized = await init.json();
  if (!init.ok || typeof initialized.stateToken !== "string") throw new Error(String(initialized.error ?? "study_initialize_failed"));
  const response = await fetch("/api/tips/lab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "recommend", stateToken: initialized.stateToken, profile }) });
  const result = await response.json();
  if (!response.ok) throw new Error(String(result.error ?? "recommendation_failed"));
  return { ingredients: (result.recommendations ?? []).map((item: { ingredientId: string }) => item.ingredientId) as string[], run: { runAt: String(result.generatedAt ?? new Date().toISOString()), modelVersion: String(result.model?.schemaVersion ?? result.model?.mode ?? "unknown"), modelSha256: String(result.model?.sourceSha256 ?? "unknown") } };
}

function csv(participants: StudyParticipant[]) {
  const rows = [["tester_id","name","age","goal","instrument","timepoint","raw_score","responses","adherence_percent","adverse_event","recommendation"]];
  for (const participant of participants) {
    rows.push([participant.id,participant.name,String(participant.age),participant.goal,participant.baseline.instrument,"baseline",proScore(participant.baseline).toFixed(2),participant.baseline.responses.join("|"),"","",participant.recommendation.join("|")]);
    for (const row of participant.followups) rows.push([participant.id,participant.name,String(participant.age),participant.goal,row.answers.instrument,`week_${row.week}`,proScore(row.answers).toFixed(2),row.answers.responses.join("|"),String(row.adherencePercent),String(row.adverseEvent),participant.recommendation.join("|")]);
  }
  return rows.map(row => row.map(value => `"${value.replaceAll('"','""')}"`).join(",")).join("\r\n");
}

function demoParticipants(): StudyParticipant[] {
  const instruments: ProInstrumentId[] = ["PSQI", "ISI", "PSS10"];
  return Array.from({ length: 120 }, (_, index) => {
    const instrument = instruments[index % instruments.length];
    const definition = PRO_INSTRUMENTS[instrument];
    const baselineResponses = Array.from({ length: definition.itemCount }, (_, item) => Math.min(definition.itemMax, 1 + ((index + item) % Math.max(2, definition.itemMax))));
    const week2Responses = baselineResponses.map((value, item) => Math.max(definition.itemMin, value - (item % 3 === 0 ? 1 : 0)));
    const week4Responses = baselineResponses.map((value, item) => Math.max(definition.itemMin, value - (item % 2 === 0 ? 1 : 0)));
    return {
      id: `DEMO-${String(index + 1).padStart(3, "0")}`, name: `평가 테스터 ${index + 1}`, age: 20 + (index % 55),
      goal: instrument === "PSS10" ? "stress_management" : "sleep_quality", enrolledAt: new Date().toISOString(),
      baseline: { instrument, responses: baselineResponses }, recommendation: [index % 2 ? "ING:MAGNESIUM" : "ING:VITAMIN_D"],
      recommendationRun: { runAt: new Date().toISOString(), modelVersion: "2026-07-10.v1", modelSha256: "simulation" },
      followups: [
        { week: 2, answers: { instrument, responses: week2Responses }, adherencePercent: 75 + (index % 20), adverseEvent: false },
        { week: 4, answers: { instrument, responses: week4Responses }, adherencePercent: 78 + (index % 18), adverseEvent: index === 119 },
      ],
    };
  });
}

export type ProStudySimulationHandle = {
  next: () => Promise<boolean>;
  previous: () => boolean;
};

type ProStudySimulationProps = { onStepChange?: (step: 0|1|2|3) => void };

const ProStudySimulation = forwardRef<ProStudySimulationHandle, ProStudySimulationProps>(function ProStudySimulation({ onStepChange }, ref) {
  const [step, setStep] = useState<0|1|2|3>(0);
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("테스터 01"); const [age, setAge] = useState(41); const [goal, setGoal] = useState("sleep_quality");
  const [instrument, setInstrument] = useState<ProInstrumentId>("PSQI");
  const [baseline, setBaseline] = useState<ProAnswers>(() => emptyProAnswers("PSQI"));
  const [followup, setFollowup] = useState<ProAnswers>(() => emptyProAnswers("PSQI"));
  const [week, setWeek] = useState<2|4>(2); const [adherence, setAdherence] = useState(85); const [adverseEvent, setAdverseEvent] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); if (Array.isArray(stored)) { setParticipants(stored); setSelectedId(stored[0]?.id ?? ""); } } catch {} }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(participants)); }, [participants]);
  useEffect(() => { onStepChange?.(step); }, [onStepChange, step]);
  const selected = participants.find(participant => participant.id === selectedId) ?? null;
  const reference = baselineReference(participants, selected?.baseline.instrument ?? instrument);
  const result = selected ? participantResult(selected, reference) : null;
  const kpi = useMemo(() => cohortKpis(participants), [participants]);
  const previewScore = selected ? proScore(followup) : null;
  const previewChange = selected && followup.instrument === selected.baseline.instrument ? standardizedImprovement(selected.baseline, followup, reference) : null;

  useEffect(() => {
    const participant = participants.find(item => item.id === selectedId); if (!participant) return;
    const saved = participant.followups.find(item => item.week === week);
    setInstrument(participant.baseline.instrument);
    setFollowup(saved?.answers ?? { instrument: participant.baseline.instrument, responses: participant.baseline.responses.map(value => Math.max(0, value - 1)) });
    setAdherence(saved?.adherencePercent ?? 85); setAdverseEvent(saved?.adverseEvent ?? false);
  }, [participants, selectedId, week]);

  function changeInstrument(next: ProInstrumentId) { setInstrument(next); setBaseline(emptyProAnswers(next)); setFollowup(emptyProAnswers(next)); }
  function updateAnswers(setter: (value: ProAnswers) => void, current: ProAnswers, index: number, value: number) { setter({ ...current, responses: current.responses.map((item, currentIndex) => currentIndex === index ? value : item) }); }
  async function enroll() {
    setBusy(true); setError("");
    try { const recommendation = await recommend(age, goal); const participant: StudyParticipant = { id: `T-${String(Date.now()).slice(-8)}`, name: name.trim() || "테스터", age, goal, enrolledAt: new Date().toISOString(), baseline, recommendation: recommendation.ingredients, recommendationRun: recommendation.run, followups: [] }; setParticipants(current => [participant, ...current]); setSelectedId(participant.id); setWeek(4); setStep(2); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "추천 모델 실행 실패"); return false; } finally { setBusy(false); }
  }
  function saveFollowup() { if (!selected) return; setParticipants(list => list.map(participant => participant.id !== selected.id ? participant : { ...participant, followups: [...participant.followups.filter(item => item.week !== week), { week, answers: followup, adherencePercent: adherence, adverseEvent }].sort((a,b)=>a.week-b.week) })); setStep(3); requestAnimationFrame(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"center"})); }
  function runDemo() { const sample = demoParticipants(); setParticipants(sample); setSelectedId(sample[0].id); setWeek(4); setStep(3); requestAnimationFrame(()=>requestAnimationFrame(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"center"}))); }
  function nextParticipant() { if (!selected || !participants.length) return; const index = participants.findIndex(participant => participant.id === selected.id); setSelectedId(participants[(index + 1) % participants.length].id); setStep(2); requestAnimationFrame(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"center"})); }
  function exportCsv() { const blob = new Blob(["\ufeff" + csv(participants)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "tips-pro-study.csv"; anchor.click(); URL.revokeObjectURL(url); }

  useImperativeHandle(ref, () => ({
    async next() {
      if (busy) return false;
      if (step === 0) { setStep(1); return false; }
      if (step === 1) { await enroll(); return false; }
      if (step === 2) { saveFollowup(); return false; }
      return true;
    },
    previous() {
      if (busy || step === 0) return false;
      setStep((step - 1) as 0|1|2|3);
      return true;
    },
  }), [busy, step, age, goal, name, baseline, selected, followup, adherence, adverseEvent]);

  return <section className={`${styles.section} ${styles.proStudy}`} aria-labelledby="pro-study-title">
    <p className={styles.sectionLabel}>복용 전후 건강 변화 평가</p>
    <h2 id="pro-study-title" className={styles.sectionTitle}>공인 설문 점수로 개선도를 계산합니다</h2>
    <p className={styles.sectionBody}>평가자는 아래 `다음` 버튼만 눌러 전체 과정을 확인할 수 있습니다. 필요한 경우에만 `입력값 수정`을 열어 값을 바꾸세요.</p>

    <nav className={styles.studyProgress} aria-label="평가 진행 단계">{["안내","복용 전","복용 후","결과"].map((label,index)=><span key={label} data-active={step===index} data-complete={step>index}>{index+1}. {label}</span>)}</nav>
    {error && <p className={styles.testError} role="alert">{error}</p>}

    {step===0&&<div className={styles.studyStep}><h3>검증할 내용</h3><p>같은 공인 설문을 복용 전과 4주 후에 측정하고, 두 점수의 차이로 건강 개선도를 계산합니다.</p><dl className={styles.studySummary}><div><dt>기본 설문</dt><dd>피츠버그 수면의 질 지수(PSQI)</dd></div><div><dt>평가 대상</dt><dd>테스터 01 · 41세</dd></div><div><dt>진행 방식</dt><dd>복용 전 → 추천 실행 → 4주 후 → 결과 계산</dd></div></dl><details className={styles.secondaryOptions}><summary>일괄 검증·기록 관리</summary><div className={styles.studyActions}><button onClick={runDemo}>120명 예시 데이터 평가</button><button onClick={exportCsv} disabled={!participants.length}>CSV 저장</button><button onClick={()=>{setParticipants([]);setSelectedId("");}}>초기화</button></div></details></div>}

    {step===1&&<div className={styles.studyStep}><h3>복용 전 상태를 기록합니다</h3><p>현재 입력된 PSQI 점수로 추천 모델을 실행합니다.</p><dl className={styles.studySummary}><div><dt>테스터</dt><dd>{name} · {age}세</dd></div><div><dt>관리 목표</dt><dd>{GOALS[goal]}</dd></div><div><dt>설문 점수</dt><dd>{PRO_INSTRUMENTS[instrument].name} · {proScore(baseline)}점</dd></div></dl><details className={styles.secondaryOptions}><summary>입력값 수정</summary><div className={styles.formGrid}><label className={styles.control}><span>테스터명</span><input className={styles.field} value={name} onChange={event=>setName(event.target.value)}/></label><label className={styles.control}><span>나이</span><input className={styles.field} type="number" value={age} onChange={event=>setAge(+event.target.value)}/></label><label className={styles.control}><span>관리 목표</span><select className={styles.field} value={goal} onChange={event=>setGoal(event.target.value)}>{Object.entries(GOALS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className={styles.control}><span>사용 설문</span><select className={styles.field} value={instrument} onChange={event=>changeInstrument(event.target.value as ProInstrumentId)}>{Object.values(PRO_INSTRUMENTS).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><Questionnaire value={baseline} onChange={(index,value)=>updateAnswers(setBaseline,baseline,index,value)}/></details></div>}

    {step===2&&selected&&<div className={styles.studyStep}><h3>4주 후 상태를 기록합니다</h3><p>복용 전과 같은 설문 점수를 저장하면 개선도를 자동 계산합니다.</p><dl className={styles.studySummary}><div><dt>테스터</dt><dd>{selected.name}</dd></div><div><dt>추천 성분</dt><dd>{selected.recommendation.map(id=>INGREDIENTS[id]??id).join(", ")||"없음"}</dd></div><div><dt>4주 후 점수</dt><dd>{proScore(followup)}점</dd></div></dl><details className={styles.secondaryOptions}><summary>입력값 수정</summary><Questionnaire value={followup} onChange={(index,value)=>updateAnswers(setFollowup,followup,index,value)}/><label className={styles.rangeRow}><span>복용 순응도</span><input type="range" min="0" max="100" value={adherence} onChange={event=>setAdherence(+event.target.value)}/><b>{adherence}%</b></label><label className={styles.aeCheck}><input type="checkbox" checked={adverseEvent} onChange={event=>setAdverseEvent(event.target.checked)}/> 이상사례 발생</label></details></div>}

    {step===3&&selected&&result&&<div ref={resultRef} className={styles.studyStep} aria-live="polite"><h3>{selected.name}의 복용 전후 평가 결과</h3><div className={styles.studyResult}><div><span>복용 전 점수</span><strong>{result.baselineScore.toFixed(1)}점</strong></div><div><span>4주 후 점수</span><strong>{previewScore?.toFixed(1)??"—"}점</strong></div><div><span>건강 백분위 변화</span><strong>{previewChange===null?"—":`${previewChange>=0?"+":""}${previewChange.toFixed(2)}pp`}</strong></div><div><span>판정</span><strong>{previewChange===null?"미평가":previewChange>0?"개선":"개선 없음"}</strong></div></div><details className={styles.secondaryOptions}><summary>전체 평가 현황 및 다른 테스터</summary><div className={styles.studyKpis}>{[["등록",kpi.enrolled,"명"],["4주 평가",kpi.completed,"명"],["평균 개선도",kpi.meanChange.toFixed(2),"pp"],["개선 사례",kpi.improvedPercent.toFixed(1),"%"]].map(([label,value,unit])=><div key={label}><span>{label}</span><strong>{value}{unit}</strong></div>)}</div><p className={kpi.kpiEffectPassed?styles.kpiPassed:styles.kpiPending}>4주 평가 100명 이상: {kpi.kpiSamplePassed?"충족":"미충족"} · 평균 개선도 0pp 초과: {kpi.kpiEffectPassed?"충족":"미충족"}</p><button type="button" onClick={nextParticipant}>다른 테스터 평가</button></details></div>}
  </section>;
});

export default ProStudySimulation;

function Questionnaire({ value, onChange }: { value: ProAnswers; onChange: (index: number, value: number) => void }) {
  const instrument = PRO_INSTRUMENTS[value.instrument];
  return <div className={styles.questionnaire}><div className={styles.questionnaireHeader}><strong>{instrument.name} 응답 점수</strong><span>{instrument.recallPeriod} 기준 · 승인된 설문지 채점값 입력</span></div>{instrument.fields.map((label,index)=><label key={label} className={styles.scoreInputRow}><span><b>{label}</b><small>{instrument.itemMin}~{instrument.itemMax}점</small></span><select value={value.responses[index] ?? instrument.itemMin} onChange={event=>onChange(index,+event.target.value)}>{Array.from({length:instrument.itemMax-instrument.itemMin+1},(_,offset)=>instrument.itemMin+offset).map(score=><option key={score} value={score}>{score}점</option>)}</select></label>)}</div>;
}
