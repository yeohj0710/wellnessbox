import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function removeReportIntakeGuidance(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { nextPayload: payload, changed: false };
  }

  const nextPayload = structuredClone(payload) as Record<string, any>;
  let changed = false;

  const pharmacist = nextPayload.pharmacist;
  if (pharmacist && typeof pharmacist === "object" && "dosingGuide" in pharmacist) {
    delete pharmacist.dosingGuide;
    changed = true;
  }

  const addendum = nextPayload.reportAddendum;
  if (addendum && typeof addendum === "object" && Array.isArray(addendum.packagedProducts)) {
    addendum.packagedProducts = addendum.packagedProducts.map((product: unknown) => {
      if (!product || typeof product !== "object") return product;
      if (!("intakeSummary" in product)) {
        return product;
      }
      changed = true;
      const nextProduct = { ...(product as Record<string, unknown>) };
      delete nextProduct.intakeSummary;
      return nextProduct;
    });
  }

  return { nextPayload, changed };
}

function removeAnalysisIntakeGuidance(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { nextPayload: payload, changed: false };
  }

  const nextPayload = structuredClone(payload) as Record<string, any>;
  const pharmacist = nextPayload.pharmacist;
  if (!pharmacist || typeof pharmacist !== "object" || !("dosingGuide" in pharmacist)) {
    return { nextPayload, changed: false };
  }

  delete pharmacist.dosingGuide;
  return { nextPayload, changed: true };
}

async function main() {
  const reports = await db.b2bReport.findMany({
    select: { id: true, reportPayload: true },
  });
  let updatedReports = 0;

  for (const report of reports) {
    const { nextPayload, changed } = removeReportIntakeGuidance(report.reportPayload);
    if (!changed) continue;
    await db.b2bReport.update({
      where: { id: report.id },
      data: { reportPayload: nextPayload as object },
    });
    updatedReports += 1;
  }

  const analyses = await db.b2bAnalysisResult.findMany({
    select: { id: true, payload: true },
  });
  let updatedAnalyses = 0;

  for (const analysis of analyses) {
    const { nextPayload, changed } = removeAnalysisIntakeGuidance(analysis.payload);
    if (!changed) continue;
    await db.b2bAnalysisResult.update({
      where: { id: analysis.id },
      data: { payload: nextPayload as object },
    });
    updatedAnalyses += 1;
  }

  console.log(
    JSON.stringify(
      {
        updatedReports,
        updatedAnalyses,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
