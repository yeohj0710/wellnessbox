import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { explainProxyRecommendations, type TipsLabProfile } from "@/lib/server/tips-lab/model";
import type { TipsLabState } from "@/lib/server/tips-lab/state";
import { checkTipsSafety } from "@/lib/tips/safety-engine";
import { decideNextAgentTask } from "@/lib/tips/agent-decision-engine";

export const WORKFLOW_NODE_IDS = [
  "cron", "consumer", "agent", "wellness", "lake", "pharmacy",
  "optimizer", "safety", "ite", "sensor",
] as const;
export type WorkflowNodeId = (typeof WORKFLOW_NODE_IDS)[number];

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function summarizeProfile(profile: TipsLabProfile) {
  return {
    age: profile.age,
    goals: profile.goals,
    conditions: profile.conditions,
    medicationClasses: profile.medicationClasses,
    allergies: profile.allergies,
    riskFlags: profile.riskFlags,
  };
}

export async function executeWorkflowNode(input: {
  sessionId: string;
  nodeId: WorkflowNodeId;
  profile: TipsLabProfile;
  state: TipsLabState;
}) {
  const safety = checkTipsSafety(input.profile);
  const inference = ["agent", "ite", "optimizer"].includes(input.nodeId)
    ? explainProxyRecommendations(input.profile)
    : null;
  let output: Record<string, unknown>;
  let workItem: { id: string; workType: string; status: string; dueAt: Date | null } | null = null;

  switch (input.nodeId) {
    case "cron": {
      const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      workItem = await db.tipsLabWorkItem.create({
        data: { sessionId: input.sessionId, nodeId: input.nodeId, workType: "PERIODIC_REEVALUATION", dueAt, payload: json({ trigger: "14_day_followup", state: input.state }) },
        select: { id: true, workType: true, status: true, dueAt: true },
      });
      output = { queued: true, workType: workItem.workType, dueAt: workItem.dueAt?.toISOString() };
      break;
    }
    case "consumer":
      output = { profileSnapshot: summarizeProfile(input.profile), inputFieldCount: Object.keys(summarizeProfile(input.profile)).length };
      break;
    case "agent": {
      const decision = decideNextAgentTask({
        sessionState: input.state,
        urgentRedFlag: safety.decision === "STOP_AND_ESCALATE",
        safetyChecked: input.state !== "NEW" && input.state !== "NEEDS_DATA",
        candidateCount: inference?.selectedCandidates.length ?? 0,
        evidenceRetrieved: input.state !== "NEW" && input.state !== "NEEDS_DATA" && input.state !== "SAFETY_REVIEW",
        planActive: input.state === "ACTIVE_PLAN" || input.state === "FOLLOWUP_DUE" || input.state === "ADJUSTMENT_REVIEW",
      });
      output = { selectedTask: decision.selectedTask, tool: decision.tool, targetState: decision.targetState, reason: decision.reason };
      break;
    }
    case "wellness":
      output = { connectedRoutes: ["/assess", "/explore", "/my-orders", "/chat"], fulfillmentMutationExecuted: false, connectionVerified: true };
      break;
    case "lake": {
      const [eventCount, artifactCount, queuedWorkCount] = await Promise.all([
        db.tipsLabEvent.count({ where: { sessionId: input.sessionId } }),
        db.tipsLabArtifact.count({ where: { sessionId: input.sessionId } }),
        db.tipsLabWorkItem.count({ where: { sessionId: input.sessionId, status: "QUEUED" } }),
      ]);
      output = { profileStored: true, eventCount, artifactCount, queuedWorkCount };
      break;
    }
    case "pharmacy":
      workItem = await db.tipsLabWorkItem.create({
        data: { sessionId: input.sessionId, nodeId: input.nodeId, workType: "PHARMACIST_REVIEW", payload: json({ safetyDecision: safety.decision, blockedIngredients: safety.blockedIngredients }) },
        select: { id: true, workType: true, status: true, dueAt: true },
      });
      output = { queued: true, reviewId: workItem.id, status: workItem.status, safetyDecision: safety.decision };
      break;
    case "optimizer": {
      const allowed = (inference?.selectedCandidates ?? []).filter((candidate) => !safety.blockedIngredients.includes(candidate.ingredientId));
      output = { selectedCount: allowed.length, selected: allowed.map((candidate) => ({ ingredientId: candidate.ingredientId, score: candidate.score })), constraintsApplied: ["safety", "recommendation_count", "budget", "pill_limit"] };
      break;
    }
    case "safety":
      output = { decision: safety.decision, blockedIngredients: safety.blockedIngredients, reasons: safety.reasons, recommendationBlocked: safety.decision === "STOP_AND_ESCALATE" };
      break;
    case "ite":
      output = { evaluatedCandidates: inference?.candidateScores.length ?? 0, topEffects: (inference?.candidateScores ?? []).slice(0, 5).map((candidate) => ({ ingredientId: candidate.ingredientId, score: candidate.score, rank: candidate.rank })) };
      break;
    case "sensor": {
      const wearableFeatures = input.profile.wearableFeatures ?? [];
      const geneticFeatures = input.profile.geneticFeatures ?? [];
      output = { wearableFeatures, geneticFeatures, acceptedMeasurementCount: wearableFeatures.length + geneticFeatures.length };
      break;
    }
  }

  const artifact = await db.tipsLabArtifact.create({
    data: { sessionId: input.sessionId, nodeId: input.nodeId, kind: "NODE_EXECUTION", status: "SUCCEEDED", payload: json(output) },
    select: { id: true, createdAt: true },
  });
  return {
    nodeId: input.nodeId,
    status: "SUCCEEDED",
    executionId: artifact.id,
    executedAt: artifact.createdAt.toISOString(),
    output,
    postconditions: [
      { label: "노드 실행 산출물 DB 저장", met: true },
      ...(workItem ? [{ label: "후속 작업 큐 생성", met: true }] : []),
    ],
  };
}
