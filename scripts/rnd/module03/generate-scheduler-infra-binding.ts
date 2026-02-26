// RND: Module 03 KPI #6 scheduler infra-binding artifact generator.

import fs from "node:fs";
import path from "node:path";
import {
  assertNonEmptyString,
  getArgValue,
  isPlainObject,
  normalizeIsoDate,
  readJsonFile,
  toWorkspacePath,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  assertEnvironmentVariableName,
  getArgValues,
  hasFlag,
} from "./cli-helpers";

type CliArgs = {
  bundlePath: string;
  outPath: string | null;
  generatedAt: string | null;
  schedulerName: string;
  environment: string;
  secretBindingsFilePath: string | null;
  secretBindingPairs: string[];
  allowPlaceholderSecretRefs: boolean;
};

type SchedulerDeploymentBundle = {
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

type SchedulerInfraBindingArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_infra_binding";
  generatedAt: string;
  environment: string;
  sourceBundlePath: string;
  scheduler: {
    name: string;
    cadenceCron: string;
    timezone: string;
    npmScript: "rnd:module03:evaluation:adverse:ops:scheduler";
    commandTemplate: string;
    commandArgs: string[];
  };
  secrets: {
    requiredEnvKeys: string[];
    boundEnvKeys: string[];
    missingEnvKeys: string[];
    failureWebhookEnvKey: string;
    failureWebhookTimeoutEnvKey: string;
    bindings: Array<{
      envKey: string;
      secretRef: string;
    }>;
  };
  warehouse: SchedulerDeploymentBundle["warehouse"];
  artifacts: SchedulerDeploymentBundle["artifacts"];
  verification: SchedulerDeploymentBundle["verification"];
};

const DEFAULT_SCHEDULER_NAME = "module03-kpi06-adverse-event-monthly";
const DEFAULT_ENVIRONMENT = "production";

function parseArgs(argv: string[]): CliArgs {
  const bundlePathValue = getArgValue(argv, "--bundle");
  const bundlePath = path.resolve(assertNonEmptyString(bundlePathValue, "--bundle"));
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`--bundle file does not exist: ${bundlePath}`);
  }

  const outPath = getArgValue(argv, "--out");
  const generatedAtRaw = getArgValue(argv, "--generated-at");
  const generatedAt = generatedAtRaw
    ? normalizeIsoDate(generatedAtRaw, "--generated-at")
    : null;
  const schedulerName = assertNonEmptyString(
    getArgValue(argv, "--scheduler-name") ?? DEFAULT_SCHEDULER_NAME,
    "--scheduler-name"
  );
  const environment = assertNonEmptyString(
    getArgValue(argv, "--environment") ?? DEFAULT_ENVIRONMENT,
    "--environment"
  );

  const secretBindingsFilePathValue = getArgValue(argv, "--secret-bindings-file");
  const secretBindingsFilePath = secretBindingsFilePathValue
    ? path.resolve(secretBindingsFilePathValue)
    : null;
  if (secretBindingsFilePath && !fs.existsSync(secretBindingsFilePath)) {
    throw new Error(`--secret-bindings-file does not exist: ${secretBindingsFilePath}`);
  }

  return {
    bundlePath,
    outPath,
    generatedAt,
    schedulerName,
    environment,
    secretBindingsFilePath,
    secretBindingPairs: getArgValues(argv, "--secret-binding"),
    allowPlaceholderSecretRefs: hasFlag(argv, "--allow-placeholder-secret-ref"),
  };
}

