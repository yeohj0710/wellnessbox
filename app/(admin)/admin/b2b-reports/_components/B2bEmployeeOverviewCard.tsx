import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeDetail, LatestReport } from "../_lib/client-types";
import { formatDateTime, formatRelativeTime } from "../_lib/client-utils";

type B2bEmployeeOverviewCardProps = {
  detail: EmployeeDetail;
  latestReport: LatestReport | null;
  selectedPeriodKey: string;
  periodOptions: string[];
  reportDisplayPeriodKey: string;
  busy: boolean;
  onPeriodChange: (periodKey: string) => void;
  onReportDisplayPeriodChange: (value: string) => void;
  onSaveReportDisplayPeriod: () => void;
  onExportPdf: () => void;
  onExportPptx: () => void;
  onRegenerateReport: () => void;
  onRecomputeAnalysis: (generateAiEvaluation: boolean) => void;
};

export default function B2bEmployeeOverviewCard({
  detail,
  latestReport,
  selectedPeriodKey,
  periodOptions,
  reportDisplayPeriodKey,
  busy,
  onPeriodChange,
  onReportDisplayPeriodChange,
  onSaveReportDisplayPeriod,
  onExportPdf,
  onExportPptx,
  onRegenerateReport,
  onRecomputeAnalysis,
}: B2bEmployeeOverviewCardProps) {
  return (
    <section className={styles.sectionCard}>
      <h2 className={styles.sectionTitle}>
        {detail.name} ({detail.birthDate})
      </h2>
      <p className={styles.sectionDescription}>
        최근 연동: {formatRelativeTime(detail.lastSyncedAt || latestReport?.updatedAt)}
      </p>
      <div className={styles.actionRow}>
        <select
          className={styles.select}
          value={selectedPeriodKey}
          disabled={busy || periodOptions.length === 0}
          onChange={(event) => onPeriodChange(event.target.value)}
        >
          {periodOptions.length === 0 ? (
            <option value="">기간 없음</option>
          ) : (
            periodOptions.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))
          )}
        </select>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={busy || !latestReport?.id}
          className={styles.buttonPrimary}
        >
          {busy ? "PDF 생성 중..." : "PDF 다운로드"}
        </button>
        <button
          type="button"
          onClick={onExportPptx}
          disabled={busy || !latestReport?.id}
          className={styles.buttonSecondary}
        >
          {busy ? "PPTX 생성 중..." : "PPTX 다운로드"}
        </button>
      </div>
      <details className={styles.optionalCard}>
        <summary>고급 작업</summary>
        <div className={styles.optionalBody}>
          <div className={styles.optionalCard}>
            <p className={styles.optionalText}>
              레포트 표기 연월 (배부월): 웹/PDF/PPTX 상단 표기에 동일 반영됩니다.
            </p>
            <div className={styles.actionRow}>
              <input
                type="month"
                className={styles.input}
                value={reportDisplayPeriodKey}
                onChange={(event) => onReportDisplayPeriodChange(event.target.value)}
                maxLength={7}
                disabled={busy || !latestReport?.id}
              />
              <button
                type="button"
                onClick={onSaveReportDisplayPeriod}
                disabled={busy || !latestReport?.id || reportDisplayPeriodKey.trim().length === 0}
                className={styles.buttonSecondary}
              >
                {busy ? "반영 중..." : "연월 반영"}
              </button>
            </div>
            <p className={styles.inlineHint}>
              조회용 기간 선택과 별개로 표기 연월만 수정합니다.
            </p>
          </div>
          <div className={styles.optionalCard}>
            <p className={styles.optionalText}>
              최근 연동 시각: {formatDateTime(detail.lastSyncedAt)}
            </p>
            <p className={styles.optionalText}>
              레포트 생성 시각:{" "}
              {formatDateTime(
                latestReport?.payload?.meta?.generatedAt || latestReport?.updatedAt
              )}
            </p>
            <p className={styles.optionalText}>
              레포트 갱신 시각: {formatDateTime(latestReport?.updatedAt)}
            </p>
          </div>
          <div className={styles.actionRow}>
            <button
              type="button"
              onClick={onRegenerateReport}
              disabled={busy}
              className={styles.buttonGhost}
            >
              {busy ? "재생성 중..." : "레포트 재생성"}
            </button>
            <button
              type="button"
              onClick={() => onRecomputeAnalysis(false)}
              disabled={busy}
              className={styles.buttonGhost}
            >
              {busy ? "재계산 중..." : "분석 재계산"}
            </button>
            <button
              type="button"
              onClick={() => onRecomputeAnalysis(true)}
              disabled={busy}
              className={styles.buttonGhost}
            >
              {busy ? "재생성 중..." : "AI 재생성"}
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
