"use client";

import { useEffect, useState } from "react";
import styles from "./interim.module.css";

type Props = {
  role: "admin" | "pharm";
};

export default function InterimRoleConsole({ role }: Props) {
  const [payload, setPayload] = useState<Record<string, unknown>>({ loading: true });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const path = role === "admin" ? "/api/admin/tips" : "/api/pharm/tips/ai-drafts";

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

  async function decide(
    draftId: string,
    reviewStatus: "approved" | "approved_with_edits" | "rejected",
  ) {
    setSubmitting(draftId);
    try {
      const response = await fetch(`/api/pharm/tips/ai-drafts/${draftId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_status: reviewStatus,
          ...(reviewStatus === "approved_with_edits"
            ? { edited_content: JSON.parse(editedContent) }
            : {}),
          ...(reviewStatus === "rejected" ? { rejection_reason: rejectionReason } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `request_${response.status}`);
      setPayload((current) => ({
        ...current,
        items: reviewItems.filter((item) => item.draft_id !== draftId),
        lastDecision: body,
      }));
      setEditedContent("");
      setRejectionReason("");
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
          {isAdmin ? "연구 운영 현황 및 성과지표" : "AI 초안 검토"}
        </h1>
        <p className={styles.lead}>
          {isAdmin
            ? "소스·모델·KPI·교체 gate를 한 화면에서 확인합니다."
            : "초안과 근거를 확인하고 건별로 승인, 수정 승인 또는 반려하세요."}
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
              <div key={String(item.draft_id)} className={styles.notice}>
                <strong>{String(item.record_type)}</strong> {String(item.draft_id)}
                <pre className={styles.output}>{JSON.stringify(item.content, null, 2)}</pre>
                <p>판단 근거: {JSON.stringify(item.rationale)}</p>
                <textarea
                  aria-label="수정한 초안 JSON"
                  placeholder="수정 승인할 때만 JSON을 입력하세요."
                  value={editedContent}
                  onChange={(event) => setEditedContent(event.target.value)}
                />
                <input
                  aria-label="반려 이유"
                  placeholder="반려할 때 이유를 입력하세요."
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                />
                <div style={{ marginTop: 12 }}>
                  <button
                    className={styles.button}
                    disabled={submitting === item.draft_id}
                    onClick={() => decide(String(item.draft_id), "approved")}
                  >
                    승인
                  </button>
                  <button
                    className={styles.button}
                    disabled={submitting === item.draft_id || !editedContent}
                    onClick={() => decide(String(item.draft_id), "approved_with_edits")}
                  >
                    수정 승인
                  </button>
                  <button
                    className={styles.button}
                    disabled={submitting === item.draft_id || !rejectionReason}
                    onClick={() => decide(String(item.draft_id), "rejected")}
                  >
                    반려
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
