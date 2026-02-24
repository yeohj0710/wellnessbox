import "server-only";

import {
  NHIS_MEDICAL_INFO_ENDPOINTS,
  NHIS_MEDICAL_INFO2_ENDPOINTS,
  type HyphenApiResponse,
  type HyphenEndpointPath,
  type HyphenNhisRequestPayload,
  type HyphenRequestOptions,
} from "./client.contracts";
import { hyphenPost, HyphenApiError, isHyphenApiError } from "./client.request";
import {
  extractCookieData,
  extractStepData,
  getHyphenCommon,
} from "./client.runtime";

export {
  HYPHEN_PROVIDER,
  NHIS_ENDPOINTS,
  NHIS_MEDICAL_INFO2_ENDPOINTS,
  NHIS_MEDICAL_INFO_ENDPOINTS,
} from "./client.contracts";
export type {
  HyphenApiResponse,
  HyphenCommon,
  HyphenEndpointPath,
  HyphenLoginMethod,
  HyphenNhisRequestPayload,
  HyphenRequestOptions,
  HyphenStep,
  HyphenStepMode,
} from "./client.contracts";
export { extractCookieData, extractStepData, getHyphenCommon };
export { HyphenApiError, isHyphenApiError };

type HyphenFetcher = (
  payload: HyphenNhisRequestPayload,
  options?: HyphenRequestOptions
) => Promise<HyphenApiResponse>;

function createHyphenFetcher(endpoint: HyphenEndpointPath): HyphenFetcher {
  return async (
    payload: HyphenNhisRequestPayload,
    options: HyphenRequestOptions = {}
  ) => hyphenPost(endpoint, payload, options);
}

export const fetchMedicalInfo = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.MEDICAL_INFO
);
export const fetchMedicationInfo = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.MEDICATION_INFO
);
export const fetchHealthAge = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.HEALTH_AGE
);
export const fetchNhis0067 = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.CHECKUP_TARGET
);
export const fetchNhis0068 = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.CHECKUP_RESULT_LIST
);
export const fetchNhis0069 = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.CHECKUP_YEARLY_RESULT
);
export const fetchNhis0070 = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.CHECKUP_OVERVIEW
);
export const fetchNhis0071 = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.SCALING_INFO
);
export const fetchNhis0073 = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.INFANT_CHECKUP_TARGET
);
export const fetchNhis0074 = createHyphenFetcher(
  NHIS_MEDICAL_INFO_ENDPOINTS.INFANT_CHECKUP_RESULT
);

// Legacy wrappers for previously used names.
export const fetchCheckupList = fetchNhis0068;
export const fetchLifestyle = fetchMedicationInfo;

export const fetchNhis0978 = createHyphenFetcher(
  NHIS_MEDICAL_INFO2_ENDPOINTS.CHECKUP_DETAIL_0978
);
export const fetchNhis0979 = createHyphenFetcher(
  NHIS_MEDICAL_INFO2_ENDPOINTS.CHECKUP_DETAIL_0979
);
export const fetchNhis0980 = createHyphenFetcher(
  NHIS_MEDICAL_INFO2_ENDPOINTS.CHECKUP_DETAIL_0980
);
export const fetchNhis0983 = createHyphenFetcher(
  NHIS_MEDICAL_INFO2_ENDPOINTS.DETAIL_0983
);
export const fetchNhis0984 = createHyphenFetcher(
  NHIS_MEDICAL_INFO2_ENDPOINTS.DETAIL_0984
);
export const fetchNhis0985 = createHyphenFetcher(
  NHIS_MEDICAL_INFO2_ENDPOINTS.DETAIL_0985
);
export const fetchNhis0986 = createHyphenFetcher(
  NHIS_MEDICAL_INFO2_ENDPOINTS.DETAIL_0986
);
export const fetchNhis0987 = createHyphenFetcher(
  NHIS_MEDICAL_INFO2_ENDPOINTS.DETAIL_0987
);

export const fetchCheckupResultList = fetchNhis0068;
export const fetchCheckupYearlyResult = fetchNhis0069;
export const fetchCheckupOverview = fetchNhis0070;
