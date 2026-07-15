import type { WbRndRecommendRequest } from "./wb-rnd-client";
import {
  WbRndProfileAdapterError,
  mapWellnessBoxProfileToWbRndRequest,
} from "./wb-rnd-profile-adapter";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function resolveWbRndRecommendPreviewPayload(
  value: unknown
): WbRndRecommendRequest {
  if (!isObject(value)) {
    throw new WbRndProfileAdapterError("invalid_request_body", [
      {
        path: "body",
        code: "invalid_type",
        message: "Request body must be a JSON object.",
      },
    ]);
  }
  if (Object.prototype.hasOwnProperty.call(value, "profile")) {
    return mapWellnessBoxProfileToWbRndRequest(value.profile, {
      requestId: value.requestId,
      subjectId: value.subjectId,
      surveyConsent: value.surveyConsent,
    });
  }
  if (isObject(value.payload)) return value.payload as WbRndRecommendRequest;
  return value as WbRndRecommendRequest;
}

export async function readWbRndRecommendPreviewRequestBody(
  request: Request
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new WbRndProfileAdapterError("invalid_json_body", [
      {
        path: "body",
        code: "invalid_json",
        message: "Request body must contain valid JSON.",
      },
    ]);
  }
}
