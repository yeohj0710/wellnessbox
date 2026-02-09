// RND: Module 03 KPI #6 scheduler production-readiness validator.

import fs from "node:fs";
import path from "node:path";

type CliArgs = {
  summaryPath: string;
  outPath: string;
  expectedEnvironment: string;
  allowRndDefaultSecretRefs: boolean;
};

type EnvSecretBinding = {
  envKey: string;
  secretRef: string;
};

type SchedulerHandoffValidationSummary = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_handoff_validation";
  strictEnv: boolean;
  scheduler: {
    name: string;
    environment: string;
  };
  secrets: {
    requiredEnvKeys: string[];
    boundSecretRefs: EnvSecretBinding[];
  };
  artifacts: {
    infraBindingPath: string;
  };
  verification: {
    allExpectedOutputsPresent: boolean;
    missingRequiredEnvKeys: string[];
  };
};

type SchedulerInfraBindingArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_infra_binding";
  environment: string;
  scheduler: {
    name: string;
    commandTemplate: string;
  };
  secrets: {
    requiredEnvKeys: string[];
    missingEnvKeys: string[];
    bindings: EnvSecretBinding[];
  };
};

type ReadinessCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

type SchedulerProductionReadinessReport = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_production_readiness_report";
  generatedAt: string;
  result: "pass" | "fail";
  expectedEnvironment: string;
  source: {
    summaryPath: string;
    infraBindingPath: string;
  };
  scheduler: {
    name: string;
    summaryEnvironment: string;
    infraEnvironment: string;
    commandTemplate: string;
  };
  checks: ReadinessCheck[];
  failures: string[];
};

const MODULE_ID = "03_personal_safety_validation_engine";
const KPI_ID = "kpi-06";
const DEFAULT_EXPECTED_ENVIRONMENT = "production";
const DEFAULT_OUT_FILENAME = "scheduler-production-readiness-report.json";
const DEFAULT_RND_SECRET_REF_PREFIX = "secret://rnd/module03/kpi06/";

function getArgValue(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

function assertEnvironmentVariableName(value: string, fieldName: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${fieldName} must be a valid environment variable name.`);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

function parseBindings(value: unknown, fieldName: string): EnvSecretBinding[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        !isPlainObject(entry) ||
        typeof entry.envKey !== "string" ||
        typeof entry.secretRef !== "string"
    )
  ) {
    throw new Error(`${fieldName} must be an array of { envKey, secretRef }.`);
  }

  const seenEnvKeys = new Set<string>();
  return value.map((entry, index) => {
    const envKey = assertEnvironmentVariableName(
      assertNonEmptyString(entry.envKey, `${fieldName}[${index}].envKey`),
      `${fieldName}[${index}].envKey`
    );
    if (seenEnvKeys.has(envKey)) {
      throw new Error(`${fieldName} contains duplicate envKey "${envKey}".`);
    }
    seenEnvKeys.add(envKey);

    const secretRef = assertNonEmptyString(
      entry.secretRef,
      `${fieldName}[${index}].secretRef`
    );
    if (/\s/.test(secretRef)) {
      throw new Error(`${fieldName}[${index}].secretRef must not contain whitespace.`);
    }
    return { envKey, secretRef };
  });
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

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  try {
    return JSON.parse(raw);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    throw new Error(`Failed to parse JSON file ${filePath}: ${message}`);
  }
}

function writeJsonFile(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function parseHandoffSummary(
  raw: unknown,
  sourcePath: string
): SchedulerHandoffValidationSummary {
  if (!isPlainObject(raw)) {
    throw new Error(`Handoff summary must be a JSON object: ${sourcePath}`);
  }
  if (
    raw.module !== MODULE_ID ||
    raw.phase !== "EVALUATION" ||
    raw.kpiId !== KPI_ID ||
    raw.artifact !== "scheduler_handoff_validation"
  ) {
    throw new Error(`Unexpected handoff summary identity: ${sourcePath}`);
  }
  if (!isPlainObject(raw.scheduler)) {
    throw new Error(`handoffSummary.scheduler must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.secrets)) {
    throw new Error(`handoffSummary.secrets must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.artifacts)) {
    throw new Error(`handoffSummary.artifacts must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.verification)) {
    throw new Error(`handoffSummary.verification must be an object: ${sourcePath}`);
  }
  if (typeof raw.strictEnv !== "boolean") {
    throw new Error(`handoffSummary.strictEnv must be boolean: ${sourcePath}`);
  }
  if (typeof raw.verification.allExpectedOutputsPresent !== "boolean") {
    throw new Error(
      `handoffSummary.verification.allExpectedOutputsPresent must be boolean: ${sourcePath}`
    );
  }

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_handoff_validation",
    strictEnv: raw.strictEnv,
    scheduler: {
      name: assertNonEmptyString(raw.scheduler.name, "handoffSummary.scheduler.name"),
      environment: assertNonEmptyString(
        raw.scheduler.environment,
        "handoffSummary.scheduler.environment"
      ),
    },
    secrets: {
      requiredEnvKeys: parseStringArray(
        raw.secrets.requiredEnvKeys,
        "handoffSummary.secrets.requiredEnvKeys"
      ).map((entry, index) =>
        assertEnvironmentVariableName(
          assertNonEmptyString(
            entry,
            `handoffSummary.secrets.requiredEnvKeys[${index}]`
          ),
          `handoffSummary.secrets.requiredEnvKeys[${index}]`
        )
      ),
      boundSecretRefs: parseBindings(
        raw.secrets.boundSecretRefs,
        "handoffSummary.secrets.boundSecretRefs"
      ),
    },
    artifacts: {
      infraBindingPath: assertNonEmptyString(
        raw.artifacts.infraBindingPath,
        "handoffSummary.artifacts.infraBindingPath"
      ),
    },
    verification: {
      allExpectedOutputsPresent: raw.verification.allExpectedOutputsPresent,
      missingRequiredEnvKeys: parseStringArray(
        raw.verification.missingRequiredEnvKeys,
        "handoffSummary.verification.missingRequiredEnvKeys"
      ).map((entry, index) =>
        assertEnvironmentVariableName(
          assertNonEmptyString(
            entry,
            `handoffSummary.verification.missingRequiredEnvKeys[${index}]`
          ),
          `handoffSummary.verification.missingRequiredEnvKeys[${index}]`
        )
      ),
    },
  };
}

