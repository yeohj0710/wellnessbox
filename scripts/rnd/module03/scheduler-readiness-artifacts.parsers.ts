import path from "node:path";

export { parseHandoffSummary } from "./scheduler-readiness-parse-handoff";
export { parseInfraBinding } from "./scheduler-readiness-parse-infra";

export function resolveArtifactPath(rawPath: string): string {
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  return path.resolve(process.cwd(), rawPath);
}
