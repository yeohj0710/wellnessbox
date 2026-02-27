// RND: Module 03 KPI #6 scheduler deployment bundle generator.

import fs from "node:fs";
import path from "node:path";
import { buildBundle } from "./scheduler-deployment-bundle-artifacts";
import { parseArgs } from "./scheduler-deployment-bundle-cli";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildBundle(args);
  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;

  if (args.outPath) {
    const absoluteOutPath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absoluteOutPath), { recursive: true });
    fs.writeFileSync(absoluteOutPath, serialized, "utf8");
    console.log(`Wrote Module 03 KPI #6 scheduler deployment bundle: ${absoluteOutPath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
