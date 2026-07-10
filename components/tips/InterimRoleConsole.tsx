"use client";

import { useEffect, useState } from "react";
import styles from "./interim.module.css";

type Props = {
  role: "admin" | "pharm";
};

export default function InterimRoleConsole({ role }: Props) {
  const [payload, setPayload] = useState<Record<string, unknown>>({ loading: true });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const path = role === "admin" ? "/api/admin/tips" : "/api/pharm/tips/reviews";

  useEffect(() => {
    const controller = new AbortController();
    fetch(path, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? `request_${response.status}`);
        setPayload(body);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setPayload({ error: error.message });
        }
      });
    return () => controller.abort();
  }, [path]);

  const isAdmin = role === "admin";
  const reviewItems = Array.isArray(payload.items)
    ? (payload.items as Array<Record<string, unknown>>)
    : [];

  async function decide(reviewId: string) {
    setSubmitting(reviewId);
    try {
      const response = await fetch(`/api/pharm/tips/reviews/${reviewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "acknowledged_proxy_review" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `request_${response.status}`);
      setPayload((current) => ({
        ...current,
        items: reviewItems.filter((item) => item.review_id !== reviewId),
        lastDecision: body,
      }));
    } catch (error) {
      setPayload((current) => ({
        ...current,
        decisionError: error instanceof Error ? error.message : "unknown_error",
      }));
    } finally {
      setSubmitting(null);
    }
  }
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>{isAdmin ? "관리자 연구 현황" : "약사 검토함"}</p>
        <h1 className={styles.title}>
          {isAdmin ? "프록시와 실제 연구 상태를 나눠 봐요" : "시뮬레이션 검토 요청만 모았어요"}
        </h1>
        <p className={styles.lead}>
          {isAdmin
            ? "소스·모델·KPI·교체 gate를 한 화면에서 확인합니다."
            : "이 큐는 실제 조제·복약지도 기록이 아닙니다. 결정은 한 번만 제출됩니다."}
        </p>
        <span className={styles.badge}>PROXY_GOLD_SIMULATION</span>
        <section className={`${styles.card} ${styles.wide}`} style={{ marginTop: 48 }}>
          <h2>{isAdmin ? "운영 스냅샷" : "검토 대기 목록"}</h2>
          <p>
            {isAdmin
              ? "실제 연구 완료는 별도 상태로 유지됩니다."
              : "실제 약사 골드 라벨로 오인하지 않도록 simulation badge를 유지합니다."}
          </p>
          {!isAdmin &&
            reviewItems.map((item) => (
              <div key={String(item.review_id)} className={styles.notice}>
                <strong>{String(item.urgency ?? "ROUTINE")}</strong>{" "}
                {String(item.review_id)} · PROXY_GOLD_SIMULATION
                <div style={{ marginTop: 12 }}>
                  <button
                    className={styles.button}
                    disabled={submitting === item.review_id}
                    onClick={() => decide(String(item.review_id))}
                  >
                    검토 확인 제출
                  </button>
                </div>
              </div>
            ))}
          <pre className={styles.output} aria-live="polite">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
