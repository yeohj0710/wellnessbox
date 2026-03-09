import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { SurveySectionGroup } from "./survey-page-helpers";

type SurveyPhase = "intro" | "survey" | "calculating" | "result";

type UseSurveyPageUiEffectsInput = {
  hydrated: boolean;
  phase: SurveyPhase;
  isAdminLoggedIn: boolean;
  refreshLoginStatus: () => Promise<void>;
  visibleSectionKeySet: Set<string>;
  surveySections: SurveySectionGroup[];
  currentSectionIndex: number;
  lastVisitedSectionIndexRef: MutableRefObject<number>;
  renewalHoldTimerRef: MutableRefObject<number | null>;
  calcTickerRef: MutableRefObject<number | null>;
  calcTimeoutRef: MutableRefObject<number | null>;
  saveDraftTimerRef: MutableRefObject<number | null>;
  setCompletedSectionKeys: Dispatch<SetStateAction<string[]>>;
};

export function useSurveyPageUiEffects({
  hydrated,
  phase,
  isAdminLoggedIn,
  refreshLoginStatus,
  visibleSectionKeySet,
  surveySections,
  currentSectionIndex,
  lastVisitedSectionIndexRef,
  renewalHoldTimerRef,
  calcTickerRef,
  calcTimeoutRef,
  saveDraftTimerRef,
  setCompletedSectionKeys,
}: UseSurveyPageUiEffectsInput) {
  useEffect(() => {
    setCompletedSectionKeys((prev) => prev.filter((key) => visibleSectionKeySet.has(key)));
  }, [setCompletedSectionKeys, visibleSectionKeySet]);

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
  }, [currentSectionIndex, lastVisitedSectionIndexRef, setCompletedSectionKeys, surveySections]);

  useEffect(() => {
    return () => {
      if (renewalHoldTimerRef.current != null) window.clearTimeout(renewalHoldTimerRef.current);
      if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
      if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);
      if (saveDraftTimerRef.current != null) window.clearTimeout(saveDraftTimerRef.current);
    };
  }, [calcTickerRef, calcTimeoutRef, renewalHoldTimerRef, saveDraftTimerRef]);
}
