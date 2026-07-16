"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ResearchOverview from "./ResearchOverview";
import BlindTestExplorer, { type BlindTestExplorerHandle } from "./BlindTestExplorer";
import ProStudySimulation, { type ProStudySimulationHandle } from "./ProStudySimulation";
import AdvancedProfileFields, { DEFAULT_ADVANCED, type AdvancedProfile } from "./AdvancedProfileFields";
import InferenceWorkbench from "./InferenceWorkbench";
import ResearchEvidencePanel from "./ResearchEvidencePanel";
import ResearchWorkflowMap from "./ResearchWorkflowMap";
import AgentDecisionWorkbench, { type AgentDecisionWorkbenchHandle } from "./AgentDecisionWorkbench";
import type { InferenceExplanation } from "./research-types";
import styles from "./interim.module.css";

type JsonRecord = Record<string, unknown>;
type LabAction =
  | "initialize"
  | "execute_workflow_node"
  | "recommend"
  | "retrieve_evidence"
  | "create_followup"
  | "ingest_pro"
  | "log_adverse_event"
  | "ingest_device"
  | "list_rnd_sessions"
  | "replay_rnd_session";

type Candidate = { ingredientId: string; label: string; score: number };
type Safety = { decision: string; reasons: string[]; blockedIngredients: string[] };
type Feedback = { tone: "success" | "warning" | "error"; title: string; detail: string };
type RndReplayStatus = "MATCH" | "MISMATCH" | "VERSION_MISMATCH";
type RndSavedSession = { executionId:string; createdAt:string; replayAvailable:boolean; lastReplayStatus:RndReplayStatus|null; lastReplayedAt:string|null };
type RndSessionSummary = { connected:boolean; availability:"CONNECTED"|"DISABLED"|"UNAVAILABLE"; totalSavedSessions:number; replayableSessions:number; unavailableSessions:number; replayRunCount:number; recentSessions:RndSavedSession[] };
type RndReplayResult = { connected:boolean; availability:"CONNECTED"|"DISABLED"|"UNAVAILABLE"; executionId:string|null; status:RndReplayStatus|null; inputMatch:boolean|null; versionMatch:boolean|null; outputMatch:boolean|null; replayedAt:string|null };
type DemoScenario = { id:string; title:string; description:string; age:number; goal:string; conditions:string[]; medications:string[]; fishAllergy:boolean; redFlag:boolean; advanced:AdvancedProfile };
const DEMO_SCENARIOS: DemoScenario[] = [
  {id:"standard",title:"일반 추천",description:"비타민 D 저하와 수면 목표의 정상 추천 경로",age:41,goal:"sleep_quality",conditions:[],medications:[],fishAllergy:false,redFlag:false,advanced:{...DEFAULT_ADVANCED,sex:"female",monthlyBudgetKrw:70000,maxDailyPills:4,preferredForm:"powder",dietPatterns:["low_fortified_food"],wearableFeatures:["low_hrv"],symptoms:[{code:"fatigue",severity:"moderate"}],labs:{vitamin_d:"low"}}},
  {id:"interaction",title:"상호작용 차단",description:"와파린 복용 조건에서 후보 차단 재현",age:67,goal:"cardiovascular_wellbeing",conditions:["hypertension"],medications:["warfarin"],fishAllergy:false,redFlag:false,advanced:{...DEFAULT_ADVANCED,sex:"male",pregnancyStatus:"not_applicable",monthlyBudgetKrw:100000,dietPatterns:["low_fish"],labs:{triglycerides:"high"}}},
  {id:"escalation",title:"응급 중단",description:"흉통 입력 후 추천 중단과 에스컬레이션 재현",age:54,goal:"energy",conditions:["hypertension"],medications:[],fishAllergy:false,redFlag:true,advanced:{...DEFAULT_ADVANCED,sex:"male",pregnancyStatus:"not_applicable",symptoms:[{code:"chest_pain",severity:"moderate"}],labs:{}}},
];

const INGREDIENT_LABELS: Record<string, string> = {
  "ING:MAGNESIUM": "마그네슘",
  "ING:POTASSIUM": "칼륨",
  "ING:IRON": "철분",
  "ING:OMEGA3": "오메가3",
};

const GOALS = [
  ["sleep_quality", "수면의 질"],
  ["stress_management", "스트레스 관리"],
  ["energy", "활력"],
  ["bone_health", "뼈 건강"],
  ["immune_support", "면역 건강"],
  ["bowel_regular", "배변 활동"],
  ["cardiovascular_wellbeing", "심혈관 건강"], ["exercise_recovery", "운동 회복"],
  ["eye_health", "눈 건강"], ["maintain_muscle", "근육 유지"],
  ["maternal_wellbeing", "모체 건강"], ["rapid_weight_loss", "체중 관리"],
] as const;

const CONDITIONS = [
  ["chronic_kidney_disease", "만성 신장질환"],
  ["chronic_liver_disease", "만성 간질환"],
  ["type_2_diabetes", "제2형 당뇨"],
  ["hypertension", "고혈압"],
  ["hemochromatosis", "철 과부하 질환"],
  ["constipation", "변비"], ["hypercalcemia", "고칼슘혈증"],
  ["hypothyroidism", "갑상선기능저하"], ["irritable_bowel_syndrome", "과민성장증후군"],
  ["osteopenia", "골감소증"], ["postmenopause", "폐경 후"], ["recent_antibiotic_use", "최근 항생제 사용"],
] as const;

const MEDICATIONS = [
  ["warfarin", "와파린"],
  ["metformin", "메트포르민"],
  ["levothyroxine", "레보티록신"],
  ["statin", "스타틴"],
  ["ace_inhibitor", "ACE 억제제"],
] as const;

const CONSENTS = [
  ["followup:write", "후속 확인 기록"],
  ["pro:write", "자가보고 결과(PRO) 기록"],
  ["ae:write", "이상사례 기록"],
  ["device:write", "기기 데이터 기록"],
] as const;

