"use client";

import { NHIS_WORKFLOW_STEPS } from "../constants";
import { HEALTH_LINK_COPY } from "../copy";
import type { NhisDataRow, NhisListSummary } from "../types";
import { formatDataCell, mapFieldLabel, pickTableColumns, toJsonPreview } from "../utils";
import styles from "../HealthLinkClient.module.css";

export function SpinnerLabel({ loading, label }: { loading: boolean; label: string }) {
  return (
    <span className={styles.spinnerLabel}>
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      <span>{label}</span>
    </span>
  );
}

export function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaCard}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <section className={styles.metricCard}>
      <h3 className={styles.metricTitle}>{title}</h3>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricNote}>{note}</p>
    </section>
  );
}

export function RawJsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section className={styles.rawBlock}>
      <h4 className={styles.rawTitle}>{title}</h4>
      <pre className={styles.rawPre}>{toJsonPreview(value)}</pre>
    </section>
  );
}

export function StepStrip({
  activeStep,
  completedStep,
}: {
  activeStep: number;
  completedStep: number;
}) {
  return (
    <div className={styles.stepStrip}>
      {NHIS_WORKFLOW_STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const done = completedStep >= stepNumber;
        const current = !done && activeStep === stepNumber;
        const stateClass = done
          ? styles.stepDone
          : current
            ? styles.stepCurrent
            : styles.stepPending;

        return (
          <div key={step.id} className={`${styles.stepItem} ${stateClass}`}>
            <span className={styles.stepNumber}>{stepNumber}</span>
            <div className={styles.stepCopy}>
              <strong>{step.title}</strong>
              <span>{step.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DataTablePanel({
  title,
  summary,
  rows,
  emptyText,
  maxRows = 18,
}: {
  title: string;
  summary?: NhisListSummary;
  rows: NhisDataRow[];
  emptyText: string;
  maxRows?: number;
}) {
  const columns = pickTableColumns(rows, 8);
  const previewRows = rows.slice(0, maxRows);
  const hasRows = previewRows.length > 0 && columns.length > 0;

  return (
    <section className={styles.dataPanel}>
      <div className={styles.dataPanelHeader}>
        <h3 className={styles.dataPanelTitle}>{title}</h3>
        <span className={styles.dataPanelCount}>
          {summary?.totalCount ?? rows.length} {HEALTH_LINK_COPY.table.rowUnit}
        </span>
      </div>

      {!hasRows ? (
        <div className={styles.emptyHint}>{emptyText}</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col">
                      {mapFieldLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {columns.map((column) => (
                      <td key={`${rowIndex}-${column}`}>{formatDataCell(row[column])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > previewRows.length ? (
            <p className={styles.tableHint}>
              {HEALTH_LINK_COPY.table.previewHintPrefix} {previewRows.length}{" "}
              {HEALTH_LINK_COPY.table.previewHintMiddle} {rows.length}{" "}
              {HEALTH_LINK_COPY.table.previewHintSuffix}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
