// RND: Module 05 Optimization Engine scaffold fixture builder.

import { assertIsoDateTime, assertModule05ScaffoldBundle } from "./scaffold.assert";
import { buildModule05ScaffoldData } from "./scaffold.fixture-data";
import type { Module05ScaffoldBundle } from "./scaffold.types";

export type { Module05ScaffoldBundle } from "./scaffold.types";
export { assertModule05ScaffoldBundle } from "./scaffold.assert";

export function buildModule05ScaffoldBundle(
  generatedAt = new Date().toISOString()
): Module05ScaffoldBundle {
  assertIsoDateTime(generatedAt, "generatedAt");

  const scaffoldData = buildModule05ScaffoldData(generatedAt);
  const bundle: Module05ScaffoldBundle = {
    generatedAt,
    ...scaffoldData,
  };

  assertModule05ScaffoldBundle(bundle);
  return bundle;
}
