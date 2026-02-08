// RND: Module 04 Efficacy Quantification Model scaffold artifact generator.

import fs from "node:fs";
import path from "node:path";
import {
  assertModule04ScaffoldBundle,
  buildModule04ScaffoldBundle,
} from "../../../lib/rnd/module04-efficacy-quantification/scaffold";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const outIndex = argv.indexOf("--out");
  const dateIndex = argv.indexOf("--generated-at");
  const outPath = outIndex >= 0 ? argv[outIndex + 1] ?? null : null;
  const generatedAt = dateIndex >= 0 ? argv[dateIndex + 1] ?? null : null;
  return { outPath, generatedAt };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule04ScaffoldBundle(args.generatedAt ?? undefined);
  assertModule04ScaffoldBundle(bundle);

  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 04 scaffold bundle: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
