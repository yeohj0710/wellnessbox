import "server-only";

import contractJson from "@/contracts/wb-rnd/ingredient-identifier-map-v1.json";

type JsonRecord = Record<string, unknown>;

type IngredientMapping = {
  serviceIngredientId: string;
  rndIngredientKey: string;
  relationship: "equivalent" | "service_broader";
  allowedDirections: ReadonlySet<"rnd_to_service" | "service_to_rnd">;
};

type IngredientMapContract = {
  schemaVersion: "wb_rnd_ingredient_identifier_map_v1";
  mappingVersion: string;
  serviceNamespace: string;
  rndNamespace: string;
  mappings: IngredientMapping[];
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function loadContract(value: unknown): IngredientMapContract {
  if (!isRecord(value)) throw new Error("WB_RND_INGREDIENT_MAP_invalid_contract");
  if (
    value.schema_version !== "wb_rnd_ingredient_identifier_map_v1" ||
    !nonEmptyString(value.mapping_version) ||
    !nonEmptyString(value.service_namespace) ||
    !nonEmptyString(value.rnd_namespace) ||
    !Array.isArray(value.mappings)
  ) {
    throw new Error("WB_RND_INGREDIENT_MAP_invalid_contract");
  }

  const seenService = new Set<string>();
  const seenRnd = new Set<string>();
  const mappings = value.mappings.map((raw): IngredientMapping => {
    if (!isRecord(raw)) throw new Error("WB_RND_INGREDIENT_MAP_invalid_mapping");
    const serviceIngredientId = raw.service_ingredient_id;
    const rndIngredientKey = raw.rnd_ingredient_key;
    const relationship = raw.relationship;
    const directions = raw.allowed_directions;
    const directionSet = new Set(
      Array.isArray(directions) ? directions.map(String) : []
    );
    const relationshipDirectionsValid =
      relationship === "equivalent"
        ? directionSet.size === 2 &&
          directionSet.has("rnd_to_service") &&
          directionSet.has("service_to_rnd")
        : relationship === "service_broader"
          ? directionSet.size === 1 && directionSet.has("rnd_to_service")
          : false;
    if (
      !nonEmptyString(serviceIngredientId) ||
      !nonEmptyString(rndIngredientKey) ||
      !["equivalent", "service_broader"].includes(String(relationship)) ||
      !Array.isArray(directions) ||
      directions.length === 0 ||
      directionSet.size !== directions.length ||
      !directions.every((direction) =>
        ["rnd_to_service", "service_to_rnd"].includes(String(direction))
      ) ||
      !relationshipDirectionsValid ||
      seenService.has(serviceIngredientId) ||
      seenRnd.has(rndIngredientKey)
    ) {
      throw new Error("WB_RND_INGREDIENT_MAP_invalid_mapping");
    }
    seenService.add(serviceIngredientId);
    seenRnd.add(rndIngredientKey);
    return {
      serviceIngredientId,
      rndIngredientKey,
      relationship: relationship as IngredientMapping["relationship"],
      allowedDirections: new Set(
        directions as Array<"rnd_to_service" | "service_to_rnd">
      ),
    };
  });

  return {
    schemaVersion: value.schema_version,
    mappingVersion: value.mapping_version,
    serviceNamespace: value.service_namespace,
    rndNamespace: value.rnd_namespace,
    mappings,
  };
}

const contract = loadContract(contractJson);
const rndToService = new Map(
  contract.mappings.map((mapping) => [
    mapping.rndIngredientKey,
    mapping.serviceIngredientId,
  ])
);

export const WB_RND_INGREDIENT_MAPPING_VERSION = contract.mappingVersion;

export function mapRndIngredientToService(rndIngredientKey: string) {
  return rndToService.get(rndIngredientKey) ?? null;
}

export function enrichWbRndRecommendationIdentifiers(value: JsonRecord) {
  if (!Array.isArray(value.recommendations)) {
    return { ok: false as const, reason: "invalid_recommendation_collection" };
  }
  const recommendations = [];
  for (const recommendation of value.recommendations) {
    if (!isRecord(recommendation) || !nonEmptyString(recommendation.ingredient)) {
      return { ok: false as const, reason: "invalid_recommendation_identifier" };
    }
    const serviceIngredientId = mapRndIngredientToService(
      recommendation.ingredient
    );
    if (serviceIngredientId === null) {
      return {
        ok: false as const,
        reason: "unmapped_rnd_ingredient_identifier",
      };
    }
    recommendations.push({
      ...recommendation,
      service_ingredient_id: serviceIngredientId,
    });
  }
  return {
    ok: true as const,
    response: {
      ...value,
      recommendations,
      ingredient_identifier_mapping: {
        schema_version: contract.schemaVersion,
        mapping_version: contract.mappingVersion,
        service_namespace: contract.serviceNamespace,
        rnd_namespace: contract.rndNamespace,
      },
    },
  };
}
