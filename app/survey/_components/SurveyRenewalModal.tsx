import ModalLayer from "@/components/common/modalLayer";

type SurveyRenewalModalProps = {
  open: boolean;
  title: string;
  description1: string;
  description2: string;
  closeText: string;
  confirmText: string;
  onClose: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

export default function SurveyRenewalModal({
  open,
  title,
  description1,
  description2,
  closeText,
  confirmText,
  onClose,
  onHoldStart,
  onHoldEnd,
}: SurveyRenewalModalProps) {
  if (!open) return null;

  return (
    <ModalLayer open={open}>
      <div
        data-testid="survey-renewal-modal"
        className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-[2px]"
      >
        <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6">
        <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description1}</p>
        <p className="mt-1 text-sm text-slate-600">{description2}</p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            data-testid="survey-renewal-close-button"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
          >
            {closeText}
          </button>
          <button
            type="button"
            onMouseDown={onHoldStart}
            onMouseUp={onHoldEnd}
            onMouseLeave={onHoldEnd}
            onTouchStart={onHoldStart}
            onTouchEnd={onHoldEnd}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onHoldStart();
            }}
            onKeyUp={(event) => {
              if (event.key === "Enter" || event.key === " ") onHoldEnd();
            }}
            data-testid="survey-renewal-confirm-button"
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
