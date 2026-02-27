// RND: Module 02 KPI rollup runner for consolidated modules 02~07 evaluation output.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildKpiBundle,
  buildRollupSummary,
  type KpiBundle,
  type Module02EvaluationOutput,
  type Module03EvaluationOutput,
  type Module04EvaluationOutput,
  type Module05EvaluationOutput,
  type Module06EvaluationOutput,
  type Module07EvaluationOutput,
  type ModuleEvaluationOutputs,
  type ModuleId,
  type ModuleRunResult,
} from "./kpi-rollup-artifacts";

type CliArgs = {
  outPath: string | null;
  outDir: string | null;
  generatedAt: string | null;
  evaluatedAt: string | null;
};

type ModuleRunner = {
  moduleId: ModuleId;
  runnerPath: string;
  outputFileName: string;
};

type RollupPaths = {
  rollupBaseDir: string;
  rollupOutputPath: string;
  moduleOutDir: string;
};

const MODULE_RUNNERS: readonly ModuleRunner[] = [
  {
    moduleId: "02_data_lake",
    runnerPath: "scripts/rnd/module02/run-evaluation.cjs",
    outputFileName: "module02-evaluation.json",
  },
  {
    moduleId: "03_personal_safety_validation_engine",
    runnerPath: "scripts/rnd/module03/run-evaluation.cjs",
    outputFileName: "module03-evaluation.json",
  },
  {
    moduleId: "04_efficacy_quantification_model",
    runnerPath: "scripts/rnd/module04/run-evaluation.cjs",
    outputFileName: "module04-evaluation.json",
  },
  {
    moduleId: "05_optimization_engine",
    runnerPath: "scripts/rnd/module05/run-evaluation.cjs",
    outputFileName: "module05-evaluation.json",
  },
  {
    moduleId: "06_closed_loop_ai",
    runnerPath: "scripts/rnd/module06/run-evaluation.cjs",
    outputFileName: "module06-evaluation.json",
  },
  {
    moduleId: "07_biosensor_and_genetic_data_integration",
    runnerPath: "scripts/rnd/module07/run-evaluation.cjs",
    outputFileName: "module07-evaluation.json",
  },
] as const;

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

function normalizeIsoDate(value: string | null, label: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`${label} must be a valid ISO-8601 date string.`);
  }

  return parsed.toISOString();
}

function parseArgs(argv: string[]): CliArgs {
  const outPath = getArgValue(argv, "--out");
  const outDir = getArgValue(argv, "--out-dir");
  const generatedAt = normalizeIsoDate(getArgValue(argv, "--generated-at"), "--generated-at");
  const evaluatedAt = normalizeIsoDate(getArgValue(argv, "--evaluated-at"), "--evaluated-at");

  if (outPath && outDir) {
    throw new Error("Use either --out or --out-dir, not both.");
  }

  return { outPath, outDir, generatedAt, evaluatedAt };
}

function readJsonFile<T>(filePath: string): T {
  const serialized = fs.readFileSync(filePath, "utf8");
  return JSON.parse(serialized) as T;
}

function toPathSafeTimestamp(timestamp: string): string {
  return timestamp.replace(/[:.]/g, "-");
}

