"use client";

import type { NhisFetchFailure } from "../types";
import { mapTargetLabel } from "../utils";
import styles from "../HealthLinkClient.module.css";
import { toFriendlyFailureMessage } from "./HealthLinkResultSection.helpers";

type HealthLinkResultFailureNoticeProps = {
  failures: NhisFetchFailure[];
};

export function HealthLinkResultFailureNotice({
  failures,
}: HealthLinkResultFailureNoticeProps) {
  return (
    <>
      <div className={styles.noticeInfo} role="status">
        일부 항목은 아직 준비 중이에요. 핵심 결과는 먼저 보여드렸어요.
      </div>
      <details className={styles.statusDetails}>
        <summary>안내 자세히 보기</summary>
        <div className={styles.detailsBody}>
          <div className={styles.detailHint}>
            {failures.map((failure, index) => (
              <div key={`${failure.target}-${index}`}>
                {mapTargetLabel(failure.target)} -{" "}
                {toFriendlyFailureMessage(failure)}
              </div>
            ))}
          </div>
        </div>
      </details>
    </>
  );
}
