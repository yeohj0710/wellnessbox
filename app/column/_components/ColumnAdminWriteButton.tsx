"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EMPTY_LOGIN_STATUS, getLoginStatus, type LoginStatus } from "@/lib/useLoginStatus";
import { subscribeAuthSyncEvent } from "@/lib/client/auth-sync";

export default function ColumnAdminWriteButton() {
  const [status, setStatus] = useState<LoginStatus>(EMPTY_LOGIN_STATUS);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      void getLoginStatus(controller.signal)
        .then((next) => setStatus(next))
        .catch(() => undefined);
    };

    refresh();
    const unsubscribe = subscribeAuthSyncEvent(refresh, {
      scopes: ["user-session"],
    });

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, []);

  if (!status.isAdminLoggedIn) return null;

  return (
    <Link
      href="/admin/column/editor"
      className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-100"
    >
      글쓰기
    </Link>
  );
}
