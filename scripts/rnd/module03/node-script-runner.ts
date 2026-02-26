import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { toWorkspacePath } from "./orchestrate-adverse-event-evaluation-monthly-helpers";

export type NodeScriptRunResult = {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  succeeded: boolean;
};

type NodeScriptRunOptions = {
  envOverrides?: Record<string, string>;
  throwOnFailure?: boolean;
};

function toUtf8TrimmedText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8").trim();
  }
  return "";
}

export function assertRunnerExists(filePath: string, runnerLabel: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${runnerLabel} runner does not exist: ${filePath}`);
  }
}

export function formatCommandFailure(result: NodeScriptRunResult): string {
  return [
    `Script execution failed: ${result.command}`,
    result.exitCode === null ? "" : `exitCode: ${String(result.exitCode)}`,
    result.stdout.length > 0 ? `stdout: ${result.stdout}` : "",
    result.stderr.length > 0 ? `stderr: ${result.stderr}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function runNodeScript(
  scriptPath: string,
  args: string[],
  options: NodeScriptRunOptions = {}
): NodeScriptRunResult {
  const command = `node ${toWorkspacePath(scriptPath)} ${args.join(" ")}`.trim();

  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: options.envOverrides
        ? { ...process.env, ...options.envOverrides }
        : process.env,
    });
    return {
      command,
      exitCode: 0,
      stdout: typeof stdout === "string" ? stdout.trim() : "",
      stderr: "",
      succeeded: true,
    };
  } catch (error: unknown) {
    const processError = error as NodeJS.ErrnoException & {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      status?: number | null;
    };
    const result: NodeScriptRunResult = {
      command,
      exitCode: processError.status ?? null,
      stdout: toUtf8TrimmedText(processError.stdout),
      stderr: toUtf8TrimmedText(processError.stderr),
      succeeded: false,
    };
    if (options.throwOnFailure) {
      throw new Error(formatCommandFailure(result));
    }
    return result;
  }
}
