// RND: Module 03 Personal Safety Validation Engine scaffold artifact generator.

import fs from "node:fs";
import path from "node:path";
import {
  assertModule03ScaffoldBundle,
  buildModule03ScaffoldBundle,
} from "../../../lib/rnd/module03-personal-safety/scaffold";

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
  const bundle = buildModule03ScaffoldBundle(args.generatedAt ?? undefined);
  assertModule03ScaffoldBundle(bundle);

  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 03 scaffold bundle: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

