"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function ProStudySimulation() {
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
    try { const recommendation = await recommend(age, goal); const participant: StudyParticipant = { id: `T-${String(Date.now()).slice(-8)}`, name: name.trim() || "테스터", age, goal, enrolledAt: new Date().toISOString(), baseline, recommendation: recommendation.ingredients, recommendationRun: recommendation.run, followups: [] }; setParticipants(current => [participant, ...current]); setSelectedId(participant.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "추천 모델 실행 실패"); } finally { setBusy(false); }
  }
  function saveFollowup() { if (!selected) return; setParticipants(list => list.map(participant => participant.id !== selected.id ? participant : { ...participant, followups: [...participant.followups.filter(item => item.week !== week), { week, answers: followup, adherencePercent: adherence, adverseEvent }].sort((a,b)=>a.week-b.week) })); requestAnimationFrame(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"center"})); }
  function runDemo() { const sample = demoParticipants(); setParticipants(sample); setSelectedId(sample[0].id); setWeek(4); requestAnimationFrame(()=>requestAnimationFrame(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"center"}))); }
  function nextParticipant() { if (!selected || !participants.length) return; const index = participants.findIndex(participant => participant.id === selected.id); setSelectedId(participants[(index + 1) % participants.length].id); requestAnimationFrame(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"center"})); }
  function exportCsv() { const blob = new Blob(["\ufeff" + csv(participants)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "tips-pro-study.csv"; anchor.click(); URL.revokeObjectURL(url); }

  return <section className={`${styles.section} ${styles.proStudy}`} aria-labelledby="pro-study-title">
    <p className={styles.sectionLabel}>계획서 19·25·26쪽 기준 PRO 평가</p>
    <h2 id="pro-study-title" className={styles.sectionTitle}>공인 설문 점수로 복용 전후 개선도를 계산합니다</h2>
    <p className={styles.sectionBody}>PSQI·ISI·PSS-10 승인본에서 산출한 응답 점수를 입력합니다. 시작 시점 분포로 Z-표준화한 뒤 복용 전후 건강 백분위 차이(pp)를 계산하며, 4주 평가 100명 이상과 평균 개선도 0pp 초과 여부를 판정합니다.</p>

    <div className={styles.instrumentGuide}>{Object.values(PRO_INSTRUMENTS).map(item => <article key={item.id} data-active={instrument === item.id}><div><strong>{item.name}</strong><span>{item.recallPeriod} · 총점 {item.scoreMin}~{item.scoreMax}점 · 낮을수록 양호</span></div><p>{item.scoreDescription}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">공식 도구 정보</a></article>)}</div>

    <div className={styles.studyKpis}>{[
      ["등록",kpi.enrolled,"명"],["4주 평가 완료",kpi.completed,"명"],["평균 표준화 개선도",kpi.meanChange.toFixed(2),"pp"],["개선 사례",kpi.improvedPercent.toFixed(1),"%"],["평균 복용 순응도",kpi.meanAdherencePercent.toFixed(1),"%"],["이상사례",kpi.adverseEventCount,"건"],
    ].map(([label,value,unit])=><div key={label}><span>{label}</span><strong>{value}{unit}</strong></div>)}</div>
    <div className={kpi.kpiEffectPassed ? styles.kpiPassed : styles.kpiPending}><strong>계획서 성과기준</strong><span>4주 평가 100명 이상: {kpi.kpiSamplePassed ? "충족" : "미충족"} · 평균 개선도 0pp 초과: {kpi.kpiEffectPassed ? "충족" : "미충족"}</span></div>
    <div className={styles.studyActions}><button className={styles.demoRun} onClick={runDemo}>120명 예시 데이터로 전체 평가 실행</button><button onClick={exportCsv} disabled={!participants.length}>평가 결과 CSV 저장</button><button onClick={()=>{setParticipants([]);setSelectedId("");}}>전체 초기화</button></div>
    {error && <p className={styles.testError} role="alert">{error}</p>}

    <div className={styles.studyGrid}>
      <div className={styles.studyPanel}><h3>1. 테스터 등록 및 복용 전 평가</h3><div className={styles.formGrid}><label className={styles.control}><span>테스터명</span><input className={styles.field} value={name} onChange={event=>setName(event.target.value)}/></label><label className={styles.control}><span>나이</span><input className={styles.field} type="number" value={age} onChange={event=>setAge(+event.target.value)}/></label><label className={styles.control}><span>관리 목표</span><select className={styles.field} value={goal} onChange={event=>setGoal(event.target.value)}>{Object.entries(GOALS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className={styles.control}><span>사용 설문</span><select className={styles.field} value={instrument} onChange={event=>changeInstrument(event.target.value as ProInstrumentId)}>{Object.values(PRO_INSTRUMENTS).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><Questionnaire value={baseline} onChange={(index,value)=>updateAnswers(setBaseline,baseline,index,value)}/><button className={styles.primaryButton} onClick={enroll} disabled={busy}>{busy ? "추천 모델 실행 중" : "등록·복용 전 평가·추천 실행"}</button></div>
      <div className={styles.studyPanel}><h3>2. 같은 설문으로 복용 후 평가</h3><label className={styles.control}><span>테스터 선택</span><select className={styles.field} value={selectedId} onChange={event=>setSelectedId(event.target.value)}><option value="">선택</option>{participants.map(participant=><option key={participant.id} value={participant.id}>{participant.id} · {participant.name} · {participant.baseline.instrument}</option>)}</select></label>{selected&&<><div className={styles.studyMeta}><span>추천 성분</span><strong>{selected.recommendation.map(id=>INGREDIENTS[id]??id).join(", ")||"없음"}</strong></div><div className={styles.timepoint}><button className={week===2?styles.filterActive:""} onClick={()=>setWeek(2)}>2주</button><button className={week===4?styles.filterActive:""} onClick={()=>setWeek(4)}>4주</button></div><Questionnaire value={followup} onChange={(index,value)=>updateAnswers(setFollowup,followup,index,value)}/><label className={styles.rangeRow}><span>복용 순응도</span><input type="range" min="0" max="100" value={adherence} onChange={event=>setAdherence(+event.target.value)}/><b>{adherence}%</b></label><label className={styles.aeCheck}><input type="checkbox" checked={adverseEvent} onChange={event=>setAdverseEvent(event.target.checked)}/> 이상사례 발생</label><button className={styles.primaryButton} onClick={saveFollowup}>복용 후 평가 저장</button></>}</div>
    </div>
    {selected&&result&&<div ref={resultRef} className={styles.studyResult} aria-live="polite"><h3>3. {selected.name}의 {selected.baseline.instrument} 복용 전후 결과</h3><div><span>복용 전 원점수</span><strong>{result.baselineScore.toFixed(1)}점</strong></div><div><span>복용 후 {week}주 원점수</span><strong>{previewScore?.toFixed(1)??"—"}점</strong></div><div><span>표준화 건강 백분위 변화</span><strong>{previewChange===null?"—":`${previewChange>=0?"+":""}${previewChange.toFixed(2)}pp`}</strong></div><div><span>개선 여부</span><strong>{previewChange===null?"미평가":previewChange>0?"개선":"개선 없음"}</strong></div><button type="button" className={styles.nextParticipantButton} onClick={nextParticipant}>다음 테스터 평가</button></div>}
  </section>;
}

function Questionnaire({ value, onChange }: { value: ProAnswers; onChange: (index: number, value: number) => void }) {
  const instrument = PRO_INSTRUMENTS[value.instrument];
  return <div className={styles.questionnaire}><div className={styles.questionnaireHeader}><strong>{instrument.name} 응답 점수</strong><span>{instrument.recallPeriod} 기준 · 승인된 설문지 채점값 입력</span></div>{instrument.fields.map((label,index)=><label key={label} className={styles.scoreInputRow}><span><b>{label}</b><small>{instrument.itemMin}~{instrument.itemMax}점</small></span><select value={value.responses[index] ?? instrument.itemMin} onChange={event=>onChange(index,+event.target.value)}>{Array.from({length:instrument.itemMax-instrument.itemMin+1},(_,offset)=>instrument.itemMin+offset).map(score=><option key={score} value={score}>{score}점</option>)}</select></label>)}</div>;
}
