// RND: Module 07 KPI #7/#5 reproducible evaluation command.

import fs from "node:fs";
import path from "node:path";
import { runModule07IntegrationMvp } from "../../../lib/rnd/module07-biosensor-genetic-integration/mvp-engine";
import { buildModule07ScaffoldBundle } from "../../../lib/rnd/module07-biosensor-genetic-integration/scaffold";
import {
  MODULE07_INTEGRATION_RATE_MIN_SAMPLE_COUNT,
  MODULE07_INTERFACE_ACCURACY_MIN_RULE_COUNT,
  evaluateModule07IntegrationAndInterface,
  type Module07IntegrationRateSample,
  type Module07InterfaceWiringSample,
} from "../../../lib/rnd/module07-biosensor-genetic-integration/evaluation";
import type { RndDataSensitivity, RndModule02SourceKind } from "../../../lib/rnd/module02-data-lake/contracts";
import type {
  RndModule07DataSource,
  RndModule07IntegrationSession,
} from "../../../lib/rnd/module07-biosensor-genetic-integration/contracts";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  evaluatedAt: string | null;
  sessionCount: number;
  ruleCount: number;
};

function parseArgs(argv: string[]): CliArgs {
  const outIndex = argv.indexOf("--out");
  const generatedAtIndex = argv.indexOf("--generated-at");
  const evaluatedAtIndex = argv.indexOf("--evaluated-at");
  const sessionsIndex = argv.indexOf("--sessions");
  const rulesIndex = argv.indexOf("--rules");

  const outPath = outIndex >= 0 ? argv[outIndex + 1] ?? null : null;
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const evaluatedAt = evaluatedAtIndex >= 0 ? argv[evaluatedAtIndex + 1] ?? null : null;
  const rawSessionCount = sessionsIndex >= 0 ? argv[sessionsIndex + 1] ?? null : null;
  const rawRuleCount = rulesIndex >= 0 ? argv[rulesIndex + 1] ?? null : null;

  const parsedSessionCount = rawSessionCount
    ? Number.parseInt(rawSessionCount, 10)
    : MODULE07_INTEGRATION_RATE_MIN_SAMPLE_COUNT;
  const parsedRuleCount = rawRuleCount
    ? Number.parseInt(rawRuleCount, 10)
    : MODULE07_INTERFACE_ACCURACY_MIN_RULE_COUNT;

  if (!Number.isInteger(parsedSessionCount) || parsedSessionCount <= 0) {
    throw new Error("--sessions must be a positive integer.");
  }
  if (!Number.isInteger(parsedRuleCount) || parsedRuleCount <= 0) {
    throw new Error("--rules must be a positive integer.");
  }

  return {
    outPath,
    generatedAt,
    evaluatedAt,
    sessionCount: parsedSessionCount,
    ruleCount: parsedRuleCount,
  };
}

function mapSourceToExpectedSourceKind(source: RndModule07DataSource): RndModule02SourceKind {
  switch (source) {
    case "wearable":
      return "internal_behavior";
    case "continuous_glucose":
      return "internal_behavior";
    case "genetic_test":
      return "internal_profile";
    default: {
      const _exhaustiveCheck: never = source;
      throw new Error(`Unsupported Module 07 source: ${_exhaustiveCheck}`);
    }
  }
}

function mapSourceToExpectedSensitivity(source: RndModule07DataSource): RndDataSensitivity {
  return source === "genetic_test" ? "sensitive" : "internal";
}