function parseInfraBinding(
  raw: unknown,
  sourcePath: string
): SchedulerInfraBindingArtifact {
  if (!isPlainObject(raw)) {
    throw new Error(`Infra-binding must be a JSON object: ${sourcePath}`);
  }
  if (
    raw.module !== MODULE_ID ||
    raw.phase !== "EVALUATION" ||
    raw.kpiId !== KPI_ID ||
    raw.artifact !== "scheduler_infra_binding"
  ) {
    throw new Error(`Unexpected infra-binding identity: ${sourcePath}`);
  }
  if (!isPlainObject(raw.scheduler)) {
    throw new Error(`infraBinding.scheduler must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.secrets)) {
    throw new Error(`infraBinding.secrets must be an object: ${sourcePath}`);
  }

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_infra_binding",
    environment: assertNonEmptyString(raw.environment, "infraBinding.environment"),
    scheduler: {
      name: assertNonEmptyString(raw.scheduler.name, "infraBinding.scheduler.name"),
      commandTemplate: assertNonEmptyString(
        raw.scheduler.commandTemplate,
        "infraBinding.scheduler.commandTemplate"
      ),
    },
    secrets: {
      requiredEnvKeys: parseStringArray(
        raw.secrets.requiredEnvKeys,
        "infraBinding.secrets.requiredEnvKeys"
      ).map((entry, index) =>
        assertEnvironmentVariableName(
          assertNonEmptyString(entry, `infraBinding.secrets.requiredEnvKeys[${index}]`),
          `infraBinding.secrets.requiredEnvKeys[${index}]`
        )
      ),
      missingEnvKeys: parseStringArray(
        raw.secrets.missingEnvKeys,
        "infraBinding.secrets.missingEnvKeys"
      ).map((entry, index) =>
        assertEnvironmentVariableName(
          assertNonEmptyString(entry, `infraBinding.secrets.missingEnvKeys[${index}]`),
          `infraBinding.secrets.missingEnvKeys[${index}]`
        )
      ),
      bindings: parseBindings(raw.secrets.bindings, "infraBinding.secrets.bindings"),
    },
  };
}

function parseArgs(argv: string[]): CliArgs {
  const summaryPathValue = getArgValue(argv, "--summary");
  if (!summaryPathValue) {
    throw new Error("--summary is required.");
  }
  const summaryPath = path.resolve(summaryPathValue);
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`--summary file does not exist: ${summaryPath}`);
  }

  const outPath = path.resolve(
    getArgValue(argv, "--out") ?? path.join(path.dirname(summaryPath), DEFAULT_OUT_FILENAME)
  );
  const expectedEnvironment = assertNonEmptyString(
    getArgValue(argv, "--expected-environment") ?? DEFAULT_EXPECTED_ENVIRONMENT,
    "--expected-environment"
  );

  return {
    summaryPath,
    outPath,
    expectedEnvironment,
    allowRndDefaultSecretRefs: hasFlag(argv, "--allow-rnd-default-secret-ref"),
  };
}

function resolveArtifactPath(rawPath: string): string {
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  return path.resolve(process.cwd(), rawPath);
}

function toStringSet(values: string[]): Set<string> {
  return new Set(values.map((entry) => entry.trim()).filter(Boolean));
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a.values()) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function toBindingMap(bindings: EnvSecretBinding[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of bindings) {
    map.set(entry.envKey, entry.secretRef);
  }
  return map;
}

function isPlaceholderSecretRef(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-with-your-secret-manager-path") ||
    normalized.includes("changeme") ||
    normalized.includes("todo") ||
    normalized.includes("{{") ||
    normalized.includes("}}")
  );
}

function isRndDefaultSecretRef(value: string): boolean {
  return value.toLowerCase().startsWith(DEFAULT_RND_SECRET_REF_PREFIX);
}

function addCheck(
  checks: ReadinessCheck[],
  id: string,
  passed: boolean,
  passDetail: string,
  failDetail: string
): void {
  checks.push({
    id,
    passed,
    detail: passed ? passDetail : failDetail,
  });
}

function buildChecks(
  args: CliArgs,
  summary: SchedulerHandoffValidationSummary,
  infra: SchedulerInfraBindingArtifact
): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];

  addCheck(
    checks,
    "strict-env-enabled",
    summary.strictEnv,
    "Handoff validation used strict environment checks.",
    "Handoff validation did not use strict environment checks."
  );

  addCheck(
    checks,
    "dry-run-expected-outputs",
    summary.verification.allExpectedOutputsPresent,
    "Dry-run verification confirms all expected outputs are present.",
    "Dry-run verification reports missing expected outputs."
  );

  addCheck(
    checks,
    "dry-run-required-env-complete",
    summary.verification.missingRequiredEnvKeys.length === 0,
    "Dry-run verification reports no missing required env keys.",
    `Dry-run verification missing required env key(s): ${summary.verification.missingRequiredEnvKeys.join(", ")}.`
  );

  addCheck(
    checks,
    "summary-environment-match",
    summary.scheduler.environment === args.expectedEnvironment,
    `Handoff summary environment matches expected "${args.expectedEnvironment}".`,
    `Handoff summary environment "${summary.scheduler.environment}" does not match expected "${args.expectedEnvironment}".`
  );

  addCheck(
    checks,
    "infra-environment-match",
    infra.environment === args.expectedEnvironment,
    `Infra binding environment matches expected "${args.expectedEnvironment}".`,
    `Infra binding environment "${infra.environment}" does not match expected "${args.expectedEnvironment}".`
  );

  const summaryRequiredEnvSet = toStringSet(summary.secrets.requiredEnvKeys);
  const infraRequiredEnvSet = toStringSet(infra.secrets.requiredEnvKeys);
  addCheck(
    checks,
    "required-env-keyset-match",
    areSetsEqual(summaryRequiredEnvSet, infraRequiredEnvSet),
    "Summary and infra binding contain the same required env key set.",
    "Summary and infra binding required env key sets differ."
  );

  addCheck(
    checks,
    "infra-missing-env-keys",
    infra.secrets.missingEnvKeys.length === 0,
    "Infra binding reports no missing env keys.",
    `Infra binding missing env key(s): ${infra.secrets.missingEnvKeys.join(", ")}.`
  );

  const summaryBindingMap = toBindingMap(summary.secrets.boundSecretRefs);
  const infraBindingMap = toBindingMap(infra.secrets.bindings);
  const missingSummaryBindings = [...summaryRequiredEnvSet].filter(
    (envKey) => !summaryBindingMap.has(envKey)
  );
  addCheck(
    checks,
    "summary-secret-binding-coverage",
    missingSummaryBindings.length === 0,
    "Handoff summary has secret bindings for all required env keys.",
    `Handoff summary missing binding(s) for env key(s): ${missingSummaryBindings.join(", ")}.`
  );

  const missingInfraBindings = [...infraRequiredEnvSet].filter((envKey) => !infraBindingMap.has(envKey));
  addCheck(
    checks,
    "infra-secret-binding-coverage",
    missingInfraBindings.length === 0,
    "Infra binding has secret bindings for all required env keys.",
    `Infra binding missing binding(s) for env key(s): ${missingInfraBindings.join(", ")}.`
  );

  const mismatchedBindings = [...summaryRequiredEnvSet]
    .filter(
      (envKey) =>
        summaryBindingMap.has(envKey) &&
        infraBindingMap.has(envKey) &&
        summaryBindingMap.get(envKey) !== infraBindingMap.get(envKey)
    )
    .map((envKey) => `${envKey}`);
  addCheck(
    checks,
    "summary-infra-binding-consistency",
    mismatchedBindings.length === 0,
    "Summary and infra binding secret refs are consistent.",
    `Summary/infra binding mismatch for env key(s): ${mismatchedBindings.join(", ")}.`
  );

  const infraSecretRefs = [...infraBindingMap.values()];
  const placeholderRefs = infraSecretRefs.filter((secretRef) => isPlaceholderSecretRef(secretRef));
  addCheck(
    checks,
    "no-placeholder-secret-refs",
    placeholderRefs.length === 0,
    "Infra binding secret refs are non-placeholder values.",
    `Placeholder secret ref(s) detected: ${placeholderRefs.join(", ")}.`
  );

  if (args.allowRndDefaultSecretRefs) {
    addCheck(
      checks,
      "no-rnd-default-secret-refs",
      true,
      "Default RND secret refs allowed by flag (--allow-rnd-default-secret-ref).",
      ""
    );
  } else {
    const defaultRndRefs = infraSecretRefs.filter((secretRef) => isRndDefaultSecretRef(secretRef));
    addCheck(
      checks,
      "no-rnd-default-secret-refs",
      defaultRndRefs.length === 0,
      "Infra binding secret refs are not using RND placeholder defaults.",
      `RND default secret ref(s) detected: ${defaultRndRefs.join(", ")}.`
    );
  }

  addCheck(
    checks,
    "scheduler-command-template-present",
    infra.scheduler.commandTemplate.includes(
      "npm run rnd:module03:evaluation:adverse:ops:scheduler --"
    ),
    "Infra binding carries the expected scheduler command template.",
    "Infra binding command template does not include the expected scheduler npm command."
  );

  return checks;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const summaryRaw = readJsonFile(args.summaryPath);
  const summary = parseHandoffSummary(summaryRaw, args.summaryPath);

  const resolvedInfraBindingPath = resolveArtifactPath(summary.artifacts.infraBindingPath);
  if (!fs.existsSync(resolvedInfraBindingPath)) {
    throw new Error(`Referenced infra binding file does not exist: ${resolvedInfraBindingPath}`);
  }
  const infraRaw = readJsonFile(resolvedInfraBindingPath);
  const infra = parseInfraBinding(infraRaw, resolvedInfraBindingPath);

  const checks = buildChecks(args, summary, infra);
  const failedChecks = checks.filter((check) => !check.passed);

  const report: SchedulerProductionReadinessReport = {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_production_readiness_report",
    generatedAt: new Date().toISOString(),
    result: failedChecks.length === 0 ? "pass" : "fail",
    expectedEnvironment: args.expectedEnvironment,
    source: {
      summaryPath: toWorkspacePath(args.summaryPath),
      infraBindingPath: toWorkspacePath(resolvedInfraBindingPath),
    },
    scheduler: {
      name: summary.scheduler.name,
      summaryEnvironment: summary.scheduler.environment,
      infraEnvironment: infra.environment,
      commandTemplate: infra.scheduler.commandTemplate,
    },
    checks,
    failures: failedChecks.map((check) => check.id),
  };

  writeJsonFile(args.outPath, report);

  const reportWorkspacePath = toWorkspacePath(args.outPath);
  if (failedChecks.length > 0) {
    console.error(
      `Wrote Module 03 KPI #6 scheduler production-readiness report (FAIL): ${reportWorkspacePath}`
    );
    console.error(`Failed check(s): ${failedChecks.map((check) => check.id).join(", ")}`);
    process.exit(1);
  }

  console.log(
    `Wrote Module 03 KPI #6 scheduler production-readiness report (PASS): ${reportWorkspacePath}`
  );
}

main();
