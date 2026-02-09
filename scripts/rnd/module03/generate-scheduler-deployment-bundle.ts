// RND: Module 03 KPI #6 scheduler deployment bundle generator.

import fs from "node:fs";
import path from "node:path";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  cadenceCron: string;
  timezone: string;
  retentionMonths: number;
  requiredEnvKeys: string[];
  exportCommandTemplate: string;
  schemaMapPath: string;
  sqlTemplatePath: string;
  archiveDir: string;
  handoffDir: string;
  failureAlertDir: string;
  failureWebhookEnvKey: string;
  failureWebhookTimeoutEnvKey: string;
};

type Module03SchedulerDeploymentBundle = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_deployment_bundle";
  generatedAt: string;
  scheduler: {
    cadenceCron: string;
    timezone: string;
    npmScript: "rnd:module03:evaluation:adverse:ops:scheduler";
    commandTemplate: string;
    commandArgs: string[];
  };
  warehouse: {
    exportCommandTemplate: string;
    sqlTemplatePath: string;
    schemaMapPath: string;
    placeholders: string[];
  };
  secrets: {
    requiredEnvKeys: string[];
    failureWebhookEnvKey: string;
    failureWebhookTimeoutEnvKey: string;
    bindingsTemplate: Array<{
      envKey: string;
      secretRef: string;
    }>;
  };
  artifacts: {
    archiveDir: string;
    handoffDir: string;
    failureAlertDir: string;
  };
  verification: {
    dryRunCommandWithInput: string;
    expectedOutputs: string[];
  };
};

const DEFAULT_CADENCE_CRON = "0 3 1 * *";
const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_RETENTION_MONTHS = 18;
const DEFAULT_EXPORT_COMMAND_TEMPLATE = [
  "warehouse-cli export",
  '--window-end "{{window_end_utc}}"',
  '--sql-file "{{sql_template_path}}"',
  '--out "{{export_output_path}}"',
].join(" ");
const DEFAULT_SCHEMA_MAP_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "schema",
  "kpi06_pharmacovigilance_schema_map.json"
);
const DEFAULT_SQL_TEMPLATE_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "sql",
  "kpi06_adverse_events_last_12_months.sql"
);
const DEFAULT_ARCHIVE_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-monthly-archive"
);
const DEFAULT_HANDOFF_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-warehouse-handoff"
);
const DEFAULT_FAILURE_ALERT_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-failure-alerts"
);
const DEFAULT_FAILURE_WEBHOOK_ENV_KEY = "RND_MODULE03_FAILURE_WEBHOOK_URL";
const DEFAULT_FAILURE_WEBHOOK_TIMEOUT_ENV_KEY = "RND_MODULE03_FAILURE_WEBHOOK_TIMEOUT_MS";

