import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx"
);
const BOOTSTRAP_SKELETON_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportBootstrappingSkeleton.tsx"
);
const DETAIL_SKELETON_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportDetailSkeleton.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const bootstrapSkeletonSource = fs.readFileSync(BOOTSTRAP_SKELETON_PATH, "utf8");
  const detailSkeletonSource = fs.readFileSync(DETAIL_SKELETON_PATH, "utf8");

  assert.match(
    clientSource,
    /import B2bAdminReportBootstrappingSkeleton from "\.\/_components\/B2bAdminReportBootstrappingSkeleton";/,
    "B2bAdminReportClient must import B2bAdminReportBootstrappingSkeleton."
  );
  assert.match(
    clientSource,
    /import B2bAdminReportDetailSkeleton from "\.\/_components\/B2bAdminReportDetailSkeleton";/,
    "B2bAdminReportClient must import B2bAdminReportDetailSkeleton."
  );
  assert.match(
    clientSource,
    /<B2bAdminReportBootstrappingSkeleton \/>/,
    "B2bAdminReportClient should render B2bAdminReportBootstrappingSkeleton for initial loading."
  );
  assert.match(
    clientSource,
    /<B2bAdminReportDetailSkeleton \/>/,
    "B2bAdminReportClient should render B2bAdminReportDetailSkeleton for detail loading."
  );
  checks.push("client_uses_extracted_skeleton_components");

  assert.ok(
    !/initial-side-skeleton-/.test(clientSource),
    "Initial loading skeleton loop markup should no longer remain inline in B2bAdminReportClient."
  );
  assert.ok(
    !/detail-panel-skeleton-/.test(clientSource),
    "Detail loading skeleton loop markup should no longer remain inline in B2bAdminReportClient."
  );
  checks.push("client_has_no_inline_skeleton_loops");

  assert.match(
    bootstrapSkeletonSource,
    /export default function B2bAdminReportBootstrappingSkeleton/,
    "Bootstrapping skeleton component should expose a default component."
  );
  assert.match(
    detailSkeletonSource,
    /export default function B2bAdminReportDetailSkeleton/,
    "Detail skeleton component should expose a default component."
  );
  checks.push("skeleton_components_export_defaults");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
