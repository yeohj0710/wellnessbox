"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

export function useLoginStatus() {
  const [status, setStatus] = useState({
    isPharmLoggedIn: false,
    isRiderLoggedIn: false,
    isAdminLoggedIn: false,
    isTestLoggedIn: false,
  });
  useEffect(() => {
    setStatus({
      isPharmLoggedIn: !!Cookies.get("pharm"),
      isRiderLoggedIn: !!Cookies.get("rider"),
      isAdminLoggedIn: !!Cookies.get("admin"),
      isTestLoggedIn: !!Cookies.get("test"),
    });
  }, []);
  return status;
}
