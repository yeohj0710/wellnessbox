"use client";

import { useMemo, useRef, useState } from "react";
import ResearchOverview from "./ResearchOverview";
import BlindTestExplorer from "./BlindTestExplorer";
import ProStudySimulation from "./ProStudySimulation";
import AdvancedProfileFields, { DEFAULT_ADVANCED } from "./AdvancedProfileFields";
import InferenceWorkbench from "./InferenceWorkbench";
import ResearchEvidencePanel from "./ResearchEvidencePanel";
import type { InferenceExplanation } from "./research-types";
import styles from "./interim.module.css";

type JsonRecord = Record<string, unknown>;
type LabAction =
  | "initialize"
  | "recommend"
  | "retrieve_evidence"
  | "create_followup"
  | "ingest_pro"
  | "log_adverse_event"
  | "ingest_device";

type Candidate = { ingredientId: string; label: string; score: number };
type Safety = { decision: string; reasons: string[]; blockedIngredients: string[] };
type Feedback = { tone: "success" | "warning" | "error"; title: string; detail: string };

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

function toggle(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
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
  const [recommendationResult, setRecommendationResult] = useState<JsonRecord | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const resultRef = useRef<HTMLElement>(null);
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

  function describeResult(action: LabAction, result: JsonRecord): Feedback {
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
      setFeedback(describeResult(action, result));
      if (typeof result.state === "string") setState(result.state);
      if (typeof result.stateToken === "string") setStateToken(result.stateToken);
      requestAnimationFrame(() => {
        const target = action === "recommend" ? resultRef.current : actionFeedbackRef.current;
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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
    } finally {
      setBusyAction(null);
    }
  }

  function resetLab() {
    setState("NEW");
    setStateToken("");
    setRecommendationResult(null);
    setFeedback(null);
    setTrace({ 안내: "새 시험 세션이 초기화되었습니다." });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>TIPS 연구개발 성과 검증 시스템</p>
            <h1 className={styles.title}>개인 맞춤형 건강기능식품<br />추천 모델 검증</h1>
            <p className={styles.lead}>
              AI 생성 프록시 데이터로 학습한 추천 모델, 안전 규칙 엔진 및 폐쇄루프 Agent의
              성능과 실행 결과를 검증합니다.
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

        <ResearchOverview />

        <BlindTestExplorer />

        <ProStudySimulation />

        <section className={styles.section}>
          <p className={styles.sectionLabel}>1. 시험 입력</p>
          <h2 className={styles.sectionTitle}>시험 대상 프로필 및 조건 설정</h2>
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
        </section>

        <section ref={resultRef} className={`${styles.section} ${styles.softSection}`}>
          <p className={styles.sectionLabel}>2. 판정 결과</p>
          <h2 className={styles.sectionTitle}>추천 모델 및 안전 규칙 판정 결과</h2>
          {safety ? (
            <div className={safety.decision === "STOP_AND_ESCALATE" ? styles.stopBanner : styles.safetyBanner}>
              <strong>{safety.decision}</strong>
              <p>{safety.reasons.length ? safety.reasons.join(" ") : "입력 조건에서 차단 규칙이 확인되지 않았습니다."}</p>
            </div>
          ) : <p className={styles.empty}>실행 결과 없음</p>}

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

        <section className={styles.section}>
          <p className={styles.sectionLabel}>4. 폐쇄루프 Agent 시험</p>
          <h2 className={styles.sectionTitle}>후속 평가 및 상태 전이 검증</h2>
          <p className={styles.sectionBody}>동의 범위에 따라 후속 평가, PRO 및 웨어러블 기록을 처리합니다. 중대한 이상사례 입력 시 추천 절차를 중단하고 에스컬레이션 상태로 전환합니다.</p>
          <div className={styles.consentGrid}>
            {CONSENTS.map(([scope, label]) => (
              <label key={scope} data-selected={consents.includes(scope)}>
                <input type="checkbox" checked={consents.includes(scope)} onChange={() => setConsents((current) => toggle(current, scope))} />
                <span><strong>{label}</strong><small>{scope}</small></span>
              </label>
            ))}
          </div>
          <div className={styles.actionGrid}>
            <button onClick={() => execute("retrieve_evidence", { query: `${goal} 근거` })} disabled={busyAction !== null || terminalState}>{busyAction === "retrieve_evidence" ? "확인 중…" : "근거 상담"}</button>
            <button onClick={() => execute("create_followup")} disabled={busyAction !== null || terminalState}>{busyAction === "create_followup" ? "생성 중…" : "2주 후속 확인"}</button>
            <button onClick={() => execute("ingest_pro")} disabled={busyAction !== null || terminalState}>{busyAction === "ingest_pro" ? "기록 중…" : "PRO 기록"}</button>
            <button onClick={() => execute("ingest_device", { source: "wearable" })} disabled={busyAction !== null || terminalState}>{busyAction === "ingest_device" ? "기록 중…" : "웨어러블 기록"}</button>
            <button className={styles.dangerButton} onClick={() => execute("log_adverse_event", { serious: true })} disabled={busyAction !== null || terminalState}>{busyAction === "log_adverse_event" ? "중단 처리 중…" : "중대한 이상사례 시험"}</button>
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

        <ResearchEvidencePanel />

        <details className={styles.trace}>
          <summary>연구용 실행 추적 보기</summary>
          <pre className={styles.output}>{JSON.stringify(trace, null, 2)}</pre>
        </details>

      </div>
    </main>
  );
}
