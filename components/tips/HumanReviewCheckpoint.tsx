"use client";

import styles from "./interim.module.css";

export type HumanReviewDecision = "APPROVED" | "REVISION_REQUIRED";

export type HumanReviewRecord = {
  stage: number;
  stageTitle: string;
  reviewerRole: string;
  reviewerCode: string;
  decision: HumanReviewDecision;
  rationale: string;
  reviewedAt: string;
  sessionState: string;
};

type Props = {
  role: string;
  reviewerCode: string;
  stageTitle: string;
  revisionRequired: boolean;
  rationale: string;
  onRevisionChange: (value: boolean) => void;
  onRationaleChange: (value: string) => void;
};

export default function HumanReviewCheckpoint(props: Props) {
  return (
    <aside className={styles.humanReviewCheckpoint} aria-label="사람 승인 대기">
      <div>
        <span>사람 승인 필수</span>
        <strong>{props.role}</strong>
        <small>{props.reviewerCode} · {props.stageTitle}</small>
      </div>
      <label className={styles.revisionToggle}>
        <input
          type="checkbox"
          checked={props.revisionRequired}
          onChange={(event) => props.onRevisionChange(event.target.checked)}
        />
        <span>수정 필요</span>
      </label>
      {props.revisionRequired && (
        <label className={styles.revisionReason}>
          <span>보류 사유</span>
          <textarea
            value={props.rationale}
            onChange={(event) => props.onRationaleChange(event.target.value)}
            placeholder="수정하거나 보완할 내용을 입력하십시오."
          />
        </label>
      )}
      <p>계산과 근거 정리는 자동화되지만, 이 단계의 결정은 지정 승인자가 직접 확정해야 합니다.</p>
    </aside>
  );
}
