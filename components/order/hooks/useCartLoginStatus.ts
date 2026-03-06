import { useCallback, useEffect, useMemo, useState } from "react";
import { getLoginStatus, type LoginStatus } from "@/lib/useLoginStatus";
import { subscribeAuthSyncEvent } from "@/lib/client/auth-sync";

const EMPTY_LOGIN_STATUS: LoginStatus = {
  isUserLoggedIn: false,
  isPharmLoggedIn: false,
  isRiderLoggedIn: false,
  isAdminLoggedIn: false,
  isTestLoggedIn: false,
};

export function useCartLoginStatus() {
  const [loginStatus, setLoginStatus] = useState<LoginStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getLoginStatus(controller.signal)
      .then((fetchedLoginStatus) => {
        setLoginStatus(fetchedLoginStatus);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const refreshLoginStatus = useCallback(async () => {
    try {
      const fetchedLoginStatus = await getLoginStatus();
      setLoginStatus(fetchedLoginStatus);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuthSyncEvent(
      () => {
        refreshLoginStatus();
      },
      { scopes: ["user-session"] }
    );
    return unsubscribe;
  }, [refreshLoginStatus]);

  const safeLoginStatus = useMemo<LoginStatus>(
    () => loginStatus ?? EMPTY_LOGIN_STATUS,
    [loginStatus]
  );

  return {
    loginStatus,
    safeLoginStatus,
  };
}
