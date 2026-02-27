import {
  assertNonEmptyString,
  isPlainObject,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { assertEnvironmentVariableName } from "./cli-helpers";
import type { EnvSecretBinding } from "./scheduler-readiness-artifacts.types";

export function requireSectionObject(
  value: unknown,
  errorMessage: string
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(errorMessage);
  }
  return value;
}

export function parseStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

export function parseEnvironmentVariableArray(
  value: unknown,
  fieldName: string
): string[] {
  return parseStringArray(value, fieldName).map((entry, index) =>
    assertEnvironmentVariableName(
      assertNonEmptyString(entry, `${fieldName}[${index}]`),
      `${fieldName}[${index}]`
    )
  );
}

export function parseBindings(
  value: unknown,
  fieldName: string
): EnvSecretBinding[] {
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
