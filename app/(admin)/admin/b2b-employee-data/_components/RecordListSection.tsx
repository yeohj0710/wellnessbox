"use client";

import styles from "@/components/b2b/B2bUx.module.css";
import type { DeleteRecordType } from "../_lib/client-types";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";
import { prettyJson } from "../_lib/client-utils";

export type RecordListRow = {
  id: string;
  metaText: string;
  recordType: DeleteRecordType;
  payload?: unknown;
};

function JsonPreview(props: { label: string; value: unknown }) {
  return (
    <details className={styles.optionalCard}>
      <summary>{props.label}</summary>
      <div className={styles.optionalBody}>
        <pre
          className={styles.mono}
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {prettyJson(props.value)}
        </pre>
      </div>
    </details>
  );
}

export default function RecordListSection(props: {
  title: string;
  rows: RecordListRow[];
  busy: boolean;
  onDeleteRecord: (recordType: DeleteRecordType, recordId: string) => void | Promise<void>;
}) {
  return (
    <details className={styles.optionalCard}>
      <summary>
        {props.title} ({props.rows.length})
      </summary>
      <div className={styles.optionalBody}>
        {props.rows.map((row) => (
          <div key={row.id} className={styles.optionalCard}>
            <div className={styles.actionRow}>
              <strong className={styles.mono}>{row.id}</strong>
              <span className={styles.inlineHint}>{row.metaText}</span>
              <button
                type="button"
                className={styles.buttonDanger}
                onClick={() => void props.onDeleteRecord(row.recordType, row.id)}
                disabled={props.busy}
              >
                {EMPLOYEE_DATA_COPY.recordList.deleteButton}
              </button>
            </div>
            {row.payload !== undefined ? (
              <JsonPreview label={EMPLOYEE_DATA_COPY.recordList.jsonPreview} value={row.payload} />
            ) : null}
          </div>
        ))}
        {props.rows.length === 0 ? (
          <p className={styles.noticeInfo}>{EMPLOYEE_DATA_COPY.recordList.empty}</p>
        ) : null}
      </div>
    </details>
  );
}
