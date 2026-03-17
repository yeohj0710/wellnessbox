import { PrismaClient } from "@prisma/client";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";

const db = new PrismaClient();
const TARGET_PERIOD_KEY = "2026-03";

type EmployeeSeed = {
  comment: string;
  products: B2bReportPackagedProduct[];
};

function normalizeComparableName(name: string) {
  return name
    .replace(/\s*\(테스트\)\s*$/g, "")
    .replace(/\s*대표\s*$/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function product(
  name: string,
  options?: Partial<Omit<B2bReportPackagedProduct, "id" | "name">>
): B2bReportPackagedProduct {
  return {
    id: `seed-${name}`,
    name,
    brand: options?.brand ?? null,
    imageUrl: options?.imageUrl ?? null,
    description: options?.description ?? null,
    ingredientSummary: options?.ingredientSummary ?? null,
    intakeSummary: options?.intakeSummary ?? null,
    caution: options?.caution ?? null,
  };
}

const SEED_DATA: Record<string, EmployeeSeed> = {
  형경진: {
    comment:
      "바쁜 일정이 이어질수록 컨디션이 전체적으로 쉽게 떨어질 수 있어, 기본적인 회복 리듬부터 먼저 챙겨보시면 좋겠습니다. 무리하게 여러 가지를 더하기보다는 수면, 식사, 휴식 흐름을 조금씩 안정적으로 맞춰가는 방향을 권해드립니다.",
    products: [
      product("올인원 혈행케어", {
        brand: "일동제약",
        description: "혈행과 순환 밸런스를 기본적으로 챙기기 좋은 구성입니다.",
        intakeSummary: "식후에 부담 없는 시간대로 맞춰 드셔 보세요.",
      }),
      product("글루타치온 화이트", {
        brand: "일동제약",
        imageUrl:
          "https://admin.ildong.com/upload/2026-01-26/176940475701122833.jpg",
        description: "항산화와 전반적인 컨디션 균형을 함께 살피기 좋은 제품입니다.",
        ingredientSummary: "글루타치온",
        intakeSummary: "하루 루틴에 맞춰 일정하게 드셔 보세요.",
      }),
      product("쏘팔메토 옥타플러스", {
        brand: "Aroundpharm",
        imageUrl: "https://i.aroundpharm.com/public/products/202602/1771492674439.png",
        description: "중년 남성 컨디션과 일상 균형을 함께 살피기 좋은 제품입니다.",
        ingredientSummary: "쏘팔메토",
        intakeSummary: "식사 후 편한 시간에 꾸준히 드셔 보세요.",
      }),
      product("안심요1000", {
        brand: "Aroundpharm",
        imageUrl: "https://i.aroundpharm.com/public/products/202602/1770890162925.png",
        description: "일상 루틴을 안정적으로 이어갈 수 있도록 가볍게 더하기 좋은 제품입니다.",
        intakeSummary: "하루 루틴에 맞춰 부담 없는 시간대에 드셔 보세요.",
      }),
    ],
  },
  한정민: {
    comment:
      "수면의 질이 흔들리면 장 컨디션이나 눈의 피로감도 같이 불편해질 수 있어, 생활 리듬을 먼저 정리해보시는 게 좋겠습니다. 몸에 부담 없는 선에서 기본 관리부터 차근차근 가져가보세요.",
    products: [
      product("혈행건강 rTG 오메가3", {
        brand: "Aroundpharm",
        imageUrl: "https://i.aroundpharm.com/public/products/202602/1771492918970.png",
        description: "하루 컨디션과 혈행 균형을 가볍게 챙기기 좋은 기본 제품입니다.",
        ingredientSummary: "rTG 오메가3",
        intakeSummary: "식후 하루 1회부터 가볍게 시작해 주세요.",
      }),
      product("위건강 솔루션 프라임", {
        imageUrl:
          "https://sungyesa.com/data/file/plist/thumb-1893499027_5IVD3gPk_46_200x200.webp",
        description: "속이 예민하거나 위 컨디션을 함께 살피고 싶을 때 더하기 좋은 제품입니다.",
        intakeSummary: "공복 부담이 없다면 식후에 편하게 드셔 보세요.",
        caution: "위장 약을 함께 드시는 경우 복용 간격을 같이 확인해 주세요.",
      }),
    ],
  },
  명진호: {
    comment:
      "요즘처럼 피로가 누적되기 쉬운 때에는 수면 회복과 낮 시간대 활력을 함께 챙기는 것이 중요합니다. 가벼운 활동과 규칙적인 생활 흐름을 붙여가시면 컨디션 유지에 도움이 될 수 있습니다.",
    products: [
      product("일동스노우콜멜팅마그네슘", {
        brand: "일동제약",
        description: "긴장과 피로가 누적될 때 부담을 덜어 주는 마그네슘 제품입니다.",
        ingredientSummary: "마그네슘",
        intakeSummary: "저녁 시간이나 휴식 전후에 편하게 드셔 보세요.",
      }),
      product("프렌디 5000IU", {
        imageUrl:
          "https://cdn.011st.com/11dims/resize/600x600/quality/75/11src/pd/v2/3/4/4/0/8/1/pDEuT/7152344081_B.jpg",
        description: "햇빛 노출이 적은 시기에 비타민 D를 보충하기 좋은 제품입니다.",
        ingredientSummary: "비타민 D 5000IU",
        intakeSummary: "식사와 함께 하루 1회 기준으로 시작해 주세요.",
      }),
    ],
  },
  이서진: {
    comment:
      "전반적인 컨디션은 비교적 안정적인 편이어서, 앞으로는 체력과 활력을 조금 더 올리는 방향으로 관리해보시면 좋겠습니다. 식사 균형과 단백질 섭취, 가벼운 운동을 함께 챙겨보시길 권해드립니다.",
    products: [
      product("일동스노우콜멜팅마그네슘", {
        brand: "일동제약",
        description: "긴장과 피로가 누적될 때 부담을 덜어 주는 마그네슘 제품입니다.",
        ingredientSummary: "마그네슘",
        intakeSummary: "저녁 시간이나 휴식 전후에 편하게 드셔 보세요.",
      }),
      product("프렌디 5000IU", {
        imageUrl:
          "https://cdn.011st.com/11dims/resize/600x600/quality/75/11src/pd/v2/3/4/4/0/8/1/pDEuT/7152344081_B.jpg",
        description: "햇빛 노출이 적은 시기에 비타민 D를 보충하기 좋은 제품입니다.",
        ingredientSummary: "비타민 D 5000IU",
        intakeSummary: "식사와 함께 하루 1회 기준으로 시작해 주세요.",
      }),
    ],
  },
  이미리: {
    comment:
      "몸 상태가 크게 불편한 편은 아니더라도, 피로가 쉽게 쌓이거나 눈이 쉽게 지칠 수 있어 평소 회복감을 높이는 관리가 중요하겠습니다. 식사 균형과 활동량을 함께 챙기면서 몸을 천천히 채워간다고 생각하시면 좋겠습니다.",
    products: [
      product("아레즈투", {
        imageUrl:
          "https://thumbnail9.coupangcdn.com/thumbnails/remote/230x230ex/image/vendor_inventory/2acc/254442a88b18559302cb0209be77cf5914ad0964751f894787a69104abb1.png",
        description: "눈의 피로감과 일상 집중 흐름을 함께 챙기기 좋은 제품입니다.",
        ingredientSummary: "눈 건강 복합 성분",
        intakeSummary: "식사 후 편한 시간에 꾸준히 드셔 보세요.",
      }),
      product("메멘토 플러스", {
        imageUrl:
          "https://hkmedi.co.kr/files/attach/images/2025/12/03/5009e4ce7232d828279d526be0b11be9.jpg",
        description: "기억력과 집중 흐름을 부드럽게 챙기기 좋은 제품입니다.",
        intakeSummary: "하루 루틴에 맞춰 같은 시간대에 드시는 편이 좋습니다.",
      }),
    ],
  },
  석만주: {
    comment:
      "바쁜 생활이 이어지면 수면 부족이 컨디션 저하로 바로 이어질 수 있어, 휴식과 회복 시간을 의식적으로 확보해보시면 좋겠습니다. 눈 피로나 전반적인 활력 저하도 함께 살피면서 기본 관리 위주로 가져가시길 권해드립니다.",
    products: [
      product("아레즈투", {
        imageUrl:
          "https://thumbnail9.coupangcdn.com/thumbnails/remote/230x230ex/image/vendor_inventory/2acc/254442a88b18559302cb0209be77cf5914ad0964751f894787a69104abb1.png",
        description: "눈의 피로감과 일상 집중 흐름을 함께 챙기기 좋은 제품입니다.",
        ingredientSummary: "눈 건강 복합 성분",
        intakeSummary: "식사 후 편한 시간에 꾸준히 드셔 보세요.",
      }),
      product("올인원 혈행케어", {
        brand: "일동제약",
        description: "혈행과 순환 밸런스를 기본적으로 챙기기 좋은 구성입니다.",
        intakeSummary: "식후에 부담 없는 시간대로 맞춰 드셔 보세요.",
      }),
    ],
  },
  박현철: {
    comment:
      "수면, 소화, 눈 컨디션은 서로 영향을 주기 쉬워 한 부분이 흔들리면 전체 컨디션도 같이 떨어질 수 있습니다. 한 번에 많이 바꾸기보다는 생활 리듬을 일정하게 맞추는 것부터 시작해보시면 좋겠습니다.",
    products: [
      product("위건강 솔루션 프라임", {
        imageUrl:
          "https://sungyesa.com/data/file/plist/thumb-1893499027_5IVD3gPk_46_200x200.webp",
        description: "속이 예민하거나 위 컨디션을 함께 살피고 싶을 때 더하기 좋은 제품입니다.",
        intakeSummary: "공복 부담이 없다면 식후에 편하게 드셔 보세요.",
        caution: "위장 약을 함께 드시는 경우 복용 간격을 같이 확인해 주세요.",
      }),
      product("아레즈투", {
        imageUrl:
          "https://thumbnail9.coupangcdn.com/thumbnails/remote/230x230ex/image/vendor_inventory/2acc/254442a88b18559302cb0209be77cf5914ad0964751f894787a69104abb1.png",
        description: "눈의 피로감과 일상 집중 흐름을 함께 챙기기 좋은 제품입니다.",
        ingredientSummary: "눈 건강 복합 성분",
        intakeSummary: "식사 후 편한 시간에 꾸준히 드셔 보세요.",
      }),
    ],
  },
  권태성: {
    comment:
      "기본적인 체력과 컨디션 유지를 위해서는 수면 리듬과 식사 균형을 먼저 안정적으로 잡아가는 것이 중요하겠습니다. 무리 없는 활동을 꾸준히 이어가면서 몸 상태를 편안하게 관리해보시길 권해드립니다.",
    products: [
      product("올인원 혈행케어", {
        brand: "일동제약",
        description: "혈행과 순환 밸런스를 기본적으로 챙기기 좋은 구성입니다.",
        intakeSummary: "식후에 부담 없는 시간대로 맞춰 드셔 보세요.",
      }),
      product("글루타치온 화이트", {
        brand: "일동제약",
        imageUrl:
          "https://admin.ildong.com/upload/2026-01-26/176940475701122833.jpg",
        description: "항산화와 전반적인 컨디션 균형을 함께 살피기 좋은 제품입니다.",
        ingredientSummary: "글루타치온",
        intakeSummary: "하루 루틴에 맞춰 일정하게 드셔 보세요.",
      }),
    ],
  },
  박정빈: {
    comment:
      "요즘처럼 피로가 쌓이기 쉬운 시기에는 몸을 더 끌어올리려 하기보다, 먼저 회복할 수 있는 여유를 만들어주는 것이 중요합니다. 수면과 휴식, 몸의 균형을 천천히 되찾는 방향으로 관리해보시면 좋겠습니다.",
    products: [
      product("MSM", {
        brand: "Aroundpharm",
        imageUrl: "https://i.aroundpharm.com/public/products/202602/1771492530633.png",
        description: "일상 활동이 많은 시기에 몸의 편안함을 챙기기 좋은 제품입니다.",
        ingredientSummary: "MSM",
        intakeSummary: "식사 후 부담 없는 시간대에 시작해 주세요.",
      }),
      product("메멘토 플러스", {
        imageUrl:
          "https://hkmedi.co.kr/files/attach/images/2025/12/03/5009e4ce7232d828279d526be0b11be9.jpg",
        description: "기억력과 집중 흐름을 부드럽게 챙기기 좋은 제품입니다.",
        intakeSummary: "하루 루틴에 맞춰 같은 시간대에 드시는 편이 좋습니다.",
      }),
    ],
  },
};

async function findEmployeeBySeedName(name: string) {
  const employees = await db.b2bEmployee.findMany({
    include: {
      reports: {
        where: { periodKey: TARGET_PERIOD_KEY },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    employees.find(
      (employee) => normalizeComparableName(employee.name) === normalizeComparableName(name)
    ) ?? null
  );
}

async function applyEmployeeSeed(name: string, seed: EmployeeSeed) {
  const employee = await findEmployeeBySeedName(name);
  if (!employee) {
    console.warn(`[skip] ${name}: 임직원 레코드를 찾지 못했습니다.`);
    return;
  }

  const report = employee.reports[0];
  if (!report) {
    console.warn(`[skip] ${name}: ${TARGET_PERIOD_KEY} 최신 레포트가 없습니다.`);
    return;
  }

  const payload = (report.reportPayload ?? {}) as Record<string, unknown>;
  const nextPayload = {
    ...payload,
    reportAddendum: {
      consultationSummary: seed.comment,
      packagedProducts: seed.products,
    },
  };

  await db.b2bReport.update({
    where: { id: report.id },
    data: { reportPayload: nextPayload },
  });

  console.log(`[ok] ${name}: ${report.id}`);
}

async function main() {
  for (const [name, seed] of Object.entries(SEED_DATA)) {
    await applyEmployeeSeed(name, seed);
  }

  const check = await db.b2bEmployee.findMany({
    where: {
      OR: Object.keys(SEED_DATA).map((name) => ({
        name: { contains: normalizeComparableName(name) },
      })),
    },
    include: {
      reports: {
        where: { periodKey: TARGET_PERIOD_KEY },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  console.log(
    JSON.stringify(
      check.map((employee) => {
        const latestPayload = employee.reports[0]?.reportPayload as
          | {
              reportAddendum?: {
                consultationSummary?: string | null;
                packagedProducts?: unknown[];
              };
            }
          | null
          | undefined;

        return {
          name: employee.name,
          latestReportId: employee.reports[0]?.id ?? null,
          hasConsultationSummary: Boolean(
            latestPayload?.reportAddendum?.consultationSummary
          ),
          packagedProductCount:
            latestPayload?.reportAddendum?.packagedProducts?.length ?? 0,
        };
      }),
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
