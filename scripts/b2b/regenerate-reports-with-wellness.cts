import db from "../../lib/db";
import { regenerateB2bReport } from "../../lib/b2b/report-service";
import { resolveCurrentPeriodKey } from "../../lib/b2b/period";

function normalizePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

async function collectPeriods(employeeId: string) {
  const [reportRows, surveyRows, analysisRows] = await Promise.all([
    db.b2bReport.findMany({
      where: { employeeId, periodKey: { not: null } },
      select: { periodKey: true },
      orderBy: [{ periodKey: "desc" }, { createdAt: "desc" }],
      take: 36,
    }),
    db.b2bSurveyResponse.findMany({
      where: { employeeId, periodKey: { not: null } },
      select: { periodKey: true },
      orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
      take: 36,
    }),
    db.b2bAnalysisResult.findMany({
      where: { employeeId, periodKey: { not: null } },
      select: { periodKey: true },
      orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
      take: 36,
    }),
  ]);

  const periodSet = new Set<string>();
  for (const row of [...reportRows, ...surveyRows, ...analysisRows]) {
    if (row.periodKey) periodSet.add(row.periodKey);
  }

  const periods = [...periodSet].sort((left, right) => right.localeCompare(left));
  if (periods.length > 0) return periods;
  return [resolveCurrentPeriodKey()];
}

async function run() {
  const employeeIdFilter = process.env.B2B_REGENERATE_EMPLOYEE_ID?.trim() || null;
  const periodFilter = process.env.B2B_REGENERATE_PERIOD?.trim() || null;
  const employeeLimit = normalizePositiveInt(process.env.B2B_REGENERATE_EMPLOYEE_LIMIT, 1000);
  const periodLimit = normalizePositiveInt(process.env.B2B_REGENERATE_PERIOD_LIMIT, 6);
  const recomputeAnalysis = process.env.B2B_REGENERATE_RECOMPUTE !== "0";
  const generateAiEvaluation = process.env.B2B_REGENERATE_AI === "1";

  const employees = await db.b2bEmployee.findMany({
    where: employeeIdFilter ? { id: employeeIdFilter } : undefined,
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, name: true },
    take: employeeLimit,
  });

  const summary: Array<{
    employeeId: string;
    employeeName: string;
    periodKey: string;
    reportId?: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const employee of employees) {
    const targetPeriods = periodFilter
      ? [periodFilter]
      : (await collectPeriods(employee.id)).slice(0, periodLimit);

    for (const periodKey of targetPeriods) {
      try {
        const report = await regenerateB2bReport({
          employeeId: employee.id,
          periodKey,
          recomputeAnalysis,
          generateAiEvaluation,
        });
        summary.push({
          employeeId: employee.id,
          employeeName: employee.name,
          periodKey,
          reportId: report.id,
          ok: true,
        });
      } catch (error) {
        summary.push({
          employeeId: employee.id,
          employeeName: employee.name,
          periodKey,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const okCount = summary.filter((row) => row.ok).length;
  const failCount = summary.length - okCount;

  console.log(
    JSON.stringify(
      {
        ok: failCount === 0,
        total: summary.length,
        success: okCount,
        failed: failCount,
        options: {
          employeeIdFilter,
          periodFilter,
          employeeLimit,
          periodLimit,
          recomputeAnalysis,
          generateAiEvaluation,
        },
        results: summary,
      },
      null,
      2
    )
  );

  await db.$disconnect();

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

void run();
