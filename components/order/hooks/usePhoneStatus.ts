import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LoginStatus } from "@/lib/useLoginStatus";
import {
  fetchMyPhoneStatusRequest,
  unlinkMyPhoneRequest,
} from "@/lib/client/phone-api";
import { formatPhoneDisplay } from "@/lib/client/phone-format";

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
        const result = await fetchMyPhoneStatusRequest();

        if (!result.ok) {
          setPhone("");
          setLinkedAt(undefined);
          if (result.status !== 401) {
            setPhoneStatusError(
              result.data?.ok === false
                ? "전화번호 정보를 불러오지 못했어요."
                : result.data?.error || `HTTP ${result.status}`
            );
          }
          return;
        }

        setPhone(
          typeof result.data.phone === "string" ? result.data.phone : ""
        );
        setLinkedAt(
          typeof result.data.linkedAt === "string"
            ? result.data.linkedAt
            : undefined
        );
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
      const result = await unlinkMyPhoneRequest();
      const data = result.data;

      if (!result.ok) {
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
