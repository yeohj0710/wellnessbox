export const TIPS_LAB_STATES = [
  "NEW",
  "NEEDS_DATA",
  "SAFETY_REVIEW",
  "CANDIDATES_READY",
  "ACTIVE_PLAN",
  "FOLLOWUP_DUE",
  "ADJUSTMENT_REVIEW",
  "STOPPED",
  "ADVERSE_EVENT",
  "ESCALATED",
] as const;

export type TipsLabState = (typeof TIPS_LAB_STATES)[number];

export function canRunTipsLabAction(state: TipsLabState, action: string) {
  if (action === "initialize") return true;
  return state !== "STOPPED" && state !== "ADVERSE_EVENT" && state !== "ESCALATED";
}

