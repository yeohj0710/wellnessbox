import {
  isPlainObject,
  readJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { assertEnvironmentVariableName } from "./cli-helpers";

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

export function isPlaceholderSecretRef(secretRef: string): boolean {
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

export function loadBindingsFromFile(filePath: string): Map<string, string> {
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

export function loadBindingsFromCli(pairs: string[]): Map<string, string> {
  const bindings = new Map<string, string>();
  for (const pair of pairs) {
    const parsedPair = parseSecretBindingPair(pair);
    addBindingToMap(bindings, parsedPair.envKey, parsedPair.secretRef, "--secret-binding");
  }
  return bindings;
}

export function mergeBindings(
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
