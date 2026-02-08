// RND: Module 02 Data Lake scaffold fixture builder.

import {
  assertRndDataLakeRecord,
  createRndDataLakeRecord,
  type RndDataLakeRecord,
  type RndEvidenceLinkLog,
} from "./contracts";

export type Module02ScaffoldBundle = {
  generatedAt: string;
  records: RndDataLakeRecord[];
  evidenceLinkLogs: RndEvidenceLinkLog[];
};

type BuildEvidenceLinkLogInput = {
  sampleId: string;
  queryId: string;
  records: RndDataLakeRecord[];
  lineagePath: string[];
  loggedAt?: string;
};

function assertIsoDateTime(value: string, fieldName: string) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

export function buildEvidenceLinkLog(
  input: BuildEvidenceLinkLogInput
): RndEvidenceLinkLog {
  const loggedAt = input.loggedAt ?? new Date().toISOString();
  assertIsoDateTime(loggedAt, "loggedAt");

  const linkedEvidenceIds = Array.from(
    new Set(
      input.records.flatMap((record) =>
        record.evidence.map((unit) => unit.evidenceId)
      )
    )
  );
  const sourceKinds = Array.from(new Set(input.records.map((record) => record.sourceKind)));

  return {
    sampleId: input.sampleId,
    queryId: input.queryId,
    linkedEvidenceIds,
    sourceKinds,
    lineagePath: input.lineagePath,
    loggedAt,
  };
}

export function buildModule02ScaffoldBundle(
  generatedAt = new Date().toISOString()
): Module02ScaffoldBundle {
  assertIsoDateTime(generatedAt, "generatedAt");

  const evidenceRecord = createRndDataLakeRecord({
    recordId: "rnd02-meddb-vitk-warfarin-v1",
    sourceKind: "medical_database",
    sensitivity: "public",
    collectedAt: generatedAt,
    payload: {
      title: "Vitamin K and warfarin interaction",
      sourceName: "Micromedex",
      ingredient: "vitamin_k",
      interactingDrug: "warfarin",
      riskLevel: "high",
    },
    evidence: [
      {
        evidenceId: "evi-meddb-vitk-warfarin-p12",
        sourceKind: "medical_database",
        sourceRef: "micromedex://interaction/vitamin-k-warfarin",
        chunk: { unitId: "chunk-12", locator: "section:interaction-summary" },
        capturedAt: generatedAt,
      },
    ],
    lineage: [
      { step: "ingest", actor: "rnd.module02.ingestor", occurredAt: generatedAt, inputIds: [] },
      {
        step: "split",
        actor: "rnd.module02.processor",
        occurredAt: generatedAt,
        inputIds: ["micromedex://interaction/vitamin-k-warfarin"],
      },
      {
        step: "tag",
        actor: "rnd.module02.processor",
        occurredAt: generatedAt,
        inputIds: ["chunk-12"],
      },
      {
        step: "index",
        actor: "rnd.module02.indexer",
        occurredAt: generatedAt,
        inputIds: ["chunk-12"],
      },
    ],
  });

  const profileRecord = createRndDataLakeRecord({
    recordId: "rnd02-profile-userhash-a1",
    sourceKind: "internal_profile",
    sensitivity: "sensitive",
    collectedAt: generatedAt,
    payload: {
      appUserIdHash: "sha256:7d7c2f4b8af0ef7d",
      ageBand: "30-39",
      conditions: ["hypertension"],
      currentMedications: ["warfarin"],
    },
    evidence: [
      {
        evidenceId: "evi-profile-app-user-a1",
        sourceKind: "internal_profile",
        sourceRef: "app://user-profile/sha256:7d7c2f4b8af0ef7d",
        chunk: { unitId: "profile-v1", locator: "field:currentMedications" },
        capturedAt: generatedAt,
      },
    ],
    lineage: [
      { step: "ingest", actor: "rnd.module02.profile-sync", occurredAt: generatedAt, inputIds: [] },
    ],
  });

  const interactionRecord = createRndDataLakeRecord({
    recordId: "rnd02-chat-session-1001",
    sourceKind: "internal_interaction",
    sensitivity: "internal",
    collectedAt: generatedAt,
    payload: {
      sessionId: "chat-1001",
      userQuery: "Can I take vitamin K with my current medicine?",
      channel: "chat",
    },
    evidence: [
      {
        evidenceId: "evi-chat-session-1001-q1",
        sourceKind: "internal_interaction",
        sourceRef: "app://chat-session/1001",
        chunk: { unitId: "turn-1", locator: "message:user" },
        capturedAt: generatedAt,
      },
    ],
    lineage: [
      { step: "ingest", actor: "rnd.module02.chat-ingestor", occurredAt: generatedAt, inputIds: [] },
    ],
  });

  const decisionRecord = createRndDataLakeRecord({
    recordId: "rnd02-decision-chat-1001-v1",
    sourceKind: "internal_compute_result",
    sensitivity: "internal",
    collectedAt: generatedAt,
    payload: {
      decision: "flag_interaction_risk",
      recommendation: "Avoid vitamin K supplement while taking warfarin without clinician review.",
      confidence: 0.92,
    },
    evidence: [
      evidenceRecord.evidence[0],
      profileRecord.evidence[0],
      interactionRecord.evidence[0],
    ],
    lineage: [
      {
        step: "retrieve",
        actor: "rnd.module02.retriever",
        occurredAt: generatedAt,
        inputIds: [evidenceRecord.recordId, profileRecord.recordId, interactionRecord.recordId],
      },
      {
        step: "decision",
        actor: "rnd.module02.decision-engine",
        occurredAt: generatedAt,
        inputIds: [evidenceRecord.recordId, profileRecord.recordId, interactionRecord.recordId],
      },
    ],
  });

  const records = [evidenceRecord, profileRecord, interactionRecord, decisionRecord];
  records.forEach((record) => assertRndDataLakeRecord(record));

  const evidenceLinkLogs = [
    buildEvidenceLinkLog({
      sampleId: "sample-rule-001",
      queryId: "query-chat-1001",
      records: [decisionRecord],
      lineagePath: [
        "internal_interaction:rnd02-chat-session-1001",
        "internal_profile:rnd02-profile-userhash-a1",
        "medical_database:rnd02-meddb-vitk-warfarin-v1",
        "internal_compute_result:rnd02-decision-chat-1001-v1",
      ],
      loggedAt: generatedAt,
    }),
  ];

  return {
    generatedAt,
    records,
    evidenceLinkLogs,
  };
}

export function assertModule02ScaffoldBundle(
  bundle: Module02ScaffoldBundle
): void {
  assertIsoDateTime(bundle.generatedAt, "generatedAt");
  if (bundle.records.length === 0) {
    throw new Error("At least one Module 02 scaffold record is required.");
  }
  bundle.records.forEach((record) => assertRndDataLakeRecord(record));
  bundle.evidenceLinkLogs.forEach((log) => {
    if (!log.sampleId.trim() || !log.queryId.trim()) {
      throw new Error("evidenceLinkLogs entries must include sampleId and queryId.");
    }
    if (log.linkedEvidenceIds.length === 0) {
      throw new Error("evidenceLinkLogs entries must include linkedEvidenceIds.");
    }
    assertIsoDateTime(log.loggedAt, "loggedAt");
  });
}
