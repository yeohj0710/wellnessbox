// RND: Module 03 KPI #6 scheduler orchestration runner with warehouse export handoff artifacts.

import {
  normalizeError,
  toWorkspacePath,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  DEFAULT_FAILURE_ALERT_DIR,
  DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS,
  parseArgs,
} from "./orchestrate-adverse-event-evaluation-monthly-cli";
import { emitFailureAlert } from "./orchestrate-adverse-event-evaluation-monthly-failure-alert";
import { runScheduler } from "./orchestrate-adverse-event-evaluation-monthly-runtime";
import type {
  CliArgs,
} from "./orchestrate-adverse-event-evaluation-monthly-types";
import { KPI_ID, MODULE_ID } from "./orchestrate-adverse-event-evaluation-monthly-types";

async function main() {
  const rawArgv = process.argv.slice(2);
  let args: CliArgs | null = null;

  try {
    args = parseArgs(rawArgv);
    runScheduler(args);
  } catch (error: unknown) {
    try {
      const alertPath = await emitFailureAlert(args, rawArgv, error, {
        moduleId: MODULE_ID,
        kpiId: KPI_ID,
        defaultFailureAlertDir: DEFAULT_FAILURE_ALERT_DIR,
        defaultFailureWebhookTimeoutMs: DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS,
      });
      console.error(
        `Wrote Module 03 KPI #6 scheduler failure alert: ${toWorkspacePath(alertPath)}`
      );
    } catch (alertError: unknown) {
      const normalizedAlertError = normalizeError(alertError);
      console.error(
        `Failed to write Module 03 KPI #6 scheduler failure alert: ${normalizedAlertError.message}`
      );
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  const normalizedError = normalizeError(error);
  console.error(normalizedError.message);
  process.exit(1);
});
