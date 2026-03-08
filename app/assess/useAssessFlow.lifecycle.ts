"use client";

import { useEffect } from "react";
import { refreshClientIdCookieIfNeeded } from "@/lib/client-id";
import { fetchCategories, type CategoryLite } from "@/lib/client/categories";
import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";
import type { CSectionResult } from "./components/CSection";
import { fixedA } from "./data/questions";
import {
  ASSESS_STORAGE_KEY,
  loadAssessStateSnapshot,
  saveAssessStateSnapshot,
} from "./lib/assessStorage";
import type { AssessSection } from "./useAssessFlow.types";

type UseAssessFlowLifecycleParams = {
  confirmOpen: boolean;
  confirmAndReset: () => void;
  cancelBtnRef: { current: HTMLButtonElement | null };
  setConfirmOpen: (open: boolean) => void;
  section: AssessSection;
  setSection: (next: AssessSection) => void;
  answers: Record<string, any>;
  setAnswers: (answers: Record<string, any>) => void;
  current: string;
  setCurrent: (current: string) => void;
  fixedIdx: number;
  setFixedIdx: (next: number) => void;
  history: string[];
  setHistory: (history: string[]) => void;
  cCats: string[];
  setCCats: (next: string[]) => void;
  cResult: CSectionResult | null;
  setCResult: (result: CSectionResult | null) => void;
  cAnswers: Record<string, number[]>;
  setCAnswers: (answers: Record<string, number[]>) => void;
  hydrated: boolean;
  setHydrated: (flag: boolean) => void;
  setCategories: (cats: CategoryLite[]) => void;
  clearLoadingTimer: () => void;
};

export function useAssessFlowLifecycle({
  confirmOpen,
  confirmAndReset,
  cancelBtnRef,
  setConfirmOpen,
  section,
  setSection,
  answers,
  setAnswers,
  current,
  setCurrent,
  fixedIdx,
  setFixedIdx,
  history,
  setHistory,
  cCats,
  setCCats,
  cResult,
  setCResult,
  cAnswers,
  setCAnswers,
  hydrated,
  setHydrated,
  setCategories,
  clearLoadingTimer,
}: UseAssessFlowLifecycleParams) {
  useEffect(() => {
    refreshClientIdCookieIfNeeded();
  }, []);

  useChatPageActionListener((detail) => {
    if (detail.action !== "focus_assess_flow") return;
    document
      .getElementById("assess-flow")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  useEffect(() => {
    if (!confirmOpen) return;
    cancelBtnRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmOpen(false);
      if (event.key === "Enter") {
        confirmAndReset();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancelBtnRef, confirmAndReset, confirmOpen, setConfirmOpen]);

  useEffect(() => {
    let cancelled = false;
    let frameA: number | null = null;
    let frameB: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const parsed = loadAssessStateSnapshot(ASSESS_STORAGE_KEY);
      if (parsed) {
        setSection(parsed.section ?? "INTRO");
        setAnswers(parsed.answers ?? {});
        setCurrent(parsed.current ?? fixedA[0]);
        setFixedIdx(parsed.fixedIdx ?? 0);
        setHistory(parsed.history ?? []);
        if (Array.isArray(parsed.cCats)) setCCats(parsed.cCats);
        if (parsed.cResult && parsed.cResult.catsOrdered) {
          setCResult(parsed.cResult);
        }
        if (parsed.cAnswers) setCAnswers(parsed.cAnswers);
      }
    } finally {
      const arm = () => {
        if (!cancelled) setHydrated(true);
      };
      if (typeof requestAnimationFrame === "function") {
        frameA = requestAnimationFrame(() => {
          frameB = requestAnimationFrame(arm);
        });
      } else {
        timeoutId = setTimeout(arm, 0);
      }
    }

    return () => {
      cancelled = true;
      if (frameA !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameA);
      }
      if (frameB !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameB);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    setAnswers,
    setCAnswers,
    setCCats,
    setCResult,
    setCurrent,
    setFixedIdx,
    setHistory,
    setHydrated,
    setSection,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const base = loadAssessStateSnapshot(ASSESS_STORAGE_KEY) ?? {};
      const next = {
        ...base,
        section,
        answers,
        current,
        fixedIdx,
        history,
        cCats,
        cResult,
        cAnswers,
      };
      saveAssessStateSnapshot(ASSESS_STORAGE_KEY, next);
    } catch {}
  }, [hydrated, section, answers, current, fixedIdx, history, cCats, cResult, cAnswers]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal)
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
    return () => controller.abort();
  }, [setCategories]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = confirmOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [confirmOpen]);

  useEffect(() => {
    if (section !== "INTRO") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") setSection("A");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [section, setSection]);

  useEffect(() => {
    return () => {
      clearLoadingTimer();
    };
  }, [clearLoadingTimer]);
}
