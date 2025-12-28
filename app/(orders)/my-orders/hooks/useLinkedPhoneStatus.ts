"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatPhoneDisplay } from "../utils/formatPhoneDisplay";

export function useLinkedPhoneStatus() {
  const [linkedPhone, setLinkedPhone] = useState("");
  const [linkedAt, setLinkedAt] = useState<string | undefined>();
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [phoneStatusLoading, setPhoneStatusLoading] = useState(true);
  const [phoneStatusError, setPhoneStatusError] = useState<string | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const linkedPhoneDisplay = useMemo(
    () => formatPhoneDisplay(linkedPhone),
    [linkedPhone]
  );

  const linkedPhoneNormalized = useMemo(
    () => linkedPhone.replace(/\D/g, ""),
    [linkedPhone]
  );

  const isPhoneLinked = useMemo(
    () => Boolean(linkedPhone && linkedAt),
    [linkedPhone, linkedAt]
  );

  const fetchPhoneStatus = useCallback(async () => {
    setPhoneStatusLoading(true);
    setPhoneStatusError(null);

    try {
      const res = await fetch("/api/me/phone-status", {
        headers: { "Cache-Control": "no-store" },
      });

      const raw = await res.text();
      let data: { ok?: boolean; phone?: string; linkedAt?: string } = {};

      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        data = { ok: false };
      }

      if (!res.ok || data.ok === false) {
        setLinkedPhone("");
        setLinkedAt(undefined);
        if (res.status !== 401) {
          setPhoneStatusError(
            data?.ok === false
              ? "전화번호 정보를 불러오지 못했어요."
              : raw || `HTTP ${res.status}`
          );
        }
        return;
      }

      setLinkedPhone(typeof data.phone === "string" ? data.phone : "");
      setLinkedAt(typeof data.linkedAt === "string" ? data.linkedAt : undefined);
    } catch (err) {
      setPhoneStatusError(err instanceof Error ? err.message : String(err));
      setLinkedPhone("");
      setLinkedAt(undefined);
    } finally {
      setPhoneStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhoneStatus();
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
      const res = await fetch("/api/me/unlink-phone", {
        method: "POST",
        headers: { "Cache-Control": "no-store" },
      });
      const raw = await res.text();
      let data: { ok?: boolean; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false) {
        setUnlinkError(data.error || "전화번호 연결 해제에 실패했어요.");
        return;
      }

      setLinkedPhone("");
      setLinkedAt(undefined);
      setIsVerifyOpen(false);
      fetchPhoneStatus();
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
      setIsVerifyOpen(false);
      setUnlinkError(null);
      fetchPhoneStatus();
    },
    [fetchPhoneStatus]
  );

  return {
    linkedPhone,
    linkedAt,
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
