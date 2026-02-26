import { assertNonEmptyString } from "./orchestrate-adverse-event-evaluation-monthly-helpers";

export function getArgValues(argv: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== flag) {
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} requires a value.`);
    }
    values.push(value);
  }
  return values;
}

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export function assertEnvironmentVariableName(value: string, fieldName: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${fieldName} must be a valid environment variable name.`);
  }
  return value;
}

export function parsePositiveInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

export function parseKeyValuePair(
  rawPair: string,
  flagName: string
): { key: string; value: string } {
  const delimiterIndex = rawPair.indexOf("=");
  if (delimiterIndex <= 0 || delimiterIndex === rawPair.length - 1) {
    throw new Error(`${flagName} must follow KEY=value format. Received "${rawPair}".`);
  }
  const key = assertEnvironmentVariableName(rawPair.slice(0, delimiterIndex).trim(), flagName);
  const value = assertNonEmptyString(rawPair.slice(delimiterIndex + 1), `${flagName} value`);
  return { key, value };
}
