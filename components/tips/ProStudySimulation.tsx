"use client";

import { useEffect, useMemo, useState } from "react";
import { cohortKpis, participantResult, proScore, type ProAnswers, type StudyParticipant } from "@/lib/tips/pro-study-engine";
import styles from "./interim.module.css";

const STORAGE_KEY = "wellnessbox.tips.pro-study.v1";
const GOALS: Record<string, string> = { sleep_quality: "수면의 질", stress_management: "스트레스 관리", energy: "활력", immune_support: "면역 건강" };
const INITIAL: ProAnswers = { sleep: 5, fatigue: 5, stress: 5, wellbeing: 5 };
const QUESTIONS: Array<[keyof ProAnswers, string, string]> = [
  ["sleep", "수면 만족도", "0 매우 낮음 · 10 매우 높음"],
  ["fatigue", "피로 수준", "0 피로 없음 · 10 매우 심함"],
  ["stress", "스트레스 수준", "0 없음 · 10 매우 높음"],
  ["wellbeing", "전반적 건강 상태", "0 매우 낮음 · 10 매우 높음"],
];
const INGREDIENTS: Record<string, string> = { "ING:MAGNESIUM": "마그네슘", "ING:VITAMIN_D": "비타민 D", "ING:VITAMIN_B12": "비타민 B12", "ING:ZINC": "아연", "ING:VITAMIN_C": "비타민 C", "ING:OMEGA3": "오메가3", "ING:PROBIOTIC": "프로바이오틱스" };

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
  const rows = [["tester_id","name","age","goal","timepoint","pro_score","sleep","fatigue","stress","wellbeing","adherence_percent","adverse_event","recommendation","recommendation_run_at","model_version","model_sha256"]];
  for (const p of participants) {
    const audit=[p.recommendationRun?.runAt??"",p.recommendationRun?.modelVersion??"",p.recommendationRun?.modelSha256??""];
    rows.push([p.id,p.name,String(p.age),p.goal,"baseline",proScore(p.baseline).toFixed(2),String(p.baseline.sleep),String(p.baseline.fatigue),String(p.baseline.stress),String(p.baseline.wellbeing),"","",p.recommendation.join("|"),...audit]);
    for (const f of p.followups) rows.push([p.id,p.name,String(p.age),p.goal,`week_${f.week}`,proScore(f.answers).toFixed(2),String(f.answers.sleep),String(f.answers.fatigue),String(f.answers.stress),String(f.answers.wellbeing),String(f.adherencePercent),String(f.adverseEvent),p.recommendation.join("|"),...audit]);
  }
  return rows.map(row => row.map(value => `"${value.replaceAll('"','""')}"`).join(",")).join("\r\n");
}