function getArgValue(argv: string[], flag: string): string | null {
  const flagIndex = argv.indexOf(flag);
  if (flagIndex < 0) {
    return null;
  }

  const value = argv[flagIndex + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function assertNonEmptyString(value: string | null, fieldName: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

function parsePositiveInteger(value: string | null, fieldName: string, fallback: number): number {
  if (value === null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function normalizeIsoDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error("--generated-at must be a valid ISO-8601 datetime.");
  }
  return parsed.toISOString();
}

function assertCronExpression(value: string): string {
  const tokens = value.trim().split(/\s+/);
  if (tokens.length !== 5) {
    throw new Error("--cadence-cron must contain exactly 5 fields.");
  }
  return tokens.join(" ");
}

function assertEnvKey(value: string, fieldName: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${fieldName} must be a valid environment variable name.`);
  }
  return value;
}

function parseRequiredEnvKeys(value: string | null): string[] {
  if (!value) {
    return [];
  }

  const uniqueKeys = [...new Set(value.split(",").map((token) => token.trim()).filter(Boolean))];
  for (const key of uniqueKeys) {
    assertEnvKey(key, "--require-env");
  }
  return uniqueKeys;
}

function assertFileExists(filePath: string, fieldName: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${fieldName} file does not exist: ${filePath}`);
  }
  return filePath;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function toWorkspacePath(value: string): string {
  const relativePath = path.relative(process.cwd(), value);
  if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
    return toPosixPath(relativePath);
  }
  return toPosixPath(value);
}

function shellQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function parseArgs(argv: string[]): CliArgs {
  const generatedAt = normalizeIsoDate(getArgValue(argv, "--generated-at"));
  const outPath = getArgValue(argv, "--out");
  const cadenceCron = assertCronExpression(
    getArgValue(argv, "--cadence-cron") ?? DEFAULT_CADENCE_CRON
  );
  const timezone = assertNonEmptyString(getArgValue(argv, "--timezone") ?? DEFAULT_TIMEZONE, "--timezone");
  const retentionMonths = parsePositiveInteger(
    getArgValue(argv, "--retention-months"),
    "--retention-months",
    DEFAULT_RETENTION_MONTHS
  );
  const requiredEnvKeys = parseRequiredEnvKeys(getArgValue(argv, "--require-env"));
  const exportCommandTemplate =
    getArgValue(argv, "--export-command-template") ?? DEFAULT_EXPORT_COMMAND_TEMPLATE;
  const schemaMapPath = assertFileExists(
    path.resolve(getArgValue(argv, "--schema-map") ?? DEFAULT_SCHEMA_MAP_PATH),
    "--schema-map"
  );
  const sqlTemplatePath = assertFileExists(
    path.resolve(getArgValue(argv, "--sql-template") ?? DEFAULT_SQL_TEMPLATE_PATH),
    "--sql-template"
  );
  const archiveDir = path.resolve(getArgValue(argv, "--archive-dir") ?? DEFAULT_ARCHIVE_DIR);
  const handoffDir = path.resolve(getArgValue(argv, "--handoff-dir") ?? DEFAULT_HANDOFF_DIR);
  const failureAlertDir = path.resolve(
    getArgValue(argv, "--failure-alert-dir") ?? DEFAULT_FAILURE_ALERT_DIR
  );
  const failureWebhookEnvKey = assertEnvKey(
    getArgValue(argv, "--failure-webhook-env") ?? DEFAULT_FAILURE_WEBHOOK_ENV_KEY,
    "--failure-webhook-env"
  );
  const failureWebhookTimeoutEnvKey = assertEnvKey(
    getArgValue(argv, "--failure-webhook-timeout-env") ?? DEFAULT_FAILURE_WEBHOOK_TIMEOUT_ENV_KEY,
    "--failure-webhook-timeout-env"
  );

  return {
    outPath,
    generatedAt,
    cadenceCron,
    timezone,
    retentionMonths,
    requiredEnvKeys,
    exportCommandTemplate,
    schemaMapPath,
    sqlTemplatePath,
    archiveDir,
    handoffDir,
    failureAlertDir,
    failureWebhookEnvKey,
    failureWebhookTimeoutEnvKey,
  };
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

function buildBundle(args: CliArgs): Module03SchedulerDeploymentBundle {
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const commandArgs = buildCommandArgs(args);
  const commandTemplate = [
    "npm run rnd:module03:evaluation:adverse:ops:scheduler --",
    ...commandArgs.map((value) => shellQuote(value)),
  ].join(" ");

  const requiredEnvKeys = [...new Set([...args.requiredEnvKeys, args.failureWebhookEnvKey, args.failureWebhookTimeoutEnvKey])];

  return {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    kpiId: "kpi-06",
    artifact: "scheduler_deployment_bundle",
    generatedAt,
    scheduler: {
      cadenceCron: args.cadenceCron,
      timezone: args.timezone,
      npmScript: "rnd:module03:evaluation:adverse:ops:scheduler",
      commandTemplate,
      commandArgs,
    },
    warehouse: {
      exportCommandTemplate: args.exportCommandTemplate,
      sqlTemplatePath: toWorkspacePath(args.sqlTemplatePath),
      schemaMapPath: toWorkspacePath(args.schemaMapPath),
      placeholders: ["{{window_end_utc}}", "{{sql_template_path}}", "{{export_output_path}}"],
    },
    secrets: {
      requiredEnvKeys,
      failureWebhookEnvKey: args.failureWebhookEnvKey,
      failureWebhookTimeoutEnvKey: args.failureWebhookTimeoutEnvKey,
      bindingsTemplate: requiredEnvKeys.map((envKey) => ({
        envKey,
        secretRef: `secret://replace-with-your-secret-manager-path/${envKey.toLowerCase()}`,
      })),
    },
    artifacts: {
      archiveDir: toWorkspacePath(args.archiveDir),
      handoffDir: toWorkspacePath(args.handoffDir),
      failureAlertDir: toWorkspacePath(args.failureAlertDir),
    },
    verification: {
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
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildBundle(args);
  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;

  if (args.outPath) {
    const absoluteOutPath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absoluteOutPath), { recursive: true });
    fs.writeFileSync(absoluteOutPath, serialized, "utf8");
    console.log(`Wrote Module 03 KPI #6 scheduler deployment bundle: ${absoluteOutPath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
