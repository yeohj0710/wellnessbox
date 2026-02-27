// RND: Module 03 KPI #6 scheduler infra-binding artifact generator.

import fs from "node:fs";
import path from "node:path";
import {
  assertNonEmptyString,
  getArgValue,
  normalizeIsoDate,
  readJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  getArgValues,
  hasFlag,
} from "./cli-helpers";
import {
  buildInfraBindingArtifact,
  loadBindingsFromCli,
  loadBindingsFromFile,
  mergeBindings,
  parseSchedulerDeploymentBundle,
} from "./scheduler-infra-binding-artifacts";

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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawBundle = readJsonFile(args.bundlePath);
  const bundle = parseSchedulerDeploymentBundle(rawBundle, args.bundlePath);

  const fileBindings = args.secretBindingsFilePath
    ? loadBindingsFromFile(args.secretBindingsFilePath)
    : new Map<string, string>();
  const cliBindings = loadBindingsFromCli(args.secretBindingPairs);
  const mergedBindings = mergeBindings(fileBindings, cliBindings);

  const artifact = buildInfraBindingArtifact(
    {
      bundlePath: args.bundlePath,
      generatedAt: args.generatedAt,
      schedulerName: args.schedulerName,
      environment: args.environment,
      allowPlaceholderSecretRefs: args.allowPlaceholderSecretRefs,
    },
    bundle,
    mergedBindings
  );
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

try {
  main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
