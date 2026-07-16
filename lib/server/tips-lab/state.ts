export const TIPS_LAB_STATES = [
  "NEW", "NEEDS_DATA", "SAFETY_REVIEW", "CANDIDATES_READY", "ACTIVE_PLAN",
  "FOLLOWUP_DUE", "ADJUSTMENT_REVIEW", "STOPPED", "ADVERSE_EVENT", "ESCALATED",
] as const;

export type TipsLabState = (typeof TIPS_LAB_STATES)[number];

const STATE_ACTIONS: Record<TipsLabState, readonly string[]> = {
  NEW: ["recommend", "decide_next_action", "execute_agent_task", "execute_workflow_node", "list_blind_tests", "verify_blind_tests", "recompute_blind_test", "dataset_registry", "list_dataset_cases", "verify_dataset_split", "verify_all_kpis"],
  NEEDS_DATA: ["recommend", "decide_next_action", "execute_agent_task", "execute_workflow_node", "list_blind_tests", "verify_blind_tests", "recompute_blind_test", "dataset_registry", "list_dataset_cases", "verify_dataset_split", "verify_all_kpis"],
  SAFETY_REVIEW: ["recommend", "retrieve_evidence", "decide_next_action", "execute_agent_task", "execute_workflow_node"],
  CANDIDATES_READY: ["retrieve_evidence", "create_followup", "decide_next_action", "execute_agent_task", "execute_workflow_node"],
  ACTIVE_PLAN: ["create_followup", "ingest_pro", "ingest_device", "log_adverse_event", "decide_next_action", "execute_agent_task", "execute_workflow_node"],
  FOLLOWUP_DUE: ["ingest_pro", "ingest_device", "log_adverse_event", "decide_next_action", "execute_agent_task", "execute_workflow_node"],
  ADJUSTMENT_REVIEW: ["recommend", "create_followup", "ingest_device", "log_adverse_event", "decide_next_action", "execute_agent_task", "execute_workflow_node"],
  STOPPED: [], ADVERSE_EVENT: [], ESCALATED: [],
};

export function canRunTipsLabAction(state: TipsLabState, action: string) {
  if (action === "initialize") return true;
  if (action === "list_rnd_sessions" || action === "replay_rnd_session") return true;
  return STATE_ACTIONS[state].includes(action);
}

export function isTipsLabTransitionAllowed(from: TipsLabState, to: TipsLabState) {
  if (from === to) return true;
  const allowed: Record<TipsLabState, readonly TipsLabState[]> = {
    NEW: ["NEEDS_DATA", "SAFETY_REVIEW", "CANDIDATES_READY", "ESCALATED"],
    NEEDS_DATA: ["SAFETY_REVIEW", "CANDIDATES_READY", "ESCALATED"],
    SAFETY_REVIEW: ["CANDIDATES_READY", "ESCALATED"],
    CANDIDATES_READY: ["ACTIVE_PLAN", "FOLLOWUP_DUE", "ESCALATED"],
    ACTIVE_PLAN: ["FOLLOWUP_DUE", "ADJUSTMENT_REVIEW", "ADVERSE_EVENT", "ESCALATED", "STOPPED"],
    FOLLOWUP_DUE: ["ADJUSTMENT_REVIEW", "ADVERSE_EVENT", "ESCALATED", "STOPPED"],
    ADJUSTMENT_REVIEW: ["ACTIVE_PLAN", "FOLLOWUP_DUE", "ADVERSE_EVENT", "ESCALATED", "STOPPED"],
    STOPPED: [], ADVERSE_EVENT: ["ESCALATED"], ESCALATED: [],
  };
  return allowed[from].includes(to);
}
