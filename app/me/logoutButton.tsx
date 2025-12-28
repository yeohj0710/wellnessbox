"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import ConfirmDialog from "./confirmDialog";

export default function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogout = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setOpen(false);
      setLoading(false);
      window.location.replace("/");
    }
  }, [loading, router]);

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
