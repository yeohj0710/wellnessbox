"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildUnifiedActions,
  type UnifiedAction,
} from "./chatInput.actions";
import type { ChatInputProps } from "./chatInput.types";

const AGENT_COACHMARK_DISMISS_KEY = "wb_chat_agent_coachmark_dismissed_v1";
const TEXTAREA_LINE_HEIGHT = 22;
const TEXTAREA_PADDING_Y = 10;
const TEXTAREA_SINGLE_HEIGHT = TEXTAREA_LINE_HEIGHT + TEXTAREA_PADDING_Y * 2;
const TEXTAREA_MAX_LINES = 6;
const TEXTAREA_MAX_HEIGHT = TEXTAREA_LINE_HEIGHT * TEXTAREA_MAX_LINES + TEXTAREA_PADDING_Y * 2;

type UseChatInputControllerParams = Pick<
  ChatInputProps,
  | "input"
  | "sendMessage"
  | "loading"
  | "disabled"
  | "quickActionLoading"
  | "suggestions"
  | "onSelectSuggestion"
  | "showAgentGuide"
  | "agentExamples"
  | "onSelectAgentExample"
  | "mode"
  | "quickActions"
  | "onSelectQuickAction"
>;

export function useChatInputController({
  input,
  sendMessage,
  loading,
  disabled = false,
  quickActionLoading = false,
  suggestions = [],
  onSelectSuggestion,
  showAgentGuide = false,
  agentExamples = [],
  onSelectAgentExample,
  mode = "fixed",
  quickActions = [],
  onSelectQuickAction,
}: UseChatInputControllerParams) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [isMultiline, setIsMultiline] = useState(false);
  const [actionTrayOpen, setActionTrayOpen] = useState(false);
  const [coachmarkDismissed, setCoachmarkDismissed] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(false);

  const canSend = !!input.trim() && !loading && !disabled;
  const align = isMultiline ? "self-end mb-1" : "self-center";
  const isEmbedded = mode === "embedded";
  const quickActionDisabled = loading || disabled || quickActionLoading;

  const unifiedActions = useMemo<UnifiedAction[]>(() => {
    return buildUnifiedActions({
      quickActions,
      agentExamples,
      suggestions,
      onSelectQuickAction,
      onSelectAgentExample,
      onSelectSuggestion,
    });
  }, [
    quickActions,
    agentExamples,
    suggestions,
    onSelectQuickAction,
    onSelectAgentExample,
    onSelectSuggestion,
  ]);

  const hasActionOptions = unifiedActions.length > 0;
  const shouldOfferAgentHint = showAgentGuide && hasActionOptions && !actionTrayOpen;
  const showHintPill = !showCoachmark && shouldOfferAgentHint;

  const helperHint = useMemo(() => {
    if (input.trim().length > 0) return "";
    if (agentExamples[0]?.prompt) return `예: ${agentExamples[0].prompt}`;
    if (suggestions[0]) return `예: ${suggestions[0]}`;
    if (quickActions[0]?.label) return `예: ${quickActions[0].label} 해줘`;
    return "예: 장바구니 열어줘";
  }, [agentExamples, input, quickActions, suggestions]);

  const resizeToContent = useCallback(() => {
    const textarea = taRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
    if (textarea.scrollHeight > TEXTAREA_MAX_HEIGHT) textarea.scrollTop = textarea.scrollHeight;
    setIsMultiline(nextHeight > TEXTAREA_SINGLE_HEIGHT + 1);
  }, []);

  const resetBox = () => {
    const textarea = taRef.current;
    if (!textarea) return;
    textarea.style.height = `${TEXTAREA_SINGLE_HEIGHT}px`;
    textarea.style.overflowY = "hidden";
    textarea.scrollTop = 0;
    setIsMultiline(false);
  };

  const dismissCoachmark = () => {
    setShowCoachmark(false);
    setCoachmarkDismissed(true);
    try {
      window.localStorage.setItem(AGENT_COACHMARK_DISMISS_KEY, "1");
    } catch {}
  };

  const hideCoachmark = () => {
    setShowCoachmark(false);
  };

  const openActionTray = () => {
    setActionTrayOpen(true);
    setShowCoachmark(false);
  };

  const closeActionTray = () => {
    setActionTrayOpen(false);
  };

  const toggleActionTray = () => {
    setActionTrayOpen((prev) => !prev);
  };

  const doSend = () => {
    if (!canSend) return;
    sendMessage();
    resetBox();
  };

  const runUnifiedAction = (action: UnifiedAction) => {
    if (quickActionDisabled) return;
    action.run();
    setActionTrayOpen(false);
    setShowCoachmark(false);
  };

  useEffect(() => {
    try {
      setCoachmarkDismissed(window.localStorage.getItem(AGENT_COACHMARK_DISMISS_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!shouldOfferAgentHint || coachmarkDismissed || quickActionDisabled) {
      setShowCoachmark(false);
      return;
    }
    setShowCoachmark(true);
    const timer = window.setTimeout(() => setShowCoachmark(false), 9000);
    return () => window.clearTimeout(timer);
  }, [coachmarkDismissed, quickActionDisabled, shouldOfferAgentHint]);

  useEffect(() => {
    if (!loading) return;
    setActionTrayOpen(false);
  }, [loading]);

  useEffect(() => {
    const textarea = taRef.current;
    if (!textarea) return;
    textarea.style.lineHeight = `${TEXTAREA_LINE_HEIGHT}px`;
    textarea.style.paddingTop = `${TEXTAREA_PADDING_Y}px`;
    textarea.style.paddingBottom = `${TEXTAREA_PADDING_Y}px`;
    textarea.style.height = `${TEXTAREA_SINGLE_HEIGHT}px`;
    textarea.style.overflowY = "hidden";
  }, []);

  useEffect(() => {
    resizeToContent();
  }, [input, resizeToContent]);

  useEffect(() => {
    const onResize = () => resizeToContent();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeToContent]);

  return {
    taRef,
    canSend,
    align,
    isEmbedded,
    actionTrayOpen,
    showCoachmark,
    showHintPill,
    hasActionOptions,
    quickActionDisabled,
    helperHint,
    unifiedActions,
    doSend,
    resizeToContent,
    dismissCoachmark,
    hideCoachmark,
    openActionTray,
    closeActionTray,
    toggleActionTray,
    runUnifiedAction,
  };
}
