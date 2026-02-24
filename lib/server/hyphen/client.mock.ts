import "server-only";

import { readFileSync } from "fs";
import path from "path";
import {
  NHIS_MEDICAL_INFO_ENDPOINTS,
  type HyphenApiResponse,
  type HyphenEndpointPath,
  type HyphenNhisRequestPayload,
} from "./client.contracts";

type HyphenMockFixture = {
  responses?: Record<string, unknown>;
};

let cachedFixture: HyphenMockFixture | null = null;

export function isHyphenMockModeEnabled() {
  return process.env.HYPHEN_MOCK_MODE === "1";
}

function loadFixture(): HyphenMockFixture {
  if (cachedFixture) return cachedFixture;
  const fixturePath = path.join(process.cwd(), "data", "hyphen", "nhis-mock.json");
  const raw = readFileSync(fixturePath, "utf8");
  cachedFixture = JSON.parse(raw) as HyphenMockFixture;
  return cachedFixture;
}

function resolveFixtureKey(
  endpoint: HyphenEndpointPath,
  payload: HyphenNhisRequestPayload
) {
  if (endpoint === NHIS_MEDICAL_INFO_ENDPOINTS.MEDICAL_INFO) {
    if (payload.stepMode === "step" && payload.step === "init") {
      return "medical.init";
    }
    if (payload.stepMode === "step" && payload.step === "sign") {
      return "medical.sign";
    }
    return "medical.fetch";
  }
  if (endpoint === NHIS_MEDICAL_INFO_ENDPOINTS.MEDICATION_INFO) {
    return "medication.fetch";
  }
  if (endpoint === NHIS_MEDICAL_INFO_ENDPOINTS.CHECKUP_OVERVIEW) {
    return "checkupOverview.fetch";
  }
  if (endpoint === NHIS_MEDICAL_INFO_ENDPOINTS.CHECKUP_RESULT_LIST) {
    return "checkupResultList.fetch";
  }
  if (endpoint === NHIS_MEDICAL_INFO_ENDPOINTS.CHECKUP_YEARLY_RESULT) {
    return "checkupYearly.fetch";
  }
  if (endpoint === NHIS_MEDICAL_INFO_ENDPOINTS.HEALTH_AGE) {
    return "healthAge.fetch";
  }
  return "medical.fetch";
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function resolveHyphenMockResponse(
  endpoint: HyphenEndpointPath,
  payload: HyphenNhisRequestPayload
): HyphenApiResponse {
  const fixture = loadFixture();
  const key = resolveFixtureKey(endpoint, payload);
  const raw = fixture.responses?.[key];
  if (!raw) {
    throw new Error(`Mock fixture is missing response for key: ${key}`);
  }
  return deepClone(raw as HyphenApiResponse);
}
