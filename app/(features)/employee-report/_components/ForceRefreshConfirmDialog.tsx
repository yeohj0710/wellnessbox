type ForceRefreshConfirmDialogProps = {
  open: boolean;
  busy: boolean;
  confirmChecked: boolean;
  confirmText: string;
  canExecuteForceSync: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmCheckedChange: (value: boolean) => void;
  onConfirmTextChange: (value: string) => void;
};

export default function ForceRefreshConfirmDialog({
  open,
  busy,
  confirmChecked,
  confirmText,
  canExecuteForceSync,
  onClose,
  onConfirm,
  onConfirmCheckedChange,
  onConfirmTextChange,
}: ForceRefreshConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="employee-report-force-sync-dialog"
      aria-label="강제 재조회 확인"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900">강제 재조회 실행</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          캐시를 무시하고 재조회합니다. 추가 API 비용이 발생하며, 되돌릴 수 없습니다.
        </p>
        <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(event) => onConfirmCheckedChange(event.target.checked)}
            data-testid="employee-report-force-sync-checkbox"
            className="mt-1"
            disabled={busy}
          />
          비용 발생 가능성을 확인했고, 운영 목적에서만 실행합니다.
        </label>
        <p className="mt-3 text-xs text-slate-500">
          확인을 위해 아래 입력창에 <span className="font-semibold">강제 재조회</span>를
          입력해 주세요.
        </p>
        <input
          value={confirmText}
          onChange={(event) => onConfirmTextChange(event.target.value)}
          data-testid="employee-report-force-sync-input"
          placeholder="강제 재조회"
          disabled={busy}
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-300 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            data-testid="employee-report-force-sync-cancel"
            disabled={busy}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canExecuteForceSync || busy}
            onClick={onConfirm}
            data-testid="employee-report-force-sync-confirm"
            className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "실행 중..." : "강제 재조회 실행"}
          </button>
        </div>
      </div>
    </div>
  );
}
