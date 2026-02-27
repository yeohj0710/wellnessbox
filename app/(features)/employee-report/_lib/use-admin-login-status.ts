"use client";

import { useEffect, useState } from "react";
import { fetchLoginStatus } from "./api";

export function useAdminLoginStatus() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetchLoginStatus()
      .then((status) => {
        if (!mounted) return;
        setIsAdminLoggedIn(status.isAdminLoggedIn === true);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  return isAdminLoggedIn;
}
