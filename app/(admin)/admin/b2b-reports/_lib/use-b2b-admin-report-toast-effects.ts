import { useEffect } from "react";

type UseB2bAdminReportToastEffectsInput = {
  error: string;
  notice: string;
  setError: (next: string) => void;
  setNotice: (next: string) => void;
  showToast: (
    message: string,
    options: {
      type: "success" | "error";
      duration: number;
    }
  ) => void;
};

export function useB2bAdminReportToastEffects({
  error,
  notice,
  setError,
  setNotice,
  showToast,
}: UseB2bAdminReportToastEffectsInput) {
  useEffect(() => {
    const text = notice.trim();
    if (!text) return;
    showToast(text, { type: "success", duration: 3200 });
    setNotice("");
  }, [notice, setNotice, showToast]);

  useEffect(() => {
    const text = error.trim();
    if (!text) return;
    showToast(text, { type: "error", duration: 5000 });
    setError("");
  }, [error, setError, showToast]);
}
