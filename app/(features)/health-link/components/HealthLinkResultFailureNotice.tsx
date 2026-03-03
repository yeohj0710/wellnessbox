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
    <details className={styles.statusDetails}>
      <summary>{"\uc77c\ubd80 \ud56d\ubaa9 \uc548\ub0b4 \ubcf4\uae30"}</summary>
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
  );
}