export default function ProStudySimulation() {
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("테스터 01"); const [age, setAge] = useState(41); const [goal, setGoal] = useState("sleep_quality");
  const [baseline, setBaseline] = useState<ProAnswers>(INITIAL); const [followup, setFollowup] = useState<ProAnswers>(INITIAL);
  const [week, setWeek] = useState<2|4>(2); const [adherence, setAdherence] = useState(85); const [adverseEvent, setAdverseEvent] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); if (Array.isArray(stored)) { setParticipants(stored); setSelectedId(stored[0]?.id ?? ""); } } catch {} }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(participants)); }, [participants]);
  const selected = participants.find(p => p.id === selectedId) ?? null; const result = selected ? participantResult(selected) : null; const kpi = useMemo(() => cohortKpis(participants), [participants]);
  const previewScore = selected ? proScore(followup) : null;
  const previewChange = selected && previewScore !== null ? previewScore - proScore(selected.baseline) : null;
  useEffect(() => { const participant=participants.find(p=>p.id===selectedId); if(!participant)return; const saved=participant.followups.find(f=>f.week===week); setFollowup(saved?.answers??{sleep:Math.min(10,participant.baseline.sleep+2),fatigue:Math.max(0,participant.baseline.fatigue-2),stress:Math.max(0,participant.baseline.stress-2),wellbeing:Math.min(10,participant.baseline.wellbeing+2)}); setAdherence(saved?.adherencePercent??85); setAdverseEvent(saved?.adverseEvent??false); },[participants,selectedId,week]);
  const update = (setter: (value: ProAnswers) => void, current: ProAnswers, key: keyof ProAnswers, value: number) => setter({ ...current, [key]: value });
  async function enroll() { setBusy(true); setError(""); try { const recommendation = await recommend(age, goal); const p: StudyParticipant = { id: `T-${String(Date.now()).slice(-8)}`, name: name.trim() || "테스터", age, goal, enrolledAt: new Date().toISOString(), baseline, recommendation: recommendation.ingredients, recommendationRun: recommendation.run, followups: [] }; setParticipants(v => [p,...v]); setSelectedId(p.id); } catch(cause) { setError(cause instanceof Error?cause.message:"추천 모델 실행 실패"); } finally { setBusy(false); } }
  function saveFollowup() { if (!selected) return; setParticipants(list => list.map(p => p.id !== selected.id ? p : { ...p, followups: [...p.followups.filter(f => f.week !== week), { week, answers: followup, adherencePercent: adherence, adverseEvent }].sort((a,b)=>a.week-b.week) })); }
  function samples() { const sample = Array.from({length:8},(_,i):StudyParticipant => ({ id:`DEMO-${String(i+1).padStart(2,"0")}`, name:`시연 테스터 ${i+1}`, age:28+i*5, goal:i%2?"energy":"sleep_quality", enrolledAt:new Date().toISOString(), baseline:{sleep:4+i%2,fatigue:7-i%2,stress:6,wellbeing:4}, recommendation:[i%2?"ING:VITAMIN_B12":"ING:MAGNESIUM"], recommendationRun:{runAt:new Date().toISOString(),modelVersion:"2026-07-10.v1",modelSha256:"f6b053ee0eb39d16e12e102723f9435a03e71068b70502f6ca702c80e82a7612"}, followups:[{week:2,answers:{sleep:5+i%2,fatigue:5,stress:5,wellbeing:6},adherencePercent:75+i*2,adverseEvent:false},{week:4,answers:{sleep:6+i%2,fatigue:4,stress:4,wellbeing:7},adherencePercent:78+i*2,adverseEvent:i===7}] })); setParticipants(sample); setSelectedId(sample[0].id); }
  function exportCsv() { const blob=new Blob(["\ufeff"+csv(participants)],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download="tips-pro-study.csv";a.click();URL.revokeObjectURL(url); }
  return <section className={`${styles.section} ${styles.proStudy}`} aria-labelledby="pro-study-title">
    <p className={styles.sectionLabel}>실증 연구 시뮬레이션</p><h2 id="pro-study-title" className={styles.sectionTitle}>테스터 PRO 평가 및 성과지표 산출</h2>
    <p className={styles.sectionBody}>테스터 등록, 기초 평가, 추천 모델 실행, 2주·4주 추적 평가와 전후 변화량 산출을 하나의 절차로 수행합니다.</p>
    <div className={styles.studyKpis}>{[["등록",kpi.enrolled,"명"],["추적 완료",kpi.completed,"명"],["평균 변화",kpi.meanChange.toFixed(1),"점"],["반응자율",kpi.responderPercent.toFixed(1),"%"],["평균 순응도",kpi.meanAdherencePercent.toFixed(1),"%"],["이상사례",kpi.adverseEventCount,"건"]].map(([l,v,u])=><div key={l}><span>{l}</span><strong>{v}{u}</strong></div>)}</div>
    <div className={styles.studyActions}><button onClick={samples}>시연 데이터 8명 생성</button><button onClick={exportCsv} disabled={!participants.length}>원자료 CSV 내보내기</button><button disabled={!selected} onClick={()=>{setParticipants(list=>list.filter(p=>p.id!==selectedId));setSelectedId("");}}>선택 테스터 삭제</button><button onClick={()=>{setParticipants([]);setSelectedId("");}}>전체 초기화</button></div>
    {error&&<p className={styles.testError} role="alert">{error}</p>}
    <div className={styles.studyGrid}><div className={styles.studyPanel}><h3>1. 테스터 등록 및 기초 PRO</h3><div className={styles.formGrid}><label className={styles.control}><span>테스터명</span><input className={styles.field} value={name} onChange={e=>setName(e.target.value)}/></label><label className={styles.control}><span>나이</span><input className={styles.field} type="number" value={age} onChange={e=>setAge(+e.target.value)}/></label><label className={styles.control}><span>관리 목표</span><select className={styles.field} value={goal} onChange={e=>setGoal(e.target.value)}>{Object.entries(GOALS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div><Questionnaire value={baseline} onChange={(k,v)=>update(setBaseline,baseline,k,v)}/><button className={styles.primaryButton} onClick={enroll} disabled={busy}>{busy?"추천 모델 실행 중":"등록·기초평가·추천 실행"}</button></div>
      <div className={styles.studyPanel}><h3>2. 추적 PRO 입력</h3><label className={styles.control}><span>테스터 선택</span><select className={styles.field} value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">선택</option>{participants.map(p=><option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select></label>{selected&&<><div className={styles.studyMeta}><span>추천 성분</span><strong>{selected.recommendation.map(id=>INGREDIENTS[id]??id).join(", ")||"없음"}</strong></div><div className={styles.timepoint}><button className={week===2?styles.filterActive:""} onClick={()=>setWeek(2)}>2주</button><button className={week===4?styles.filterActive:""} onClick={()=>setWeek(4)}>4주</button></div><Questionnaire value={followup} onChange={(k,v)=>update(setFollowup,followup,k,v)}/><label className={styles.rangeRow}><span>복용 순응도</span><input type="range" min="0" max="100" value={adherence} onChange={e=>setAdherence(+e.target.value)}/><b>{adherence}%</b></label><label className={styles.aeCheck}><input type="checkbox" checked={adverseEvent} onChange={e=>setAdverseEvent(e.target.checked)}/> 이상사례 발생</label><button className={styles.primaryButton} onClick={saveFollowup}>추적 평가 저장</button></>}</div></div>
    {selected&&result&&<div className={styles.studyResult} aria-live="polite"><h3>3. 개인별 전후 비교</h3><div><span>기초 PRO</span><strong>{result.baselineScore.toFixed(1)}</strong></div><div><span>{week}주 PRO</span><strong>{previewScore?.toFixed(1)??"—"}</strong></div><div><span>변화량</span><strong>{previewChange===null?"—":`${previewChange>=0?"+":""}${previewChange.toFixed(1)}`}</strong></div><div><span>반응자 판정</span><strong>{previewChange===null?"미평가":previewChange>=10?"반응":"비반응"}</strong></div></div>}
  </section>;
}

function Questionnaire({value,onChange}:{value:ProAnswers;onChange:(key:keyof ProAnswers,value:number)=>void}) { return <div className={styles.questionnaire}>{QUESTIONS.map(([key,label,help])=><label key={key} className={styles.rangeRow}><span><b>{label}</b><small>{help}</small></span><input type="range" min="0" max="10" value={value[key]} onChange={e=>onChange(key,+e.target.value)}/><strong>{value[key]}</strong></label>)}</div>; }
