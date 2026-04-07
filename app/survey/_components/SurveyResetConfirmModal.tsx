import ModalLayer from "@/components/common/modalLayer";

type SurveyResetConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  cancelText: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function SurveyResetConfirmModal({
  open,
  title,
  description,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
}: SurveyResetConfirmModalProps) {
  if (!open) return null;

  return (
    <ModalLayer open={open}>
      <div
        data-testid="survey-reset-confirm-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-[2px]"
      >
        <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6">
        <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            data-testid="survey-reset-cancel-button"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="survey-reset-confirm-button"
            className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 hover:shadow-md active:scale-[0.99]"
          >
            {confirmText}
          </button>
        </div>
        </div>
      </div>
    </ModalLayer>
  );
}
