// RND: Module 03 KPI #6 ops-facing ingestion adapter evaluation command.

import fs from "node:fs";
import path from "node:path";
import {
  evaluateModule03AdverseEventCount,
} from "../../../lib/rnd/module03-personal-safety/evaluation";
import { buildOpsEvaluationOutput } from "./evaluate-adverse-event-count-from-source-artifacts";
import {
  DEFAULT_SCHEMA_MAP_PATH,
  DEFAULT_SQL_TEMPLATE_PATH,
  parseArgs,
} from "./evaluate-adverse-event-count-from-source-cli";
import { parseSchemaMap, toSamples } from "./evaluate-adverse-event-count-from-source-schema";
import { readJsonFile } from "./orchestrate-adverse-event-evaluation-monthly-helpers";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const schemaMapPath = path.resolve(args.schemaMapPath ?? DEFAULT_SCHEMA_MAP_PATH);
  const schemaMapRaw = readJsonFile(schemaMapPath);
  const schemaMap = parseSchemaMap(schemaMapRaw, schemaMapPath);
  const rowsRaw = readJsonFile(args.inputPath);
  const samples = toSamples(rowsRaw, schemaMap);
  const evaluatedAt = args.evaluatedAt ?? new Date().toISOString();
  const report = evaluateModule03AdverseEventCount(samples, evaluatedAt);
  const output = buildOpsEvaluationOutput({
    schemaMapPath,
    sqlTemplatePath: DEFAULT_SQL_TEMPLATE_PATH,
    schemaMap,
    samples,
    report,
  });

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 03 KPI #6 ops evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