const EVALUATION_STAGES = [
  { title: "연구 개요", purpose: "추천 모델과 검증 범위의 구성입니다.", input: "학습 데이터 규모, 입력 변수, 추천 성분 분류기, 독립 시험 데이터", process: "연구 산출물과 성능지표를 항목별로 집계합니다.", output: "KPI별 측정 대상, 판정 기준, 저장 결과와 실행 경로" },
  { title: "독립 시험 데이터", purpose: "학습에 사용하지 않은 5,000건에서 추천 결과가 정답 기준과 일치하는지 확인합니다.", input: "나이·질환·약물·영양 상태 등이 포함된 독립 시험 사례", process: "저장된 모델이 각 사례를 다시 계산하고 기준 추천과 비교합니다.", output: "사례별 일치 여부와 전체 정확도" },
  { title: "복용 전후 건강 변화", purpose: "같은 공인 설문을 복용 전과 4주 후에 측정해 건강 변화량을 계산합니다.", input: "PSQI·ISI·PSS-10 승인본에서 산출한 복용 전후 점수", process: "원점수를 시작 시점 분포로 표준화하고 건강 백분위 차이로 변환합니다.", output: "개인별 개선도와 100명 이상 집단의 평균 개선도" },
  { title: "추천 모델 실행", purpose: "한 사람의 조건이 실제 추천 결과로 변환되는 전체 과정을 실행합니다.", input: "나이, 관리 목표, 질환, 복용 약물, 검사 결과 등 최대 93개 특성", process: "학습 모델이 14개 성분 점수를 계산한 뒤 안전 규칙이 금기·상호작용 후보를 제외합니다.", output: "최종 추천 성분, 제외 성분과 제외 사유" },
  { title: "추천 결과 분석", purpose: "모델이 어떤 입력을 근거로 각 성분 점수를 계산했는지 확인합니다.", input: "입력 특성, 학습된 계수, 성분별 선형 점수", process: "특성별 기여도를 합산해 확률을 계산하고 안전 판정 전후 결과를 비교합니다.", output: "추천 순위, 계산 근거, 안전 필터 적용 결과" },
  { title: "추천 이후 기록", purpose: "추천 후 필요한 근거·추적·자가보고·기기·이상사례 기록 기능을 검증합니다.", input: "추천 세션과 저장 허용 범위", process: "근거 조회, 후속 일정, PRO, 스마트워치 데이터 또는 이상사례를 세션에 연결합니다.", output: "기록 성공 여부와 이상사례 발생 시 추천 중단 상태" },
  { title: "모델 및 검증 산출물", purpose: "평가에 사용된 모델과 성능 결과가 지정된 산출물과 연결되는지 확인합니다.", input: "모델 구조, 데이터 규모, 독립 시험 결과, 검증 파일", process: "모델 명세와 재현 가능한 평가 결과를 한 화면에 정리합니다.", output: "기관 평가자가 확인할 최종 기술·성능 요약" },
] as const;

const PRO_STAGE_LABELS = ["안내", "복용 전 점수", "4주 후 점수", "개선도 결과"] as const;
const PRO_STAGE_HELP = [
  { purpose:"복용 전후 평가의 대상, 설문과 계산 순서를 확인합니다.", input:"기본 테스터와 PSQI 설문", process:"복용 전 측정, 추천 실행, 4주 후 동일 설문 측정 순서를 준비합니다.", output:"이번 평가에서 재현할 전체 절차" },
  { purpose:"테스터의 복용 전 건강 상태를 기준점으로 저장하고 추천 모델을 실행합니다.", input:"테스터 정보, 관리 목표, 승인된 PSQI 구성요소 점수", process:"설문 원점수를 저장하고 동일 프로필로 추천 성분을 계산합니다.", output:"복용 전 기준 점수와 추천 성분" },
  { purpose:"같은 테스터의 4주 후 건강 상태를 같은 설문으로 기록합니다.", input:"4주 후 PSQI 점수, 복용 순응도, 이상사례 여부", process:"복용 전과 같은 척도의 원점수를 저장해 직접 비교 가능한 상태로 만듭니다.", output:"4주 후 점수와 복용 상태" },
  { purpose:"복용 전후 점수 차이가 건강 상태에서 어느 정도 변화인지 계산합니다.", input:"복용 전 점수, 4주 후 점수, 시작 시점 집단 분포", process:"두 점수를 Z-표준화한 뒤 건강 백분위 차이(pp)로 변환합니다.", output:"개인 개선도, 개선 여부와 집단 평균 성과" },
] as const;

