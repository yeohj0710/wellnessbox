"use client";

import React from "react";
import type { NhisAiSummary, NhisFetchFailure } from "../types";
import {
  hasNhisSessionExpiredFailure,
  type LatestCheckupMeta,
  type MedicationDigest,
} from "../utils";
import { HEALTH_LINK_COPY } from "../copy";
import {
  isSkippableFailure,
  type LatestCheckupRow,
} from "./HealthLinkResultSection.helpers";

type UseHealthLinkResultSectionModelInput = {
  fetchLoading: boolean;
  fetchFailures: NhisFetchFailure[];
  hasFetchResult: boolean;
  latestCheckupRows: LatestCheckupRow[];
  medicationDigest: MedicationDigest;
  aiSummary: NhisAiSummary | null;
};

export function useHealthLinkResultSectionModel({
  fetchLoading,
  fetchFailures,
  hasFetchResult,
  latestCheckupRows,
  medicationDigest,
  aiSummary,
}: UseHealthLinkResultSectionModelInput) {
  const hasCheckupRows = latestCheckupRows.length > 0;
  const hasMedicationRows = medicationDigest.totalRows > 0;
  const sessionExpiredFailure = hasNhisSessionExpiredFailure(fetchFailures);
  const sessionExpiredBlocking = sessionExpiredFailure && !hasFetchResult;

  const visibleFailures = React.useMemo(
    () =>
      fetchFailures.filter(
        (failure) =>
          !isSkippableFailure(failure, {
            hasAnyResult: hasFetchResult,
            hasCheckupRows,
            hasMedicationRows,
          })
      ),
    [fetchFailures, hasCheckupRows, hasFetchResult, hasMedicationRows]
  );
  const showFailureNotice =
    visibleFailures.length > 0 && !sessionExpiredBlocking;

  const [fetchLoadingElapsedSec, setFetchLoadingElapsedSec] = React.useState(0);

  React.useEffect(() => {
    if (!fetchLoading) {
      setFetchLoadingElapsedSec(0);
      return;
    }
    setFetchLoadingElapsedSec(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setFetchLoadingElapsedSec(elapsed);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [fetchLoading]);

  const loadingProgressPercent = Math.min(
    92,
    fetchLoadingElapsedSec < 10
      ? 20 + fetchLoadingElapsedSec * 5
      : fetchLoadingElapsedSec < 25
        ? 70 + (fetchLoadingElapsedSec - 10)
        : 86 + Math.floor((fetchLoadingElapsedSec - 25) / 6)
  );
  const loadingStageMessage =
    fetchLoadingElapsedSec < 8
      ? HEALTH_LINK_COPY.result.loadingStageInit
      : fetchLoadingElapsedSec < 20
        ? HEALTH_LINK_COPY.result.loadingStageFetch
        : HEALTH_LINK_COPY.result.loadingStageSlow;
  const loadingElapsedLabel = `${fetchLoadingElapsedSec}${HEALTH_LINK_COPY.result.loadingElapsedUnit}`;

  return {
    hasCheckupRows,
    hasMedicationRows,
    sessionExpiredBlocking,
    visibleFailures,
    showFailureNotice,
    loadingElapsedLabel,
    loadingStageMessage,
    loadingProgressPercent,
    aiSummary,
  };
}
