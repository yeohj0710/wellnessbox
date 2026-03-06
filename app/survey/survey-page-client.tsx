"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPublicSurveyQuestionList,
  buildWellnessAnalysisInputFromSurvey,
  isSurveyQuestionAnswered,
  normalizeSurveyAnswersByTemplate,
  pruneSurveyAnswersByVisibility,
  resolveSurveySelectionState,
  resolveGroupFieldValues,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  toAnswerRecord,
  toInputValue,
  toMultiOtherTextByValue,
  toMultiValues,
  toggleSurveyMultiValue,
  updateSurveyMultiOtherText,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import { computeWellnessResult, type WellnessComputedResult } from "@/lib/wellness/analysis";
import { loadWellnessTemplateForB2b } from "@/lib/wellness/data-loader";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import {
  normalizeDigits,
  isValidIdentityInput,
  resolveAutoComputedSurveyState,
  toIdentityPayload,
} from "@/app/survey/_lib/survey-page-auto-compute";
import {
  buildOutOfRangeWarning,
  buildSurveySections,
  getFocusedIndex,
  isNoneLikeOption,
  isOptionalHintLikeText,
  isOptionalSelectionQuestion,
  isQuestionEffectivelyRequired,
  resolveOptionLayout,
  resolveNumberRangeForGroupField,
  resolveNumberRangeForQuestion,
  resolveProgressMessage,
  resolveQuestionNumericWarning,
  toDisplayQuestionText,
  type SurveySectionGroup,
} from "@/app/survey/_lib/survey-page-helpers";
import { CALCULATING_MESSAGES, TEXT } from "@/app/survey/_lib/survey-page-copy";
import { useSurveySectionNavigation } from "@/app/survey/_lib/use-survey-section-navigation";
import { useSurveyAuthActions } from "@/app/survey/_lib/use-survey-auth-actions";
import {
  useSurveyRemoteSync,
  type EmployeeSurveyResponsePayload,
} from "@/app/survey/_lib/use-survey-remote-sync";
import { useSurveyLifecycleActions } from "@/app/survey/_lib/use-survey-lifecycle-actions";
import {
  deleteEmployeeSession,
  fetchEmployeeSession,
  upsertEmployeeSession,
} from "@/app/(features)/employee-report/_lib/api";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";
import {
  clearStoredIdentity,
  readStoredIdentityWithSource,
  saveStoredIdentity,
} from "@/app/(features)/employee-report/_lib/client-utils";
import { emitAuthSyncEvent, subscribeAuthSyncEvent } from "@/lib/client/auth-sync";
import { getLoginStatus } from "@/lib/useLoginStatus";
import SurveyCalculatingPanel from "./_components/SurveyCalculatingPanel";
import SurveyIntroPanel from "./_components/SurveyIntroPanel";
import SurveyResultPanel from "./_components/SurveyResultPanel";
import SurveyRenewalModal from "./_components/SurveyRenewalModal";
import SurveyResetConfirmModal from "./_components/SurveyResetConfirmModal";
import SurveySectionPanel from "./_components/SurveySectionPanel";
import SurveySubmittedPanel from "./_components/SurveySubmittedPanel";

const STORAGE_KEY = "b2b-public-survey-state.v4";
const BLOCK_SURVEY_START_TEMPORARILY = false;



type SurveyPhase = "intro" | "survey" | "calculating" | "result";
type PersistedSurveyPhase = Exclude<SurveyPhase, "calculating">;

type PersistedSurveyState = {
  phase: PersistedSurveyPhase;
  currentSectionIndex: number;
  focusedQuestionBySection?: Record<string, string>;
  confirmedQuestionKeys?: string[];
  completedSectionKeys?: string[];
  updatedAt?: string;
  periodKey?: string;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
};

