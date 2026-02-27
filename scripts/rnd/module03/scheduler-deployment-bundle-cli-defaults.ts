import path from "node:path";

export const DEFAULT_CADENCE_CRON = "0 3 1 * *";
export const DEFAULT_TIMEZONE = "UTC";
export const DEFAULT_RETENTION_MONTHS = 18;
export const DEFAULT_EXPORT_COMMAND_TEMPLATE = [
  "warehouse-cli export",
  '--window-end "{{window_end_utc}}"',
  '--sql-file "{{sql_template_path}}"',
  '--out "{{export_output_path}}"',
].join(" ");

export const DEFAULT_SCHEMA_MAP_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "schema",
  "kpi06_pharmacovigilance_schema_map.json"
);
export const DEFAULT_SQL_TEMPLATE_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "sql",
  "kpi06_adverse_events_last_12_months.sql"
);
export const DEFAULT_ARCHIVE_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-monthly-archive"
);
export const DEFAULT_HANDOFF_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-warehouse-handoff"
);
export const DEFAULT_FAILURE_ALERT_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-failure-alerts"
);
export const DEFAULT_FAILURE_WEBHOOK_ENV_KEY = "RND_MODULE03_FAILURE_WEBHOOK_URL";
export const DEFAULT_FAILURE_WEBHOOK_TIMEOUT_ENV_KEY = "RND_MODULE03_FAILURE_WEBHOOK_TIMEOUT_MS";
