import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";
import type { NhisFetchTarget } from "@/lib/server/hyphen/fetch-contract";
import type { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import type { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";

export type NhisFetchPayload = Awaited<ReturnType<typeof executeNhisFetch>>["payload"];
export type NhisFetchFirstFailed = Awaited<
  ReturnType<typeof executeNhisFetch>
>["firstFailed"];

export type RequestHashMeta = {
  requestHash: string;
  requestKey: string;
  normalizedTargets: string[];
};

export type NhisRequestDefaults = ReturnType<typeof buildNhisRequestDefaults>;

export type ResolveFetchExecutionInput = {
  appUserId: string;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  forceRefresh: boolean;
};

export type ResolveFetchExecutionContext = {
  appUserId: string;
  identityHash: string;
  requestHashMeta: RequestHashMeta;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  requestDefaults: NhisRequestDefaults;
  forceRefresh: boolean;
  basePayload: HyphenNhisRequestPayload;
  detailPayload: HyphenNhisRequestPayload;
};

export type ExecuteAndPersistNhisFetchResult = {
  statusCode: number;
  payload: NhisFetchPayload;
};
