"use client";

import { useMemo, useState } from "react";
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

const GOALS = [
  ["sleep_quality", "수면의 질"],
  ["stress_management", "스트레스 관리"],
  ["energy", "활력"],
  ["bone_health", "뼈 건강"],
  ["immune_support", "면역 건강"],
  ["bowel_regular", "배변 활동"],
] as const;

const CONDITIONS = [
  ["chronic_kidney_disease", "만성 신장질환"],
  ["chronic_liver_disease", "만성 간질환"],
  ["type_2_diabetes", "제2형 당뇨"],
  ["hypertension", "고혈압"],
  ["hemochromatosis", "철 과부하 질환"],
] as const;

const MEDICATIONS = [
  ["warfarin", "와파린"],
  ["metformin", "메트포르민"],
  ["levothyroxine", "레보티록신"],
  ["statin", "스타틴"],
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
        ? "비공개 연구실 로그인이 필요해요. /test-login?redirect=/tips 에서 접속해 주세요."
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
  const [pregnant, setPregnant] = useState(false);
  const [fishAllergy, setFishAllergy] = useState(false);
  const [redFlag, setRedFlag] = useState(false);
  const [consents, setConsents] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<LabAction | null>(null);
  const [state, setState] = useState("NEW");
  const [stateToken, setStateToken] = useState("");
  const [trace, setTrace] = useState<JsonRecord>({
    안내: "프로필을 확인하고 추천 시뮬레이션을 시작해 주세요.",
  });

  const profile = useMemo(
    () => ({
      age,
      sex: "unknown",
      pregnant,
      goals: [goal],
      conditions,
      medicationClasses: medications,
      allergies: fishAllergy ? ["fish"] : [],
      currentSupplements: [],
      riskFlags: redFlag ? ["red_flag_chest_pain"] : [],
    }),
    [age, conditions, fishAllergy, goal, medications, pregnant, redFlag]
  );

  const recommendations = Array.isArray(trace.recommendations)
    ? (trace.recommendations as Candidate[])
    : [];
  const safety =
    trace.safety && typeof trace.safety === "object" ? (trace.safety as Safety) : null;

  async function execute(action: LabAction, payload: JsonRecord = {}) {
    setBusyAction(action);
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
      if (typeof result.state === "string") setState(result.state);
      if (typeof result.stateToken === "string") setStateToken(result.stateToken);
    } catch (error) {
      setTrace({ error: error instanceof Error ? error.message : "unknown_error" });
    } finally {
      setBusyAction(null);
    }
  }

  function resetLab() {
    setState("NEW");
    setStateToken("");
    setTrace({ 안내: "새 시뮬레이션을 시작할 수 있어요." });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>비공개 TIPS 연구실</p>
            <h1 className={styles.title}>추천이 아니라,<br />판단 과정을 시험해요</h1>
            <p className={styles.lead}>
              학습된 프록시 모델과 결정적 안전엔진, 폐쇄루프 Agent를 웹에서 바로
              실행합니다. 별도 Python 서버 없이 WellnessBox 서버 안에서 동작해요.
            </p>
          </div>
          <div className={styles.statusPanel}>
            <span className={styles.badge}>PROXY_GOLD_SIMULATION</span>
            <dl className={styles.statusList}>
              <div><dt>Agent 상태</dt><dd>{state}</dd></div>
              <div><dt>모델</dt><dd>학습 스냅샷 연결</dd></div>
              <div><dt>실제 연구</dt><dd>미완료</dd></div>
            </dl>
          </div>
        </header>

        <section className={styles.section}>
          <p className={styles.sectionLabel}>1. 프로필</p>
          <h2 className={styles.sectionTitle}>조건이 달라지면 결과도 달라져요</h2>
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

          <div className={styles.optionGroup}>
            <strong>건강 상태</strong>
            <div className={styles.chips}>
              {CONDITIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
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
                  className={medications.includes(value) ? styles.chipActive : styles.chip}
                  onClick={() => setMedications((current) => toggle(current, value))}
                >{label}</button>
              ))}
            </div>
          </div>

          <div className={styles.checkGrid}>
            <label><input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} /> 임신 중</label>
            <label><input type="checkbox" checked={fishAllergy} onChange={(e) => setFishAllergy(e.target.checked)} /> 어류 알레르기</label>
            <label className={styles.dangerCheck}><input type="checkbox" checked={redFlag} onChange={(e) => setRedFlag(e.target.checked)} /> 흉통 등 응급 위험 신호 시험</label>
          </div>

          <button className={styles.primaryButton} disabled={busyAction !== null} onClick={() => execute("recommend")}>
            {busyAction === "recommend" ? "판단 중…" : "안전 검사 후 추천 보기"}
          </button>
        </section>

        <section className={`${styles.section} ${styles.softSection}`}>
          <p className={styles.sectionLabel}>2. 판단 결과</p>
          <h2 className={styles.sectionTitle}>모델 점수보다 안전 조건이 먼저예요</h2>
          {safety ? (
            <div className={safety.decision === "STOP_AND_ESCALATE" ? styles.stopBanner : styles.safetyBanner}>
              <strong>{safety.decision}</strong>
              <p>{safety.reasons.length ? safety.reasons.join(" ") : "현재 입력에서 결정적 차단 조건이 발견되지 않았어요."}</p>
            </div>
          ) : <p className={styles.empty}>아직 실행 결과가 없어요.</p>}

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

        <section className={styles.section}>
          <p className={styles.sectionLabel}>3. 폐쇄루프 Agent</p>
          <h2 className={styles.sectionTitle}>추천 뒤의 변화까지 같은 흐름에서 봐요</h2>
          <p className={styles.sectionBody}>기록 동의가 있는 동작만 실행됩니다. 중대한 이상사례는 추천 흐름을 즉시 멈추고 에스컬레이션 상태로 바꿉니다.</p>
          <div className={styles.consentGrid}>
            {CONSENTS.map(([scope, label]) => (
              <label key={scope}>
                <input type="checkbox" checked={consents.includes(scope)} onChange={() => setConsents((current) => toggle(current, scope))} />
                <span><strong>{label}</strong><small>{scope}</small></span>
              </label>
            ))}
          </div>
          <div className={styles.actionGrid}>
            <button onClick={() => execute("retrieve_evidence", { query: `${goal} 근거` })} disabled={busyAction !== null}>근거 상담</button>
            <button onClick={() => execute("create_followup")} disabled={busyAction !== null}>2주 후속 확인</button>
            <button onClick={() => execute("ingest_pro")} disabled={busyAction !== null}>PRO 기록</button>
            <button onClick={() => execute("ingest_device", { source: "wearable" })} disabled={busyAction !== null}>웨어러블 기록</button>
            <button className={styles.dangerButton} onClick={() => execute("log_adverse_event", { serious: true })} disabled={busyAction !== null}>중대한 이상사례 시험</button>
            {(state === "ESCALATED" || state === "STOPPED" || state === "ADVERSE_EVENT") && (
              <button onClick={resetLab} disabled={busyAction !== null}>새 시뮬레이션</button>
            )}
          </div>
        </section>

        <details className={styles.trace}>
          <summary>연구용 실행 추적 보기</summary>
          <pre className={styles.output}>{JSON.stringify(trace, null, 2)}</pre>
        </details>

        <div className={styles.notice}>
          이 화면은 메뉴·검색엔진에 노출하지 않는 연구용 경로입니다. 실제 의료 판단을 대신하지 않으며,
          흉통·호흡곤란·심한 출혈 등 응급 증상은 즉시 119 또는 응급실을 이용하세요.
        </div>
      </div>
    </main>
  );
}
