import { useState } from "react";
import type { ChatSession, UserProfile } from "@/types/chat";
import type {
  NormalizedAssessResult,
  NormalizedCheckAiResult,
  NormalizedOrderSummary,
} from "./useChat.results";
import type { ChatAgentSuggestedAction } from "@/lib/chat/agent-actions";
import type { InChatAssessmentState } from "./useChat.assessment";
import { readActionMemory, type ActionMemoryMap } from "./useChat.actionMemory";

export type UseChatState = {
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  profile: UserProfile | undefined;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showProfileBanner: boolean;
  setShowProfileBanner: React.Dispatch<React.SetStateAction<boolean>>;
  profileLoaded: boolean;
  setProfileLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  drawerVisible: boolean;
  setDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  drawerOpen: boolean;
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  localCheckAi: string[];
  setLocalCheckAi: React.Dispatch<React.SetStateAction<string[]>>;
  localAssessCats: string[];
  setLocalAssessCats: React.Dispatch<React.SetStateAction<string[]>>;
  assessResult: NormalizedAssessResult | null;
  setAssessResult: React.Dispatch<React.SetStateAction<NormalizedAssessResult | null>>;
  checkAiResult: NormalizedCheckAiResult | null;
  setCheckAiResult: React.Dispatch<React.SetStateAction<NormalizedCheckAiResult | null>>;
  orders: NormalizedOrderSummary[];
  setOrders: React.Dispatch<React.SetStateAction<NormalizedOrderSummary[]>>;
  resultsLoaded: boolean;
  setResultsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  titleHighlightId: string | null;
  setTitleHighlightId: React.Dispatch<React.SetStateAction<string | null>>;
  suggestions: string[];
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
  interactiveActions: ChatAgentSuggestedAction[];
  setInteractiveActions: React.Dispatch<
    React.SetStateAction<ChatAgentSuggestedAction[]>
  >;
  inChatAssessment: InChatAssessmentState | null;
  setInChatAssessment: React.Dispatch<
    React.SetStateAction<InChatAssessmentState | null>
  >;
  actionLoading: boolean;
  setActionLoading: React.Dispatch<React.SetStateAction<boolean>>;
  titleLoading: boolean;
  setTitleLoading: React.Dispatch<React.SetStateAction<boolean>>;
  titleError: boolean;
  setTitleError: React.Dispatch<React.SetStateAction<boolean>>;
  topTitleHighlight: boolean;
  setTopTitleHighlight: React.Dispatch<React.SetStateAction<boolean>>;
  actionMemory: ActionMemoryMap;
  setActionMemory: React.Dispatch<React.SetStateAction<ActionMemoryMap>>;
};

export function useChatState(): UseChatState {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localCheckAi, setLocalCheckAi] = useState<string[]>([]);
  const [localAssessCats, setLocalAssessCats] = useState<string[]>([]);
  const [assessResult, setAssessResult] = useState<NormalizedAssessResult | null>(null);
  const [checkAiResult, setCheckAiResult] =
    useState<NormalizedCheckAiResult | null>(null);
  const [orders, setOrders] = useState<NormalizedOrderSummary[]>([]);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [titleHighlightId, setTitleHighlightId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [interactiveActions, setInteractiveActions] = useState<
    ChatAgentSuggestedAction[]
  >([]);
  const [inChatAssessment, setInChatAssessment] =
    useState<InChatAssessmentState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [topTitleHighlight, setTopTitleHighlight] = useState(false);
  const [actionMemory, setActionMemory] = useState<ActionMemoryMap>(() =>
    readActionMemory()
  );

  return {
    sessions,
    setSessions,
    activeId,
    setActiveId,
    profile,
    setProfile,
    input,
    setInput,
    loading,
    setLoading,
    showSettings,
    setShowSettings,
    showProfileBanner,
    setShowProfileBanner,
    profileLoaded,
    setProfileLoaded,
    drawerVisible,
    setDrawerVisible,
    drawerOpen,
    setDrawerOpen,
    localCheckAi,
    setLocalCheckAi,
    localAssessCats,
    setLocalAssessCats,
    assessResult,
    setAssessResult,
    checkAiResult,
    setCheckAiResult,
    orders,
    setOrders,
    resultsLoaded,
    setResultsLoaded,
    titleHighlightId,
    setTitleHighlightId,
    suggestions,
    setSuggestions,
    interactiveActions,
    setInteractiveActions,
    inChatAssessment,
    setInChatAssessment,
    actionLoading,
    setActionLoading,
    titleLoading,
    setTitleLoading,
    titleError,
    setTitleError,
    topTitleHighlight,
    setTopTitleHighlight,
    actionMemory,
    setActionMemory,
  };
}
