import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LoginStatus } from "@/lib/useLoginStatus";

export function formatPhoneDisplay(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function usePhoneStatus(loginStatus: LoginStatus | null) {
  const phoneStatusRequestRef = useRef<Promise<void> | null>(null);
  const [phone, setPhone] = useState("");
  const [linkedAt, setLinkedAt] = useState<string | undefined>();
  const [phoneStatusLoading, setPhoneStatusLoading] = useState(true);
  const [phoneStatusError, setPhoneStatusError] = useState<string | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const fetchPhoneStatus = useCallback(async () => {
    if (phoneStatusRequestRef.current) {
      await phoneStatusRequestRef.current;
      return;
    }

    phoneStatusRequestRef.current = (async () => {
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
          setPhone("");
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

        setPhone(typeof data.phone === "string" ? data.phone : "");
        setLinkedAt(typeof data.linkedAt === "string" ? data.linkedAt : undefined);
      } catch (error) {
        setPhoneStatusError(error instanceof Error ? error.message : String(error));
        setPhone("");
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
  }, []);

  const unlinkPhone = useCallback(async () => {
    if (unlinkLoading) return false;

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
        return false;
      }

      setPhone("");
      setLinkedAt(undefined);
      await fetchPhoneStatus();
      return true;
    } catch (error) {
      setUnlinkError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setUnlinkLoading(false);
    }
  }, [fetchPhoneStatus, unlinkLoading]);

  const phoneDisplay = useMemo(() => formatPhoneDisplay(phone), [phone]);
  const isPhoneLinked = useMemo(
    () => Boolean(phone && linkedAt),
    [phone, linkedAt]
  );

  useEffect(() => {
    if (loginStatus === null) return;
    fetchPhoneStatus();
  }, [fetchPhoneStatus, loginStatus]);

  return {
    phone,
    setPhone,
    linkedAt,
    setLinkedAt,
    phoneDisplay,
    isPhoneLinked,
    phoneStatusLoading,
    phoneStatusError,
    unlinkLoading,
    unlinkError,
    setUnlinkError,
    fetchPhoneStatus,
    unlinkPhone,
  };
}
