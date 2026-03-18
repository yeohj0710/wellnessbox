const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const TARGET_PERIOD_KEY = "2026-03";
const EXPECTED_EMPLOYEES = [
  "한정민",
  "명진호",
  "이서진",
  "이미리",
  "석만주",
  "박현철",
  "권태성",
  "박정빈",
  "형경진",
];

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
  if (process.env.WELLNESSBOX_URL_NON_POOLING) {
    process.env.DATABASE_URL = process.env.WELLNESSBOX_URL_NON_POOLING;
  }
}

function summarizeAddendum(payload) {
  const addendum = payload?.reportAddendum ?? {};
  const pharmacist = payload?.pharmacist ?? {};
  const consultationSummary =
    typeof addendum.consultationSummary === "string"
      ? addendum.consultationSummary.trim()
      : "";
  const packagedProducts = Array.isArray(addendum.packagedProducts)
    ? addendum.packagedProducts
    : [];
  const pharmacistNote =
    typeof pharmacist.note === "string" ? pharmacist.note.trim() : "";
  return {
    consultationSummary,
    packagedProducts: packagedProducts.map((product) => ({
      name: typeof product?.name === "string" ? product.name : "",
      imageUrl: typeof product?.imageUrl === "string" ? product.imageUrl : null,
    })),
    pharmacistNote,
  };
}

async function main() {
  loadEnv();
  const db = new PrismaClient();

  try {
    const reports = await db.b2bReport.findMany({
      where: {
        periodKey: TARGET_PERIOD_KEY,
        employee: {
          name: {
            in: EXPECTED_EMPLOYEES,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        updatedAt: true,
        variantIndex: true,
        reportPayload: true,
        employee: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            phoneNormalized: true,
          },
        },
      },
    });

    const latestByName = new Map();
    for (const report of reports) {
      if (latestByName.has(report.employee.name)) continue;
      latestByName.set(report.employee.name, report);
    }

    const result = EXPECTED_EMPLOYEES.map((name) => {
      const report = latestByName.get(name) ?? null;
      if (!report) {
        return {
          name,
          status: "missing-report",
        };
      }

      const addendum = summarizeAddendum(report.reportPayload);
      return {
        name,
        employeeId: report.employee.id,
        birthDate: report.employee.birthDate,
        phoneNormalized: report.employee.phoneNormalized,
        reportId: report.id,
        variantIndex: report.variantIndex,
        updatedAt: report.updatedAt,
        hasConsultationSummary: addendum.consultationSummary.length > 0,
        packagedProductCount: addendum.packagedProducts.length,
        hasPharmacistNote: addendum.pharmacistNote.length > 0,
        packagedProducts: addendum.packagedProducts,
      };
    });

    console.log(
      JSON.stringify(
        {
          periodKey: TARGET_PERIOD_KEY,
          employees: result,
        },
        null,
        2
      )
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
