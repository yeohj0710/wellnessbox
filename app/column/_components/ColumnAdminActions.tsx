"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/components/common/toastContext.client";

type ColumnAdminActionsProps = {
  postId: string | null;
  title: string;
  className?: string;
  showListLink?: boolean;
  redirectAfterDelete?: string;
  onDeleted?: (postId: string) => void;
};

async function readDeleteErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return payload.error || "칼럼 삭제에 실패했습니다.";
}

export default function ColumnAdminActions({
  postId,
  title,
  className = "",
  showListLink = false,
  redirectAfterDelete,
  onDeleted,
}: ColumnAdminActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const canDelete = Boolean(postId);
  const canConfirmDelete = useMemo(
    () => confirmText.trim() === "삭제" && !isDeleting,
    [confirmText, isDeleting]
  );

  async function handleDelete() {
    if (!postId || !canConfirmDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/column/posts/${postId}`, {
        method: "DELETE",
        headers: { "Cache-Control": "no-store" },
        cache: "no-store",
      });
      if (!response.ok) {
        const message = await readDeleteErrorMessage(response);
        throw new Error(message);
      }

      showToast("칼럼을 삭제했습니다.", { type: "success" });
      onDeleted?.(postId);
      setConfirmOpen(false);
      setConfirmText("");

      if (redirectAfterDelete) {
        router.push(redirectAfterDelete);
      } else {
        router.refresh();
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "칼럼 삭제에 실패했습니다.", {
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (!postId && !showListLink) return null;

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {showListLink ? (
          <Link
            href="/column"
            data-testid="column-admin-list"
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            목록
          </Link>
        ) : null}
        {postId ? (
          <Link
            href={`/admin/column/editor?postId=${encodeURIComponent(postId)}`}
            data-testid="column-admin-edit"
            className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            수정
          </Link>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            data-testid="column-admin-delete-open"
            onClick={() => setConfirmOpen(true)}
            className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            삭제
          </button>
        ) : null}
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="칼럼 삭제 확인"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">칼럼 삭제</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              <span className="font-semibold text-slate-900">{title}</span> 글을 삭제합니다.
              삭제 후 복구할 수 없습니다.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              확인을 위해 아래 입력창에 <span className="font-semibold">삭제</span>를
              입력해 주세요.
            </p>
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="삭제"
              data-testid="column-admin-delete-confirm-input"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-300"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  if (isDeleting) return;
                  setConfirmOpen(false);
                  setConfirmText("");
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!canConfirmDelete}
                data-testid="column-admin-delete-confirm-submit"
                onClick={() => void handleDelete()}
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                {isDeleting ? "삭제 중..." : "삭제 실행"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
