"use client";

import styles from "@/components/b2b/B2bUx.module.css";
import { prettyJson } from "../_lib/client-utils";
import type { DeleteRecordType } from "../_lib/client-types";

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
                삭제
              </button>
            </div>
            {row.payload !== undefined ? <JsonPreview label="JSON 보기" value={row.payload} /> : null}
          </div>
        ))}
        {props.rows.length === 0 ? <p className={styles.noticeInfo}>데이터가 없습니다.</p> : null}
      </div>
    </details>
  );
}
