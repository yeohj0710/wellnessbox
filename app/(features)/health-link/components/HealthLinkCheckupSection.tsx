"use client";

import { HEALTH_LINK_COPY } from "../copy";
import type { LatestCheckupMeta } from "../utils";
import styles from "../HealthLinkClient.module.css";
import {
  renderMetricCards,
  type LatestCheckupRow,
  type MetricGroupId,
  type MetricTab,
} from "./HealthLinkResultSection.helpers";

type HealthLinkCheckupSectionProps = {
  latestCheckupMeta: LatestCheckupMeta;
  prioritizedRowsCount: number;
  metricTabs: MetricTab[];
  activeGroupId: MetricGroupId;
  onSelectGroup: (groupId: MetricGroupId) => void;
  metricRows: LatestCheckupRow[];
  hiddenMetricCount: number;
  showAllMetrics: boolean;
  metricVisibleCount: number;
  onExpand: () => void;
  onCollapse: () => void;
};

export function HealthLinkCheckupSection({
  latestCheckupMeta,
  prioritizedRowsCount,
  metricTabs,
  activeGroupId,
  onSelectGroup,
  metricRows,
  hiddenMetricCount,
  showAllMetrics,
  metricVisibleCount,
  onExpand,
  onCollapse,
}: HealthLinkCheckupSectionProps) {
  return (
    <section className={styles.compactSection}>
      <div className={styles.compactHeader}>
        <h3>검진 항목</h3>
        <span>
          {latestCheckupMeta.checkupDate
            ? `최근 검사 ${latestCheckupMeta.checkupDate}`
            : `${prioritizedRowsCount.toLocaleString("ko-KR")}개 표시`}
        </span>
      </div>
      <p className={styles.sectionSubText}>{HEALTH_LINK_COPY.result.metricLead}</p>
      <div className={styles.metricFilterWrap}>
        {metricTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeGroupId === tab.id}
            className={`${styles.metricFilterChip} ${
              activeGroupId === tab.id ? styles.metricFilterChipActive : ""
            }`}
            onClick={() => onSelectGroup(tab.id)}
          >
            {tab.label} {tab.count}
          </button>
        ))}
      </div>
      {metricRows.length > 0 ? (
        <div className={styles.metricBoard}>{renderMetricCards(metricRows)}</div>
      ) : (
        <div className={styles.emptyHint}>표시할 검진 항목이 없습니다.</div>
      )}
      {hiddenMetricCount > 0 ? (
        <button
          type="button"
          className={styles.metricExpandButton}
          onClick={onExpand}
        >
          {`${HEALTH_LINK_COPY.result.metricExpandPrefix}${hiddenMetricCount.toLocaleString(
            "ko-KR"
          )}${HEALTH_LINK_COPY.result.metricExpandSuffix}`}
        </button>
      ) : null}
      {showAllMetrics && prioritizedRowsCount > metricVisibleCount ? (
        <button
          type="button"
          className={styles.metricCollapseButton}
          onClick={onCollapse}
        >
          {HEALTH_LINK_COPY.result.metricCollapseLabel}
        </button>
      ) : null}
    </section>
  );
}
