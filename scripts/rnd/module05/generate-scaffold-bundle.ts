// RND: Module 05 Optimization Engine scaffold artifact generator.

import fs from "node:fs";
import path from "node:path";
import {
  assertModule05ScaffoldBundle,
  buildModule05ScaffoldBundle,
} from "../../../lib/rnd/module05-optimization/scaffold";

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
  const bundle = buildModule05ScaffoldBundle(args.generatedAt ?? undefined);
  assertModule05ScaffoldBundle(bundle);

  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 05 scaffold bundle: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

