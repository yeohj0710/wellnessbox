import { useEffect, type MutableRefObject } from "react";
import { isBrowserOnline } from "./useChat.browser";
import {
  type ActorRefs,
  type AllResultsBootstrapParams,
  initializeSessionBootstrap,
  type SessionBootstrapParams,
  syncAllResultsBootstrap,
  syncInitialProfile,
  syncRemoteSessionBootstrap,
} from "./useChat.bootstrap.helpers";

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
    const bootstrapParams: SessionBootstrapParams = {
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
    };

    initializeSessionBootstrap(bootstrapParams);

    void syncRemoteSessionBootstrap({
      ...bootstrapParams,
      online: isBrowserOnline(),
    });

    void syncInitialProfile(bootstrapParams);
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
    setHealthLink,
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
    const aliveRef: MutableRefObject<boolean> = {
      current: true,
    };

    void syncAllResultsBootstrap({
      remoteBootstrap,
      online: true,
      signal: controller.signal,
      aliveRef,
      ...refs,
      setAssessResult,
      setCheckAiResult,
      setHealthLink,
      setOrders,
      setResultsLoaded,
    }).finally(() => {
      if (!aliveRef.current) return;
      setResultsLoaded(true);
    });

    return () => {
      aliveRef.current = false;
      controller.abort();
    };
  }, [
    remoteBootstrap,
    actorLoggedInRef,
    actorAppUserIdRef,
    actorPhoneLinkedRef,
    setAssessResult,
    setCheckAiResult,
    setHealthLink,
    setOrders,
    setResultsLoaded,
  ]);
}
