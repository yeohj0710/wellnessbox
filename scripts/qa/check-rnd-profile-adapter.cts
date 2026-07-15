import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import {
  WbRndProfileAdapterError,
  mapWellnessBoxProfileToWbRndRequest,
} from "../../lib/server/wb-rnd-profile-adapter";
import { callWbRndRecommendPreview } from "../../lib/server/wb-rnd-client";
import { resolveWbRndRecommendPreviewPayload } from "../../lib/server/wb-rnd-recommend-preview-payload";
import { runWbRndRecommendPreviewPostRoute } from "../../lib/server/wb-rnd-recommend-preview-route";

type SourceProfileValidationCase = {
  case_id: string;
  field: string;
  value?: unknown;
  value_factory?:
    | { kind: "repeated_text_array"; text: string; count: number }
    | { kind: "repeated_array_item"; item: unknown; count: number };
  issue_path?: string;
  expected: "accepted" | "rejected";
};

type AdapterContract = {
  source_profile: Record<string, unknown>;
  adapter_options: Record<string, unknown>;
  expected_request: Record<string, unknown>;
  source_profile_validation_cases: SourceProfileValidationCase[];
};

function materializeValidationCaseValue(testCase: SourceProfileValidationCase) {
  const factory = testCase.value_factory;
  if (!factory) return structuredClone(testCase.value);
  if (factory.kind === "repeated_text_array") {
    return [factory.text.repeat(factory.count)];
  }
  return Array.from({ length: factory.count }, () =>
    structuredClone(factory.item)
  );
}

function expectAdapterError(
  operation: () => unknown,
  expectedCode: string,
  expectedPath: string
) {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof WbRndProfileAdapterError);
    assert.equal(error.code, expectedCode);
    assert.ok(
      error.issues.some((issue) => issue.path === expectedPath),
      `expected ${expectedPath} in ${JSON.stringify(error.issues)}`
    );
    return true;
  });
}

