import fs from "node:fs";
import { readJsonFile } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  parseHandoffSummary,
  parseInfraBinding,
  resolveArtifactPath,
} from "./scheduler-readiness-artifacts";
import { buildReadinessChecks } from "./scheduler-readiness-checks";
import {
  DEFAULT_RND_SECRET_REF_PREFIX,
  type CliArgs,
  type ReadinessComputation,
  type ReadinessSource,
} from "./validate-scheduler-production-readiness-types";

export function loadReadinessSource(args: CliArgs): ReadinessSource {
  const summaryRaw = readJsonFile(args.summaryPath);
  const summary = parseHandoffSummary(summaryRaw, args.summaryPath);

  const resolvedInfraBindingPath = resolveArtifactPath(summary.artifacts.infraBindingPath);
  if (!fs.existsSync(resolvedInfraBindingPath)) {
    throw new Error(`Referenced infra binding file does not exist: ${resolvedInfraBindingPath}`);
  }
  const infraRaw = readJsonFile(resolvedInfraBindingPath);
  const infra = parseInfraBinding(infraRaw, resolvedInfraBindingPath);

  return {
    summary,
    infra,
    resolvedInfraBindingPath,
  };
}

export function computeReadinessChecks(
  args: CliArgs,
  source: ReadinessSource
): ReadinessComputation {
  const checks = buildReadinessChecks(
    {
      expectedEnvironment: args.expectedEnvironment,
      requireProvidedInput: args.requireProvidedInput,
      allowRndDefaultSecretRefs: args.allowRndDefaultSecretRefs,
      rndDefaultSecretRefPrefix: DEFAULT_RND_SECRET_REF_PREFIX,
    },
    source.summary,
    source.infra
  );
  return {
    checks,
    failedChecks: checks.filter((check) => !check.passed),
  };
}
