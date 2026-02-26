import path from "node:path";
import {
  getMissingRequiredEnvKeys,
  normalizeError,
  summarizeWebhookTarget,
  toMonthToken,
  toPathSafeTimestamp,
  toPosixPath,
  toWorkspacePath,
  writeJsonFile,
  type Module03SchedulerFailureAlert,
  type Module03SchedulerFailureWebhookResult,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type { CliArgs } from "./orchestrate-adverse-event-evaluation-monthly-types";

type FailureAlertOptions = {
  moduleId: Module03SchedulerFailureAlert["module"];
  kpiId: Module03SchedulerFailureAlert["kpiId"];
  defaultFailureAlertDir: string;
  defaultFailureWebhookTimeoutMs: number;
};

async function deliverFailureWebhook(
  webhookUrl: string | null,
  timeoutMs: number,
  payload: Module03SchedulerFailureAlert
): Promise<Module03SchedulerFailureWebhookResult> {
  if (!webhookUrl) {
    return {
      attempted: false,
      delivered: false,
      target: null,
      timeoutMs,
      statusCode: null,
      responsePreview: null,
      errorMessage: null,
    };
  }

  const target = summarizeWebhookTarget(webhookUrl);
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });
    const responseText = await response.text();
    return {
      attempted: true,
      delivered: response.ok,
      target,
      timeoutMs,
      statusCode: response.status,
      responsePreview: responseText.slice(0, 500),
      errorMessage: response.ok ? null : `Webhook returned HTTP ${response.status}.`,
    };
  } catch (error: unknown) {
    return {
      attempted: true,
      delivered: false,
      target,
      timeoutMs,
      statusCode: null,
      responsePreview: null,
      errorMessage: normalizeError(error).message,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function emitFailureAlert(
  args: CliArgs | null,
  rawArgv: string[],
  error: unknown,
  options: FailureAlertOptions
): Promise<string> {
  const generatedAt = new Date().toISOString();
  const missingRequiredEnvKeys = getMissingRequiredEnvKeys(args?.requiredEnvKeys ?? []);
  const basePayload: Module03SchedulerFailureAlert = {
    module: options.moduleId,
    phase: "EVALUATION",
    kpiId: options.kpiId,
    artifact: "scheduler_failure_alert",
    generatedAt,
    windowEnd: args?.windowEnd ?? null,
    commandArgs: rawArgv,
    scheduler: {
      exportSource: args
        ? args.inputPath
          ? "provided_input"
          : args.exportCommand
            ? "scheduled_export"
            : "unknown"
        : "unknown",
      inputPath: args?.inputPath ? toWorkspacePath(args.inputPath) : null,
      archiveDir: args?.archiveDir ? toWorkspacePath(args.archiveDir) : null,
      handoffDir: args?.handoffDir ? toWorkspacePath(args.handoffDir) : null,
      requiredEnvKeys: args?.requiredEnvKeys ?? [],
      missingRequiredEnvKeys,
      failureWebhookConfigured: Boolean(args?.failureWebhookUrl),
      failureAlertDir: toWorkspacePath(
        args?.failureAlertDir ?? options.defaultFailureAlertDir
      ),
    },
    error: normalizeError(error),
    webhook: {
      attempted: false,
      delivered: false,
      target: summarizeWebhookTarget(args?.failureWebhookUrl ?? null),
      timeoutMs:
        args?.failureWebhookTimeoutMs ?? options.defaultFailureWebhookTimeoutMs,
      statusCode: null,
      responsePreview: null,
      errorMessage: null,
    },
  };

  const webhookResult = await deliverFailureWebhook(
    args?.failureWebhookUrl ?? null,
    args?.failureWebhookTimeoutMs ?? options.defaultFailureWebhookTimeoutMs,
    basePayload
  );
  const payload: Module03SchedulerFailureAlert = {
    ...basePayload,
    webhook: webhookResult,
  };

  const alertDir = args?.failureAlertDir ?? options.defaultFailureAlertDir;
  const alertMonth = toMonthToken(generatedAt);
  const alertPath = path.join(
    alertDir,
    alertMonth,
    `kpi06-scheduler-failure-${toPathSafeTimestamp(generatedAt)}.json`
  );
  writeJsonFile(alertPath, payload);
  writeJsonFile(path.join(alertDir, "latest.json"), {
    module: options.moduleId,
    phase: "EVALUATION",
    kpiId: options.kpiId,
    artifact: "scheduler_failure_alert_latest",
    generatedAt,
    alertPath: toPosixPath(path.relative(alertDir, alertPath)),
  });

  return alertPath;
}