function toggle(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function object(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function parseRndSessions(value: unknown): RndSessionSummary | null {
  const item = object(value);
  if (!item || typeof item.connected !== "boolean" || !["CONNECTED","DISABLED","UNAVAILABLE"].includes(String(item.availability))) return null;
  const recentSessions = Array.isArray(item.recentSessions) ? item.recentSessions.flatMap((entry):RndSavedSession[]=>{
    const session=object(entry);
    if (!session || typeof session.executionId!=="string" || typeof session.createdAt!=="string" || typeof session.replayAvailable!=="boolean") return [];
    const lastReplayStatus=["MATCH","MISMATCH","VERSION_MISMATCH"].includes(String(session.lastReplayStatus))?session.lastReplayStatus as RndReplayStatus:null;
    return [{executionId:session.executionId,createdAt:session.createdAt,replayAvailable:session.replayAvailable,lastReplayStatus,lastReplayedAt:typeof session.lastReplayedAt==="string"?session.lastReplayedAt:null}];
  }):[];
  return {
    connected:item.connected,
    availability:item.availability as RndSessionSummary["availability"],
    totalSavedSessions:Number(item.totalSavedSessions)||0,
    replayableSessions:Number(item.replayableSessions)||0,
    unavailableSessions:Number(item.unavailableSessions)||0,
    replayRunCount:Number(item.replayRunCount)||0,
    recentSessions,
  };
}

function parseRndReplay(value: unknown): RndReplayResult | null {
  const item=object(value);
  if (!item || typeof item.connected!=="boolean" || !["CONNECTED","DISABLED","UNAVAILABLE"].includes(String(item.availability))) return null;
  const status=["MATCH","MISMATCH","VERSION_MISMATCH"].includes(String(item.status))?item.status as RndReplayStatus:null;
  const nullableBoolean=(entry:unknown)=>typeof entry==="boolean"?entry:null;
  return {connected:item.connected,availability:item.availability as RndReplayResult["availability"],executionId:typeof item.executionId==="string"?item.executionId:null,status,inputMatch:nullableBoolean(item.inputMatch),versionMatch:nullableBoolean(item.versionMatch),outputMatch:nullableBoolean(item.outputMatch),replayedAt:typeof item.replayedAt==="string"?item.replayedAt:null};
}

function formatRndSessionTime(value: string | null) {
  if (!value) return "기록 없음";
  const time=new Date(value);
  return Number.isNaN(time.getTime())?"시간 확인 불가":new Intl.DateTimeFormat("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(time);
}

function rndReplayLabel(status: RndReplayStatus | null) {
  if (status==="MATCH") return "동일 결과 확인";
  if (status==="MISMATCH") return "결과 차이 확인";
  if (status==="VERSION_MISMATCH") return "버전 불일치로 재생 중단";
  return "재생 기록 없음";
}

async function runLab(body: JsonRecord) {
  const response = await fetch("/api/tips/lab", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as JsonRecord;
  if (!response.ok) {
    const message = String(payload.error ?? `request_${response.status}`);
    throw new Error(
      response.status === 401
        ? "접근 권한이 필요합니다. /test-login?redirect=/tips 경로에서 인증하십시오."
        : message
    );
  }
  return payload;
}

export default function InterimUserConsole() {
  const [activeStage, setActiveStage] = useState(0);
  const [proStep, setProStep] = useState<0|1|2|3>(0);
  const [proBusy, setProBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const stageRefs = useRef<Array<HTMLElement | null>>([]);
  const modalScrollPosition = useRef(0);
  const modalScrollLocked = useRef(false);
  const proStudyRef = useRef<ProStudySimulationHandle | null>(null);
  const blindTestRef = useRef<BlindTestExplorerHandle | null>(null);
  const agentDecisionRef = useRef<AgentDecisionWorkbenchHandle | null>(null);
  const [age, setAge] = useState(41);
  const [goal, setGoal] = useState("sleep_quality");
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [fishAllergy, setFishAllergy] = useState(false);
  const [redFlag, setRedFlag] = useState(false);
  const [advanced, setAdvanced] = useState(DEFAULT_ADVANCED);
  const [consents, setConsents] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<LabAction | null>(null);
  const [state, setState] = useState("NEW");
  const [stateToken, setStateToken] = useState("");
  const [dataLake, setDataLake] = useState<JsonRecord | null>(null);
  const [rndSessions, setRndSessions] = useState<RndSessionSummary | null>(null);
  const [rndReplay, setRndReplay] = useState<RndReplayResult | null>(null);
  const [selectedRndExecutionId, setSelectedRndExecutionId] = useState("");
  const [recommendationResult, setRecommendationResult] = useState<JsonRecord | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [demoProgress, setDemoProgress] = useState("");
  const [stageActivity, setStageActivity] = useState("단계 실행 대기");
  const resultRef = useRef<HTMLElement | null>(null);
  const actionFeedbackRef = useRef<HTMLDivElement>(null);
  const [trace, setTrace] = useState<JsonRecord>({
    안내: "시험 프로필 설정 후 추천 모델을 실행하십시오.",
  });

  const profile = useMemo(
    () => ({
      age,
      sex: advanced.sex,
      pregnant: advanced.pregnancyStatus === "pregnant",
      pregnancyStatus: advanced.pregnancyStatus,
      monthlyBudgetKrw: advanced.monthlyBudgetKrw,
      maxDailyPills: advanced.maxDailyPills,
      preferredForm: advanced.preferredForm,
      goals: [goal],
      conditions,
      medicationClasses: medications,
      allergies: fishAllergy ? ["fish"] : [],
      dietPatterns: advanced.dietPatterns,
      currentSupplements: advanced.currentSupplements,
      wearableFeatures: advanced.wearableFeatures,
      symptoms: advanced.symptoms,
      labs: advanced.labs,
      riskFlags: [...new Set([...(redFlag ? ["red_flag_chest_pain"] : []), ...advanced.riskFlags, ...(advanced.pregnancyStatus === "pregnant" ? ["pregnant"] : []), ...(advanced.pregnancyStatus === "lactating" ? ["lactating"] : []), ...(advanced.symptoms.some(item => item.code === "chest_pain") ? ["red_flag_chest_pain"] : []), ...(advanced.symptoms.some(item => item.code === "abdominal_pain" && item.severity === "severe") ? ["red_flag_severe_abdominal_pain"] : [])])],
    }),
    [advanced, age, conditions, fishAllergy, goal, medications, redFlag]
  );

  const recommendations = Array.isArray(recommendationResult?.recommendations)
    ? (recommendationResult.recommendations as Candidate[])
    : [];
  const safety =
    recommendationResult?.safety && typeof recommendationResult.safety === "object"
      ? (recommendationResult.safety as Safety)
      : null;
  const inference =
    recommendationResult?.inference && typeof recommendationResult.inference === "object"
      ? (recommendationResult.inference as InferenceExplanation)
      : null;
  const terminalState = state === "ESCALATED" || state === "STOPPED" || state === "ADVERSE_EVENT";
  const activeHelp = activeStage === 2 ? PRO_STAGE_HELP[proStep] : EVALUATION_STAGES[activeStage];
  const activeStageTitle = activeStage === 2 ? `복용 전후 건강 변화 · ${PRO_STAGE_LABELS[proStep]}` : EVALUATION_STAGES[activeStage].title;

  function updateRndSessions(value: unknown) {
    const parsed=parseRndSessions(value);
    if (!parsed) return;
    setRndSessions(parsed);
    const replayable=parsed.recentSessions.filter(item=>item.replayAvailable);
    const nextExecutionId=replayable.some(item=>item.executionId===selectedRndExecutionId)?selectedRndExecutionId:replayable[0]?.executionId??"";
    if (nextExecutionId!==selectedRndExecutionId) setRndReplay(null);
    setSelectedRndExecutionId(nextExecutionId);
  }

  useEffect(() => {
    if (!helpOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setHelpOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [helpOpen]);

  useEffect(() => {
    if (activeStage > 0 && !modalScrollLocked.current) {
      modalScrollPosition.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${modalScrollPosition.current}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      modalScrollLocked.current = true;
      return;
    }
    if (activeStage === 0 && modalScrollLocked.current) {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, modalScrollPosition.current);
      modalScrollLocked.current = false;
    }
  }, [activeStage]);

  useEffect(() => () => {
    if (!modalScrollLocked.current) return;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
  }, []);

  function moveToStage(next: number) {
    const bounded = Math.max(0, Math.min(EVALUATION_STAGES.length - 1, next));
    const closingModal = activeStage > 0 && bounded === 0;
    setHelpOpen(false);
    setActiveStage(bounded);
    if (bounded === 0 && !closingModal) requestAnimationFrame(() => stageRefs.current[0]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function nextStage() {
    if (activeStage === 0) {
      const completed = await initializeEvaluationSession();
      if (completed) moveToStage(1);
      return;
    }
    if (activeStage === 1) {
      setProBusy(true);
      setStageActivity("5,000건 독립 시험 재계산 중");
      try {
        const completed = await blindTestRef.current?.verifyAll();
        if (completed) { setStageActivity("5,000건 독립 시험 재계산 완료"); moveToStage(2); }
      } finally { setProBusy(false); }
      return;
    }
    if (activeStage === 2) {
      setProBusy(true);
      setStageActivity(`PRO ${PRO_STAGE_LABELS[proStep]} 계산·저장 중`);
      try {
        const completed = await proStudyRef.current?.next();
        setStageActivity(completed ? "PRO 복용 전후 변화 계산 완료" : `PRO ${PRO_STAGE_LABELS[Math.min(3, proStep + 1) as 0|1|2|3]} 단계 준비 완료`);
        if (completed) moveToStage(3);
      } finally { setProBusy(false); }
      return;
    }
    if (activeStage === 3 && !recommendationResult) {
      setStageActivity("추천 모델·안전 규칙 계산 중");
      const completed = await execute("recommend");
      if (completed) { setStageActivity("추천 모델·안전 규칙 계산 완료"); moveToStage(4); }
      return;
    }
    if (activeStage === 3) {
      setStageActivity("변경된 입력으로 추천 재계산 중");
      const completed = await execute("recommend");
      if (completed) { setStageActivity("추천 재계산 완료"); moveToStage(4); }
      return;
    }
    if (activeStage === 4) {
      setStageActivity("추천 결과의 연결 근거 조회 중");
      const completed = await execute("retrieve_evidence", { query: `${goal} 추천 근거` });
      if (completed) { setStageActivity("추천 근거 조회 완료"); moveToStage(5); }
      return;
    }
    if (activeStage === 5) {
      setProBusy(true);
      setStageActivity("Agent 다음 작업 결정·실행·검증 중");
      try {
        const completed = await agentDecisionRef.current?.evaluate();
        if (completed) { setStageActivity("Agent 결정·실행·사후조건 검증 완료"); moveToStage(6); }
      } finally { setProBusy(false); }
      return;
    }
    moveToStage(activeStage + 1);
  }

  async function initializeEvaluationSession() {
    setBusyAction("initialize");
    setStageActivity("평가 세션과 입력 스냅샷 생성 중");
    try {
      const initialized = await runLab({ action: "initialize", profile, consentScopes: consents });
      setTrace(initialized);
      setState(String(initialized.state ?? "NEW"));
      setStateToken(String(initialized.stateToken ?? ""));
      setDataLake(initialized.dataLake && typeof initialized.dataLake === "object" ? initialized.dataLake as JsonRecord : null);
      updateRndSessions(initialized.rndSessions);
      setStageActivity("평가 세션과 입력 스냅샷 생성 완료");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      setTrace({ error: message });
      setFeedback({ tone: "error", title: "평가 세션 생성 실패", detail: message });
      setStageActivity("평가 세션 생성 실패");
      return false;
    } finally { setBusyAction(null); }
  }

  function previousStage() {
    if (activeStage === 2 && proStudyRef.current?.previous()) return;
    moveToStage(activeStage - 1);
  }

  function describeResult(action: LabAction, result: JsonRecord): Feedback {
    if (action === "execute_workflow_node") return { tone: "success", title: "기술 블록 실행 완료", detail: "실행 산출물과 사후조건을 데이터베이스에 저장했습니다." };
    if (action === "recommend") {
      const resultSafety = result.safety as Safety | undefined;
      const items = Array.isArray(result.recommendations) ? result.recommendations : [];
      if (resultSafety?.decision === "STOP_AND_ESCALATE") {
        return { tone: "error", title: "추천 절차 중단", detail: "응급 위험 신호 감지에 따라 안전 절차로 전환되었습니다." };
      }
      if (items.length === 0 && resultSafety?.blockedIngredients.length) {
        const names = resultSafety.blockedIngredients.map((id) => INGREDIENT_LABELS[id] ?? id).join(", ");
        return { tone: "warning", title: "안전 조건에 따른 추천 보류", detail: `${names} 성분은 입력 조건과의 충돌로 추천 목록에서 제외되었습니다.` };
      }
      return { tone: "success", title: `추천 후보 ${items.length}개 산출`, detail: "안전성 판정 및 모델 점수가 아래에 표시됩니다." };
    }
    if (action === "retrieve_evidence") return { tone: "success", title: "근거 조회 완료", detail: String(result.answer ?? "연구 근거 응답이 생성되었습니다.") };
    if (action === "create_followup") return { tone: "success", title: "2주 후속 평가 생성", detail: "14일 후 점수와 복용 여부를 확인하도록 설정되었습니다." };
    if (action === "ingest_pro") return { tone: "success", title: "PRO 기록 반영 완료", detail: "4주 시점 자가보고 결과가 조정 검토 상태로 반영되었습니다." };
    if (action === "ingest_device") return { tone: "success", title: "웨어러블 기록 반영 완료", detail: "기기 데이터가 활성 계획에 연결되었습니다." };
    if (action === "list_rnd_sessions") {
      const summary=parseRndSessions(result.rndSessions);
      return summary?.connected
        ? {tone:"success",title:"R&D 저장 세션 조회 완료",detail:`저장 세션 ${summary.totalSavedSessions}건 중 ${summary.replayableSessions}건을 같은 입력과 버전으로 재생할 수 있습니다.`}
        : {tone:"warning",title:"R&D 서버 미연결",detail:"R&D 서버 주소와 내부 인증 설정을 확인한 뒤 다시 조회하십시오."};
    }
    if (action === "replay_rnd_session") {
      const replay=parseRndReplay(result.rndReplay);
      if (!replay?.connected) return {tone:"warning",title:"R&D 세션 재생 불가",detail:"R&D 서버 연결을 확인한 뒤 저장 세션을 다시 조회하십시오."};
      if (replay.status==="MATCH") return {tone:"success",title:"동일 결과 확인",detail:"저장한 입력과 실행 버전으로 다시 계산한 결과가 기준 결과와 일치합니다."};
      if (replay.status==="VERSION_MISMATCH") return {tone:"warning",title:"버전 불일치로 재생 중단",detail:"현재 실행 버전이 저장 당시 버전과 달라 추천 계산을 실행하지 않았습니다."};
      return {tone:"error",title:"재생 결과 차이 확인",detail:"같은 입력과 버전에서 기준 결과와 다른 항목이 확인되었습니다."};
    }
    return { tone: "error", title: "추천 절차 중단", detail: "중대한 이상사례 기록에 따라 긴급 검토 상태로 전환되었습니다." };
  }

  async function execute(action: LabAction, payload: JsonRecord = {}) {
    setBusyAction(action);
    setFeedback(null);
    try {
      let token = stateToken;
      if (!token) {
        const initialized = await runLab({
          action: "initialize",
          profile,
          consentScopes: consents,
        });
        token = String(initialized.stateToken ?? "");
        setStateToken(token);
        updateRndSessions(initialized.rndSessions);
      }
      const result = await runLab({
        action,
        stateToken: token,
        profile,
        consentScopes: consents,
        payload,
      });
      setTrace(result);
      if (action === "recommend") setRecommendationResult(result);
      if (action === "list_rnd_sessions" || action === "replay_rnd_session") updateRndSessions(result.rndSessions);
      if (action === "list_rnd_sessions") setRndReplay(null);
      if (action === "replay_rnd_session") setRndReplay(parseRndReplay(result.rndReplay));
      setFeedback(describeResult(action, result));
      if (typeof result.state === "string") setState(result.state);
      if (typeof result.stateToken === "string") setStateToken(result.stateToken);
      if (result.dataLake && typeof result.dataLake === "object") setDataLake(result.dataLake as JsonRecord);
      requestAnimationFrame(() => {
        const target = action === "recommend" ? resultRef.current : actionFeedbackRef.current;
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      setTrace({ error: message });
      setFeedback({
        tone: "error",
        title: "실행 실패",
        detail: message.startsWith("consent_scope_required")
          ? "해당 기록 동의 항목을 먼저 선택하십시오."
          : message,
      });
      requestAnimationFrame(() => actionFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  function resetLab() {
    setState("NEW");
    setStateToken("");
    setDataLake(null);
    setRndReplay(null);
    setRecommendationResult(null);
    setFeedback(null);
    setTrace({ 안내: "새 시험 세션이 초기화되었습니다." });
  }

  function applyScenario(s: DemoScenario) {
    setAge(s.age); setGoal(s.goal); setConditions(s.conditions); setMedications(s.medications);
    setFishAllergy(s.fishAllergy); setRedFlag(s.redFlag); setAdvanced(s.advanced); setConsents([]); resetLab();
    setDemoProgress(`${s.title} 입력값 적용 완료`);
  }

  async function runScenario(s: DemoScenario) {
    applyScenario(s); setBusyAction("initialize");
    const scopes=["followup:write","pro:write","ae:write","device:write"];
    const p={age:s.age,sex:s.advanced.sex,pregnant:s.advanced.pregnancyStatus==="pregnant",pregnancyStatus:s.advanced.pregnancyStatus,monthlyBudgetKrw:s.advanced.monthlyBudgetKrw,maxDailyPills:s.advanced.maxDailyPills,preferredForm:s.advanced.preferredForm,goals:[s.goal],conditions:s.conditions,medicationClasses:s.medications,allergies:s.fishAllergy?["fish"]:[],dietPatterns:s.advanced.dietPatterns,currentSupplements:s.advanced.currentSupplements,wearableFeatures:s.advanced.wearableFeatures,symptoms:s.advanced.symptoms,labs:s.advanced.labs,riskFlags:[...s.advanced.riskFlags,...(s.redFlag?["red_flag_chest_pain"]:[])]};
    try {
      setConsents(scopes); setDemoProgress("1/6 세션 초기화"); let r=await runLab({action:"initialize",profile:p,consentScopes:scopes}); updateRndSessions(r.rndSessions); let token=String(r.stateToken??"");
      setDemoProgress("2/6 추천·안전 판정"); r=await runLab({action:"recommend",stateToken:token,profile:p,consentScopes:scopes}); setRecommendationResult(r); setTrace(r); setFeedback(describeResult("recommend",r)); setState(String(r.state??"")); token=String(r.stateToken??token); setStateToken(token);
      if (["ESCALATED","STOPPED","ADVERSE_EVENT"].includes(String(r.state))) { setDemoProgress("완료 · 안전 중단 경로 재현"); moveToStage(4); return; }
      for (const [i,action] of (["retrieve_evidence","create_followup","ingest_pro","ingest_device"] as LabAction[]).entries()) { setDemoProgress(`${i+3}/6 ${action}`); r=await runLab({action,stateToken:token,profile:p,consentScopes:scopes,payload:action==="retrieve_evidence"?{query:`${s.goal} 근거`}:action==="ingest_device"?{source:"wearable"}:{}}); token=String(r.stateToken??token); setTrace(r); setState(String(r.state??"")); setStateToken(token); }
      setDemoProgress("완료 · 추천부터 추적 기록까지 자동 실행"); moveToStage(4);
    } catch(error) { const message=error instanceof Error?error.message:"unknown_error"; setDemoProgress(`실패 · ${message}`); setTrace({error:message}); }
    finally { setBusyAction(null); }
  }

  return (
    <main className={styles.page}>
      {activeStage>0&&<><div className={styles.stageModalBackdrop} onMouseDown={()=>moveToStage(0)} aria-hidden="true"/><button type="button" className={styles.stageModalClose} aria-label="평가 단계 닫기" onClick={()=>moveToStage(0)}>×</button></>}
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>TIPS 연구개발 성과 검증 시스템</p>
            <h1 className={styles.title}>개인 맞춤형 건강기능식품<br />추천 모델 검증</h1>
            <p className={styles.lead}>
              시험 대상의 조건을 입력하면 추천 결과, 제외 사유, 계산 과정과 후속 기록 기능을 한 화면에서 확인할 수 있습니다.
            </p>
          </div>

          <div className={styles.statusPanel}>
            <span className={styles.badge}>PROXY_GOLD_SIMULATION</span>
            <dl className={styles.statusList}>
              <div><dt>실행 상태</dt><dd>{state}</dd></div>
              <div><dt>모델 상태</dt><dd>학습 스냅샷 적용</dd></div>
            </dl>
          </div>
        </header>

        <div ref={(node)=>{stageRefs.current[0]=node;}} className={styles.stageAnchor}>
          <ResearchWorkflowMap activeStage={activeStage} agentState={state} safetyDecision={safety?.decision??""} recommendationCount={recommendations.length} consentCount={consents.length} deviceConnected={consents.includes("device:write")&&state!=="NEW"} dataLake={dataLake} onNavigate={moveToStage} onExecuteNode={async(nodeId)=>{const result=await execute("execute_workflow_node",{nodeId});return result?.nodeExecution&&typeof result.nodeExecution==="object"?result.nodeExecution as JsonRecord:null;}} />
          <ResearchOverview onNavigate={moveToStage} />
        </div>

        <div ref={(node)=>{stageRefs.current[1]=node;}} className={`${styles.stageAnchor} ${activeStage===1?styles.stageModalContent:styles.stageHidden}`}><BlindTestExplorer ref={blindTestRef} /></div>

        <div ref={(node)=>{stageRefs.current[2]=node;}} className={`${styles.stageAnchor} ${activeStage===2?styles.stageModalContent:styles.stageHidden}`}><ProStudySimulation ref={proStudyRef} onStepChange={setProStep} /></div>

        <section ref={(node)=>{stageRefs.current[3]=node;}} className={`${styles.section} ${activeStage===3?styles.stageModalContent:styles.stageHidden}`}>
          <p className={styles.sectionLabel}>1. 시험 조건 입력</p>
          <h2 className={styles.sectionTitle}>예시 조건으로 추천 모델을 실행합니다</h2>
          <p className={styles.sectionBody}>기본 예시를 기준으로 추천 계산, 안전 판정, 근거 연결과 후속 기록을 연속 실행합니다.</p>
          <div className={styles.quickScenarioSummary}><span>실행 예시</span><strong>{DEMO_SCENARIOS[0].title}</strong><small>{DEMO_SCENARIOS[0].description}</small></div>
          <details className={styles.secondaryOptions}>
            <summary>다른 예시 선택 또는 입력값 수정</summary>
          <div className={styles.demoPanel}>
            <div><strong>평가 시나리오</strong><p>일반 추천, 상호작용 차단, 응급 중단 조건을 불러와 단계별 또는 전체 경로로 실행할 수 있습니다.</p></div>
            <div className={styles.demoScenarios}>{DEMO_SCENARIOS.map(s=><article key={s.id}><h3>{s.title}</h3><p>{s.description}</p><div><button type="button" onClick={()=>applyScenario(s)} disabled={busyAction!==null}>조건만 불러오기</button><button type="button" className={styles.demoRun} onClick={()=>runScenario(s)} disabled={busyAction!==null}>전체 과정 실행</button></div></article>)}</div>
            {demoProgress&&<div className={styles.demoProgress} aria-live="polite">{demoProgress}</div>}
          </div>
          <div className={styles.formGrid}>
            <label className={styles.control}>
              <span>나이</span>
              <input
                className={styles.field}
                type="number"
                min={18}
                max={100}
                value={age}
                onChange={(event) => setAge(Number(event.target.value))}
              />
            </label>
            <label className={styles.control}>
              <span>관리 목표</span>
              <select className={styles.field} value={goal} onChange={(e) => setGoal(e.target.value)}>
                {GOALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <AdvancedProfileFields value={advanced} onChange={setAdvanced} />

          <div className={styles.optionGroup}>
            <strong>건강 상태</strong>
            <div className={styles.chips}>
              {CONDITIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={conditions.includes(value)}
                  className={conditions.includes(value) ? styles.chipActive : styles.chip}
                  onClick={() => setConditions((current) => toggle(current, value))}
                >{label}</button>
              ))}
            </div>
          </div>

          <div className={styles.optionGroup}>
            <strong>복용 약물</strong>
            <div className={styles.chips}>
              {MEDICATIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={medications.includes(value)}
                  className={medications.includes(value) ? styles.chipActive : styles.chip}
                  onClick={() => setMedications((current) => toggle(current, value))}
                >{label}</button>
              ))}
            </div>
          </div>

          <div className={styles.checkGrid}>
            <label><input type="checkbox" checked={fishAllergy} onChange={(e) => setFishAllergy(e.target.checked)} /> 어류 알레르기</label>
            <label className={styles.dangerCheck}><input type="checkbox" checked={redFlag} onChange={(e) => setRedFlag(e.target.checked)} /> 흉통 등 응급 위험 신호 시험</label>
          </div>

          <button className={styles.primaryButton} disabled={busyAction !== null} onClick={() => execute("recommend")}>
            {busyAction === "recommend" ? "판단 중…" : "안전 검사 후 추천 보기"}
          </button>
          </details>
        </section>

        <div ref={(node)=>{stageRefs.current[4]=node;}} className={activeStage===4?styles.stageModalContent:styles.stageHidden}>
        <section ref={(node)=>{resultRef.current=node;}} className={`${styles.section} ${styles.softSection}`}>
          <p className={styles.sectionLabel}>2. 추천 결과 확인</p>
          <h2 className={styles.sectionTitle}>무엇이 추천되었고, 무엇이 제외되었는가</h2>
          <p className={styles.sectionBody}>입력 조건을 모델에 적용한 뒤 복용 약물·질환·알레르기 안전 규칙을 순서대로 확인한 결과입니다.</p>
          {safety && <div className={styles.resultSummaryBar} aria-label="추천 평가 결과 요약">
            <div><span>안전 판정</span><strong>{safety.decision === "ALLOW" ? "추천 가능" : safety.decision === "REVIEW" ? "검토 필요" : "추천 중단"}</strong></div>
            <div><span>최종 추천</span><strong>{recommendations.length}개</strong></div>
            <div><span>안전 규칙 제외</span><strong>{safety.blockedIngredients.length}개</strong></div>
          </div>}
          {safety ? (
            <div className={safety.decision === "STOP_AND_ESCALATE" ? styles.stopBanner : styles.safetyBanner}>
              <strong>{safety.decision === "ALLOW" ? "안전 규칙 통과" : safety.decision === "REVIEW" ? "약사 검토 필요" : "추천 중단 및 검토 전환"}</strong>
              <p>{safety.reasons.length ? safety.reasons.join(" ") : "입력 조건에서 차단 규칙이 확인되지 않았습니다."}</p>
            </div>
          ) : <p className={styles.empty}>안전 판정 대기 상태입니다. 시험 조건을 입력한 뒤 안전 검사와 추천 계산을 실행할 수 있습니다.</p>}

          {feedback && recommendationResult && trace.action === "recommend" && (
            <div className={`${styles.feedback} ${styles[feedback.tone]}`} aria-live="polite">
              <strong>{feedback.title}</strong>
              <p>{feedback.detail}</p>
            </div>
          )}

          {safety && recommendations.length === 0 && safety.blockedIngredients.length > 0 && (
            <div className={styles.noCandidates}>
              <strong>최종 추천 후보 없음</strong>
              <p>모델 후보 산출 후 안전 규칙 적용에 따라 전체 후보가 제외되었습니다.</p>
            </div>
          )}

          <div className={styles.resultGrid}>
            {recommendations.map((item, index) => (
              <article className={styles.resultCard} key={item.ingredientId}>
                <span className={styles.rank}>{index + 1}</span>
                <h3>{item.label}</h3>
                <p>프록시 적합도 {(item.score * 100).toFixed(1)}%</p>
                <div className={styles.scoreTrack}><span style={{ width: `${Math.max(4, item.score * 100)}%` }} /></div>
              </article>
            ))}
          </div>
        </section>

        {inference && <InferenceWorkbench inference={inference} />}
        </div>

        <section ref={(node)=>{stageRefs.current[5]=node;}} className={`${styles.section} ${activeStage===5?styles.stageModalContent:styles.stageHidden}`}>
          <p className={styles.sectionLabel}>4. 추천 이후 기록 기능 시험</p>
          <h2 className={styles.sectionTitle}>추천 이후 기록과 상태 전이 평가</h2>
          <p className={styles.sectionBody}>저장 동의 범위에 따라 근거, 후속 일정, 자가보고 결과와 기기 데이터를 세션에 연결합니다. 중대한 이상사례 입력 시 추가 추천 차단과 약사 검토 전환을 평가합니다.</p>
          <section className={styles.rndReplayPanel} aria-labelledby="rnd-replay-title">
            <header>
              <div>
                <span>R&D 실행 세션</span>
                <h3 id="rnd-replay-title">저장 세션 재생 검증</h3>
              </div>
              <strong data-connected={rndSessions?.connected===true}>
                {rndSessions?.connected?"R&D 서버 연결":rndSessions?.availability==="UNAVAILABLE"?"R&D 서버 응답 없음":rndSessions?.availability==="DISABLED"?"R&D 서버 미연결":"조회 전"}
              </strong>
            </header>
            <p>저장 당시 입력과 모델·데이터·코드 버전이 같은지 먼저 확인한 뒤 추천 결과를 다시 계산합니다.</p>
            <div className={styles.rndReplayStats}>
              <div><span>저장 세션</span><strong>{rndSessions?.connected?`${rndSessions.totalSavedSessions}건`:"—"}</strong></div>
              <div><span>재생 가능</span><strong>{rndSessions?.connected?`${rndSessions.replayableSessions}건`:"—"}</strong></div>
              <div><span>재생 실행</span><strong>{rndSessions?.connected?`${rndSessions.replayRunCount}건`:"—"}</strong></div>
            </div>
            {rndSessions?.connected ? <>
              {rndSessions.recentSessions.some(item=>item.replayAvailable)?<label className={styles.rndSessionSelect}>
                <span>검증할 저장 세션</span>
                <select value={selectedRndExecutionId} onChange={event=>{setSelectedRndExecutionId(event.target.value);setRndReplay(null);}}>
                  {rndSessions.recentSessions.filter(item=>item.replayAvailable).map((item,index)=><option key={item.executionId} value={item.executionId}>{`${formatRndSessionTime(item.createdAt)} 저장 · ${item.lastReplayStatus?rndReplayLabel(item.lastReplayStatus):index===0?"최근 세션":"재생 기록 없음"}`}</option>)}
                </select>
              </label>:<div className={styles.rndReplayUnavailable}><strong>재생 가능한 저장 세션 없음</strong><p>입력 저장 동의를 포함한 추천 실행을 생성한 뒤 다시 조회하십시오.</p></div>}
              <div className={styles.rndReplayActions}>
                <button type="button" onClick={()=>execute("list_rnd_sessions")} disabled={busyAction!==null}>{busyAction==="list_rnd_sessions"?"조회 중…":"저장 세션 다시 조회"}</button>
                <button type="button" onClick={()=>execute("replay_rnd_session",{executionId:selectedRndExecutionId})} disabled={busyAction!==null||!selectedRndExecutionId}>{busyAction==="replay_rnd_session"?"재생 중…":"선택 세션 재생"}</button>
              </div>
            </>:<div className={styles.rndReplayUnavailable}>
              <strong>{rndSessions?.availability==="UNAVAILABLE"?"R&D 서버 응답을 받지 못했습니다.":"R&D 서버가 프로덕션 화면에 연결되지 않았습니다."}</strong>
              <p>{rndSessions?.availability==="UNAVAILABLE"?"잠시 후 저장 세션을 다시 조회하십시오.":"R&D 서버 주소와 내부 인증이 설정되면 저장 건수와 재생 결과를 확인할 수 있습니다."}</p>
              <button type="button" onClick={()=>execute("list_rnd_sessions")} disabled={busyAction!==null}>{busyAction==="list_rnd_sessions"?"조회 중…":"연결 상태 다시 확인"}</button>
            </div>}
            {rndSessions?.connected&&rndReplay?.connected&&rndReplay.executionId===selectedRndExecutionId&&<div className={styles.rndReplayResult} data-status={rndReplay.status}>
              <header><span>최근 재생 결과</span><strong>{rndReplayLabel(rndReplay.status)}</strong><small>{formatRndSessionTime(rndReplay.replayedAt)}</small></header>
              <div><span>입력 일치</span><strong>{rndReplay.inputMatch?"확인":"불일치"}</strong></div>
              <div><span>실행 버전 일치</span><strong>{rndReplay.versionMatch?"확인":"불일치"}</strong></div>
              <div><span>추천 결과 일치</span><strong>{rndReplay.outputMatch===null?"실행 안 함":rndReplay.outputMatch?"확인":"불일치"}</strong></div>
            </div>}
          </section>
          <AgentDecisionWorkbench ref={agentDecisionRef} />
          <div className={styles.consentGrid}>
            {CONSENTS.map(([scope, label]) => (
              <label key={scope} data-selected={consents.includes(scope)}>
                <input type="checkbox" checked={consents.includes(scope)} onChange={() => setConsents((current) => toggle(current, scope))} />
                <span><strong>{label}</strong><small>{consents.includes(scope) ? "저장 허용됨" : "선택하면 저장 가능"}</small></span>
              </label>
            ))}
          </div>
          <div className={styles.actionGrid}>
            <button onClick={() => execute("retrieve_evidence", { query: `${goal} 근거` })} disabled={busyAction !== null || terminalState}>{busyAction === "retrieve_evidence" ? "확인 중…" : "추천 근거 확인"}</button>
            <button onClick={() => execute("create_followup")} disabled={busyAction !== null || terminalState}>{busyAction === "create_followup" ? "생성 중…" : "2주 후 확인 일정 만들기"}</button>
            <button onClick={() => execute("ingest_pro")} disabled={busyAction !== null || terminalState}>{busyAction === "ingest_pro" ? "기록 중…" : "자가보고 결과 저장"}</button>
            <button onClick={() => execute("ingest_device", { source: "wearable" })} disabled={busyAction !== null || terminalState}>{busyAction === "ingest_device" ? "기록 중…" : "스마트워치 측정값 저장"}</button>
            <button className={styles.dangerButton} onClick={() => execute("log_adverse_event", { serious: true })} disabled={busyAction !== null || terminalState}>{busyAction === "log_adverse_event" ? "중단 처리 중…" : "중대한 이상사례 발생 처리"}</button>
            {terminalState && (
              <button className={styles.resetButton} onClick={resetLab} disabled={busyAction !== null}>새 시뮬레이션</button>
            )}
          </div>
          <div ref={actionFeedbackRef} className={styles.feedbackSlot}>
            {feedback && busyAction === null && trace.action !== "recommend" && (
              <div className={`${styles.feedback} ${styles[feedback.tone]}`} aria-live="polite">
                <strong>{feedback.title}</strong>
                <p>{feedback.detail}</p>
              </div>
            )}
          </div>
        </section>

        <div ref={(node)=>{stageRefs.current[6]=node;}} className={`${styles.stageAnchor} ${activeStage===6?styles.stageModalContent:styles.stageHidden}`}><ResearchEvidencePanel /></div>

        <details className={styles.trace}>
          <summary>연구용 실행 추적 보기</summary>
          <pre className={styles.output}>{JSON.stringify(trace, null, 2)}</pre>
        </details>

      </div>
      <div className={`${styles.evaluatorDock} ${activeStage>0?styles.evaluatorDockModal:""}`} aria-label="평가 단계 이동">
        <div><span>{activeStage + 1} / {EVALUATION_STAGES.length}</span><strong>{activeStageTitle}</strong><small aria-live="polite">{stageActivity}</small></div>
        <button type="button" onClick={previousStage} disabled={activeStage===0||busyAction!==null||proBusy}>이전</button>
        <button type="button" className={styles.helpButton} onClick={()=>setHelpOpen(true)}>자세히 설명</button>
        <button type="button" className={styles.dockNext} onClick={nextStage} disabled={activeStage===EVALUATION_STAGES.length-1||busyAction!==null||proBusy}>{busyAction!==null||proBusy?"실행 중…":"다음"}</button>
      </div>
      {helpOpen&&<aside className={styles.stageGuideBar} aria-labelledby="stage-help-title"><header><div><span>단계 {activeStage+1} 설명</span><h2 id="stage-help-title">{activeStageTitle}</h2></div><button type="button" aria-label="설명 닫기" onClick={()=>setHelpOpen(false)}>×</button></header><p>{activeHelp.purpose}</p><dl><div><dt>입력</dt><dd>{activeHelp.input}</dd></div><div><dt>계산</dt><dd>{activeHelp.process}</dd></div><div><dt>확인 항목</dt><dd>{activeHelp.output}</dd></div></dl></aside>}
    </main>
  );
}
