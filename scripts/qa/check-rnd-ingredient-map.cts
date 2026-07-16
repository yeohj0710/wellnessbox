import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WB_RND_INGREDIENT_MAPPING_VERSION,
  enrichWbRndRecommendationIdentifiers,
  mapRndIngredientToService,
} from "../../lib/server/wb-rnd-ingredient-map";

type Mapping = {
  service_ingredient_id: string;
  rnd_ingredient_key: string;
  relationship: string;
  allowed_directions: string[];
};

const contract = JSON.parse(
  readFileSync(
    resolve("contracts/wb-rnd/ingredient-identifier-map-v1.json"),
    "utf8"
  )
) as {
  schema_version: string;
  mapping_version: string;
  mappings: Mapping[];
  unmapped_service_identifiers: Array<{ service_ingredient_id: string }>;
};
const proxyModel = JSON.parse(
  readFileSync(resolve("data/tips/proxy-recommendation-model.json"), "utf8")
) as { ingredients: string[] };

assert.equal(contract.schema_version, "wb_rnd_ingredient_identifier_map_v1");
assert.equal(contract.mapping_version, WB_RND_INGREDIENT_MAPPING_VERSION);
assert.ok(contract.mappings.length > 0);

const mappedServiceIds = contract.mappings.map(
  (mapping) => mapping.service_ingredient_id
);
const mappedRndKeys = contract.mappings.map(
  (mapping) => mapping.rnd_ingredient_key
);
assert.equal(new Set(mappedServiceIds).size, mappedServiceIds.length);
assert.equal(new Set(mappedRndKeys).size, mappedRndKeys.length);
for (const mapping of contract.mappings) {
  assert.match(mapping.service_ingredient_id, /^ING:[A-Z0-9_]+$/);
  assert.match(mapping.rnd_ingredient_key, /^[a-z0-9_]+$/);
  assert.ok(["equivalent", "service_broader"].includes(mapping.relationship));
  assert.deepEqual(
    new Set(mapping.allowed_directions),
    mapping.relationship === "equivalent"
      ? new Set(["rnd_to_service", "service_to_rnd"])
      : new Set(["rnd_to_service"])
  );
}

const coveredServiceIds = new Set([
  ...mappedServiceIds,
  ...contract.unmapped_service_identifiers.map(
    (item) => item.service_ingredient_id
  ),
]);
assert.deepEqual(coveredServiceIds, new Set(proxyModel.ingredients));

assert.equal(mapRndIngredientToService("omega3"), "ING:OMEGA3");
assert.equal(mapRndIngredientToService("soluble_fiber"), null);

const enriched = enrichWbRndRecommendationIdentifiers({
  recommendations: [
    {
      ingredient: "omega3",
      rank: 1,
      score: 0.8,
      evidence_ids: ["EV-1"],
    },
  ],
});
assert.equal(enriched.ok, true);
if (enriched.ok) {
  assert.equal(
    enriched.response.recommendations[0].service_ingredient_id,
    "ING:OMEGA3"
  );
  assert.equal(
    enriched.response.ingredient_identifier_mapping.mapping_version,
    contract.mapping_version
  );
}

const rejected = enrichWbRndRecommendationIdentifiers({
  recommendations: [
    {
      ingredient: "soluble_fiber",
      rank: 1,
      score: 0.8,
      evidence_ids: ["EV-1"],
    },
  ],
});
assert.deepEqual(rejected, {
  ok: false,
  reason: "unmapped_rnd_ingredient_identifier",
});

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        "service_candidate_coverage",
        "unique_mapping_identifiers",
        "direction_and_relationship_contract",
        "mapped_identifier_enrichment",
        "unmapped_identifier_fail_closed",
      ],
    },
    null,
    2
  )
);
