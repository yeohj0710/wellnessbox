"use client";

import { useEffect, useState } from "react";
import { subscribeAuthSyncEvent } from "@/lib/client/auth-sync";
import { fetchLoginStatus } from "./api";

export function useAdminLoginStatus() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

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
      scopes: ["user-session"],
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return isAdminLoggedIn;
}
