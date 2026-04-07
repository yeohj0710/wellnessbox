"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/types/chat";
import { useDraggableModal } from "@/components/common/useDraggableModal";

type UseProfileModalStateInput = {
  profile?: UserProfile;
  onClose: () => void;
};

export function useProfileModalState({
  profile,
  onClose,
}: UseProfileModalStateInput) {
  const [local, setLocal] = useState<UserProfile>({ ...(profile || {}) });
  const [confirmReset, setConfirmReset] = useState(false);
  const modalDrag = useDraggableModal(true, { resetOnOpen: true });
  const resetDialogDrag = useDraggableModal(confirmReset, { resetOnOpen: true });

  useEffect(() => {
    setLocal({ ...(profile || {}) });
  }, [profile]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmReset) setConfirmReset(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmReset, onClose]);

  const setField = useCallback(<K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setLocal((prev) => ({ ...(prev || {}), [key]: value }));
  }, []);

  return {
    local,
    setLocal,
    setField,
    confirmReset,
    setConfirmReset,
    modalDrag,
    resetDialogDrag,
  };
}