async function run() {
  const contract = JSON.parse(
    readFileSync(
      resolve(process.cwd(), "contracts/wb-rnd/profile-adapter-v1.json"),
      "utf8"
    )
  ) as AdapterContract;
  const originalProfile = structuredClone(contract.source_profile);

  const request = mapWellnessBoxProfileToWbRndRequest(
    contract.source_profile,
    contract.adapter_options
  );

  for (const testCase of contract.source_profile_validation_cases) {
    const profile = {
      ...contract.source_profile,
      [testCase.field]: materializeValidationCaseValue(testCase),
    };
    if (testCase.expected === "accepted") {
      const boundaryRequest = mapWellnessBoxProfileToWbRndRequest(
        profile,
        contract.adapter_options
      );
      if (testCase.field === "medications") {
        assert.deepEqual(
          boundaryRequest.medications,
          (profile.medications as string[]).map((name) => ({ name }))
        );
      }
      continue;
    }
    expectAdapterError(
      () => mapWellnessBoxProfileToWbRndRequest(profile, contract.adapter_options),
      "invalid_source_profile",
      String(testCase.issue_path)
    );
  }

  assert.deepEqual(request, contract.expected_request);
  assert.equal(
    request.source_profile?.subject_id,
    contract.adapter_options.subjectId,
    "stable pseudonymous subject id must survive the adapter"
  );
  assert.deepEqual(contract.source_profile, originalProfile, "adapter must not mutate source");
  assert.deepEqual(
    resolveWbRndRecommendPreviewPayload({
      profile: contract.source_profile,
      ...contract.adapter_options,
      payload: { bypass: "must not win over profile" },
    }),
    contract.expected_request
  );
  expectAdapterError(
    () =>
      resolveWbRndRecommendPreviewPayload({
        profile: [],
        ...contract.adapter_options,
      }),
    "invalid_source_profile",
    ""
  );

  const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    WB_RND_PREVIEW_ENABLED: process.env.WB_RND_PREVIEW_ENABLED,
    WB_RND_RECOMMEND_ENABLED: process.env.WB_RND_RECOMMEND_ENABLED,
    WB_RND_SERVICE_BASE_URL: process.env.WB_RND_SERVICE_BASE_URL,
    WB_RND_RECOMMEND_TIMEOUT_MS: process.env.WB_RND_RECOMMEND_TIMEOUT_MS,
  };
  let routeServer: Server | undefined;
  let routeForwardedBody: unknown = null;
  process.env.NODE_ENV = "development";
  process.env.WB_RND_PREVIEW_ENABLED = "1";
  process.env.WB_RND_RECOMMEND_ENABLED = "0";
  process.env.WB_RND_SERVICE_BASE_URL = "http://127.0.0.1:8000";
  process.env.WB_RND_RECOMMEND_TIMEOUT_MS = "2500";

  try {
    let forwardedBody: unknown = null;
    const result = await callWbRndRecommendPreview(request, {
      fetchImpl: async (_input, init) => {
        forwardedBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ status: "needs_review" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });
    assert.equal(result.source, "rnd");
    assert.deepEqual(forwardedBody, contract.expected_request);

    routeServer = createServer((incoming, outgoing) => {
      const chunks: Buffer[] = [];
      incoming.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      incoming.on("end", () => {
        routeForwardedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        outgoing.writeHead(200, { "Content-Type": "application/json" });
        outgoing.end(JSON.stringify({ status: "needs_review" }));
      });
    });
    routeServer.listen(0, "127.0.0.1");
    await once(routeServer, "listening");
    const routeAddress = routeServer.address() as AddressInfo;
    process.env.WB_RND_SERVICE_BASE_URL = `http://127.0.0.1:${routeAddress.port}`;

    const validRouteResponse = await runWbRndRecommendPreviewPostRoute(
      new Request("http://localhost/api/internal/wb-rnd/recommend-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: contract.source_profile,
          ...contract.adapter_options,
          payload: { bypass: "must not win over profile" },
        }),
      })
    );
    assert.equal(validRouteResponse.status, 200);
    assert.equal((await validRouteResponse.json()).source, "rnd");
    assert.deepEqual(routeForwardedBody, contract.expected_request);

    const malformedJsonResponse = await runWbRndRecommendPreviewPostRoute(
      new Request("http://localhost/api/internal/wb-rnd/recommend-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    );
    assert.equal(malformedJsonResponse.status, 400);
    assert.equal((await malformedJsonResponse.json()).error, "invalid_json_body");

    for (const invalidBody of [null, []]) {
      const invalidBodyResponse = await runWbRndRecommendPreviewPostRoute(
        new Request("http://localhost/api/internal/wb-rnd/recommend-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invalidBody),
        })
      );
      assert.equal(invalidBodyResponse.status, 422);
      const invalidBodyResult = await invalidBodyResponse.json();
      assert.equal(invalidBodyResult.error, "invalid_request_body");
      assert.ok(
        invalidBodyResult.issues.some(
          (issue: { path: string }) => issue.path === "body"
        )
      );
    }

    const invalidProfileResponse = await runWbRndRecommendPreviewPostRoute(
      new Request("http://localhost/api/internal/wb-rnd/recommend-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { ...contract.source_profile, silentLossCandidate: true },
          ...contract.adapter_options,
        }),
      })
    );
    assert.equal(invalidProfileResponse.status, 422);
    const invalidProfileResult = await invalidProfileResponse.json();
    assert.equal(invalidProfileResult.error, "invalid_source_profile");
    assert.ok(
      invalidProfileResult.issues.some(
        (issue: { path: string }) => issue.path === "silentLossCandidate"
      )
    );
  } finally {
    if (routeServer) {
      await new Promise<void>((resolveClose) => routeServer?.close(() => resolveClose()));
    }
    for (const [key, value] of Object.entries(previousEnv)) {
      if (typeof value === "undefined") delete process.env[key];
      else process.env[key] = value;
    }
  }

  expectAdapterError(
    () =>
      mapWellnessBoxProfileToWbRndRequest(
        { ...contract.source_profile, silentLossCandidate: true },
        contract.adapter_options
      ),
    "invalid_source_profile",
    "silentLossCandidate"
  );
  expectAdapterError(
    () =>
      mapWellnessBoxProfileToWbRndRequest(
        { name: "필수값 없음" },
        contract.adapter_options
      ),
    "missing_required_profile_fields",
    "age"
  );
  expectAdapterError(
    () =>
      mapWellnessBoxProfileToWbRndRequest(contract.source_profile, {
        ...contract.adapter_options,
        surveyConsent: {
          useForRecommendation: false,
          allowPersistentStorage: false,
        },
      }),
    "survey_recommendation_consent_required",
    "surveyConsent.useForRecommendation"
  );
  expectAdapterError(
    () =>
      mapWellnessBoxProfileToWbRndRequest(
        { ...contract.source_profile, goals: ["quantum wellness"] },
        contract.adapter_options
      ),
    "unsupported_profile_goal",
    "goals.0"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "versioned_contract_snapshot",
          "stable_pseudonymous_subject_id",
          "all_profile_fields_preserved",
          "operational_fields_mapped",
          "shared_source_validation_cases",
          "exact_request_forwarding",
          "profile_route_payload_resolution",
          "profile_route_bypass_rejected",
          "post_route_valid_profile_forwarding",
          "post_route_malformed_json_rejected",
          "post_route_null_body_rejected",
          "post_route_array_body_rejected",
          "post_route_adapter_error_rejected",
          "unknown_source_field_rejected",
          "required_fields_rejected",
          "survey_consent_required",
          "unsupported_goal_rejected",
        ],
      },
      null,
      2
    )
  );
}

void run();
