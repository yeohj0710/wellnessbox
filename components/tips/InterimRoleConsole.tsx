"use client";

import { useEffect, useState } from "react";
import styles from "./interim.module.css";

type Props = { role: "admin" | "pharm" };
type ReviewItem = Record<string, unknown>;

const OPERATIONS_URL = "http://127.0.0.1:8767/";

export default function InterimRoleConsole({ role }: Props) {
  const [payload, setPayload] = useState<Record<string, unknown>>({ loading: true });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewerName, setReviewerName] = useState("권혁찬");
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
        if (error instanceof Error && error.name !== "AbortError") setPayload({ error: error.message });
      });
    return () => controller.abort();
  }, [path]);

  const isAdmin = role === "admin";
  const reviewItems = Array.isArray(payload.items) ? (payload.items as ReviewItem[]) : [];
  const currentItem = reviewItems[0];
  const currentDraftId = currentItem ? String(currentItem.draft_id) : "";
  const isLoading = payload.loading === true;
  const loadError = typeof payload.error === "string" ? payload.error : null;
  const decisionError = typeof payload.decisionError === "string" ? payload.decisionError : null;

  async function decide(reviewStatus: "approved" | "approved_with_edits" | "rejected") {
    if (!currentDraftId) return;
    setSubmitting(currentDraftId);
    setPayload((current) => ({ ...current, decisionError: undefined }));
    try {
      const response = await fetch(`/api/pharm/tips/ai-drafts/${currentDraftId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_status: reviewStatus,
          reviewer_name: reviewerName.trim(),
          ...(reviewStatus === "approved_with_edits" ? { edited_content: JSON.parse(editedContent) } : {}),
          ...(reviewStatus === "rejected" ? { rejection_reason: rejectionReason.trim() } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `request_${response.status}`);
      setPayload((current) => ({
        ...current,
        items: reviewItems.filter((item) => String(item.draft_id) !== currentDraftId),
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

  if (isAdmin) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>관리자 연구 현황</p>
          <h1 className={styles.title}>연구 운영 현황과 성과 지표</h1>
          <p className={styles.lead}>테스트, 모델, 성과 지표와 교체 조건을 한 화면에서 확인합니다.</p>
          <span className={styles.badge}>PROXY_GOLD_SIMULATION</span>
          <section className={`${styles.card} ${styles.wide}`} style={{ marginTop: 48 }}>
            <h2>운영 데이터</h2>
            <pre className={styles.output} aria-live="polite">{JSON.stringify(payload, null, 2)}</pre>
          </section>
        </div>
      </main>
    );
  }

  const pendingCount = reviewItems.length;
  const isSubmitting = submitting === currentDraftId;

  return (
    <main className={`${styles.page} ${styles.pharmPage}`}>
      <div className={styles.pharmShell}>
        <p className={styles.eyebrow}>약사 검토</p>
        <h1 className={styles.pharmTitle}>AI 초안을 확인하고 승인하세요</h1>
        <p className={styles.lead}>현재 초안 한 건만 확인하면 됩니다. 내용이 맞으면 화면 아래 파란 버튼을 누르세요.</p>

        <section className={styles.reviewProgress} aria-label="검토 순서">
          <span data-active={Boolean(currentItem)}>1. 초안 확인</span>
          <span>2. 아래 승인 버튼 누르기</span>
          <span>3. 운영 화면으로 돌아가기</span>
        </section>

        {isLoading && <p className={styles.empty} aria-live="polite">검토할 초안을 불러오고 있습니다.</p>}
        {loadError && (
          <div className={`${styles.feedback} ${styles.error}`} role="alert">
            <strong>검토할 초안을 불러오지 못했습니다.</strong>
            <p>운영 화면으로 돌아갔다가 약사 검토 화면을 다시 여세요.</p>
          </div>
        )}
        {decisionError && (
          <div className={`${styles.feedback} ${styles.error}`} role="alert">
            <strong>검토 결과를 저장하지 못했습니다.</strong>
            <p>{decisionError}</p>
          </div>
        )}

        {!isLoading && !loadError && currentItem && (
          <article className={styles.reviewCard}>
            <header>
              <div>
                <span>현재 검토 · 대기 {pendingCount}건</span>
                <h2>{String(currentItem.record_type ?? "AI 추천 초안")}</h2>
                <p>{currentDraftId}</p>
              </div>
              <label className={styles.reviewerField}>
                검토자
                <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} />
              </label>
            </header>

            <section className={styles.reviewSummary}>
              <h3>초안 내용</h3>
              <pre>{JSON.stringify(currentItem.content, null, 2)}</pre>
            </section>

            <details className={styles.reviewDetails}>
              <summary>판단 근거와 원본 데이터 보기</summary>
              <p>판단 근거</p>
              <pre>{JSON.stringify(currentItem.rationale, null, 2)}</pre>
            </details>

            <details className={styles.reviewDetails}>
              <summary>내용 수정 또는 반려</summary>
              <label>
                수정한 초안 JSON
                <textarea value={editedContent} onChange={(event) => setEditedContent(event.target.value)} placeholder="수정 승인할 때만 JSON을 입력하세요." />
              </label>
              <button disabled={isSubmitting || !reviewerName.trim() || !editedContent.trim()} onClick={() => decide("approved_with_edits")}>수정한 내용으로 승인</button>
              <label>
                반려 이유
                <input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="반려 이유를 입력하세요." />
              </label>
              <button className={styles.rejectButton} disabled={isSubmitting || !reviewerName.trim() || !rejectionReason.trim()} onClick={() => decide("rejected")}>초안 반려</button>
            </details>
          </article>
        )}

        {!isLoading && !loadError && !currentItem && (
          <div className={styles.emptyState} aria-live="polite">
            <strong>검토할 AI 초안이 없습니다.</strong>
            <p>현재 대기 건수는 0건입니다. 운영 화면에서 다음 단계로 이동하세요.</p>
          </div>
        )}
      </div>

      <div className={styles.reviewDock}>
        <div>
          <span>{currentItem ? `대기 ${pendingCount}건` : "검토 완료"}</span>
          <strong>{currentItem ? "초안이 맞으면 승인하세요" : "운영 화면에서 계속하세요"}</strong>
        </div>
        {currentItem ? (
          <button disabled={isSubmitting || !reviewerName.trim()} onClick={() => decide("approved")}>
            {isSubmitting ? "저장 중…" : "이 초안 승인"}
          </button>
        ) : (
          <a href={OPERATIONS_URL}>운영 화면으로 돌아가기</a>
        )}
      </div>
    </main>
  );
}
