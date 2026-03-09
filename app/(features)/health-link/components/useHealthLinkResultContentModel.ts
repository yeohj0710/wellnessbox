"use client";

import React from "react";
import { resolveMetricDisplayValue, type MedicationDigest } from "../utils";
import {
  buildMedicationAnalysisModel,
  buildMetricGroups,
  buildMetricTabs,
  normalizeCompactText,
  shouldHideMetricTone,
  type LatestCheckupRow,
  type MetricGroupId,
} from "./HealthLinkResultSection.helpers";

const METRIC_VISIBLE_COUNT = 8;

type UseHealthLinkResultContentModelInput = {
  latestCheckupRows: LatestCheckupRow[];
  medicationDigest: MedicationDigest;
};

export function useHealthLinkResultContentModel({
  latestCheckupRows,
  medicationDigest,
}: UseHealthLinkResultContentModelInput) {
  const sanitizedCheckupRows = React.useMemo(
    () =>
      latestCheckupRows.filter((row) => {
        const metric = typeof row.metric === "string" ? row.metric.trim() : "";
        if (!metric || shouldHideMetricTone(metric)) return false;
        return resolveMetricDisplayValue(row) !== null;
      }),
    [latestCheckupRows]
  );
  const hasCheckupRows = sanitizedCheckupRows.length > 0;
  const hasMedicationRows = medicationDigest.totalRows > 0;
  const showMedicationSection = hasMedicationRows || !hasCheckupRows;
  const medicationOnlyMode = !hasCheckupRows && hasMedicationRows;

  const medicationAnalysis = React.useMemo(
    () => buildMedicationAnalysisModel(medicationDigest),
    [medicationDigest]
  );

  const groupedRows = React.useMemo(
    () => buildMetricGroups(sanitizedCheckupRows),
    [sanitizedCheckupRows]
  );

  const metricTabs = React.useMemo(
    () => buildMetricTabs(groupedRows, sanitizedCheckupRows.length),
    [groupedRows, sanitizedCheckupRows.length]
  );

  const topMedicineLine = React.useMemo(
    () =>
      medicationDigest.topMedicines
        .slice(0, 3)
        .map((item) => `${item.label} ${item.count}건`)
        .join(", "),
    [medicationDigest]
  );

  const recentMedications = React.useMemo(
    () => medicationDigest.recentMedications.slice(0, 3),
    [medicationDigest]
  );

  const [activeGroup, setActiveGroup] = React.useState<MetricGroupId>("all");
  const [showAllMetrics, setShowAllMetrics] = React.useState(false);

  React.useEffect(() => {
    if (metricTabs.some((tab) => tab.id === activeGroup)) return;
    setActiveGroup("all");
  }, [activeGroup, metricTabs]);

  React.useEffect(() => {
    setShowAllMetrics(false);
  }, [activeGroup]);

  const visibleRows = React.useMemo(
    () => (activeGroup === "all" ? sanitizedCheckupRows : groupedRows[activeGroup]),
    [activeGroup, groupedRows, sanitizedCheckupRows]
  );

  const prioritizedRows = React.useMemo(
    () =>
      activeGroup === "all"
        ? [
            ...visibleRows.filter((row) => row.statusTone === "caution"),
            ...visibleRows.filter((row) => row.statusTone !== "caution"),
          ]
        : visibleRows,
    [activeGroup, visibleRows]
  );

  const metricRows = React.useMemo(
    () =>
      showAllMetrics
        ? prioritizedRows
        : prioritizedRows.slice(0, METRIC_VISIBLE_COUNT),
    [prioritizedRows, showAllMetrics]
  );

  const hiddenMetricCount = Math.max(
    prioritizedRows.length - metricRows.length,
    0
  );

  const latestMedicationDateLabel =
    normalizeCompactText(medicationAnalysis.latestMedication?.date) ??
    "날짜 정보 없음";
  const latestMedicationPurposeLabel = medicationAnalysis.primaryPurpose
    ? `복용 목적: ${medicationAnalysis.primaryPurpose}`
    : "복용 목적 정보가 없어 약품명 중심으로 안내해드려요.";

  const handleSelectGroup = React.useCallback((groupId: MetricGroupId) => {
    setActiveGroup(groupId);
  }, []);

  const handleExpand = React.useCallback(() => {
    setShowAllMetrics(true);
  }, []);

  const handleCollapse = React.useCallback(() => {
    setShowAllMetrics(false);
  }, []);

  return {
    checkupSectionModel: {
      hasCheckupRows,
      prioritizedRowsCount: prioritizedRows.length,
      metricTabs,
      activeGroupId: activeGroup,
      onSelectGroup: handleSelectGroup,
      metricRows,
      hiddenMetricCount,
      showAllMetrics,
      metricVisibleCount: METRIC_VISIBLE_COUNT,
      onExpand: handleExpand,
      onCollapse: handleCollapse,
    },
    medicationModel: {
      showMedicationSection,
      medicationOnlyMode,
      medicationAnalysis,
      latestMedicationDateLabel,
      latestMedicationPurposeLabel,
      topMedicineLine,
      recentMedications,
    },
  };
}