function formatModuleRunError(
  moduleId: ModuleId,
  runnerPath: string,
  error: unknown
): string {
  const processError = error as NodeJS.ErrnoException & {
    stdout?: string;
    stderr?: string;
  };
  const stdout = typeof processError.stdout === "string" ? processError.stdout.trim() : "";
  const stderr = typeof processError.stderr === "string" ? processError.stderr.trim() : "";

  return [
    `Failed to execute ${moduleId} evaluation.`,
    `Command: node ${runnerPath}`,
    stdout.length > 0 ? `stdout: ${stdout}` : "",
    stderr.length > 0 ? `stderr: ${stderr}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function runModuleEvaluation(
  repoRoot: string,
  runner: ModuleRunner,
  moduleOutDir: string,
  generatedAt: string,
  evaluatedAt: string
): { outputPath: string; command: string } {
  const runnerAbsolutePath = path.resolve(repoRoot, runner.runnerPath);
  const outputPath = path.join(moduleOutDir, runner.outputFileName);
  const runnerArgs = [
    runnerAbsolutePath,
    "--out",
    outputPath,
    "--generated-at",
    generatedAt,
    "--evaluated-at",
    evaluatedAt,
  ];

  try {
    execFileSync(process.execPath, runnerArgs, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(formatModuleRunError(runner.moduleId, runner.runnerPath, error));
  }

  return {
    outputPath,
    command: `node ${runner.runnerPath} --out ${outputPath} --generated-at ${generatedAt} --evaluated-at ${evaluatedAt}`,
  };
}

function resolveRollupPaths(
  repoRoot: string,
  args: CliArgs,
  timestampToken: string
): RollupPaths {
  const resolvedOutPath = args.outPath ? path.resolve(repoRoot, args.outPath) : null;
  const resolvedOutDir = args.outDir ? path.resolve(repoRoot, args.outDir) : null;

  const rollupBaseDir =
    resolvedOutDir ??
    (resolvedOutPath
      ? path.join(
          path.dirname(resolvedOutPath),
          `${path.basename(resolvedOutPath, path.extname(resolvedOutPath))}-modules`
        )
      : path.resolve(repoRoot, "tmp", "rnd", "kpi-rollup", timestampToken));

  const rollupOutputPath =
    resolvedOutPath ?? path.join(rollupBaseDir, `kpi-rollup-${timestampToken}.json`);
  const moduleOutDir = path.join(rollupBaseDir, "module-evaluations");

  return {
    rollupBaseDir,
    rollupOutputPath,
    moduleOutDir,
  };
}

function ensureOutputDirs(paths: RollupPaths): void {
  fs.mkdirSync(path.dirname(paths.rollupOutputPath), { recursive: true });
  fs.mkdirSync(paths.moduleOutDir, { recursive: true });
}

function runAllModuleEvaluations(
  repoRoot: string,
  moduleOutDir: string,
  generatedAt: string,
  evaluatedAt: string
): ModuleRunResult[] {
  return MODULE_RUNNERS.map((runner) => {
    const run = runModuleEvaluation(
      repoRoot,
      runner,
      moduleOutDir,
      generatedAt,
      evaluatedAt
    );
    return {
      moduleId: runner.moduleId,
      outputPath: run.outputPath,
      command: run.command,
    };
  });
}

function readModuleEvaluationOutputs(
  moduleRuns: ModuleRunResult[]
): ModuleEvaluationOutputs {
  return {
    module02: readJsonFile<Module02EvaluationOutput>(moduleRuns[0].outputPath),
    module03: readJsonFile<Module03EvaluationOutput>(moduleRuns[1].outputPath),
    module04: readJsonFile<Module04EvaluationOutput>(moduleRuns[2].outputPath),
    module05: readJsonFile<Module05EvaluationOutput>(moduleRuns[3].outputPath),
    module06: readJsonFile<Module06EvaluationOutput>(moduleRuns[4].outputPath),
    module07: readJsonFile<Module07EvaluationOutput>(moduleRuns[5].outputPath),
  };
}

function resolveRunTimestamps(args: CliArgs): {
  evaluatedAt: string;
  generatedAt: string;
  timestampToken: string;
} {
  const evaluatedAt = args.evaluatedAt ?? new Date().toISOString();
  const generatedAt = args.generatedAt ?? evaluatedAt;
  return {
    evaluatedAt,
    generatedAt,
    timestampToken: toPathSafeTimestamp(evaluatedAt),
  };
}

function buildEnvironmentSnapshot() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuCount: os.cpus().length,
  };
}

function buildModuleArtifactEntries(
  moduleRuns: ModuleRunResult[],
  rollupOutputPath: string
): Array<{ moduleId: ModuleId; outputPath: string }> {
  return moduleRuns.map((run) => ({
    moduleId: run.moduleId,
    outputPath: path.relative(path.dirname(rollupOutputPath), run.outputPath),
  }));
}

function buildRollupReport(
  generatedAt: string,
  evaluatedAt: string,
  paths: RollupPaths,
  moduleRuns: ModuleRunResult[],
  outputs: ModuleEvaluationOutputs,
  kpis: KpiBundle
) {
  return {
    module: "02_data_lake",
    phase: "EVALUATION",
    artifact: "kpi_rollup",
    generatedAt,
    evaluatedAt,
    environment: buildEnvironmentSnapshot(),
    commands: moduleRuns.map((run) => run.command),
    moduleArtifacts: buildModuleArtifactEntries(moduleRuns, paths.rollupOutputPath),
    kpiRollup: {
      kpi01: kpis.kpi01,
      kpi02: kpis.kpi02,
      kpi03: kpis.kpi03,
      kpi04: kpis.kpi04,
      kpi05: {
        ...kpis.kpi05,
        moduleBreakdown: kpis.kpi05Breakdown,
      },
      kpi06: {
        ...kpis.kpi06,
        evaluatedAt: outputs.module03.kpi06Report.evaluatedAt,
        windowStart: outputs.module03.kpi06Report.windowStart,
        windowEnd: outputs.module03.kpi06Report.windowEnd,
      },
      kpi07: kpis.kpi07,
    },
    summary: buildRollupSummary(kpis),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const timing = resolveRunTimestamps(args);
  const paths = resolveRollupPaths(repoRoot, args, timing.timestampToken);
  ensureOutputDirs(paths);

  const moduleRuns = runAllModuleEvaluations(
    repoRoot,
    paths.moduleOutDir,
    timing.generatedAt,
    timing.evaluatedAt
  );
  const outputs = readModuleEvaluationOutputs(moduleRuns);
  const kpis = buildKpiBundle(outputs);
  const rollup = buildRollupReport(
    timing.generatedAt,
    timing.evaluatedAt,
    paths,
    moduleRuns,
    outputs,
    kpis
  );

  fs.writeFileSync(
    paths.rollupOutputPath,
    `${JSON.stringify(rollup, null, 2)}\n`,
    "utf8"
  );
  console.log(`Wrote Module 02 KPI rollup report: ${paths.rollupOutputPath}`);
}

main();