function parseSchedulerDeploymentBundle(raw: unknown, sourcePath: string): SchedulerDeploymentBundle {
  if (!isPlainObject(raw)) {
    throw new Error(`Bundle file must be a JSON object: ${sourcePath}`);
  }

  const moduleId = raw.module;
  const phase = raw.phase;
  const kpiId = raw.kpiId;
  const artifact = raw.artifact;
  if (moduleId !== "03_personal_safety_validation_engine") {
    throw new Error(
      `Bundle module must be "03_personal_safety_validation_engine", received "${String(moduleId)}".`
    );
  }
  if (phase !== "EVALUATION") {
    throw new Error(`Bundle phase must be "EVALUATION", received "${String(phase)}".`);
  }
  if (kpiId !== "kpi-06") {
    throw new Error(`Bundle kpiId must be "kpi-06", received "${String(kpiId)}".`);
  }
  if (artifact !== "scheduler_deployment_bundle") {
    throw new Error(
      `Bundle artifact must be "scheduler_deployment_bundle", received "${String(artifact)}".`
    );
  }

  if (!isPlainObject(raw.scheduler)) {
    throw new Error("Bundle scheduler must be an object.");
  }
  if (!isPlainObject(raw.warehouse)) {
    throw new Error("Bundle warehouse must be an object.");
  }
  if (!isPlainObject(raw.secrets)) {
    throw new Error("Bundle secrets must be an object.");
  }
  if (!isPlainObject(raw.artifacts)) {
    throw new Error("Bundle artifacts must be an object.");
  }
  if (!isPlainObject(raw.verification)) {
    throw new Error("Bundle verification must be an object.");
  }

  const schedulerCommandArgs = raw.scheduler.commandArgs;
  if (!Array.isArray(schedulerCommandArgs) || schedulerCommandArgs.some((value) => typeof value !== "string")) {
    throw new Error("Bundle scheduler.commandArgs must be a string array.");
  }
  const requiredEnvKeys = raw.secrets.requiredEnvKeys;
  if (!Array.isArray(requiredEnvKeys) || requiredEnvKeys.some((value) => typeof value !== "string")) {
    throw new Error("Bundle secrets.requiredEnvKeys must be a string array.");
  }
  const expectedOutputs = raw.verification.expectedOutputs;
  if (!Array.isArray(expectedOutputs) || expectedOutputs.some((value) => typeof value !== "string")) {
    throw new Error("Bundle verification.expectedOutputs must be a string array.");
  }
  const placeholders = raw.warehouse.placeholders;
  if (!Array.isArray(placeholders) || placeholders.some((value) => typeof value !== "string")) {
    throw new Error("Bundle warehouse.placeholders must be a string array.");
  }
  const bindingsTemplate = raw.secrets.bindingsTemplate;
  if (
    !Array.isArray(bindingsTemplate) ||
    bindingsTemplate.some(
      (entry) =>
        !isPlainObject(entry) ||
        typeof entry.envKey !== "string" ||
        typeof entry.secretRef !== "string"
    )
  ) {
    throw new Error("Bundle secrets.bindingsTemplate must be an array of { envKey, secretRef }.");
  }

  return {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    kpiId: "kpi-06",
    artifact: "scheduler_deployment_bundle",
    generatedAt: assertNonEmptyString(
      typeof raw.generatedAt === "string" ? raw.generatedAt : null,
      "bundle.generatedAt"
    ),
    scheduler: {
      cadenceCron: assertNonEmptyString(
        typeof raw.scheduler.cadenceCron === "string" ? raw.scheduler.cadenceCron : null,
        "bundle.scheduler.cadenceCron"
      ),
      timezone: assertNonEmptyString(
        typeof raw.scheduler.timezone === "string" ? raw.scheduler.timezone : null,
        "bundle.scheduler.timezone"
      ),
      npmScript: "rnd:module03:evaluation:adverse:ops:scheduler",
      commandTemplate: assertNonEmptyString(
        typeof raw.scheduler.commandTemplate === "string" ? raw.scheduler.commandTemplate : null,
        "bundle.scheduler.commandTemplate"
      ),
      commandArgs: schedulerCommandArgs,
    },
    warehouse: {
      exportCommandTemplate: assertNonEmptyString(
        typeof raw.warehouse.exportCommandTemplate === "string"
          ? raw.warehouse.exportCommandTemplate
          : null,
        "bundle.warehouse.exportCommandTemplate"
      ),
      sqlTemplatePath: assertNonEmptyString(
        typeof raw.warehouse.sqlTemplatePath === "string" ? raw.warehouse.sqlTemplatePath : null,
        "bundle.warehouse.sqlTemplatePath"
      ),
      schemaMapPath: assertNonEmptyString(
        typeof raw.warehouse.schemaMapPath === "string" ? raw.warehouse.schemaMapPath : null,
        "bundle.warehouse.schemaMapPath"
      ),
      placeholders,
    },
    secrets: {
      requiredEnvKeys,
      failureWebhookEnvKey: assertEnvironmentVariableName(
        assertNonEmptyString(
          typeof raw.secrets.failureWebhookEnvKey === "string"
            ? raw.secrets.failureWebhookEnvKey
            : null,
          "bundle.secrets.failureWebhookEnvKey"
        ),
        "bundle.secrets.failureWebhookEnvKey"
      ),
      failureWebhookTimeoutEnvKey: assertEnvironmentVariableName(
        assertNonEmptyString(
          typeof raw.secrets.failureWebhookTimeoutEnvKey === "string"
            ? raw.secrets.failureWebhookTimeoutEnvKey
            : null,
          "bundle.secrets.failureWebhookTimeoutEnvKey"
        ),
        "bundle.secrets.failureWebhookTimeoutEnvKey"
      ),
      bindingsTemplate,
    },
    artifacts: {
      archiveDir: assertNonEmptyString(
        typeof raw.artifacts.archiveDir === "string" ? raw.artifacts.archiveDir : null,
        "bundle.artifacts.archiveDir"
      ),
      handoffDir: assertNonEmptyString(
        typeof raw.artifacts.handoffDir === "string" ? raw.artifacts.handoffDir : null,
        "bundle.artifacts.handoffDir"
      ),
      failureAlertDir: assertNonEmptyString(
        typeof raw.artifacts.failureAlertDir === "string" ? raw.artifacts.failureAlertDir : null,
        "bundle.artifacts.failureAlertDir"
      ),
    },
    verification: {
      dryRunCommandWithInput: assertNonEmptyString(
        typeof raw.verification.dryRunCommandWithInput === "string"
          ? raw.verification.dryRunCommandWithInput
          : null,
        "bundle.verification.dryRunCommandWithInput"
      ),
      expectedOutputs,
    },
  };
}

