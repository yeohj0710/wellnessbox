import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect } from "react";
import { useFooter } from "@/components/common/footerContext";
import type { ChatSession } from "@/types/chat";
import {
  readLocalAssessCats,
  readLocalCheckAiTopLabels,
} from "./useChat.results";
import { type ActionMemoryMap, readActionMemory } from "./useChat.actionMemory";
import { filterPersistableSessions } from "./useChat.persistence";
import { saveSessions } from "../utils";
import type { ChatAgentSuggestedAction } from "@/lib/chat/agent-actions";

type UseChatLocalEffectsInput = {
  manageFooter: boolean;
  activeId: string | null;
  sessions: ChatSession[];
  readyToPersistRef: MutableRefObject<Record<string, boolean>>;
  activeIdRef: MutableRefObject<string | null>;
  setActionMemory: Dispatch<SetStateAction<ActionMemoryMap>>;
  setSuggestions: Dispatch<SetStateAction<string[]>>;
  setInteractiveActions: Dispatch<SetStateAction<ChatAgentSuggestedAction[]>>;
  setLocalCheckAi: Dispatch<SetStateAction<string[]>>;
  setLocalAssessCats: Dispatch<SetStateAction<string[]>>;
};

export function useChatLocalEffects({
  manageFooter,
  activeId,
  sessions,
  readyToPersistRef,
  activeIdRef,
  setActionMemory,
  setSuggestions,
  setInteractiveActions,
  setLocalCheckAi,
  setLocalAssessCats,
}: UseChatLocalEffectsInput) {
  useEffect(() => {
    setActionMemory(readActionMemory());
  }, [setActionMemory]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId, activeIdRef]);

  useEffect(() => {
    setSuggestions([]);
    setInteractiveActions([]);
  }, [activeId, setSuggestions, setInteractiveActions]);

  useEffect(() => {
    if (!sessions.length) return;
    saveSessions(filterPersistableSessions(sessions, readyToPersistRef.current));
  }, [sessions, readyToPersistRef]);

  const { hideFooter, showFooter } = useFooter();
  useEffect(() => {
    if (!manageFooter) return;
    hideFooter();
    return () => showFooter();
  }, [hideFooter, manageFooter, showFooter]);

  useEffect(() => {
    const labels = readLocalCheckAiTopLabels();
    if (labels.length) setLocalCheckAi(labels);
  }, [setLocalCheckAi]);

  useEffect(() => {
    const cats = readLocalAssessCats();
    if (cats.length) setLocalAssessCats(cats);
  }, [setLocalAssessCats]);
}
