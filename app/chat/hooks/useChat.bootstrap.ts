import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ChatSession, UserProfile } from "@/types/chat";
import { isBrowserOnline } from "./useChat.browser";
import {
  buildInitialSessionBootstrap,
  fetchAllResultsBootstrap,
  fetchRemoteSessionBootstrap,
  type BootstrapActorState,
  resolveInitialProfile,
} from "./useChat.lifecycle";
import { mergeServerSessions } from "./useChat.session";

type ActorRefs = {
  actorLoggedInRef: MutableRefObject<boolean>;
  actorAppUserIdRef: MutableRefObject<string | null>;
  actorPhoneLinkedRef: MutableRefObject<boolean>;
};

type SessionBootstrapParams = ActorRefs & {
  remoteBootstrap: boolean;
  activeIdRef: MutableRefObject<string | null>;
  readyToPersistRef: MutableRefObject<Record<string, boolean>>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  setActiveId: (id: string | null) => void;
  setProfile: (profile: UserProfile | undefined) => void;
  setShowProfileBanner: (show: boolean) => void;
  setProfileLoaded: (loaded: boolean) => void;
};

type AllResultsBootstrapParams = ActorRefs & {
  remoteBootstrap: boolean;
  setAssessResult: (result: any | null) => void;
  setCheckAiResult: (result: any | null) => void;
  setOrders: (orders: any[]) => void;
  setResultsLoaded: (loaded: boolean) => void;
};

function applyBootstrapActor(actor: BootstrapActorState | null, refs: ActorRefs) {
  if (!actor) return;
  refs.actorLoggedInRef.current = actor.loggedIn;
  refs.actorAppUserIdRef.current = actor.appUserId;
  refs.actorPhoneLinkedRef.current = actor.phoneLinked;
}

export function useSessionAndProfileBootstrap(params: SessionBootstrapParams) {
  const {
    remoteBootstrap,
    activeIdRef,
    readyToPersistRef,
    actorLoggedInRef,
    actorAppUserIdRef,
    actorPhoneLinkedRef,
    setSessions,
    setActiveId,
    setProfile,
    setShowProfileBanner,
    setProfileLoaded,
  } = params;

  useEffect(() => {
    const refs: ActorRefs = {
      actorLoggedInRef,
      actorAppUserIdRef,
      actorPhoneLinkedRef,
    };

    const initialState = buildInitialSessionBootstrap({
      actor: {
        loggedIn: actorLoggedInRef.current,
        appUserId: actorAppUserIdRef.current,
      },
    });
    readyToPersistRef.current = initialState.readyMap;
    setSessions(initialState.sessions);
    setActiveId(initialState.activeId);

    (async () => {
      const bootstrap = await fetchRemoteSessionBootstrap({
        enabled: remoteBootstrap,
        online: isBrowserOnline(),
      });
      if (!bootstrap) return;
      applyBootstrapActor(bootstrap.actor, refs);
      if (!bootstrap.sessions.length) return;

      setSessions((prev) => {
        const merged = mergeServerSessions({
          prevSessions: prev,
          incomingSessions: bootstrap.sessions,
          currentReadyMap: readyToPersistRef.current,
          actor: {
            loggedIn: actorLoggedInRef.current,
            appUserId: actorAppUserIdRef.current,
          },
          currentActiveId: activeIdRef.current,
        });

        readyToPersistRef.current = merged.nextReadyMap;
        setActiveId(merged.nextActiveId);
        return merged.sessions;
      });
    })();

    (async () => {
      const resolved = await resolveInitialProfile(remoteBootstrap);
      setProfile(resolved);
      setShowProfileBanner(!resolved);
      setProfileLoaded(true);
    })();
  }, [
    remoteBootstrap,
    activeIdRef,
    readyToPersistRef,
    actorLoggedInRef,
    actorAppUserIdRef,
    actorPhoneLinkedRef,
    setSessions,
    setActiveId,
    setProfile,
    setShowProfileBanner,
    setProfileLoaded,
  ]);
}

export function useAllResultsBootstrap(params: AllResultsBootstrapParams) {
  const {
    remoteBootstrap,
    actorLoggedInRef,
    actorAppUserIdRef,
    actorPhoneLinkedRef,
    setAssessResult,
    setCheckAiResult,
    setOrders,
    setResultsLoaded,
  } = params;

  useEffect(() => {
    if (!remoteBootstrap || !isBrowserOnline()) {
      setResultsLoaded(true);
      return;
    }

    const refs: ActorRefs = {
      actorLoggedInRef,
      actorAppUserIdRef,
      actorPhoneLinkedRef,
    };
    const controller = new AbortController();
    let alive = true;

    fetchAllResultsBootstrap({
      enabled: remoteBootstrap,
      online: true,
      signal: controller.signal,
    })
      .then((normalized) => {
        if (!alive || !normalized) return;
        applyBootstrapActor(normalized.actor, refs);
        setAssessResult(normalized.assessResult);
        setCheckAiResult(normalized.checkAiResult);
        setOrders(normalized.orders);
      })
      .finally(() => {
        if (!alive) return;
        setResultsLoaded(true);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [
    remoteBootstrap,
    actorLoggedInRef,
    actorAppUserIdRef,
    actorPhoneLinkedRef,
    setAssessResult,
    setCheckAiResult,
    setOrders,
    setResultsLoaded,
  ]);
}
