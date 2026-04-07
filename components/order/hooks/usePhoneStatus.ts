"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LoginStatus } from "@/lib/useLoginStatus";
import {
  fetchMyPhoneStatusRequest,
  unlinkMyPhoneRequest,
} from "@/lib/client/phone-api";
import {
  emitAuthSyncEvent,
  subscribeAuthSyncEvent,
} from "@/lib/client/auth-sync";
import { formatPhoneDisplay } from "@/lib/client/phone-format";

const CHECKOUT_VERIFIED_PHONE_KEY = "checkoutVerifiedPhone";
const CHECKOUT_VERIFIED_AT_KEY = "checkoutVerifiedAt";

export function usePhoneStatus(loginStatus: LoginStatus | null) {
  const phoneStatusRequestRef = useRef<Promise<void> | null>(null);
  const [phone, setPhone] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem(CHECKOUT_VERIFIED_PHONE_KEY) ?? "";
  });
  const [linkedAt, setLinkedAt] = useState<string | undefined>();
  const [guestVerifiedAt, setGuestVerifiedAt] = useState<string | undefined>(
    () => {
      if (typeof window === "undefined") return undefined;
      return (
        window.sessionStorage.getItem(CHECKOUT_VERIFIED_AT_KEY) ?? undefined
      );
    }
  );
  const [phoneStatusLoading, setPhoneStatusLoading] = useState(true);
  const [phoneStatusError, setPhoneStatusError] = useState<string | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const clearGuestVerifiedPhone = useCallback(() => {
    setGuestVerifiedAt(undefined);

    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(CHECKOUT_VERIFIED_PHONE_KEY);
    window.sessionStorage.removeItem(CHECKOUT_VERIFIED_AT_KEY);
  }, []);

  const markPhoneVerified = useCallback((nextPhone: string) => {
    const verifiedAt = new Date().toISOString();

    setPhone(nextPhone);
    setLinkedAt(undefined);
    setGuestVerifiedAt(verifiedAt);

    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(CHECKOUT_VERIFIED_PHONE_KEY, nextPhone);
    window.sessionStorage.setItem(CHECKOUT_VERIFIED_AT_KEY, verifiedAt);
  }, []);

  const fetchPhoneStatus = useCallback(async () => {
    if (phoneStatusRequestRef.current) {
      await phoneStatusRequestRef.current;
      return;
    }

    phoneStatusRequestRef.current = (async () => {
      setPhoneStatusLoading(true);
      setPhoneStatusError(null);

      try {
        const result = await fetchMyPhoneStatusRequest();

        if (!result.ok) {
          if (!guestVerifiedAt) {
            setPhone("");
          }
          setLinkedAt(undefined);

          if (result.status !== 401) {
            setPhoneStatusError(
              result.data?.ok === false
                ? "휴대폰 정보를 불러오지 못했어요."
                : result.data?.error || `HTTP ${result.status}`
            );
          }
          return;
        }

        const nextPhone =
          typeof result.data.phone === "string" ? result.data.phone : "";
        const nextLinkedAt =
          typeof result.data.linkedAt === "string"
            ? result.data.linkedAt
            : undefined;

        if (nextPhone && nextLinkedAt) {
          setPhone(nextPhone);
          setLinkedAt(nextLinkedAt);
          clearGuestVerifiedPhone();
          return;
        }

        if (!guestVerifiedAt) {
          setPhone(nextPhone);
        }
        setLinkedAt(nextLinkedAt);
      } catch (error) {
        setPhoneStatusError(error instanceof Error ? error.message : String(error));
        if (!guestVerifiedAt) {
          setPhone("");
        }
        setLinkedAt(undefined);
      } finally {
        setPhoneStatusLoading(false);
      }
    })();

    try {
      await phoneStatusRequestRef.current;
    } finally {
      phoneStatusRequestRef.current = null;
    }
  }, [clearGuestVerifiedPhone, guestVerifiedAt]);

  const unlinkPhone = useCallback(async () => {
    if (unlinkLoading) return false;

    setUnlinkLoading(true);
    setUnlinkError(null);

    try {
      const result = await unlinkMyPhoneRequest();
      const data = result.data;

      if (!result.ok) {
        setUnlinkError(data.error || "휴대폰 연결 해제에 실패했어요.");
        return false;
      }

      setPhone("");
      setLinkedAt(undefined);
      clearGuestVerifiedPhone();
      await fetchPhoneStatus();
      emitAuthSyncEvent({ scope: "phone-link", reason: "unlink" });
      return true;
    } catch (error) {
      setUnlinkError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setUnlinkLoading(false);
    }
  }, [clearGuestVerifiedPhone, fetchPhoneStatus, unlinkLoading]);

  const phoneDisplay = useMemo(() => formatPhoneDisplay(phone), [phone]);
  const isPhoneLinked = useMemo(
    () => Boolean(phone && linkedAt),
    [phone, linkedAt]
  );
  const hasVerifiedPhone = useMemo(
    () => Boolean(phone && (linkedAt || guestVerifiedAt)),
    [guestVerifiedAt, linkedAt, phone]
  );

  useEffect(() => {
    if (loginStatus === null) return;
    void fetchPhoneStatus();
  }, [fetchPhoneStatus, loginStatus]);

  useEffect(() => {
    const unsubscribe = subscribeAuthSyncEvent(
      () => {
        if (loginStatus === null) return;
        void fetchPhoneStatus();
      },
      { scopes: ["user-session", "phone-link"] }
    );
    return unsubscribe;
  }, [fetchPhoneStatus, loginStatus]);

  return {
    phone,
    setPhone,
    linkedAt,
    setLinkedAt,
    guestVerifiedAt,
    hasVerifiedPhone,
    phoneDisplay,
    isPhoneLinked,
    phoneStatusLoading,
    phoneStatusError,
    unlinkLoading,
    unlinkError,
    setUnlinkError,
    fetchPhoneStatus,
    clearGuestVerifiedPhone,
    markPhoneVerified,
    unlinkPhone,
  };
}
