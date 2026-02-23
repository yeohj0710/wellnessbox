import { HEALTH_LINK_COPY } from "./copy";
import type { PrimaryFlow } from "./ui-types";

export function resolvePrimaryFlow(
  statusLinked: boolean,
  hasAuthRequested: boolean
): PrimaryFlow {
  if (statusLinked) {
    return {
      kind: "fetch",
      step: 3,
      title: HEALTH_LINK_COPY.flow.fetch.title,
      guide: HEALTH_LINK_COPY.flow.fetch.guide,
    };
  }

  if (hasAuthRequested) {
    return {
      kind: "sign",
      step: 2,
      title: HEALTH_LINK_COPY.flow.sign.title,
      guide: HEALTH_LINK_COPY.flow.sign.guide,
    };
  }

  return {
    kind: "init",
    step: 1,
    title: HEALTH_LINK_COPY.flow.init.title,
    guide: HEALTH_LINK_COPY.flow.init.guide,
  };
}

export function resolvePrimaryButtonLabel(
  isFetchStep: boolean,
  hasFetchResult: boolean
) {
  if (isFetchStep && hasFetchResult) return HEALTH_LINK_COPY.action.reload;
  return HEALTH_LINK_COPY.action.next;
}
