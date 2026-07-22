export const WB_RND_INTERIM_OPERATIONS = [
  ["GET", "/v1/interim/status"],
  ["GET", "/v1/interim/kpis"],
  ["POST", "/v1/interim/profiles"],
  ["POST", "/v1/interim/recommendations"],
  ["POST", "/v1/interim/counseling/turns"],
  ["POST", "/v1/interim/agent/runs"],
  ["POST", "/v1/interim/agent/tools"],
  ["POST", "/v1/interim/connectors/device"],
  ["GET", "/v1/interim/executions"],
  ["POST", "/v1/interim/executions/{execution_id}/replay"],
  ["POST", "/v1/interim/plans/order-context"],
  ["POST", "/v1/interim/plans/bindings/validate"],
  ["POST", "/v1/interim/pro/plans"],
  ["POST", "/v1/interim/pro/followups"],
  ["POST", "/v1/interim/pro/followups/correct-and-recalculate"],
  ["GET", "/v1/interim/admin/sources"],
  ["GET", "/v1/interim/admin/runtime"],
  ["GET", "/v1/interim/admin/reviews"],
  ["POST", "/v1/interim/admin/reviews/{review_id}/decision"],
] as const;

export type WbRndInterimOperation = (typeof WB_RND_INTERIM_OPERATIONS)[number];
