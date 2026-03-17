export type {
  DateLike,
  NormalizedAllResults,
  NormalizedAnswer,
  NormalizedAssessResult,
  NormalizedCheckAiResult,
  NormalizedHealthLinkSummary,
  NormalizedOrderSummary,
} from "./useChat.results.types";

export {
  normalizeAllResultsPayload,
  readLocalAssessCats,
  readLocalCheckAiTopLabels,
} from "./useChat.results.normalize";
