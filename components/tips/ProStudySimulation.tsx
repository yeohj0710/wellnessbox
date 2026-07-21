"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  PRO_INSTRUMENTS,
  cohortKpis,
  emptyProAnswers,
  participantResult,
  proScore,
  type ProAnswers,
  type ProInstrumentId,
  type StudyParticipant,
} from "@/lib/tips/pro-study-engine";
import { enrollProPlan, saveProFollowup } from "@/lib/tips/pro-study-rnd-client";
import styles from "./interim.module.css";

const STORAGE_KEY = "wellnessbox.tips.pro-study.v3";
const GOALS: Record<string, string> = {
  "sleep quality": "수면의 질",
  "stress management": "스트레스 관리",
  "energy": "활력",
  "immune support": "면역 건강",
};
const INGREDIENTS: Record<string, string> = {
  magnesium_glycinate: "마그네슘 글리시네이트",
  l_theanine: "L-테아닌",
  vitamin_d3: "비타민 D3",
  zinc: "아연",
};

function csv(participants: StudyParticipant[]) {
  const rows = [["tester_id", "mode", "plan_id", "instrument", "timepoint", "raw_score", "responses", "adherence_percent", "adverse_event", "recommendation"]];
  for (const participant of participants) {
    rows.push([participant.id, participant.mode, participant.planId ?? "", participant.baseline.instrument, "baseline", String(participant.baselineRawScore ?? proScore(participant.baseline)), participant.baseline.responses.join("|"), "", "", participant.recommendation.join("|")]);
    for (const row of participant.followups) rows.push([participant.id, participant.mode, participant.planId ?? "", row.answers.instrument, `week_${row.week}`, String(row.rndRawScore ?? proScore(row.answers)), row.answers.responses.join("|"), String(row.adherencePercent), String(row.adverseEvent), participant.recommendation.join("|")]);
  }
  return rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
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
      id: `DEMO-${String(index + 1).padStart(3, "0")}`,
      name: `예시 테스터 ${index + 1}`,
      age: 20 + (index % 55),
      goal: instrument === "PSS10" ? "stress management" : "sleep quality",
      enrolledAt: new Date().toISOString(),
      baseline: { instrument, responses: baselineResponses },
      recommendation: [index % 2 ? "magnesium_glycinate" : "vitamin_d3"],
      mode: "simulation",
      recommendationRun: { runAt: new Date().toISOString(), modelVersion: "simulation", modelSha256: "simulation" },
      followups: [
        { week: 2, answers: { instrument, responses: week2Responses }, adherencePercent: 75 + (index % 20), adverseEvent: false },
        { week: 4, answers: { instrument, responses: week4Responses }, adherencePercent: 78 + (index % 18), adverseEvent: index === 119 },
      ],
    };
  });
}

export type ProStudySimulationHandle = { next: () => Promise<boolean>; previous: () => boolean };
type Props = { onStepChange?: (step: 0 | 1 | 2 | 3) => void };