function normalizeSecretRef(secretRef: string, fieldName: string): string {
  const normalized = secretRef.trim();
  if (normalized.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  if (/\s/.test(normalized)) {
    throw new Error(`${fieldName} must not contain whitespace.`);
  }
  return normalized;
}

function isPlaceholderSecretRef(secretRef: string): boolean {
  const normalized = secretRef.toLowerCase();
  return (
    normalized.includes("replace-with-your-secret-manager-path") ||
    normalized.includes("changeme") ||
    normalized.includes("todo")
  );
}

function addBindingToMap(
  map: Map<string, string>,
  envKey: string,
  secretRef: string,
  sourceLabel: string
): void {
  const normalizedEnvKey = assertEnvironmentVariableName(envKey.trim(), `${sourceLabel} envKey`);
  const normalizedSecretRef = normalizeSecretRef(secretRef, `${sourceLabel} secretRef`);
  const existingSecretRef = map.get(normalizedEnvKey);
  if (existingSecretRef && existingSecretRef !== normalizedSecretRef) {
    throw new Error(
      `Duplicate binding for "${normalizedEnvKey}" with conflicting secret refs: "${existingSecretRef}" vs "${normalizedSecretRef}".`
    );
  }
  map.set(normalizedEnvKey, normalizedSecretRef);
}

function loadBindingsFromFile(filePath: string): Map<string, string> {
  const raw = readJsonFile(filePath);
  const bindings = new Map<string, string>();

  if (isPlainObject(raw)) {
    for (const [envKey, secretRef] of Object.entries(raw)) {
      if (typeof secretRef !== "string") {
        throw new Error(
          `Invalid secret binding in ${filePath}: key "${envKey}" must map to a string secret ref.`
        );
      }
      addBindingToMap(bindings, envKey, secretRef, `secret-bindings-file(${filePath})`);
    }
    return bindings;
  }

  if (Array.isArray(raw)) {
    for (const [index, entry] of raw.entries()) {
      if (!isPlainObject(entry)) {
        throw new Error(
          `Invalid secret binding in ${filePath}: index ${index} must be an object.`
        );
      }
      if (typeof entry.envKey !== "string" || typeof entry.secretRef !== "string") {
        throw new Error(
          `Invalid secret binding in ${filePath}: index ${index} must include string envKey and secretRef.`
        );
      }
      addBindingToMap(
        bindings,
        entry.envKey,
        entry.secretRef,
        `secret-bindings-file(${filePath})`
      );
    }
    return bindings;
  }

  throw new Error(
    `--secret-bindings-file must be either a JSON object map or an array of { envKey, secretRef }: ${filePath}`
  );
}

function parseSecretBindingPair(value: string): { envKey: string; secretRef: string } {
  const delimiterIndex = value.indexOf("=");
  if (delimiterIndex <= 0 || delimiterIndex === value.length - 1) {
    throw new Error(
      `--secret-binding must follow KEY=secretRef format. Received "${value}".`
    );
  }

  const envKey = assertEnvironmentVariableName(value.slice(0, delimiterIndex).trim(), "--secret-binding");
  const secretRef = normalizeSecretRef(value.slice(delimiterIndex + 1), "--secret-binding");
  return { envKey, secretRef };
}

function loadBindingsFromCli(pairs: string[]): Map<string, string> {
  const bindings = new Map<string, string>();
  for (const pair of pairs) {
    const parsedPair = parseSecretBindingPair(pair);
    addBindingToMap(bindings, parsedPair.envKey, parsedPair.secretRef, "--secret-binding");
  }
  return bindings;
}

function mergeBindings(
  fileBindings: Map<string, string>,
  cliBindings: Map<string, string>
): Map<string, string> {
  const merged = new Map<string, string>();

  for (const [envKey, secretRef] of fileBindings.entries()) {
    addBindingToMap(merged, envKey, secretRef, "--secret-bindings-file");
  }
  for (const [envKey, secretRef] of cliBindings.entries()) {
    addBindingToMap(merged, envKey, secretRef, "--secret-binding");
  }
  return merged;
}

function buildInfraBindingArtifact(
  args: CliArgs,
  bundle: SchedulerDeploymentBundle,
  bindingsMap: Map<string, string>
): SchedulerInfraBindingArtifact {
  const requiredEnvKeys = [...new Set(bundle.secrets.requiredEnvKeys.map((value) => assertEnvironmentVariableName(value, "bundle.secrets.requiredEnvKeys")))].sort();
  const missingEnvKeys = requiredEnvKeys.filter((envKey) => !bindingsMap.has(envKey));
  if (missingEnvKeys.length > 0) {
    throw new Error(
      `Missing required secret bindings for env key(s): ${missingEnvKeys.join(", ")}.`
    );
  }

  const bindings = requiredEnvKeys.map((envKey) => ({
    envKey,
    secretRef: bindingsMap.get(envKey) as string,
  }));
  const placeholderBindings = bindings.filter((entry) => isPlaceholderSecretRef(entry.secretRef));
  if (!args.allowPlaceholderSecretRefs && placeholderBindings.length > 0) {
    throw new Error(
      `Placeholder secret reference(s) are not allowed: ${placeholderBindings
        .map((entry) => `${entry.envKey}=${entry.secretRef}`)
        .join(", ")}`
    );
  }

  return {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    kpiId: "kpi-06",
    artifact: "scheduler_infra_binding",
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    environment: args.environment,
    sourceBundlePath: toWorkspacePath(args.bundlePath),
    scheduler: {
      name: args.schedulerName,
      cadenceCron: bundle.scheduler.cadenceCron,
      timezone: bundle.scheduler.timezone,
      npmScript: bundle.scheduler.npmScript,
      commandTemplate: bundle.scheduler.commandTemplate,
      commandArgs: bundle.scheduler.commandArgs,
    },
    secrets: {
      requiredEnvKeys,
      boundEnvKeys: requiredEnvKeys,
      missingEnvKeys: [],
      failureWebhookEnvKey: bundle.secrets.failureWebhookEnvKey,
      failureWebhookTimeoutEnvKey: bundle.secrets.failureWebhookTimeoutEnvKey,
      bindings,
    },
    warehouse: bundle.warehouse,
    artifacts: bundle.artifacts,
    verification: bundle.verification,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawBundle = readJsonFile(args.bundlePath);
  const bundle = parseSchedulerDeploymentBundle(rawBundle, args.bundlePath);

  const fileBindings = args.secretBindingsFilePath
    ? loadBindingsFromFile(args.secretBindingsFilePath)
    : new Map<string, string>();
  const cliBindings = loadBindingsFromCli(args.secretBindingPairs);
  const mergedBindings = mergeBindings(fileBindings, cliBindings);

  const artifact = buildInfraBindingArtifact(args, bundle, mergedBindings);
  const serializedArtifact = `${JSON.stringify(artifact, null, 2)}\n`;

  if (args.outPath) {
    const absoluteOutPath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absoluteOutPath), { recursive: true });
    fs.writeFileSync(absoluteOutPath, serializedArtifact, "utf8");
    console.log(`Wrote Module 03 KPI #6 scheduler infra binding: ${absoluteOutPath}`);
    return;
  }

  process.stdout.write(serializedArtifact);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
