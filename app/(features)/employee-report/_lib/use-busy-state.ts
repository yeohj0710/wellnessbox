"use client";

import { useState } from "react";

export function useBusyState() {
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");

  function beginBusy(message: string) {
    setBusyMessage(message);
    setBusy(true);
  }

  function endBusy() {
    setBusy(false);
    setBusyMessage("");
  }

  return {
    busy,
    busyMessage,
    beginBusy,
    endBusy,
  };
}