const ProStudySimulation = forwardRef<ProStudySimulationHandle, Props>(function ProStudySimulation({ onStepChange }, ref) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("테스터 01");
  const [age, setAge] = useState(41);
  const [goal, setGoal] = useState("sleep quality");
  const [instrument, setInstrument] = useState<ProInstrumentId>("PSQI");
  const [baseline, setBaseline] = useState<ProAnswers>(() => emptyProAnswers("PSQI"));
  const [followup, setFollowup] = useState<ProAnswers>(() => emptyProAnswers("PSQI"));
  const [week, setWeek] = useState<2 | 4>(2);
  const [adherence, setAdherence] = useState(85);
  const [adverseEvent, setAdverseEvent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) {
        setParticipants(stored);
        setSelectedId(stored[0]?.id ?? "");
      }
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(participants)); }, [participants]);
  useEffect(() => { onStepChange?.(step); }, [onStepChange, step]);

  const selected = participants.find((participant) => participant.id === selectedId) ?? null;
  const result = selected ? participantResult(selected) : null;
  const kpi = useMemo(() => cohortKpis(participants), [participants]);

  useEffect(() => {
    const participant = participants.find((item) => item.id === selectedId);
    if (!participant) return;
    const saved = participant.followups.find((item) => item.week === week);
    setInstrument(participant.baseline.instrument);
    setFollowup(saved?.answers ?? { instrument: participant.baseline.instrument, responses: participant.baseline.responses.map((value) => Math.max(0, value - 1)) });
    setAdherence(saved?.adherencePercent ?? 85);
    setAdverseEvent(saved?.adverseEvent ?? false);
  }, [participants, selectedId, week]);

  function changeInstrument(next: ProInstrumentId) {
    setInstrument(next);
    setBaseline(emptyProAnswers(next));
    setFollowup(emptyProAnswers(next));
  }
  function updateAnswers(setter: (value: ProAnswers) => void, current: ProAnswers, index: number, value: number) {
    setter({ ...current, responses: current.responses.map((item, currentIndex) => currentIndex === index ? value : item) });
  }

  async function enroll() {
    setBusy(true);
    setError("");
    try {
      const observedAt = new Date().toISOString();
      const enrolled = await enrollProPlan({
        profile: { name: name.trim() || "테스터", age, sex: "other", goals: [goal] },
        baseline,
        observedAt,
        consentAccepted,
      });
      const participant: StudyParticipant = {
        id: `T-${String(Date.now()).slice(-8)}`,
        name: name.trim() || "테스터",
        age,
        goal,
        enrolledAt: observedAt,
        baseline,
        baselineRawScore: enrolled.rawScore,
        recommendation: enrolled.recommendation,
        followups: [],
        mode: "live",
        executionId: enrolled.executionId,
        planId: enrolled.planId,
        baselineEventId: enrolled.baselineEventId,
      };
      setParticipants((current) => [participant, ...current]);
      setSelectedId(participant.id);
      setWeek(2);
      setStep(2);
      return true;
    } catch {
      setError("PRO 계획을 등록하지 못했습니다. 입력값과 저장 동의를 확인한 뒤 다시 시도하세요.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveFollowup() {
    if (!selected?.executionId || !selected.planId) return false;
    setBusy(true);
    setError("");
    try {
      const plannedDoseCount = week * 7;
      const saved = await saveProFollowup({
        executionId: selected.executionId,
        planId: selected.planId,
        timepoint: `week_${week}`,
        answers: followup,
        observedAt: new Date().toISOString(),
        actualDayIndex: plannedDoseCount,
        plannedDoseCount,
        takenDoseCount: Math.round(plannedDoseCount * adherence / 100),
        adverseEvents: adverseEvent ? [{ adverse_event_id: `ae_${selected.id}_${week}`, severity: "mild", relatedness: "unknown", ongoing: false }] : [],
      });
      setParticipants((list) => list.map((participant) => participant.id !== selected.id ? participant : {
        ...participant,
        lastRndInterpretation: saved.interpretation,
        followups: [...participant.followups.filter((item) => item.week !== week), {
          week,
          answers: followup,
          adherencePercent: adherence,
          adverseEvent,
          eventId: saved.eventId,
          rndRawScore: saved.rawScore,
          rndInterpretation: saved.interpretation,
        }].sort((a, b) => a.week - b.week),
      }));
      setStep(3);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return true;
    } catch {
      setError("PRO 결과를 저장하지 못했습니다. 잠시 후 다시 시도하세요.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function runDemo() {
    const sample = demoParticipants();
    setParticipants(sample);
    setSelectedId(sample[0].id);
    setWeek(4);
    setStep(3);
  }
  function exportCsv() {
    const blob = new Blob(["\ufeff" + csv(participants)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tips-pro-study.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  useImperativeHandle(ref, () => ({
    async next() {
      if (busy) return false;
      if (step === 0) { setStep(1); return false; }
      if (step === 1) { await enroll(); return false; }
      if (step === 2) { await saveFollowup(); return false; }
      return true;
    },
    previous() {
      if (busy || step === 0) return false;
      setStep((step - 1) as 0 | 1 | 2 | 3);
      return true;
    },
  }), [busy, step, age, goal, name, baseline, consentAccepted, selected, followup, week, adherence, adverseEvent]);

  return <section className={`${styles.section} ${styles.proStudy}`} aria-labelledby="pro-study-title">
    <p className={styles.sectionLabel}>복용 전후 건강 변화 평가</p>
    <h2 id="pro-study-title" className={styles.sectionTitle}>같은 공인 설문으로 변화를 기록해요</h2>
    <p className={styles.sectionBody}>R&D 추천 계획에 복용 전, 2주, 4주 점수를 연결합니다. 관찰된 변화만 보여주며 인과 효과를 주장하지 않습니다.</p>
    <nav className={styles.studyProgress} aria-label="평가 진행 단계">{["안내", "복용 전", "추적 기록", "결과"].map((label, index) => <span key={label} data-active={step === index} data-complete={step > index}>{index + 1}. {label}</span>)}</nav>
    {error && <p className={styles.testError} role="alert">{error}</p>}

    {step === 0 && <div className={styles.studyStep}>
      <h3>측정 순서를 확인하세요</h3>
      <p>복용 전 점수와 추천 계획을 먼저 저장한 뒤 2주, 4주 점수를 차례로 기록합니다.</p>
      <details className={styles.secondaryOptions}><summary>예시 데이터와 기록 관리</summary><div className={styles.studyActions}><button onClick={runDemo}>120명 시뮬레이션 보기</button><button onClick={exportCsv} disabled={!participants.length}>CSV 저장</button><button onClick={() => { setParticipants([]); setSelectedId(""); }}>기록 초기화</button></div></details>
    </div>}

    {step === 1 && <div className={styles.studyStep}>
      <h3>복용 전 상태를 기록하세요</h3>
      <div className={styles.formGrid}>
        <label className={styles.control}><span>테스터명</span><input className={styles.field} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className={styles.control}><span>나이</span><input className={styles.field} type="number" min="18" max="120" value={age} onChange={(event) => setAge(+event.target.value)} /></label>
        <label className={styles.control}><span>관리 목표</span><select className={styles.field} value={goal} onChange={(event) => setGoal(event.target.value)}>{Object.entries(GOALS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className={styles.control}><span>사용 설문</span><select className={styles.field} value={instrument} onChange={(event) => changeInstrument(event.target.value as ProInstrumentId)}>{Object.values(PRO_INSTRUMENTS).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <Questionnaire value={baseline} onChange={(index, value) => updateAnswers(setBaseline, baseline, index, value)} />
      <label className={styles.aeCheck}><input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} /> 설문 응답과 추천 계획을 연구 데이터 저장소에 보관하는 데 동의합니다.</label>
    </div>}

    {step === 2 && selected && <div className={styles.studyStep}>
      <h3>{week}주 후 상태를 기록하세요</h3>
      <p>{selected.name}님의 계획 <code>{selected.planId}</code>에 결과를 연결합니다.</p>
      <label className={styles.control}><span>측정 시점</span><select className={styles.field} value={week} onChange={(event) => setWeek(Number(event.target.value) as 2 | 4)}><option value={2}>2주</option><option value={4}>4주</option></select></label>
      <Questionnaire value={followup} onChange={(index, value) => updateAnswers(setFollowup, followup, index, value)} />
      <label className={styles.rangeRow}><span>복용 순응도</span><input type="range" min="0" max="100" value={adherence} onChange={(event) => setAdherence(+event.target.value)} /><b>{adherence}%</b></label>
      <label className={styles.aeCheck}><input type="checkbox" checked={adverseEvent} onChange={(event) => setAdverseEvent(event.target.checked)} /> 이상사례가 있었습니다.</label>
    </div>}

    {step === 3 && selected && result && <div ref={resultRef} className={styles.studyStep} aria-live="polite">
      <h3>{selected.name}님의 관찰 결과</h3>
      <p>{selected.mode === "simulation" ? "시뮬레이션 결과이며 저장된 운영 데이터가 아닙니다." : "R&D 저장소가 반환한 점수와 해석입니다."}</p>
      <div className={styles.studyResult}>
        <div><span>복용 전 점수</span><strong>{result.baselineScore ?? "—"}점</strong></div>
        <div><span>최근 점수</span><strong>{result.latestScore ?? "—"}점</strong></div>
        <div><span>{selected.mode === "live" ? "건강 Z점수 변화" : "건강 백분위 변화"}</span><strong>{result.change === null ? "—" : `${result.change >= 0 ? "+" : ""}${result.change.toFixed(2)}${selected.mode === "live" ? "" : "pp"}`}</strong></div>
        <div><span>해석</span><strong>{result.change === null ? "평가 전" : result.improved ? "관찰된 개선" : "개선 확인 안 됨"}</strong></div>
      </div>
      {selected.mode === "live" && week === 2 && <button type="button" onClick={() => { setWeek(4); setStep(2); }}>4주 결과 입력</button>}
      <details className={styles.secondaryOptions}><summary>전체 평가 현황</summary><div className={styles.studyKpis}><div><span>등록</span><strong>{kpi.enrolled}명</strong></div><div><span>4주 평가</span><strong>{kpi.completed}명</strong></div><div><span>개선 비율</span><strong>{kpi.improvedPercent.toFixed(1)}%</strong></div></div></details>
    </div>}
  </section>;
});

export default ProStudySimulation;

function Questionnaire({ value, onChange }: { value: ProAnswers; onChange: (index: number, value: number) => void }) {
  const instrument = PRO_INSTRUMENTS[value.instrument];
  return <div className={styles.questionnaire}>
    <div className={styles.questionnaireHeader}><strong>{instrument.name} 응답 점수</strong><span>{instrument.recallPeriod} 기준 · 승인된 설문지의 채점값을 입력하세요.</span></div>
    {instrument.fields.map((label, index) => <label key={label} className={styles.scoreInputRow}><span><b>{label}</b><small>{instrument.itemMin}~{instrument.itemMax}점</small></span><select value={value.responses[index] ?? instrument.itemMin} onChange={(event) => onChange(index, +event.target.value)}>{Array.from({ length: instrument.itemMax - instrument.itemMin + 1 }, (_, offset) => instrument.itemMin + offset).map((score) => <option key={score} value={score}>{score}점</option>)}</select></label>)}
  </div>;
}
