import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export type B2bAdminReportBusyActionOptions = {
  fallbackError: string;
  clearNotice?: boolean;
  onError?: (error: unknown, fallbackError: string) => void;
  run: () => Promise<void>;
};

export type B2bAdminReportRunBusyAction = (
  options: B2bAdminReportBusyActionOptions
) => Promise<void>;

type UseB2bAdminReportBusyActionParams = {
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
};

export function useB2bAdminReportBusyAction({
  setError,
  setNotice,
}: UseB2bAdminReportBusyActionParams) {
  const [busy, setBusy] = useState(false);

  const runBusyAction = useCallback<B2bAdminReportRunBusyAction>(
    async ({ fallbackError, clearNotice = false, onError, run }) => {
      setBusy(true);
      setError("");
      if (clearNotice) {
        setNotice("");
      }
      try {
        await run();
      } catch (error) {
        if (onError) {
          onError(error, fallbackError);
          return;
        }
        setError(error instanceof Error ? error.message : fallbackError);
      } finally {
        setBusy(false);
      }
    },
    [setError, setNotice]
  );

  return {
    busy,
    runBusyAction,
  };
}
