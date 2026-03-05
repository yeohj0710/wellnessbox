"use client";

import { useCallback, useState } from "react";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import ConfirmDialog from "./confirmDialog";

function resolveCurrentReturnToPath() {
  if (typeof window === "undefined") return "/";
  const { pathname, search, hash } = window.location;
  const composed = `${pathname}${search}${hash}`;
  if (!composed.startsWith("/") || composed.startsWith("//")) return "/";
  return composed;
}

export default function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogout = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    const returnTo = resolveCurrentReturnToPath();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setOpen(false);
      setLoading(false);
      emitAuthSyncEvent({ scope: "user-session", reason: "logout" });
      window.location.replace(returnTo);
    }
  }, [loading]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
        로그아웃
      </button>

      <ConfirmDialog
        open={open}
        title="로그아웃"
        description="로그아웃하면 다시 로그인해야 해요. 계속할까요?"
        confirmText="로그아웃"
        cancelText="취소"
        confirmLoading={loading}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        onConfirm={doLogout}
      />
    </>
  );
}
