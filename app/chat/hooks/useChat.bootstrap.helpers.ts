import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ChatSession, UserProfile } from "@/types/chat";
import type {
  NormalizedAssessResult,
  NormalizedCheckAiResult,
  NormalizedHealthLinkSummary,
  NormalizedOrderSummary,
} from "./useChat.results";
import {
  buildInitialSessionBootstrap,
  fetchAllResultsBootstrap,
  fetchRemoteSessionBootstrap,
  type BootstrapActorState,
  resolveInitialProfile,
} from "./useChat.lifecycle";
import { mergeServerSessions } from "./useChat.session";

export type ActorRefs = {
  actorLoggedInRef: MutableRefObject<boolean>;
  actorAppUserIdRef: MutableRefObject<string | null>;
  actorPhoneLinkedRef: MutableRefObject<boolean>;
};

export type SessionBootstrapParams = ActorRefs & {
  remoteBootstrap: boolean;
  activeIdRef: MutableRefObject<string | null>;
  readyToPersistRef: MutableRefObject<Record<string, boolean>>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  setActiveId: (id: string | null) => void;
  setProfile: (profile: UserProfile | undefined) => void;
  setShowProfileBanner: (show: boolean) => void;
  setProfileLoaded: (loaded: boolean) => void;
};

export type AllResultsBootstrapParams = ActorRefs & {
  remoteBootstrap: boolean;
  setAssessResult: Dispatch<SetStateAction<NormalizedAssessResult | null>>;
  setCheckAiResult: Dispatch<SetStateAction<NormalizedCheckAiResult | null>>;
  setHealthLink: Dispatch<SetStateAction<NormalizedHealthLinkSummary | null>>;
  setOrders: Dispatch<SetStateAction<NormalizedOrderSummary[]>>;
  setResultsLoaded: (loaded: boolean) => void;
};

export function applyBootstrapActor(
  actor: BootstrapActorState | null,
  refs: ActorRefs
) {
  if (!actor) return;
  refs.actorLoggedInRef.current = actor.loggedIn;
  refs.actorAppUserIdRef.current = actor.appUserId;
  refs.actorPhoneLinkedRef.current = actor.phoneLinked;
}

export function initializeSessionBootstrap(params: SessionBootstrapParams) {
  const initialState = buildInitialSessionBootstrap({
    actor: {
      loggedIn: params.actorLoggedInRef.current,
      appUserId: params.actorAppUserIdRef.current,
    },
  });

  params.readyToPersistRef.current = initialState.readyMap;
  params.setSessions(initialState.sessions);
  params.setActiveId(initialState.activeId);
}

export async function syncRemoteSessionBootstrap(
  params: SessionBootstrapParams & {
    online: boolean;
  }
) {
  const bootstrap = await fetchRemoteSessionBootstrap({
    enabled: params.remoteBootstrap,
    online: params.online,
  });
  if (!bootstrap) return;

  applyBootstrapActor(bootstrap.actor, params);
  if (!bootstrap.sessions.length) return;

  params.setSessions((prev) => {
    const merged = mergeServerSessions({
      prevSessions: prev,
      incomingSessions: bootstrap.sessions,
      currentReadyMap: params.readyToPersistRef.current,
      actor: {
        loggedIn: params.actorLoggedInRef.current,
        appUserId: params.actorAppUserIdRef.current,
      },
      currentActiveId: params.activeIdRef.current,
    });

    params.readyToPersistRef.current = merged.nextReadyMap;
    params.setActiveId(merged.nextActiveId);
    return merged.sessions;
  });
}

export async function syncInitialProfile(params: SessionBootstrapParams) {
  const resolved = await resolveInitialProfile(params.remoteBootstrap);
  params.setProfile(resolved);
  params.setShowProfileBanner(!resolved);
  params.setProfileLoaded(true);
}

export async function syncAllResultsBootstrap(
  params: AllResultsBootstrapParams & {
    online: boolean;
    signal: AbortSignal;
    aliveRef: MutableRefObject<boolean>;
  }
) {
  const normalized = await fetchAllResultsBootstrap({
    enabled: params.remoteBootstrap,
    online: params.online,
    signal: params.signal,
  });
  if (!params.aliveRef.current || !normalized) return;

  applyBootstrapActor(normalized.actor, params);
  params.setAssessResult(normalized.assessResult);
  params.setCheckAiResult(normalized.checkAiResult);
  params.setHealthLink(normalized.healthLink);
  params.setOrders(normalized.orders);
}
