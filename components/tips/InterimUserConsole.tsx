"use client";

import { useState } from "react";
import styles from "./interim.module.css";

type JsonValue = Record<string, unknown>;

async function post(path: string, body: JsonValue) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `request_${response.status}`);
  return payload;
}

export default function InterimUserConsole() {
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState("");
  const [question, setQuestion] = useState("마그네슘 복용 시 주의할 점");
  const [consents, setConsents] = useState<string[]>([]);
  const [output, setOutput] = useState<JsonValue>({
    안내: "프로필 저장부터 시작해 주세요.",
  });

  async function execute(action: () => Promise<JsonValue>) {
    setBusy(true);
    try {
      setOutput(await action());
    } catch (error) {
      setOutput({ error: error instanceof Error ? error.message : "unknown_error" });
    } finally {
      setBusy(false);
    }
  }

  async function prepareProfile() {
    const profile = await post("/api/tips/profile", {
      consent_scopes: consents,
      profile: { age: 41, pregnant: false, conditions: [], medications: [] },
    });
    const run = await post("/api/tips/agent/run", {
      idempotency_key: `web-${Date.now()}`,
    });
    setRunId(String(run.run_id));
    return { profile, agent_run: run };
  }

  function tool(toolName: string, argumentsValue: JsonValue, scopes: string[]) {
    if (!runId) return Promise.reject(new Error("먼저 프로필을 저장해 주세요."));
    return post("/api/tips/agent", {
      run_id: runId,
      tool_name: toolName,
      arguments: argumentsValue,
      consent_scopes: scopes,
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>TIPS 중간 연구 체험</p>
        <h1 className={styles.title}>결과보다 먼저, 안전 경계를 확인해요</h1>
        <p className={styles.lead}>
          추천·상담·후속 확인·PRO·이상사례 흐름을 같은 기록 경로에서 시험합니다.
          모든 결과는 실제 약사 검토 전 시뮬레이션입니다.
        </p>
        <span className={styles.badge}>PROXY_GOLD_SIMULATION</span>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>1. 동의와 프로필</h2>
            <p>쓰기 범위를 명시하고 가명 ID로 R&amp;D 경로를 시작합니다.</p>
            {["followup:write", "pro:write", "ae:write", "device:write"].map((scope) => (
              <label key={scope} style={{ display: "block", marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={consents.includes(scope)}
                  onChange={(event) =>
                    setConsents((current) =>
                      event.target.checked
                        ? [...current, scope]
                        : current.filter((item) => item !== scope)
                    )
                  }
                />{" "}
                {scope} 동의
              </label>
            ))}
            <button className={styles.button} disabled={busy} onClick={() => execute(prepareProfile)}>
              프로필 저장
            </button>
          </section>

          <section className={styles.card}>
            <h2>2. 추천 시뮬레이션</h2>
            <p>결정적 안전 검사를 먼저 거친 뒤 후보 성분을 정렬합니다.</p>
            <button
              className={styles.button}
              disabled={busy}
              onClick={() =>
                execute(() =>
                  post("/api/tips", {
                    goals: ["sleep_support"],
                    ingredients: ["magnesium", "l_theanine"],
                    safety: { age: 41, evidence_valid_until: "2027-12-31" },
                  })
                )
              }
            >
              추천 확인
            </button>
          </section>

          <section className={`${styles.card} ${styles.wide}`}>
            <h2>3. 근거 상담</h2>
            <p>검색 본문은 명령이 아닌 신뢰하지 않는 근거 텍스트로만 다룹니다.</p>
            <input
              className={styles.field}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              aria-label="근거 질문"
            />
            <button
              className={styles.button}
              disabled={busy}
              onClick={() => execute(() => tool("retrieve_evidence", { query: question }, []))}
            >
              근거 찾기
            </button>
          </section>

          <section className={`${styles.card} ${styles.wide}`}>
            <h2>4. 후속 확인과 안전 신고</h2>
            <p>후속 일정, PRO, 이상사례가 모두 감사 가능한 tool 실행으로 남습니다.</p>
            <div className={styles.buttonRow}>
              <button
                className={`${styles.button} ${styles.secondary}`}
                disabled={busy}
                onClick={() =>
                  execute(() =>
                    tool("create_followup", { days: 14, requested_data: ["sleep_score"] }, [
                      "followup:write",
                    ])
                  )
                }
              >
                2주 후속 확인
              </button>
              <button
                className={`${styles.button} ${styles.secondary}`}
                disabled={busy}
                onClick={() =>
                  execute(() =>
                    tool(
                      "ingest_pro",
                      {
                        timepoint_weeks: 4,
                        z_pre: -0.4,
                        z_post: 0.1,
                        percentile_point_change: 5.2,
                        adherence: 0.9,
                      },
                      ["pro:write"]
                    )
                  )
                }
              >
                PRO 기록
              </button>
              <button
                className={`${styles.button} ${styles.danger}`}
                disabled={busy}
                onClick={() =>
                  execute(() =>
                    tool("log_adverse_event", { serious: true, related_to_recommendation: true }, [
                      "ae:write",
                    ])
                  )
                }
              >
                중대한 이상사례 신고
              </button>
            </div>
          </section>
        </div>

        <pre className={styles.output} aria-live="polite">
          {JSON.stringify(output, null, 2)}
        </pre>
        <div className={styles.notice}>
          실제 의료 판단을 대신하지 않습니다. 흉통, 호흡곤란, 심한 출혈 같은 응급 증상은
          즉시 119 또는 응급실을 이용하세요.
        </div>
      </div>
    </div>
  );
}