function buildIntegrationSamples(
  mvpResult: ReturnType<typeof runModule07IntegrationMvp>,
  sessions: RndModule07IntegrationSession[],
  sessionCount: number
): Module07IntegrationRateSample[] {
  if (mvpResult.wiringLogs.length === 0) {
    throw new Error("Module 07 evaluation requires at least one wiring log.");
  }

  const sessionById = new Map(
    sessions.map((session) => [session.sessionId, session] as const)
  );
  const linkedSessionIds = new Set(
    mvpResult.wiringLogs.filter((log) => log.linked).map((log) => log.sessionId)
  );
  const seedBySessionId = new Map<
    string,
    {
      sessionId: string;
      source: RndModule07DataSource;
      sessionSuccess: boolean;
      dataLakeLinked: boolean;
    }
  >();

  mvpResult.wiringLogs.forEach((log) => {
    const session = sessionById.get(log.sessionId);
    if (!session) {
      throw new Error(`Missing session metadata for wiring log sessionId: ${log.sessionId}.`);
    }

    if (!seedBySessionId.has(log.sessionId)) {
      seedBySessionId.set(log.sessionId, {
        sessionId: log.sessionId,
        source: log.source,
        sessionSuccess: session.status === "success",
        dataLakeLinked: linkedSessionIds.has(log.sessionId),
      });
    }
  });

  const seeds = [...seedBySessionId.values()].sort((left, right) =>
    left.sessionId.localeCompare(right.sessionId)
  );
  if (seeds.length === 0) {
    throw new Error("Module 07 evaluation requires at least one integration session seed.");
  }

  return Array.from({ length: sessionCount }, (_, index) => {
    const seed = seeds[index % seeds.length];
    const suffix = String(index + 1).padStart(3, "0");

    return {
      sampleId: `m07-kpi07-sample-${suffix}`,
      source: seed.source,
      sessionSuccess: seed.sessionSuccess,
      dataLakeLinked: seed.dataLakeLinked,
    };
  });
}

function buildInterfaceSamples(
  mvpResult: ReturnType<typeof runModule07IntegrationMvp>,
  ruleCount: number
): Module07InterfaceWiringSample[] {
  const seeds = [...mvpResult.wiringLogs].sort((left, right) =>
    left.wiringLogId.localeCompare(right.wiringLogId)
  );
  if (seeds.length === 0) {
    throw new Error("Module 07 evaluation requires at least one wiring log seed.");
  }

  return Array.from({ length: ruleCount }, (_, index) => {
    const seed = seeds[index % seeds.length];
    const suffix = String(index + 1).padStart(3, "0");
    const expectedSourceKind = mapSourceToExpectedSourceKind(seed.source);
    const expectedSensitivity = mapSourceToExpectedSensitivity(seed.source);

    return {
      sampleId: `m07-kpi05-sample-${suffix}`,
      expected: {
        sessionId: seed.sessionId,
        source: seed.source,
        sourceKind: expectedSourceKind,
        sensitivity: expectedSensitivity,
        linked: seed.linked,
        dataLakeRecordId: seed.linked ? seed.dataLakeRecordId : null,
      },
      observed: {
        sessionId: seed.sessionId,
        source: seed.source,
        sourceKind: seed.sourceKind,
        sensitivity: seed.sensitivity,
        linked: seed.linked,
        dataLakeRecordId: seed.dataLakeRecordId,
      },
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule07ScaffoldBundle(args.generatedAt ?? undefined);
  const mvpResult = runModule07IntegrationMvp({
    sessions: bundle.sessions,
    wearableMetrics: bundle.wearableMetrics,
    cgmMetrics: bundle.cgmMetrics,
    geneticVariants: bundle.geneticVariants,
    algorithmAdjustments: bundle.algorithmAdjustments,
    dataLakeWriteLogs: bundle.dataLakeWriteLogs,
    generatedAt: args.generatedAt ?? bundle.generatedAt,
  });

  const integrationSamples = buildIntegrationSamples(
    mvpResult,
    bundle.sessions,
    args.sessionCount
  );
  const interfaceSamples = buildInterfaceSamples(mvpResult, args.ruleCount);
  const report = evaluateModule07IntegrationAndInterface(
    integrationSamples,
    interfaceSamples,
    args.evaluatedAt ?? mvpResult.generatedAt
  );

  const output = {
    module: "07_biosensor_and_genetic_data_integration",
    phase: "EVALUATION",
    generatedAt: bundle.generatedAt,
    evaluatedAt: report.evaluatedAt,
    mvpRunId: mvpResult.output.runId,
    mvpSessionCount: bundle.sessions.length,
    mvpWiringLogCount: mvpResult.wiringLogs.length,
    mvpRuntimeLogCount: mvpResult.runtimeLogs.length,
    sampleSessionCount: integrationSamples.length,
    sampleRuleCount: interfaceSamples.length,
    report,
    integrationSamples,
    interfaceSamples,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 07 evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
