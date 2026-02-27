import path from "node:path";

export type CliArgs = {
  inputPath: string;
  schemaMapPath: string | null;
  archiveDir: string;
  windowEnd: string;
  retentionMonths: number | null;
};

export const DEFAULT_ARCHIVE_DIR = path.resolve(
  "tmp",
  "rnd",
  "module03",
  "kpi06-monthly-archive"
);

export const OPS_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-adverse-event-evaluation-from-source.cjs"
);
