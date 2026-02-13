// RND: Module 02 MVP ingest + load verification command.

import { buildModule02ScaffoldBundle } from "../../../lib/rnd/module02-data-lake/scaffold";
import {
  loadModule02BundleMvp,
  persistModule02BundleMvp,
} from "../../../lib/rnd/module02-data-lake/mvp-store";

type CliArgs = {
  generatedAt: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const generatedAtIndex = argv.indexOf("--generated-at");
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  return { generatedAt };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule02ScaffoldBundle(args.generatedAt ?? undefined);
  const persisted = await persistModule02BundleMvp(bundle);
  const loaded = await loadModule02BundleMvp();

  if (!loaded) {
    throw new Error("MVP load check failed: persisted bundle was not found.");
  }

  const output = {
    module: "02_data_lake",
    phase: "MVP",
    generatedAt: bundle.generatedAt,
    persistedAt: persisted.persistedAt,
    persisted: {
      recordCount: persisted.recordCount,
      evidenceLinkLogCount: persisted.evidenceLinkLogCount,
      summaryKey: persisted.summaryKey,
      recordKeys: persisted.recordKeys,
      evidenceLogKeys: persisted.evidenceLogKeys,
    },
    loaded: {
      generatedAt: loaded.generatedAt,
      recordCount: loaded.records.length,
      evidenceLinkLogCount: loaded.evidenceLinkLogs.length,
    },
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
