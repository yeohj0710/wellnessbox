import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { buildPublicSurveyQuestionList, type PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import { resolveAutoComputedSurveyState } from "@/app/survey/_lib/survey-page-auto-compute";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";

type SurveyPhase = "intro" | "survey" | "calculating" | "result";

export type EmployeeSurveyResponsePayload = {
  id: string;
  periodKey: string | null;
  selectedSections: string[];
  answersJson: unknown;
  submittedAt?: string | null;
  updatedAt: string;
};

type EmployeeSurveyGetResponse = {
  ok: boolean;
  periodKey?: string;
  response?: EmployeeSurveyResponsePayload | null;
};

type EmployeeSurveyPutResponse = {
  ok: boolean;
  response?: {
    id: string;
    periodKey: string | null;
    selectedSections: string[];
    submittedAt: string | null;
    updatedAt: string;
  };
};

type PersistSurveySnapshotInput = {
  answers: PublicSurveyAnswers;
  selectedSections: string[];
  finalize: boolean;
  periodKey?: string | null;
};

type UseSurveyRemoteSyncInput = {
  template: WellnessSurveyTemplate;
  maxSelectedSections: number;
  hydrated: boolean;
  authVerified: boolean;
  phase: SurveyPhase;
  answers: PublicSurveyAnswers;
  selectedSectionsCommitted: string[];
  surveyPeriodKey: string | null;
  surveySyncReady: boolean;
  setSurveyPeriodKey: Dispatch<SetStateAction<string | null>>;
  setSurveySyncReady: Dispatch<SetStateAction<boolean>>;
  applyRemoteSurveySnapshot: (input: {
    response: EmployeeSurveyResponsePayload;
    periodKey: string | null;
  }) => void;
  remoteSurveyBootstrappedRef: MutableRefObject<boolean>;
  restoredSnapshotUpdatedAtRef: MutableRefObject<number>;
  lastRemoteSavedSignatureRef: MutableRefObject<string>;
  saveDraftTimerRef: MutableRefObject<number | null>;
};

async function requestSurveyJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "request_failed");
  }
  return data;
}

export function useSurveyRemoteSync(input: UseSurveyRemoteSyncInput) {
  const {
    template,
    maxSelectedSections,
    hydrated,
    authVerified,
    phase,
    answers,
    selectedSectionsCommitted,
    surveyPeriodKey,
    surveySyncReady,
    setSurveyPeriodKey,
    setSurveySyncReady,
    applyRemoteSurveySnapshot,
    remoteSurveyBootstrappedRef,
    restoredSnapshotUpdatedAtRef,
    lastRemoteSavedSignatureRef,
    saveDraftTimerRef,
  } = input;

  const persistSurveySnapshot = useCallback(
    async (persistInput: PersistSurveySnapshotInput) => {
      const rawQuestionList = buildPublicSurveyQuestionList(
        template,
        persistInput.answers,
        persistInput.selectedSections,
        {
          deriveSelectedSections: false,
        }
      );
      const autoComputed = resolveAutoComputedSurveyState({
        answers: persistInput.answers,
        questionList: rawQuestionList,
        maxSelectedSections,
      });
      const payload = {
        periodKey: persistInput.periodKey ?? surveyPeriodKey ?? undefined,
        selectedSections: persistInput.selectedSections,
        answers: autoComputed.answers,
        finalize: persistInput.finalize,
      };
      const signature = JSON.stringify(payload);
      if (signature === lastRemoteSavedSignatureRef.current) return;

      const saved = await requestSurveyJson<EmployeeSurveyPutResponse>(
        "/api/b2b/employee/survey",
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
      if (saved.response?.periodKey) {
        setSurveyPeriodKey(saved.response.periodKey);
      }
      lastRemoteSavedSignatureRef.current = signature;
    },
    [
      lastRemoteSavedSignatureRef,
      maxSelectedSections,
      setSurveyPeriodKey,
      surveyPeriodKey,
      template,
    ]
  );

  useEffect(() => {
    if (!hydrated || !authVerified || remoteSurveyBootstrappedRef.current) return;
    remoteSurveyBootstrappedRef.current = true;

    requestSurveyJson<EmployeeSurveyGetResponse>("/api/b2b/employee/survey")
      .then((remote) => {
        if (remote.periodKey) setSurveyPeriodKey(remote.periodKey);
        if (!remote.response) return;
        const remoteUpdatedMs = new Date(remote.response.updatedAt).getTime();
        const localUpdatedMs = restoredSnapshotUpdatedAtRef.current;
        const hasLocalSnapshot = localUpdatedMs > 0;
        const hasLocalAnswers = Object.keys(answers).length > 0;
        const shouldApplyRemote =
          (!hasLocalAnswers && !hasLocalSnapshot) ||
          (Number.isFinite(remoteUpdatedMs) && remoteUpdatedMs > localUpdatedMs);
        if (!shouldApplyRemote) return;
        applyRemoteSurveySnapshot({
          response: remote.response,
          periodKey: remote.response.periodKey ?? remote.periodKey ?? null,
        });
      })
      .catch(() => null)
      .finally(() => {
        setSurveySyncReady(true);
      });
  }, [
    answers,
    applyRemoteSurveySnapshot,
    authVerified,
    hydrated,
    remoteSurveyBootstrappedRef,
    restoredSnapshotUpdatedAtRef,
    setSurveyPeriodKey,
    setSurveySyncReady,
  ]);

  useEffect(() => {
    if (!hydrated || !authVerified || !surveySyncReady) return;
    if (phase !== "survey" && phase !== "result") return;
    if (saveDraftTimerRef.current != null) window.clearTimeout(saveDraftTimerRef.current);
    saveDraftTimerRef.current = window.setTimeout(() => {
      void persistSurveySnapshot({
        answers,
        selectedSections: selectedSectionsCommitted,
        finalize: phase === "result",
        periodKey: surveyPeriodKey,
      }).catch(() => null);
    }, 700);
    return () => {
      if (saveDraftTimerRef.current != null) {
        window.clearTimeout(saveDraftTimerRef.current);
        saveDraftTimerRef.current = null;
      }
    };
  }, [
    answers,
    authVerified,
    hydrated,
    persistSurveySnapshot,
    phase,
    saveDraftTimerRef,
    selectedSectionsCommitted,
    surveyPeriodKey,
    surveySyncReady,
  ]);

  return {
    persistSurveySnapshot,
  };
}
