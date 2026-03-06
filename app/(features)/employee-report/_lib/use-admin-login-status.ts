"use client";

import { useEffect, useState } from "react";
import { subscribeAuthSyncEvent } from "@/lib/client/auth-sync";
import { fetchLoginStatus } from "./api";

export function useAdminLoginStatus(initialIsAdminLoggedIn = false) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(initialIsAdminLoggedIn);

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void fetchLoginStatus()
        .then((status) => {
          if (!mounted) return;
          setIsAdminLoggedIn(status.isAdminLoggedIn === true);
        })
        .catch(() => undefined);
    };

    refresh();
    const unsubscribe = subscribeAuthSyncEvent(refresh, {
      scopes: ["user-session", "b2b-employee-session"],
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return isAdminLoggedIn;
}
