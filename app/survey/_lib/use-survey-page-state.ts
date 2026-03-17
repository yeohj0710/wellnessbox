"use client";

import { useRef, useState } from "react";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";
import type { SurveyPhase } from "./survey-page-persistence";

type SurveyAuthBusyState = "idle" | "session" | "init" | "sign" | "sync";

export function useSurveyPageState() {
  const [phase, setPhase] = useState<SurveyPhase>("intro");
  const [identity, setIdentity] = useState<IdentityInput>({
    name: "",
    birthDate: "",
    phone: "",
  });
  const [authVerified, setAuthVerified] = useState(false);
  const [identityEditable, setIdentityEditable] = useState(true);
  const [authPendingSign, setAuthPendingSign] = useState(false);
  const [authBusy, setAuthBusy] = useState<SurveyAuthBusyState>("idle");
  const [authErrorText, setAuthErrorText] = useState<string | null>(null);
  const [authNoticeText, setAuthNoticeText] = useState<string | null>(null);
  const [surveyPeriodKey, setSurveyPeriodKey] = useState<string | null>(null);
  const [surveySyncReady, setSurveySyncReady] = useState(false);
  const [answers, setAnswers] = useState<PublicSurveyAnswers>({});
  const [selectedSectionsCommitted, setSelectedSectionsCommitted] = useState<
    string[]
  >([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [focusedQuestionBySection, setFocusedQuestionBySection] = useState<
    Record<string, string>
  >({});
  const [confirmedQuestionKeys, setConfirmedQuestionKeys] = useState<string[]>(
    []
  );
  const [completedSectionKeys, setCompletedSectionKeys] = useState<string[]>(
    []
  );
  const [errorText, setErrorText] = useState<string | null>(null);
  const [errorQuestionKey, setErrorQuestionKey] = useState<string | null>(null);
  const [isSectionTransitioning, setIsSectionTransitioning] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [result, setResult] = useState<WellnessComputedResult | null>(null);
  const [hasCompletedSubmission, setHasCompletedSubmission] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [calcPercent, setCalcPercent] = useState(8);
  const [calcMessageIndex, setCalcMessageIndex] = useState(0);

  return {
    phase,
    setPhase,
    identity,
    setIdentity,
    authVerified,
    setAuthVerified,
    identityEditable,
    setIdentityEditable,
    authPendingSign,
    setAuthPendingSign,
    authBusy,
    setAuthBusy,
    authErrorText,
    setAuthErrorText,
    authNoticeText,
    setAuthNoticeText,
    surveyPeriodKey,
    setSurveyPeriodKey,
    surveySyncReady,
    setSurveySyncReady,
    answers,
    setAnswers,
    selectedSectionsCommitted,
    setSelectedSectionsCommitted,
    currentSectionIndex,
    setCurrentSectionIndex,
    focusedQuestionBySection,
    setFocusedQuestionBySection,
    confirmedQuestionKeys,
    setConfirmedQuestionKeys,
    completedSectionKeys,
    setCompletedSectionKeys,
    errorText,
    setErrorText,
    errorQuestionKey,
    setErrorQuestionKey,
    isSectionTransitioning,
    setIsSectionTransitioning,
    isRenewalModalOpen,
    setIsRenewalModalOpen,
    isResetConfirmModalOpen,
    setIsResetConfirmModalOpen,
    result,
    setResult,
    hasCompletedSubmission,
    setHasCompletedSubmission,
    hydrated,
    setHydrated,
    calcPercent,
    setCalcPercent,
    calcMessageIndex,
    setCalcMessageIndex,
  };
}

export function useSurveyPageRefs() {
  const restoredRef = useRef(false);
  const authBootstrappedRef = useRef(false);
  const restoredSnapshotUpdatedAtRef = useRef(0);
  const remoteSurveyBootstrappedRef = useRef(false);
  const lastRemoteSavedSignatureRef = useRef("");
  const renewalHoldTimerRef = useRef<number | null>(null);
  const renewalBypassTriggeredRef = useRef(false);
  const calcTickerRef = useRef<number | null>(null);
  const calcTimeoutRef = useRef<number | null>(null);
  const saveDraftTimerRef = useRef<number | null>(null);
  const lastVisitedSectionIndexRef = useRef(0);

  return {
    restoredRef,
    authBootstrappedRef,
    restoredSnapshotUpdatedAtRef,
    remoteSurveyBootstrappedRef,
    lastRemoteSavedSignatureRef,
    renewalHoldTimerRef,
    renewalBypassTriggeredRef,
    calcTickerRef,
    calcTimeoutRef,
    saveDraftTimerRef,
    lastVisitedSectionIndexRef,
  };
}
