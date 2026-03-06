import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type UseB2bEmployeeDataBusyActionParams = {
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
};

type BusyActionOptions = {
  message: string;
  fallbackError: string;
  run: () => Promise<void>;
  clearError?: boolean;
  clearNotice?: boolean;
  successNotice?: string;
  onError?: (error: unknown, fallbackError: string) => void;
};

export type B2bEmployeeDataBusyActionOptions = BusyActionOptions;
export type B2bEmployeeDataRunBusyAction = (
  options: BusyActionOptions
) => Promise<void>;

export function useB2bEmployeeDataBusyAction({
  setError,
  setNotice,
}: UseB2bEmployeeDataBusyActionParams) {
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");

  const runBusyAction = useCallback<B2bEmployeeDataRunBusyAction>(
    async ({
      message,
      fallbackError,
      run,
      clearError = true,
      clearNotice = false,
      successNotice,
      onError,
    }: BusyActionOptions) => {
      setBusy(true);
      setBusyMessage(message);
      if (clearError) setError("");
      if (clearNotice) setNotice("");

      try {
        await run();
        if (successNotice) {
          setNotice(successNotice);
        }
      } catch (error) {
        if (onError) {
          onError(error, fallbackError);
        } else {
          setError(error instanceof Error ? error.message : fallbackError);
        }
      } finally {
        setBusy(false);
        setBusyMessage("");
      }
    },
    [setError, setNotice]
  );

  return {
    busy,
    busyMessage,
    runBusyAction,
  };
}
