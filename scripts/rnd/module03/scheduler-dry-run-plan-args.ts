import fs from "node:fs";
import { parsePositiveInteger } from "./cli-helpers";
import type {
  CliArgs,
  Module03SchedulerInfraBindingArtifact,
  SchedulerDryRunPlan,
} from "./scheduler-dry-run-types";
import { resolveArtifactPath } from "./scheduler-dry-run-infra";

function readSchedulerFlagValue(commandArgs: string[], flag: string): string | null {
  for (let index = 0; index < commandArgs.length; index += 1) {
    if (commandArgs[index] !== flag) {
      continue;
    }
    const value = commandArgs[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Infra-binding scheduler command arg ${flag} is missing a value.`);
    }
    return value;
  }
  return null;
}

function getMissingRequiredEnvKeys(requiredEnvKeys: string[]): string[] {
  return requiredEnvKeys.filter((envKey) => {
    const value = process.env[envKey];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function resolveSchedulerArtifactPaths(
  infraBinding: Module03SchedulerInfraBindingArtifact
): {
  schemaMapPath: string;
  archiveDir: string;
  handoffDir: string;
  failureAlertDir: string;
} {
  const schemaMapPath = resolveArtifactPath(infraBinding.warehouse.schemaMapPath);
  if (!fs.existsSync(schemaMapPath)) {
    throw new Error(`Schema map path from infra binding does not exist: ${schemaMapPath}`);
  }

  return {
    schemaMapPath,
    archiveDir: resolveArtifactPath(infraBinding.artifacts.archiveDir),
    handoffDir: resolveArtifactPath(infraBinding.artifacts.handoffDir),
    failureAlertDir: resolveArtifactPath(infraBinding.artifacts.failureAlertDir),
  };
}

function buildBaseSchedulerArgs(
  args: CliArgs,
  artifactPaths: {
    schemaMapPath: string;
    archiveDir: string;
    handoffDir: string;
    failureAlertDir: string;
  }
): string[] {
  return [
    "--input",
    args.inputPath,
    "--schema-map",
    artifactPaths.schemaMapPath,
    "--archive-dir",
    artifactPaths.archiveDir,
    "--handoff-dir",
    artifactPaths.handoffDir,
    "--failure-alert-dir",
    artifactPaths.failureAlertDir,
    "--window-end",
    args.windowEnd,
  ];
}

function applyRetentionMonthsArg(
  schedulerArgs: string[],
  commandArgs: string[]
): number | null {
  const retentionMonthsValue = readSchedulerFlagValue(commandArgs, "--retention-months");
  const appliedRetentionMonths = retentionMonthsValue
    ? parsePositiveInteger(
        retentionMonthsValue,
        "infraBinding.scheduler.commandArgs(--retention-months)"
      )
    : null;
  if (appliedRetentionMonths !== null) {
    schedulerArgs.push("--retention-months", String(appliedRetentionMonths));
  }
  return appliedRetentionMonths;
}

function applyRequiredEnvArg(
  schedulerArgs: string[],
  strictEnv: boolean,
  requiredEnvKeys: string[]
): string[] {
  const missingRequiredEnvKeys = getMissingRequiredEnvKeys(requiredEnvKeys);
  if (strictEnv && missingRequiredEnvKeys.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingRequiredEnvKeys.join(", ")}.`
    );
  }
  if (strictEnv && requiredEnvKeys.length > 0) {
    schedulerArgs.push("--require-env", requiredEnvKeys.join(","));
  }
  return missingRequiredEnvKeys;
}

function applyFailureWebhookArgs(
  schedulerArgs: string[],
  infraBinding: Module03SchedulerInfraBindingArtifact
): void {
  const failureWebhookUrlValue = process.env[infraBinding.secrets.failureWebhookEnvKey]?.trim();
  if (failureWebhookUrlValue) {
    schedulerArgs.push("--failure-webhook-url", failureWebhookUrlValue);
  }

  const failureWebhookTimeoutValue =
    process.env[infraBinding.secrets.failureWebhookTimeoutEnvKey]?.trim();
  if (failureWebhookTimeoutValue) {
    const timeoutMs = parsePositiveInteger(
      failureWebhookTimeoutValue,
      `env:${infraBinding.secrets.failureWebhookTimeoutEnvKey}`
    );
    schedulerArgs.push("--failure-webhook-timeout-ms", String(timeoutMs));
  }
}

export function buildSchedulerArgs(
  args: CliArgs,
  infraBinding: Module03SchedulerInfraBindingArtifact
): SchedulerDryRunPlan {
  const artifactPaths = resolveSchedulerArtifactPaths(infraBinding);
  const schedulerArgs = buildBaseSchedulerArgs(args, artifactPaths);
  const appliedRetentionMonths = applyRetentionMonthsArg(
    schedulerArgs,
    infraBinding.scheduler.commandArgs
  );
  const missingRequiredEnvKeys = applyRequiredEnvArg(
    schedulerArgs,
    args.strictEnv,
    infraBinding.secrets.requiredEnvKeys
  );
  applyFailureWebhookArgs(schedulerArgs, infraBinding);

  return {
    schedulerArgs,
    missingRequiredEnvKeys,
    appliedRetentionMonths,
  };
}
