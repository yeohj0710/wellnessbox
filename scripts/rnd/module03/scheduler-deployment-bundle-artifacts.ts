import { toWorkspacePath } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  KPI_ID,
  MODULE_ID,
  type CliArgs,
  type Module03SchedulerDeploymentBundle,
} from "./scheduler-deployment-bundle-types";

function shellQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildCommandArgs(args: CliArgs): string[] {
  const commandArgs = [
    "--export-command",
    args.exportCommandTemplate,
    "--schema-map",
    toWorkspacePath(args.schemaMapPath),
    "--sql-template",
    toWorkspacePath(args.sqlTemplatePath),
    "--archive-dir",
    toWorkspacePath(args.archiveDir),
    "--handoff-dir",
    toWorkspacePath(args.handoffDir),
    "--failure-alert-dir",
    toWorkspacePath(args.failureAlertDir),
    "--retention-months",
    String(args.retentionMonths),
    "--window-end",
    "{{scheduler_run_iso_utc}}",
    "--failure-webhook-url",
    `\${${args.failureWebhookEnvKey}}`,
    "--failure-webhook-timeout-ms",
    `\${${args.failureWebhookTimeoutEnvKey}}`,
  ];

  if (args.requiredEnvKeys.length > 0) {
    commandArgs.push("--require-env", args.requiredEnvKeys.join(","));
  }

  return commandArgs;
}

function buildCommandTemplate(commandArgs: string[]): string {
  return [
    "npm run rnd:module03:evaluation:adverse:ops:scheduler --",
    ...commandArgs.map((value) => shellQuote(value)),
  ].join(" ");
}

function resolveDeploymentRequiredEnvKeys(args: CliArgs): string[] {
  return [
    ...new Set([
      ...args.requiredEnvKeys,
      args.failureWebhookEnvKey,
      args.failureWebhookTimeoutEnvKey,
    ]),
  ];
}

function buildWarehouseSection(
  args: CliArgs
): Module03SchedulerDeploymentBundle["warehouse"] {
  return {
    exportCommandTemplate: args.exportCommandTemplate,
    sqlTemplatePath: toWorkspacePath(args.sqlTemplatePath),
    schemaMapPath: toWorkspacePath(args.schemaMapPath),
    placeholders: ["{{window_end_utc}}", "{{sql_template_path}}", "{{export_output_path}}"],
  };
}

function buildSecretsSection(
  args: CliArgs,
  requiredEnvKeys: string[]
): Module03SchedulerDeploymentBundle["secrets"] {
  return {
    requiredEnvKeys,
    failureWebhookEnvKey: args.failureWebhookEnvKey,
    failureWebhookTimeoutEnvKey: args.failureWebhookTimeoutEnvKey,
    bindingsTemplate: requiredEnvKeys.map((envKey) => ({
      envKey,
      secretRef: `secret://replace-with-your-secret-manager-path/${envKey.toLowerCase()}`,
    })),
  };
}

function buildArtifactsSection(
  args: CliArgs
): Module03SchedulerDeploymentBundle["artifacts"] {
  return {
    archiveDir: toWorkspacePath(args.archiveDir),
    handoffDir: toWorkspacePath(args.handoffDir),
    failureAlertDir: toWorkspacePath(args.failureAlertDir),
  };
}

function buildVerificationSection(
  args: CliArgs
): Module03SchedulerDeploymentBundle["verification"] {
  return {
    dryRunCommandWithInput: [
      "npm run rnd:module03:evaluation:adverse:ops:scheduler --",
      '--input "tmp/rnd/module03/sample-export.json"',
      `--schema-map "${toWorkspacePath(args.schemaMapPath)}"`,
      `--archive-dir "${toWorkspacePath(args.archiveDir)}"`,
      `--handoff-dir "${toWorkspacePath(args.handoffDir)}"`,
      `--failure-alert-dir "${toWorkspacePath(args.failureAlertDir)}"`,
      `--retention-months ${args.retentionMonths}`,
      `--window-end "{{scheduler_run_iso_utc}}"`,
    ].join(" "),
    expectedOutputs: [
      `${toWorkspacePath(args.archiveDir)}/latest.json`,
      `${toWorkspacePath(args.archiveDir)}/archive-manifest.json`,
      `${toWorkspacePath(args.handoffDir)}/latest.json`,
    ],
  };
}

export function buildBundle(args: CliArgs): Module03SchedulerDeploymentBundle {
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const commandArgs = buildCommandArgs(args);
  const commandTemplate = buildCommandTemplate(commandArgs);
  const requiredEnvKeys = resolveDeploymentRequiredEnvKeys(args);

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_deployment_bundle",
    generatedAt,
    scheduler: {
      cadenceCron: args.cadenceCron,
      timezone: args.timezone,
      npmScript: "rnd:module03:evaluation:adverse:ops:scheduler",
      commandTemplate,
      commandArgs,
    },
    warehouse: buildWarehouseSection(args),
    secrets: buildSecretsSection(args, requiredEnvKeys),
    artifacts: buildArtifactsSection(args),
    verification: buildVerificationSection(args),
  };
}