export default function SurveyPageClient() {
  const router = useRouter();
  const template = useMemo(() => loadWellnessTemplateForB2b(), []);
  const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const sectionTitleMap = useMemo(
    () => new Map(template.sectionCatalog.map((item) => [item.key, item.displayName || item.title])),
    [template]
  );

  const [phase, setPhase] = useState<SurveyPhase>("intro");
  const [identity, setIdentity] = useState<IdentityInput>({ name: "", birthDate: "", phone: "" });
  const [authVerified, setAuthVerified] = useState(false);
  const [identityEditable, setIdentityEditable] = useState(true);
  const [authPendingSign, setAuthPendingSign] = useState(false);
  const [authBusy, setAuthBusy] = useState<"idle" | "session" | "init" | "sign" | "sync">("idle");
  const [authErrorText, setAuthErrorText] = useState<string | null>(null);
  const [authNoticeText, setAuthNoticeText] = useState<string | null>(null);
  const [surveyPeriodKey, setSurveyPeriodKey] = useState<string | null>(null);
  const [surveySyncReady, setSurveySyncReady] = useState(false);
  const [answers, setAnswers] = useState<PublicSurveyAnswers>({});
  const [selectedSectionsCommitted, setSelectedSectionsCommitted] = useState<string[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [focusedQuestionBySection, setFocusedQuestionBySection] = useState<Record<string, string>>({});
  const [confirmedQuestionKeys, setConfirmedQuestionKeys] = useState<string[]>([]);
  const [completedSectionKeys, setCompletedSectionKeys] = useState<string[]>([]);
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
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

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

  const handleOpenEmployeeReport = useCallback(() => {
    const query = surveyPeriodKey ? `?period=${encodeURIComponent(surveyPeriodKey)}` : "";
    router.push(`/employee-report${query}`);
  }, [router, surveyPeriodKey]);

  const pruneAnswersByVisibility = useCallback(
    (inputAnswers: PublicSurveyAnswers, selectedSections: string[]) => {
      return pruneSurveyAnswersByVisibility(template, inputAnswers, selectedSections);
    },
    [template]
  );

  const buildVisibleQuestionList = useCallback(
    (inputAnswers: PublicSurveyAnswers, selectedSections: string[]) => {
      const rawList = buildPublicSurveyQuestionList(template, inputAnswers, selectedSections, {
        deriveSelectedSections: false,
      });
      const autoComputed = resolveAutoComputedSurveyState({
        answers: inputAnswers,
        questionList: rawList,
        maxSelectedSections,
      });
      return rawList.filter((item) => !autoComputed.hiddenQuestionKeys.has(item.question.key));
    },
    [maxSelectedSections, template]
  );

  const hasSameSectionSelection = useCallback((left: string[], right: string[]) => {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }, []);

  const questionListRaw = useMemo(
    () =>
      buildPublicSurveyQuestionList(template, answers, selectedSectionsCommitted, {
        deriveSelectedSections: false,
      }),
    [answers, selectedSectionsCommitted, template]
  );
  const autoComputedState = useMemo(
    () =>
      resolveAutoComputedSurveyState({
        answers,
        questionList: questionListRaw,
        maxSelectedSections,
      }),
    [answers, maxSelectedSections, questionListRaw]
  );
  const questionList = useMemo(
    () =>
      questionListRaw.filter(
        (item) => !autoComputedState.hiddenQuestionKeys.has(item.question.key)
      ),
    [autoComputedState, questionListRaw]
  );

  useEffect(() => {
    if (questionListRaw.length === 0) return;
    setAnswers((prev) =>
      resolveAutoComputedSurveyState({
        answers: prev,
        questionList: questionListRaw,
        maxSelectedSections,
      }).answers
    );
  }, [maxSelectedSections, questionListRaw]);

  const surveySections = useMemo(
    () =>
      buildSurveySections(
        questionList,
        selectedSectionsCommitted,
        sectionTitleMap,
        TEXT.commonSection
      ),
    [questionList, selectedSectionsCommitted, sectionTitleMap]
  );
  const visibleSectionKeySet = useMemo(
    () => new Set(surveySections.map((section) => section.key)),
    [surveySections]
  );
  const completedSectionKeySet = useMemo(
    () => new Set(completedSectionKeys.filter((key) => visibleSectionKeySet.has(key))),
    [completedSectionKeys, visibleSectionKeySet]
  );
  const visibleQuestionKeySet = useMemo(
    () => new Set(questionList.map((item) => item.question.key)),
    [questionList]
  );
  const { currentSection, focusedQuestionKey, scrollToQuestion, moveToSection, setQuestionRef } =
    useSurveySectionNavigation({
      surveySections,
      answers,
      currentSectionIndex,
      focusedQuestionBySection,
      isSectionTransitioning,
      setCurrentSectionIndex,
      setFocusedQuestionBySection,
      setErrorText,
      setErrorQuestionKey,
    });
  const progressTotalCount = questionList.length;
  const progressDoneCount = useMemo(() => {
    if (questionList.length === 0) return 0;
    let done = 0;
    for (const section of surveySections) {
      const requiredQuestions = section.questions.filter((item) =>
        isQuestionEffectivelyRequired(item.question)
      );
      const hasAllRequiredAnswers = requiredQuestions.every((item) =>
        isSurveyQuestionAnswered(item.question, answers[item.question.key])
      );
      const canTreatSectionAsCompleted =
        completedSectionKeySet.has(section.key) && hasAllRequiredAnswers;

      if (canTreatSectionAsCompleted) {
        done += section.questions.length;
        continue;
      }
      for (const item of section.questions) {
        if (isSurveyQuestionAnswered(item.question, answers[item.question.key])) {
          done += 1;
        }
      }
    }
    return Math.min(done, questionList.length);
  }, [answers, completedSectionKeySet, questionList.length, surveySections]);
  const progressDisplayDoneCount = useMemo(
    () => Math.min(progressDoneCount, progressTotalCount),
    [progressDoneCount, progressTotalCount]
  );
  const progressPercent = useMemo(() => {
    if (progressTotalCount === 0) return 0;
    return Math.round((progressDisplayDoneCount / progressTotalCount) * 100);
  }, [progressDisplayDoneCount, progressTotalCount]);
  const identityPayload = useMemo(() => toIdentityPayload(identity), [identity]);
  const validIdentity = useMemo(() => isValidIdentityInput(identityPayload), [identityPayload]);
  const identityLocked = authVerified && !identityEditable;
  const authInitializing = !hydrated || authBusy === "session";

  const refreshLoginStatus = useCallback(async () => {
    try {
      const status = await getLoginStatus();
      setIsAdminLoggedIn(status.isAdminLoggedIn);
    } catch {
      setIsAdminLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    setCompletedSectionKeys((prev) => prev.filter((key) => visibleSectionKeySet.has(key)));
  }, [visibleSectionKeySet]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshLoginStatus();
  }, [hydrated, refreshLoginStatus]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase !== "result") return;
    void refreshLoginStatus();
  }, [hydrated, phase, refreshLoginStatus]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase !== "result") return;
    if (isAdminLoggedIn) return;
    if (typeof window === "undefined") return;

    window.dispatchEvent(new Event("wb:topbar-close-drawer"));
    window.dispatchEvent(new Event("wb:close-command-palette"));
    window.dispatchEvent(new Event("wb:chat-close-dock"));
    window.dispatchEvent(new Event("closeCart"));
    sessionStorage.removeItem("wbGlobalCartOpen");
    localStorage.removeItem("openCart");
  }, [hydrated, isAdminLoggedIn, phase]);

  useEffect(() => {
    if (surveySections.length === 0) {
      lastVisitedSectionIndexRef.current = 0;
      return;
    }
    const clampedCurrent = Math.max(0, Math.min(currentSectionIndex, surveySections.length - 1));
    const clampedPrevious = Math.max(
      0,
      Math.min(lastVisitedSectionIndexRef.current, surveySections.length - 1)
    );
    if (clampedCurrent > clampedPrevious) {
      const sectionKeysToComplete = surveySections
        .slice(clampedPrevious, clampedCurrent)
        .map((section) => section.key);
      if (sectionKeysToComplete.length > 0) {
        setCompletedSectionKeys((prev) => {
          const next = new Set(prev);
          for (const key of sectionKeysToComplete) next.add(key);
          return [...next];
        });
      }
    }
    lastVisitedSectionIndexRef.current = clampedCurrent;
  }, [currentSectionIndex, surveySections]);

  useEffect(() => {
    return () => {
      if (renewalHoldTimerRef.current != null) window.clearTimeout(renewalHoldTimerRef.current);
      if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
      if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);
      if (saveDraftTimerRef.current != null) window.clearTimeout(saveDraftTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedSurveyState> & { currentIndex?: number };
      const parsedUpdatedAtMs =
        typeof parsed.updatedAt === "string" ? new Date(parsed.updatedAt).getTime() : 0;
      restoredSnapshotUpdatedAtRef.current = Number.isFinite(parsedUpdatedAtMs)
        ? parsedUpdatedAtMs
        : 0;
      const loadedAnswers =
        parsed.answers && typeof parsed.answers === "object"
          ? normalizeSurveyAnswersByTemplate(template, parsed.answers as PublicSurveyAnswers)
          : {};
      const seededSections = Array.isArray(parsed.selectedSections)
        ? parsed.selectedSections.filter((value): value is string => typeof value === "string")
        : [];
      const nextSelectionState = resolveSurveySelectionState({
        template,
        answers: loadedAnswers,
        selectedSections: seededSections,
      });
      const nextSelectedSections = nextSelectionState.selectedSections;
      const prunedAnswers = nextSelectionState.answers;
      const restoredList = buildVisibleQuestionList(prunedAnswers, nextSelectedSections);
      const restoredKeySet = new Set(restoredList.map((item) => item.question.key));
      const restoredSections = buildSurveySections(
        restoredList,
        nextSelectedSections,
        sectionTitleMap,
        TEXT.commonSection
      );

      setAnswers(prunedAnswers);
      setSelectedSectionsCommitted(nextSelectedSections);
      setSurveyPeriodKey(typeof parsed.periodKey === "string" ? parsed.periodKey : null);
      const requested =
        typeof parsed.currentSectionIndex === "number"
          ? parsed.currentSectionIndex
          : typeof parsed.currentIndex === "number"
            ? parsed.currentIndex
            : 0;
      const clamped =
        restoredSections.length > 0 ? Math.max(0, Math.min(requested, restoredSections.length - 1)) : 0;
      setCurrentSectionIndex(clamped);
      lastVisitedSectionIndexRef.current = clamped;

      if (parsed.focusedQuestionBySection && typeof parsed.focusedQuestionBySection === "object") {
        const map = parsed.focusedQuestionBySection as Record<string, string>;
        const sanitized: Record<string, string> = {};
        for (const section of restoredSections) {
          const key = map[section.key];
          if (!key) continue;
          if (!section.questions.some((q) => q.question.key === key)) continue;
          sanitized[section.key] = key;
        }
        setFocusedQuestionBySection(sanitized);
      }

      if (Array.isArray(parsed.confirmedQuestionKeys)) {
        setConfirmedQuestionKeys(
          parsed.confirmedQuestionKeys
            .filter((key): key is string => typeof key === "string")
            .filter((key) => restoredKeySet.has(key))
        );
      }
      if (Array.isArray(parsed.completedSectionKeys)) {
        const restoredSectionKeySet = new Set(restoredSections.map((section) => section.key));
        setCompletedSectionKeys(
          parsed.completedSectionKeys
            .filter((key): key is string => typeof key === "string")
            .filter((key) => restoredSectionKeySet.has(key))
        );
      }
      setHasCompletedSubmission(parsed.phase === "result");
      if (parsed.phase === "result") {
        const input = buildWellnessAnalysisInputFromSurvey({
          template,
          answers: prunedAnswers,
          selectedSections: nextSelectedSections,
        });
        setResult(computeWellnessResult(input));
        setPhase("result");
      } else if (parsed.phase === "survey") {
        setPhase("survey");
      }
    } catch {
      setPhase("intro");
    } finally {
      setHydrated(true);
    }
  }, [buildVisibleQuestionList, pruneAnswersByVisibility, sectionTitleMap, template]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "intro" && Object.keys(answers).length === 0 && selectedSectionsCommitted.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const snapshot: PersistedSurveyState = {
      phase: phase === "calculating" ? "survey" : phase,
      currentSectionIndex,
      focusedQuestionBySection,
      confirmedQuestionKeys,
      completedSectionKeys,
      updatedAt: new Date().toISOString(),
      periodKey: surveyPeriodKey ?? undefined,
      answers,
      selectedSections: selectedSectionsCommitted,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    answers,
    completedSectionKeys,
    confirmedQuestionKeys,
    currentSectionIndex,
    focusedQuestionBySection,
    hydrated,
    phase,
    selectedSectionsCommitted,
    surveyPeriodKey,
  ]);

  function saveSurveyIdentity(input: IdentityInput) {
    saveStoredIdentity(toIdentityPayload(input));
  }

  function applyRemoteSurveySnapshot(input: {
    response: EmployeeSurveyResponsePayload;
    periodKey: string | null;
  }) {
    const normalizedAnswers = normalizeSurveyAnswersByTemplate(
      template,
      (input.response.answersJson ?? {}) as PublicSurveyAnswers
    );
    const nextSelectionState = resolveSurveySelectionState({
      template,
      answers: normalizedAnswers,
      selectedSections: input.response.selectedSections ?? [],
    });
    const derivedSelectedSections = nextSelectionState.selectedSections;
    const prunedAnswers = nextSelectionState.answers;
    const nextQuestionList = buildVisibleQuestionList(prunedAnswers, derivedSelectedSections);
    const nextSections = buildSurveySections(
      nextQuestionList,
      derivedSelectedSections,
      sectionTitleMap,
      TEXT.commonSection
    );
    let nextSectionIndex = 0;
    for (let idx = 0; idx < nextSections.length; idx += 1) {
      const hasUnanswered = nextSections[idx].questions.some(
        (item) => !isSurveyQuestionAnswered(item.question, prunedAnswers[item.question.key])
      );
      if (hasUnanswered) {
        nextSectionIndex = idx;
        break;
      }
      if (idx === nextSections.length - 1) nextSectionIndex = idx;
    }
    const targetSection = nextSections[nextSectionIndex] ?? null;
    const targetQuestionIndex = getFocusedIndex(targetSection, undefined, prunedAnswers);
    const targetQuestionKey =
      targetSection && targetQuestionIndex >= 0
        ? targetSection.questions[targetQuestionIndex].question.key
        : "";
    const answeredQuestionKeys = nextQuestionList
      .filter((item) => isSurveyQuestionAnswered(item.question, prunedAnswers[item.question.key]))
      .map((item) => item.question.key);
    const completedKeysFromSnapshot = input.response.submittedAt
      ? nextSections.map((section) => section.key)
      : nextSections.slice(0, nextSectionIndex).map((section) => section.key);

    setAnswers(prunedAnswers);
    setSelectedSectionsCommitted(derivedSelectedSections);
    setCurrentSectionIndex(nextSectionIndex);
    setFocusedQuestionBySection(
      targetSection && targetQuestionKey ? { [targetSection.key]: targetQuestionKey } : {}
    );
    setHasCompletedSubmission(Boolean(input.response.submittedAt));
    setConfirmedQuestionKeys(answeredQuestionKeys);
    setCompletedSectionKeys(completedKeysFromSnapshot);
    lastVisitedSectionIndexRef.current = nextSectionIndex;
    setSurveyPeriodKey(input.periodKey);
    if (input.response.submittedAt) {
      setResult(
        computeWellnessResult(
          buildWellnessAnalysisInputFromSurvey({
            template,
            answers: prunedAnswers,
            selectedSections: derivedSelectedSections,
          })
        )
      );
    }
    const updatedMs = new Date(input.response.updatedAt).getTime();
    restoredSnapshotUpdatedAtRef.current = Number.isFinite(updatedMs) ? updatedMs : Date.now();
  }

  const { persistSurveySnapshot } = useSurveyRemoteSync({
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
  });

  useEffect(() => {
    if (!hydrated || authBootstrappedRef.current) return;
    authBootstrappedRef.current = true;
    let bootIdentity: IdentityInput | null = null;

    const stored = readStoredIdentityWithSource().identity;
    if (stored) {
      bootIdentity = {
        name: stored.name ?? "",
        birthDate: normalizeDigits(stored.birthDate ?? ""),
        phone: normalizeDigits(stored.phone ?? ""),
      };
      setIdentity(bootIdentity);
    }

    setAuthBusy("session");
    fetchEmployeeSession()
      .then(async (session) => {
        if (session.authenticated) {
          if (session.employee) {
            const sessionIdentity = {
              name: session.employee.name,
              birthDate: normalizeDigits(session.employee.birthDate),
              phone: normalizeDigits(session.employee.phoneNormalized),
            };
            setIdentity(sessionIdentity);
            saveSurveyIdentity(sessionIdentity);
          }
          setAuthVerified(true);
          setIdentityEditable(false);
          setAuthPendingSign(false);
          setAuthNoticeText(TEXT.noticeAuthBySession);
          setAuthErrorText(null);
          return;
        }

        const storedPayload = toIdentityPayload(bootIdentity ?? { name: "", birthDate: "", phone: "" });
        if (!isValidIdentityInput(storedPayload)) return;
        const loginResult = await upsertEmployeeSession(storedPayload).catch(() => null);
        if (!loginResult?.found) return;
        saveSurveyIdentity(storedPayload);
        emitAuthSyncEvent({
          scope: "b2b-employee-session",
          reason: "survey-session-restored",
        });
        setAuthVerified(true);
        setIdentityEditable(false);
        setAuthPendingSign(false);
        setAuthNoticeText(TEXT.noticeAuthByStoredIdentity);
        setAuthErrorText(null);
      })
      .catch(() => null)
      .finally(() => {
        setAuthBusy("idle");
      });
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const unsubscribe = subscribeAuthSyncEvent(
      () => {
        void refreshLoginStatus();
        if (authBusy !== "idle") return;
        setAuthBusy("session");
        fetchEmployeeSession()
          .then((session) => {
            if (!session.authenticated) {
              setAuthVerified(false);
              setIdentityEditable(true);
              setAuthPendingSign(false);
              setAuthErrorText(null);
              setAuthNoticeText(null);
              return;
            }

            if (session.employee) {
              const sessionIdentity = {
                name: session.employee.name,
                birthDate: normalizeDigits(session.employee.birthDate),
                phone: normalizeDigits(session.employee.phoneNormalized),
              };
              setIdentity(sessionIdentity);
              saveSurveyIdentity(sessionIdentity);
            }
            setAuthVerified(true);
            setIdentityEditable(false);
            setAuthPendingSign(false);
            setAuthErrorText(null);
          })
          .catch(() => null)
          .finally(() => {
            setAuthBusy("idle");
          });
      },
      { scopes: ["b2b-employee-session", "user-session"] }
    );
    return unsubscribe;
  }, [authBusy, hydrated, refreshLoginStatus]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "survey" && !authVerified) setPhase("intro");
  }, [authVerified, hydrated, phase]);

  function applyAnswer(question: WellnessSurveyQuestionForTemplate, rawValue: unknown) {
    setAnswers((prev) => {
      const sanitized = sanitizeSurveyAnswerValue(question, rawValue, maxSelectedSections);
      const nextState = resolveSurveySelectionState({
        template,
        answers: { ...prev, [question.key]: sanitized },
        selectedSections: selectedSectionsCommitted,
      });
      const nextSelectedSections = nextState.selectedSections;
      if (
        nextSelectedSections.length !== selectedSectionsCommitted.length ||
        nextSelectedSections.some(
          (sectionKey, index) => sectionKey !== selectedSectionsCommitted[index]
        )
      ) {
        setSelectedSectionsCommitted(nextSelectedSections);
      }
      return nextState.answers;
    });
    if (errorQuestionKey === question.key) {
      setErrorQuestionKey(null);
      setErrorText(null);
    }
    if (phase === "result") {
      setPhase("survey");
      setResult(null);
      setHasCompletedSubmission(false);
    }
  }

  function addConfirmedQuestion(questionKey: string, visibleKeys: Set<string>) {
    setConfirmedQuestionKeys((prev) => {
      const next = new Set(prev);
      next.add(questionKey);
      return [...next].filter((key) => visibleKeys.has(key));
    });
  }

  const { handleStartKakaoAuth, handleConfirmKakaoAuth } = useSurveyAuthActions({
    validIdentity,
    identityPayload,
    saveSurveyIdentity,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    setAuthVerified,
    setIdentityEditable,
    text: {
      errorInvalidIdentity: TEXT.errorInvalidIdentity,
      noticeAuthComplete: TEXT.noticeAuthComplete,
      noticeAuthBySession: TEXT.noticeAuthBySession,
      noticeAuthByStoredIdentity: TEXT.noticeAuthByStoredIdentity,
      noticeAuthRequested: TEXT.noticeAuthRequested,
      noticeNeedResend: TEXT.noticeNeedResend,
    },
  });

  async function handleSwitchIdentity() {
    if (authBusy !== "idle") return;
    setAuthBusy("session");
    try {
      await deleteEmployeeSession().catch(() => null);
      setIdentity({ name: "", birthDate: "", phone: "" });
      setAuthVerified(false);
      setIdentityEditable(true);
      setAuthPendingSign(false);
      setAuthErrorText(null);
      setAuthNoticeText(TEXT.noticeSwitchedIdentity);
      setAnswers({});
      setSelectedSectionsCommitted([]);
      setCurrentSectionIndex(0);
      setFocusedQuestionBySection({});
      setConfirmedQuestionKeys([]);
      setCompletedSectionKeys([]);
      setErrorText(null);
      setErrorQuestionKey(null);
      setResult(null);
      setHasCompletedSubmission(false);
      setSurveyPeriodKey(null);
      setSurveySyncReady(false);
      setPhase("intro");
      remoteSurveyBootstrappedRef.current = false;
      restoredSnapshotUpdatedAtRef.current = 0;
      lastRemoteSavedSignatureRef.current = "";
      lastVisitedSectionIndexRef.current = 0;
      window.localStorage.removeItem(STORAGE_KEY);
      clearStoredIdentity();
      emitAuthSyncEvent({
        scope: "b2b-employee-session",
        reason: "survey-session-cleared",
      });
    } finally {
      setAuthBusy("idle");
    }
  }

  const {
    requestReset,
    handleReset,
    handleStartSurvey,
    handleRenewalHoldStart,
    handleRenewalHoldEnd,
  } = useSurveyLifecycleActions({
    authVerified,
    hasCompletedSubmission,
    surveyPeriodKey,
    blockSurveyStartTemporarily: BLOCK_SURVEY_START_TEMPORARILY,
    needAuthNoticeText: TEXT.needAuthNotice,
    storageKey: STORAGE_KEY,
    setAuthErrorText,
    setIsRenewalModalOpen,
    setPhase,
    setAnswers,
    setSelectedSectionsCommitted,
    setCurrentSectionIndex,
    setFocusedQuestionBySection,
    setConfirmedQuestionKeys,
    setCompletedSectionKeys,
    setErrorText,
    setErrorQuestionKey,
    setResult,
    setHasCompletedSubmission,
    setIsSectionTransitioning,
    setIsResetConfirmModalOpen,
    restoredSnapshotUpdatedAtRef,
    lastRemoteSavedSignatureRef,
    lastVisitedSectionIndexRef,
    renewalHoldTimerRef,
    renewalBypassTriggeredRef,
    persistSurveySnapshot,
  });

  function startCalculation(finalAnswers: PublicSurveyAnswers, finalSections: string[]) {
    const resolvedAnswers = resolveAutoComputedSurveyState({
      answers: finalAnswers,
      questionList: buildPublicSurveyQuestionList(template, finalAnswers, finalSections, {
        deriveSelectedSections: false,
      }),
      maxSelectedSections,
    }).answers;
    if (resolvedAnswers !== finalAnswers) {
      setAnswers(resolvedAnswers);
    }
    setCompletedSectionKeys((prev) => {
      const next = new Set(prev);
      for (const section of surveySections) {
        next.add(section.key);
      }
      return [...next];
    });
    setPhase("calculating");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }
    setResult(null);
    setErrorText(null);
    setErrorQuestionKey(null);
    setCalcPercent(8);
    setCalcMessageIndex(0);
    if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
    if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);

    calcTickerRef.current = window.setInterval(() => {
      setCalcPercent((prev) => (prev >= 92 ? prev : prev + (prev < 70 ? 8 : 4)));
      setCalcMessageIndex((prev) => (prev + 1) % CALCULATING_MESSAGES.length);
    }, 420);

    calcTimeoutRef.current = window.setTimeout(() => {
      try {
        const input = buildWellnessAnalysisInputFromSurvey({
          template,
          answers: resolvedAnswers,
          selectedSections: finalSections,
        });
        setResult(computeWellnessResult(input));
        setCalcPercent(100);
        setHasCompletedSubmission(true);
        if (authVerified) {
          void persistSurveySnapshot({
            answers: resolvedAnswers,
            selectedSections: finalSections,
            finalize: true,
            periodKey: surveyPeriodKey,
          }).catch(() => null);
        }
        setPhase("result");
      } catch {
        setPhase("survey");
        setErrorText("analysis_failed");
      } finally {
        if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
        if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);
      }
    }, 1700);
  }

  function handleAdvance(params?: { fromQuestionKey?: string; answerOverride?: unknown }) {
    if (isSectionTransitioning) return;
    if (!currentSection || currentSection.questions.length === 0) return;
    const fromQuestionKey = params?.fromQuestionKey;
    const isAutoAdvanceFromAnswer = typeof fromQuestionKey === "string";
    const at =
      fromQuestionKey != null
        ? currentSection.questions.findIndex((item) => item.question.key === fromQuestionKey)
        : getFocusedIndex(currentSection, focusedQuestionBySection[currentSection.key], answers);
    if (at < 0) return;
    const currentNode = currentSection.questions[at];

    let effectiveAnswers = answers;
    if (
      params &&
      params.fromQuestionKey === currentNode.question.key &&
      typeof params.answerOverride !== "undefined"
    ) {
      const sanitized = sanitizeSurveyAnswerValue(
        currentNode.question,
        params.answerOverride,
        maxSelectedSections
      );
      effectiveAnswers = resolveSurveySelectionState({
        template,
        answers: { ...answers, [currentNode.question.key]: sanitized },
        selectedSections: selectedSectionsCommitted,
      }).answers;
    }

    const currentError = validateSurveyQuestionAnswer(
      currentNode.question,
      effectiveAnswers[currentNode.question.key],
      {
        treatSelectionAsOptional: isOptionalSelectionQuestion(currentNode.question),
      }
    );
    const numericWarning = resolveQuestionNumericWarning(
      currentNode.question,
      effectiveAnswers[currentNode.question.key]
    );
    if (numericWarning) {
      setErrorQuestionKey(currentNode.question.key);
      setErrorText(numericWarning);
      scrollToQuestion(currentNode.question.key);
      return;
    }
    if (currentError) {
      setErrorQuestionKey(currentNode.question.key);
      setErrorText(currentError);
      scrollToQuestion(currentNode.question.key);
      return;
    }

    let nextAnswers = effectiveAnswers;
    let nextSelectedSections = selectedSectionsCommitted;
    if (currentNode.question.key === c27Key) {
      const nextSelectionState = resolveSurveySelectionState({
        template,
        answers: nextAnswers,
        selectedSections: selectedSectionsCommitted,
      });
      nextSelectedSections = nextSelectionState.selectedSections;
      nextAnswers = nextSelectionState.answers;
      setSelectedSectionsCommitted(nextSelectedSections);
      setAnswers(nextAnswers);
    }

    const effectiveQuestionList = buildVisibleQuestionList(nextAnswers, nextSelectedSections);
    const effectiveVisibleKeySet = new Set(effectiveQuestionList.map((item) => item.question.key));
    addConfirmedQuestion(currentNode.question.key, effectiveVisibleKeySet);

    const effectiveSections = buildSurveySections(
      effectiveQuestionList,
      nextSelectedSections,
      sectionTitleMap,
      TEXT.commonSection
    );
    const sectionAt = Math.max(
      0,
      effectiveSections.findIndex((item) => item.key === currentSection.key)
    );
    const section = effectiveSections[sectionAt];
    if (!section) return;
    const questionAt = Math.max(
      0,
      section.questions.findIndex((item) => item.question.key === currentNode.question.key)
    );

    const shouldBlockAutoAdvanceFromMulti =
      isAutoAdvanceFromAnswer && currentNode.question.type === "multi";
    if (shouldBlockAutoAdvanceFromMulti) {
      setErrorQuestionKey(null);
      setErrorText(null);
      setIsSectionTransitioning(false);
      return;
    }

    if (questionAt < section.questions.length - 1) {
      const nextQuestion = section.questions[questionAt + 1].question;
      const nextKey = nextQuestion.key;
      const nextAlreadyAnswered = isSurveyQuestionAnswered(nextQuestion, nextAnswers[nextKey]);
      if (isAutoAdvanceFromAnswer && nextAlreadyAnswered) {
        setErrorQuestionKey(null);
        setErrorText(null);
        setIsSectionTransitioning(false);
        return;
      }
      setCurrentSectionIndex(sectionAt);
      setFocusedQuestionBySection((prev) => ({ ...prev, [section.key]: nextKey }));
      setErrorQuestionKey(null);
      setErrorText(null);
      const shouldCenterNextQuestion =
        isAutoAdvanceFromAnswer &&
        currentNode.question.type !== "multi" &&
        !nextAlreadyAnswered;
      scrollToQuestion(nextKey, {
        align: shouldCenterNextQuestion ? "center" : "comfort",
      });
      setIsSectionTransitioning(false);
      return;
    }

    if (sectionAt < effectiveSections.length - 1) {
      const nextSection = effectiveSections[sectionAt + 1];
      const nextKey = nextSection.questions[0]?.question.key ?? "";
      const nextQuestion = nextSection.questions[0]?.question;
      const nextAlreadyAnswered =
        nextQuestion != null ? isSurveyQuestionAnswered(nextQuestion, nextAnswers[nextKey]) : false;
      if (isAutoAdvanceFromAnswer && nextAlreadyAnswered) {
        setErrorQuestionKey(null);
        setErrorText(null);
        setIsSectionTransitioning(false);
        return;
      }
      const shouldShowSectionTransition = currentNode.question.key === c27Key;
      if (shouldShowSectionTransition) {
        setIsSectionTransitioning(true);
      } else {
        setIsSectionTransitioning(false);
      }
      setCurrentSectionIndex(sectionAt + 1);
      if (nextKey) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [nextSection.key]: nextKey }));
        const shouldCenterNextSectionFirstQuestion =
          isAutoAdvanceFromAnswer &&
          currentNode.question.type !== "multi" &&
          !nextAlreadyAnswered;
        if (shouldShowSectionTransition) {
          window.setTimeout(() => {
            scrollToQuestion(nextKey, {
              align: shouldCenterNextSectionFirstQuestion ? "center" : "comfort",
            });
            setIsSectionTransitioning(false);
          }, 140);
        } else {
          scrollToQuestion(nextKey, {
            align: shouldCenterNextSectionFirstQuestion ? "center" : "comfort",
          });
        }
      } else {
        setIsSectionTransitioning(false);
      }
      setErrorQuestionKey(null);
      setErrorText(null);
      return;
    }

    if (isAutoAdvanceFromAnswer) {
      setErrorQuestionKey(null);
      setErrorText(null);
      setIsSectionTransitioning(false);
      return;
    }

    setIsSectionTransitioning(false);
    startCalculation(nextAnswers, nextSelectedSections);
  }

  function renderQuestionInput(question: WellnessSurveyQuestionForTemplate) {
    if (question.type === "single") {
      const value = toInputValue(answers[question.key]).trim();
      const options = (question.options ?? []).filter((option) => !isNoneLikeOption(option));
      const optionLayout = resolveOptionLayout(options);
      return (
        <div className={`grid gap-2 ${optionLayout.gridClass} sm:gap-2.5`}>
          {options.map((option) => {
            const active = value === option.value;
            return (
              <button
                key={`${question.key}-${option.value}`}
                data-testid="survey-option"
                type="button"
                onClick={() => {
                  const nextValue = active ? "" : option.value;
                  applyAnswer(question, nextValue);
                  if (!nextValue) return;
                  handleAdvance({ fromQuestionKey: question.key, answerOverride: nextValue });
                }}
                className={`rounded-xl border transition ${
                  optionLayout.compact
                    ? "h-[40px] px-2 py-1.5 text-center text-[12px] font-semibold leading-tight break-keep sm:h-[44px] sm:px-3 sm:py-2 sm:text-[13px]"
                    : "h-[44px] px-3 py-1.5 text-left text-[12px] font-medium leading-tight break-keep sm:h-[48px] sm:px-4 sm:py-2 sm:text-[13px]"
                } ${
                  active
                    ? "border-sky-300 bg-sky-50 text-slate-900 ring-1 ring-sky-200 shadow-[0_8px_18px_-14px_rgba(14,116,144,0.35)]"
                    : "border-slate-300 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50"
                }`}
              >
                <span className="block max-h-[2.2em] overflow-hidden leading-tight">{option.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (question.type === "multi") {
      const options = (question.options ?? []).filter((option) => !isNoneLikeOption(option));
      const selected = new Set(toMultiValues(answers[question.key]));
      const otherTextByValue = toMultiOtherTextByValue(answers[question.key]);
      const customOptions = options.filter((option) => option.allowsCustomInput && selected.has(option.value));
      const optionLayout = resolveOptionLayout(options);
      return (
        <div className="space-y-3">
          <div className={`grid gap-2 ${optionLayout.gridClass} sm:gap-2.5`}>
            {options.map((option) => {
              const active = selected.has(option.value);
              return (
                <button
                  key={`${question.key}-${option.value}`}
                  data-testid="survey-multi-option"
                  type="button"
                  onClick={() =>
                    applyAnswer(
                      question,
                      toggleSurveyMultiValue(question, answers[question.key], option.value, maxSelectedSections)
                    )
                  }
                  className={`rounded-xl border transition ${
                    optionLayout.compact
                      ? "h-[40px] px-2 py-1.5 text-center text-[12px] font-semibold leading-tight break-keep sm:h-[44px] sm:px-3 sm:py-2 sm:text-[13px]"
                      : "h-[44px] px-3 py-1.5 text-left text-[12px] font-medium leading-tight break-keep sm:h-[48px] sm:px-4 sm:py-2 sm:text-[13px]"
                  } ${
                    active
                      ? "border-sky-300 bg-sky-50 text-slate-900 ring-1 ring-sky-200 shadow-[0_8px_18px_-14px_rgba(14,116,144,0.35)]"
                      : "border-slate-300 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50"
                  }`}
                >
                  <span className="block max-h-[2.2em] overflow-hidden leading-tight">{option.label}</span>
                </button>
              );
            })}
          </div>
          {customOptions.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {customOptions.map((option) => (
                <input
                  key={`${question.key}-${option.value}-other`}
                  data-testid="survey-multi-other-input"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  value={otherTextByValue[option.value] ?? ""}
                  onChange={(event) =>
                    applyAnswer(
                      question,
                      updateSurveyMultiOtherText(
                        question,
                        answers[question.key],
                        option.value,
                        event.target.value,
                        maxSelectedSections
                      )
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    handleAdvance();
                  }}
                  placeholder={`${option.label}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (question.type === "group") {
      const fields = question.fields ?? [];
      const fieldValues = resolveGroupFieldValues(question, answers[question.key]);
      return (
        <div className={`grid gap-3 ${fields.length >= 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {fields.map((field, index) => {
            const isNumericField = field.type === "number";
            const inputId = `${question.key}-${field.id}`;
            const value = fieldValues[field.id] ?? "";
            const numericRule = isNumericField ? resolveNumberRangeForGroupField(field) : null;
            const numericWarning = numericRule ? buildOutOfRangeWarning(numericRule, value) : null;
            return (
              <label key={inputId} className="space-y-1.5 text-sm text-slate-700">
                <span className="font-semibold">
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ""}
                </span>
                <input
                  id={inputId}
                  type="text"
                  data-testid={`survey-group-input-${field.id}`}
                  value={value}
                  inputMode={isNumericField ? "decimal" : "text"}
                  pattern={isNumericField ? "[0-9]*" : undefined}
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    const nextValue = isNumericField
                      ? rawValue.replace(/[^0-9.]/g, "")
                      : rawValue;
                    applyAnswer(question, {
                      fieldValues: {
                        ...fieldValues,
                        [field.id]: nextValue,
                      },
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const nextField = fields[index + 1];
                    if (nextField) {
                      const nextNode = document.getElementById(
                        `${question.key}-${nextField.id}`
                      ) as HTMLInputElement | null;
                      nextNode?.focus();
                      return;
                    }
                    handleAdvance();
                  }}
                  placeholder={field.unit ? `${field.unit}` : undefined}
                />
                {numericWarning ? (
                  <p className="text-xs font-medium text-amber-700">{numericWarning}</p>
                ) : null}
              </label>
            );
          })}
        </div>
      );
    }

    const inputValue = toInputValue(answers[question.key]);
    const isNumberQuestion = question.type === "number";
    const numberRule = isNumberQuestion ? resolveNumberRangeForQuestion(question) : null;
    const numericWarning = numberRule ? buildOutOfRangeWarning(numberRule, inputValue) : null;
    return (
      <div className="space-y-1.5">
        <input
          type="text"
          data-testid={isNumberQuestion ? "survey-number-input" : "survey-text-input"}
          value={inputValue}
          inputMode={isNumberQuestion ? "decimal" : "text"}
          pattern={isNumberQuestion ? "[0-9]*" : undefined}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 sm:text-base"
          placeholder={
            question.placeholder ??
            (isNumberQuestion
              ? "\uC22B\uC790\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694"
              : "\uB2F5\uBCC0\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694")
          }
          onChange={(event) => {
            const rawValue = event.target.value;
            const nextValue = isNumberQuestion ? rawValue.replace(/[^0-9.]/g, "") : rawValue;
            applyAnswer(question, nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const nextValue = isNumberQuestion
              ? event.currentTarget.value.replace(/[^0-9.]/g, "")
              : event.currentTarget.value;
            handleAdvance({ fromQuestionKey: question.key, answerOverride: nextValue });
          }}
        />
        {numericWarning ? <p className="text-xs font-medium text-amber-700">{numericWarning}</p> : null}
      </div>
    );
  }

  function handleMovePreviousSection() {
    if (isSectionTransitioning) return;
    if (currentSectionIndex <= 0) return;
    moveToSection(currentSectionIndex - 1);
  }

  function handleMoveNextSection() {
    if (isSectionTransitioning) return;
    if (!currentSection || currentSection.questions.length === 0) return;

    for (const node of currentSection.questions) {
      const question = node.question;
      const answerValue = answers[question.key];
      const numericWarning = resolveQuestionNumericWarning(question, answerValue);
      if (numericWarning) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [currentSection.key]: question.key }));
        setErrorQuestionKey(question.key);
        setErrorText(numericWarning);
        scrollToQuestion(question.key);
        return;
      }
      const validationError = validateSurveyQuestionAnswer(question, answerValue, {
        treatSelectionAsOptional: isOptionalSelectionQuestion(question),
      });
      if (validationError) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [currentSection.key]: question.key }));
        setErrorQuestionKey(question.key);
        setErrorText(validationError);
        scrollToQuestion(question.key);
        return;
      }
    }

    let nextAnswers = answers;
    const nextSelectionState = resolveSurveySelectionState({
      template,
      answers: nextAnswers,
      selectedSections: selectedSectionsCommitted,
    });
    const nextSelectedSections = nextSelectionState.selectedSections;
    const nextPrunedAnswers = nextSelectionState.answers;
    const hasSelectionChanged = !hasSameSectionSelection(
      nextSelectedSections,
      selectedSectionsCommitted
    );
    const hasAnswersChanged =
      JSON.stringify(nextPrunedAnswers) !== JSON.stringify(nextAnswers);
    if (hasSelectionChanged || hasAnswersChanged) {
      nextAnswers = nextPrunedAnswers;
      setSelectedSectionsCommitted(nextSelectedSections);
      setAnswers(nextAnswers);
    }

    const effectiveQuestionList = buildVisibleQuestionList(nextAnswers, nextSelectedSections);
    const effectiveSections = buildSurveySections(
      effectiveQuestionList,
      nextSelectedSections,
      sectionTitleMap,
      TEXT.commonSection
    );
    const sectionAt = effectiveSections.findIndex((section) => section.key === currentSection.key);
    if (sectionAt < 0) return;

    if (sectionAt >= effectiveSections.length - 1) {
      setErrorQuestionKey(null);
      setErrorText(null);
      setIsSectionTransitioning(false);
      startCalculation(nextAnswers, nextSelectedSections);
      return;
    }

    const nextSection = effectiveSections[sectionAt + 1];
    const nextKey = nextSection.questions[0]?.question.key ?? "";
    const shouldShowSectionTransition = currentSection.questions.some(
      (item) => item.question.key === c27Key
    );
    setErrorQuestionKey(null);
    setErrorText(null);
    if (shouldShowSectionTransition) {
      setIsSectionTransitioning(true);
    } else {
      setIsSectionTransitioning(false);
    }
    setCurrentSectionIndex(sectionAt + 1);
    if (nextKey) {
      setFocusedQuestionBySection((prev) => ({ ...prev, [nextSection.key]: nextKey }));
      if (shouldShowSectionTransition) {
        window.setTimeout(() => {
          scrollToQuestion(nextKey);
          setIsSectionTransitioning(false);
        }, 140);
      } else {
        scrollToQuestion(nextKey);
      }
    } else {
      setIsSectionTransitioning(false);
    }
  }

  const resultSummary = useMemo(() => {
    if (phase !== "result" || !isAdminLoggedIn) return null;
    if (result) return result;
    try {
      const input = buildWellnessAnalysisInputFromSurvey({
        template,
        answers,
        selectedSections: selectedSectionsCommitted,
      });
      return computeWellnessResult(input);
    } catch {
      return null;
    }
  }, [answers, isAdminLoggedIn, phase, result, selectedSectionsCommitted, template]);

  if (!hydrated) return null;

  const hasPrevStep = currentSectionIndex > 0;
  const isCommonSurveySection = currentSection?.key === "common";
  const liveSelectedSections = resolveSelectedSectionsFromC27(
    template,
    answers,
    selectedSectionsCommitted
  );
  const hasLiveDetailedSectionSelection = liveSelectedSections.length > 0;
  const prevButtonLabel = TEXT.prevSection;
  const atLastSection = currentSectionIndex >= surveySections.length - 1;
  const shouldShowNextSectionLabelAtCommon =
    isCommonSurveySection && atLastSection && hasLiveDetailedSectionSelection;
  const nextButtonLabel =
    atLastSection && !shouldShowNextSectionLabelAtCommon
      ? isAdminLoggedIn
        ? TEXT.resultCheck
        : TEXT.submitSurvey
      : TEXT.nextSection;
  const progressMessage = resolveProgressMessage(progressPercent);
  const resolveQuestionHelpText = (question: WellnessSurveyQuestionForTemplate) => {
    const rawHelpText = question.helpText?.trim() ?? "";
    if (!rawHelpText) return "";
    return isOptionalHintLikeText(rawHelpText, TEXT.optionalHint) ? "" : rawHelpText;
  };

  return (
    <div
      className="relative isolate w-full overflow-hidden bg-[radial-gradient(130%_90%_at_0%_0%,#c9f6ff_0%,#dce9ff_42%,#eef2ff_100%)] py-5 sm:py-8"
      style={{
        minHeight:
          "max(calc(105vh - var(--wb-topbar-height, 3.5rem)), calc(105dvh - var(--wb-topbar-height, 3.5rem)))",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-blue-300/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-200/45 blur-3xl"
      />
      <div className="relative z-10 mx-auto w-full max-w-full px-4 overflow-visible sm:max-w-[640px] lg:max-w-[760px]">
        {phase === "intro" ? (
          <SurveyIntroPanel
            text={{
              introBadge: TEXT.introBadge,
              introTitle: TEXT.introTitle,
              introDesc1: TEXT.introDesc1,
              introDesc2: TEXT.introDesc2,
              preAuthTitle: TEXT.preAuthTitle,
              preAuthDesc: TEXT.preAuthDesc,
              namePlaceholder: TEXT.namePlaceholder,
              birthPlaceholder: TEXT.birthPlaceholder,
              phonePlaceholder: TEXT.phonePlaceholder,
              sendAuth: TEXT.sendAuth,
              resendAuth: TEXT.resendAuth,
              checkAuth: TEXT.checkAuth,
              authDone: TEXT.authDone,
              authCheckingTitle: TEXT.authCheckingTitle,
              authCheckingDesc: TEXT.authCheckingDesc,
              authLockedHint: TEXT.authLockedHint,
              switchIdentity: TEXT.switchIdentity,
              startSurvey: TEXT.startSurvey,
              needAuthNotice: TEXT.needAuthNotice,
              busyRequest: TEXT.busyRequest,
              busyChecking: TEXT.busyChecking,
              completedRestartHint: TEXT.completedRestartHint,
            }}
            identity={identity}
            identityEditable={identityEditable}
            identityLocked={identityLocked}
            authBusy={authBusy}
            authPendingSign={authPendingSign}
            authVerified={authVerified}
            authInitializing={authInitializing}
            authNoticeText={authNoticeText}
            authErrorText={authErrorText}
            hasCompletedSubmission={hasCompletedSubmission}
            startDisabled={!authVerified || authBusy !== "idle" || authInitializing}
            onNameChange={(value) =>
              setIdentity((prev) => ({
                ...prev,
                name: value,
              }))
            }
            onBirthDateChange={(value) =>
              setIdentity((prev) => ({
                ...prev,
                birthDate: normalizeDigits(value).slice(0, 8),
              }))
            }
            onPhoneChange={(value) =>
              setIdentity((prev) => ({
                ...prev,
                phone: normalizeDigits(value).slice(0, 11),
              }))
            }
            onStartKakaoAuth={() => void handleStartKakaoAuth()}
            onConfirmKakaoAuth={() => void handleConfirmKakaoAuth()}
            onSwitchIdentity={() => void handleSwitchIdentity()}
            onStartSurvey={handleStartSurvey}
          />
        ) : null}

        {phase === "survey" ? (
          <SurveySectionPanel
            text={{
              commonSection: TEXT.commonSection,
              sectionGuide: TEXT.sectionGuide,
              restart: TEXT.restart,
              progressBarLabel: TEXT.progressBarLabel,
              sectionTransitionTitle: TEXT.sectionTransitionTitle,
              sectionTransitionDesc: TEXT.sectionTransitionDesc,
              commonBadge: TEXT.commonBadge,
              requiredBadge: TEXT.requiredBadge,
              optionalBadge: TEXT.optionalBadge,
              optionalHint: TEXT.optionalHint,
            }}
            currentSectionIndex={currentSectionIndex}
            currentSection={currentSection}
            surveySections={surveySections}
            progressPercent={progressPercent}
            progressDoneCount={progressDisplayDoneCount}
            progressTotalCount={progressTotalCount}
            progressMessage={progressMessage}
            isSectionTransitioning={isSectionTransitioning}
            isCommonSurveySection={isCommonSurveySection}
            hasPrevStep={hasPrevStep}
            prevButtonLabel={prevButtonLabel}
            nextButtonLabel={nextButtonLabel}
            focusedQuestionKey={focusedQuestionKey}
            errorQuestionKey={errorQuestionKey}
            errorText={errorText}
            onReset={requestReset}
            onMoveToSection={moveToSection}
            onMovePreviousSection={handleMovePreviousSection}
            onMoveNextSection={handleMoveNextSection}
            onQuestionRef={(questionKey, nodeRef) => {
              setQuestionRef(questionKey, nodeRef);
            }}
            renderQuestionInput={renderQuestionInput}
            resolveQuestionText={toDisplayQuestionText}
            resolveQuestionHelpText={resolveQuestionHelpText}
            isQuestionRequired={isQuestionEffectivelyRequired}
            shouldShowQuestionOptionalHint={isOptionalSelectionQuestion}
          />
        ) : null}

        {phase === "calculating" ? (
          <SurveyCalculatingPanel
            title={TEXT.resultTitle}
            message={CALCULATING_MESSAGES[calcMessageIndex]}
            percent={calcPercent}
          />
        ) : null}

        {phase === "result" && isAdminLoggedIn ? (
          <SurveyResultPanel
            resultSummary={resultSummary}
            sectionTitleMap={sectionTitleMap}
            text={{
              resultTitle: TEXT.resultTitle,
              scoreHealth: TEXT.scoreHealth,
              scoreRisk: TEXT.scoreRisk,
              editSurvey: TEXT.editSurvey,
              restart: TEXT.restart,
              viewEmployeeReport: TEXT.viewEmployeeReport,
            }}
            onEditSurvey={() => {
              setPhase("survey");
              setResult(resultSummary);
              setHasCompletedSubmission(false);
            }}
            onRestart={requestReset}
            onOpenEmployeeReport={handleOpenEmployeeReport}
          />
        ) : null}

        {phase === "result" && !isAdminLoggedIn ? (
          <SurveySubmittedPanel
            text={{
              submittedTitle: TEXT.submittedTitle,
              submittedDesc: TEXT.submittedDesc,
              editSurvey: TEXT.editSurvey,
              restart: TEXT.restart,
            }}
            onEditSurvey={() => {
              setPhase("survey");
              setResult(null);
              setHasCompletedSubmission(false);
            }}
            onRestart={requestReset}
          />
        ) : null}
      </div>

      <SurveyRenewalModal
        open={isRenewalModalOpen}
        title={TEXT.renewalTitle}
        description1={TEXT.renewalDesc1}
        description2={TEXT.renewalDesc2}
        closeText={TEXT.close}
        confirmText={TEXT.confirm}
        onClose={() => {
          setIsRenewalModalOpen(false);
          handleRenewalHoldEnd();
        }}
        onHoldStart={handleRenewalHoldStart}
        onHoldEnd={handleRenewalHoldEnd}
      />
      <SurveyResetConfirmModal
        open={isResetConfirmModalOpen}
        title={TEXT.resetAsk}
        description={TEXT.resetDesc}
        cancelText={TEXT.cancel}
        confirmText={TEXT.reset}
        onCancel={() => setIsResetConfirmModalOpen(false)}
        onConfirm={handleReset}
      />
    </div>
  );
}
