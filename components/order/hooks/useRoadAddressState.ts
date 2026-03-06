"use client";

import { useEffect, useState } from "react";

function readRoadAddress() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("roadAddress") || "").trim();
}

export function useRoadAddressState() {
  const [roadAddress, setRoadAddress] = useState(() => readRoadAddress());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAddress = () => setRoadAddress(readRoadAddress());
    syncAddress();
    window.addEventListener("addressUpdated", syncAddress);
    window.addEventListener("addressCleared", syncAddress);

    return () => {
      window.removeEventListener("addressUpdated", syncAddress);
      window.removeEventListener("addressCleared", syncAddress);
    };
  }, []);

  return {
    roadAddress,
    setRoadAddress,
  };
}
