import type { CliArgs } from "./scheduler-deployment-bundle-types";
import {
  parseArchiveDirArg,
  parseCadenceCronArg,
  parseExportCommandTemplateArg,
  parseFailureAlertDirArg,
  parseFailureWebhookEnvKeyArg,
  parseFailureWebhookTimeoutEnvKeyArg,
  parseGeneratedAtArg,
  parseHandoffDirArg,
  parseOutPathArg,
  parseRequiredEnvKeysArg,
  parseRetentionMonthsArg,
  parseSchemaMapPathArg,
  parseSqlTemplatePathArg,
  parseTimezoneArg,
} from "./scheduler-deployment-bundle-cli-fields";

export function parseArgs(argv: string[]): CliArgs {
  const generatedAt = parseGeneratedAtArg(argv);
  const outPath = parseOutPathArg(argv);
  const cadenceCron = parseCadenceCronArg(argv);
  const timezone = parseTimezoneArg(argv);
  const retentionMonths = parseRetentionMonthsArg(argv);
  const requiredEnvKeys = parseRequiredEnvKeysArg(argv);
  const exportCommandTemplate = parseExportCommandTemplateArg(argv);
  const schemaMapPath = parseSchemaMapPathArg(argv);
  const sqlTemplatePath = parseSqlTemplatePathArg(argv);
  const archiveDir = parseArchiveDirArg(argv);
  const handoffDir = parseHandoffDirArg(argv);
  const failureAlertDir = parseFailureAlertDirArg(argv);
  const failureWebhookEnvKey = parseFailureWebhookEnvKeyArg(argv);
  const failureWebhookTimeoutEnvKey = parseFailureWebhookTimeoutEnvKeyArg(argv);

  return {
    outPath,
    generatedAt,
    cadenceCron,
    timezone,
    retentionMonths,
    requiredEnvKeys,
    exportCommandTemplate,
    schemaMapPath,
    sqlTemplatePath,
    archiveDir,
    handoffDir,
    failureAlertDir,
    failureWebhookEnvKey,
    failureWebhookTimeoutEnvKey,
  };
}
