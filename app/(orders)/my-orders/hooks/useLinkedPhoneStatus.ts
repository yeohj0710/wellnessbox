"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchMyPhoneStatusRequest,
  unlinkMyPhoneRequest,
} from "@/lib/client/phone-api";
import {
  emitAuthSyncEvent,
  subscribeAuthSyncEvent,
} from "@/lib/client/auth-sync";

import { formatPhoneDisplay } from "../utils/formatPhoneDisplay";

const VERIFIED_LOOKUP_PHONE_STORAGE_KEY = "wbVerifiedLookupPhone";

function readVerifiedLookupPhone() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(VERIFIED_LOOKUP_PHONE_STORAGE_KEY) ?? "";
}

function writeVerifiedLookupPhone(phone: string) {
  if (typeof window === "undefined") return;
  if (phone) {
    sessionStorage.setItem(VERIFIED_LOOKUP_PHONE_STORAGE_KEY, phone);
    return;
  }
  sessionStorage.removeItem(VERIFIED_LOOKUP_PHONE_STORAGE_KEY);
}

export function useLinkedPhoneStatus() {
  const [linkedPhone, setLinkedPhone] = useState("");
  const [linkedAt, setLinkedAt] = useState<string | undefined>();
  const [verifiedLookupPhone, setVerifiedLookupPhone] = useState("");
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [phoneStatusLoading, setPhoneStatusLoading] = useState(true);
  const [phoneStatusError, setPhoneStatusError] = useState<string | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  useEffect(() => {
    setVerifiedLookupPhone(readVerifiedLookupPhone());
  }, []);

  const activePhone = useMemo(
    () => linkedPhone || verifiedLookupPhone,
    [linkedPhone, verifiedLookupPhone]
  );

  const linkedPhoneDisplay = useMemo(
    () => formatPhoneDisplay(activePhone),
    [activePhone]
  );

  const linkedPhoneNormalized = useMemo(
    () => activePhone.replace(/\D/g, ""),
    [activePhone]
  );

  const hasVerifiedPhone = useMemo(() => Boolean(activePhone), [activePhone]);
  const isPhoneLinked = useMemo(
    () => Boolean(linkedPhone && linkedAt),
    [linkedPhone, linkedAt]
  );

  const fetchPhoneStatus = useCallback(async () => {
    setPhoneStatusLoading(true);
    setPhoneStatusError(null);

    try {
      const result = await fetchMyPhoneStatusRequest();

      if (!result.ok) {
        setLinkedPhone("");
        setLinkedAt(undefined);
        if (result.status !== 401) {
          setVerifiedLookupPhone("");
          writeVerifiedLookupPhone("");
          setPhoneStatusError(
            result.data?.ok === false
              ? "전화번호 정보를 불러오지 못했어요."
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

      setLinkedPhone(nextPhone);
      setLinkedAt(nextLinkedAt);
      setVerifiedLookupPhone(nextPhone);
      writeVerifiedLookupPhone(nextPhone);
    } catch (err) {
      setPhoneStatusError(err instanceof Error ? err.message : String(err));
      setLinkedPhone("");
      setLinkedAt(undefined);
    } finally {
      setPhoneStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPhoneStatus();
  }, [fetchPhoneStatus]);

  const openVerifyModal = useCallback(() => {
    setIsVerifyOpen(true);
    setUnlinkError(null);
  }, []);

  const closeVerifyModal = useCallback(() => {
    if (unlinkLoading) return;
    setIsVerifyOpen(false);
  }, [unlinkLoading]);

  const handleUnlinkPhone = useCallback(async () => {
    if (unlinkLoading) return;

    setUnlinkLoading(true);
    setUnlinkError(null);

    try {
      const result = await unlinkMyPhoneRequest();
      const data = result.data;

      if (!result.ok) {
        setUnlinkError(
          data.error || "전화번호 연결 해제에 실패했어요."
        );
        return;
      }

      setLinkedPhone("");
      setLinkedAt(undefined);
      setVerifiedLookupPhone("");
      writeVerifiedLookupPhone("");
      setIsVerifyOpen(false);
      void fetchPhoneStatus();
      emitAuthSyncEvent({ scope: "phone-link", reason: "unlink" });
    } catch (err) {
      setUnlinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setUnlinkLoading(false);
    }
  }, [fetchPhoneStatus, unlinkLoading]);

  const handleLinkedFromModal = useCallback(
    (nextPhone: string, nextLinkedAt?: string) => {
      setLinkedPhone(nextPhone);
      setLinkedAt(nextLinkedAt);
      setVerifiedLookupPhone(nextPhone);
      writeVerifiedLookupPhone(nextPhone);
      setIsVerifyOpen(false);
      setUnlinkError(null);
      void fetchPhoneStatus();
      emitAuthSyncEvent({ scope: "phone-link", reason: "link" });
    },
    [fetchPhoneStatus]
  );

  useEffect(() => {
    const unsubscribe = subscribeAuthSyncEvent(
      () => {
        void fetchPhoneStatus();
      },
      { scopes: ["user-session", "phone-link"] }
    );
    return unsubscribe;
  }, [fetchPhoneStatus]);

  return {
    linkedPhone,
    linkedAt,
    hasVerifiedPhone,
    linkedPhoneDisplay,
    linkedPhoneNormalized,
    isPhoneLinked,
    phoneStatusLoading,
    phoneStatusError,
    isVerifyOpen,
    unlinkLoading,
    unlinkError,
    openVerifyModal,
    closeVerifyModal,
    handleUnlinkPhone,
    handleLinkedFromModal,
    fetchPhoneStatus,
  };
}
