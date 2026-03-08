"use client";

import OperationLoadingOverlay from "@/components/common/operationLoadingOverlay";
import type { EditorAdminClientProps } from "./_lib/types";
import { useColumnEditorController } from "./_lib/use-column-editor-controller";
import { ColumnEditorHeader } from "./_components/ColumnEditorHeader";
import { ColumnEditorWorkspace } from "./_components/ColumnEditorWorkspace";
import { ColumnPostListSidebar } from "./_components/ColumnPostListSidebar";

export default function EditorAdminClient({ allowDevFileSave }: EditorAdminClientProps) {
  const { busyOverlayMessage, error, notice, isBusy, sidebarProps, workspaceProps } =
    useColumnEditorController({
      allowDevFileSave,
    });

  return (
    <section className="w-full min-h-[calc(100vh-7rem)] bg-[linear-gradient(180deg,_#f8fafc_0%,_#ecfeff_36%,_#ffffff_100%)]">
      <OperationLoadingOverlay
        visible={isBusy}
        title={busyOverlayMessage || "작업을 처리하고 있어요."}
        description="완료되면 편집 화면이 최신 상태로 갱신됩니다."
      />
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-10 sm:px-6">
        <ColumnEditorHeader />

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div
            data-testid="column-editor-notice"
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {notice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <ColumnPostListSidebar {...sidebarProps} />
          <ColumnEditorWorkspace {...workspaceProps} />
        </div>
      </div>
    </section>
  );
}
