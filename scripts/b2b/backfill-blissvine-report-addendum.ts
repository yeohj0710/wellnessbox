import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";

const db = new PrismaClient();
const TARGET_PERIOD_KEY = "2026-03";
const DEFAULT_TEMPLATE_EMPLOYEE_NAME = "권태성";
const CREATED_BY_ADMIN_TAG = "script:blissvine-addendum";
const DEFAULT_B2B_IDENTITY_SALT = "wellnessbox-b2b-identity-v1";

type EmployeeSeed = {
  comment: string;
  products: B2bReportPackagedProduct[];
  cloneFromEmployeeName?: string;
  hasReportSourceData?: boolean;
  createIfMissing?: {
    birthDate: string;
    phone: string;
    linkedProvider: string;
  };
};

function normalizeComparableName(name: string) {
  return name
    .replace(/\s*\(테스트\)\s*$/g, "")
    .replace(/\s*대표\s*$/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function normalizePhoneDigits(input: string) {
  return input.replace(/\D/g, "");
}

function resolveIdentity(input: {
  name: string;
  birthDate: string;
  phone: string;
}) {
  const name = input.name.trim().replace(/\s+/g, "");
  const birthDate = input.birthDate.replace(/\D/g, "");
  const phoneNormalized = normalizePhoneDigits(input.phone);
  const identityBase = `name:${name.toLowerCase()}|birth:${birthDate}|phone:${phoneNormalized}`;
  const identityHash = createHash("sha256")
    .update(`${process.env.B2B_EMPLOYEE_IDENTITY_SALT || DEFAULT_B2B_IDENTITY_SALT}|${identityBase}`)
    .digest("hex");

  if (!/^\d{8}$/.test(birthDate)) {
    throw new Error(`유효하지 않은 생년월일입니다: ${birthDate}`);
  }
  if (!/^\d{10,11}$/.test(phoneNormalized)) {
    throw new Error(`유효하지 않은 전화번호입니다: ${phoneNormalized}`);
  }

  return {
    name,
    birthDate,
    phoneNormalized,
    identityHash,
  };
}

function maskBirthDateValue(birthDate: string) {
  return `${birthDate.slice(0, 4)}-${birthDate.slice(4, 6)}-**`;
}

function maskPhoneValue(phoneNormalized: string) {
  return `${phoneNormalized.slice(0, 3)}-${phoneNormalized.slice(3, 7)}-${"*".repeat(
    Math.max(0, phoneNormalized.length - 7)
  )}`;
}

function buildComment(lines: string[]) {
  return lines.join(" ").trim();
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
    intakeSummary: null,
    caution: options?.caution ?? null,
  };
}

const SEED_DATA: Record<string, EmployeeSeed> = {
  형경진: {
    createIfMissing: {
      birthDate: "19700101",
      phone: "01000001001",
      linkedProvider: "HYPHEN_NHIS",
    },
    cloneFromEmployeeName: "권태성",
    hasReportSourceData: false,
    comment: buildComment([
      "최근 컨디션 저하의 중심축은 단순한 피로 누적보다 장기간의 업무 스트레스와 회복력 저하에 가깝게 보였습니다.",
      "특히 수면의 깊이가 떨어지고 야간 각성이 반복되면서 자율신경 균형, 에너지 레벨, 일상 리듬이 함께 흔들리는 흐름이 확인되었습니다.",
      "현재는 여러 보조 성분을 동시에 더하는 방식보다, 조합을 단순화해 몸의 반응을 명확히 보는 접근이 더 효율적입니다.",
      "이번 구성은 정신적 피로 회복, 혈행·순환 보완, 야간 생활 리듬 안정화에 우선순위를 두었습니다.",
      "오후 이후 카페인과 늦은 시간 수분·식사 조절, 취침 전 화면 노출 감소가 실제 체감 개선에 중요한 변수로 보입니다.",
      "향후에는 지질·혈당·간 관련 지표를 한 번 다시 점검해 현재 컨디션을 객관적으로 확인해 두는 것이 좋겠습니다.",
    ]),
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
    comment: buildComment([
      "리포트와 상담을 종합하면, 이번 달 핵심 이슈는 스트레스와 수면 저하가 장 컨디션, 면역 반응, 눈 피로로까지 이어지는 연결형 패턴입니다.",
      "실제로 피로가 누적될수록 장 예민도와 더부룩함이 커지고, 회복감이 떨어지면서 전반 컨디션이 함께 흔들리는 흐름이 확인되었습니다.",
      "이번 관리의 1순위는 단순 피로 보충이 아니라 수면의 깊이와 스트레스 반응 자체를 낮추는 것입니다.",
      "여기에 소화기 부담을 줄이는 방향의 식사 조정과 오메가3 기반의 눈·점막 컨디션 보완이 함께 들어가는 구조가 적절합니다.",
      "가공식품과 자극적인 외식 빈도를 줄이고, 단백질·채소·수분 루틴을 안정적으로 만드는 것이 장과 면역에 동시에 도움이 될 수 있습니다.",
      "한 달간은 수면-장-눈 세 축의 변화를 같이 보면서 기본 컨디션을 바닥부터 끌어올리는 관리가 핵심입니다.",
    ]),
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
    comment: buildComment([
      "이번 상담에서는 수면의 질 저하가 단순 피곤함 수준을 넘어, 기상 직후 두중감과 낮 컨디션 저하로 이어지는 핵심 원인으로 정리되었습니다.",
      "리포트에서도 눈, 수면·피로, 간 관리 영역이 우선 항목으로 잡혀 생활 패턴과 데이터가 같은 방향을 보여주었습니다.",
      "실내 위주의 생활로 햇빛 노출이 부족한 편이어서, 회복력 저하와 비타민 D 부족 가능성을 함께 고려할 필요가 있어 보입니다.",
      "이번 구성은 즉각적인 각성이나 부스터류보다, 수면 회복·마그네슘/비타민 D 보완·눈 피로 관리에 우선순위를 두었습니다.",
      "운동도 강한 루틴보다 걷기나 필라테스처럼 부담이 덜한 방식으로 시작해 허리 부담과 체력 회복을 같이 가져가는 편이 더 효율적입니다.",
      "기상 후 두통이 오래 지속되는 경우에는 생활관리와 별개로 한 번 객관적 검진을 통해 원인을 확인해 두는 것을 권장드립니다.",
    ]),
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
    comment: buildComment([
      "이번에는 큰 질환성 이슈보다는, 낮은 활동량과 정적인 생활 패턴이 낮 시간대 활력 저하로 이어지는 흐름에 더 주목했습니다.",
      "리포트상 체지방, 수면·피로, 근육 영역이 우선 관리 항목으로 확인되었지만, 상담에서는 전반 수치가 비교적 안정적인 편으로 해석되었습니다.",
      "현재 컨디션은 문제가 많은 상태라기보다, 각성도와 근육 자극이 부족해 몸이 쉽게 처지고 회복이 더디게 느껴지는 타입에 가깝습니다.",
      "따라서 체중 숫자보다 식사 내 단백질 비중을 높이고, 식후 햇빛 노출과 가벼운 산책으로 낮 각성도를 올리는 접근이 더 중요합니다.",
      "운동은 강한 감량 루틴보다 필라테스나 자세·속근육 중심 프로그램이 체형 균형과 피로 관리에 더 잘 맞을 수 있습니다.",
      "이번 달은 마그네슘과 비타민 D 기반으로 리듬을 정돈하면서, 근육을 건강하게 붙이는 방향으로 관리해보시길 권장드립니다.",
    ]),
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
    comment: buildComment([
      "리포트상 종합 상태는 비교적 양호하지만, 상담에서는 쉬어도 충분히 충전되지 않는 느낌이 가장 핵심적인 체감 이슈로 확인되었습니다.",
      "데이터상 눈, 면역, 수면·피로 영역이 반복적으로 잡히며, 실제로는 마른 체형에서 회복 자원이 충분히 채워지지 않는 패턴에 가깝게 보였습니다.",
      "이번 관리의 핵심은 체중 감량이 아니라, 양질의 단백질과 규칙적인 활동을 통해 근육과 기초체력을 건강하게 채우는 데 있습니다.",
      "식사는 양보다 질이 더 중요해 생선·해산물·달걀·두부처럼 흡수 효율이 좋은 단백질원을 의식적으로 늘리는 것이 유리합니다.",
      "눈 피로와 건조감 관리도 이번 달 주요 포인트이므로, 화면 노출 습관 조정과 눈 건강 보조를 함께 가져가는 것이 좋겠습니다.",
      "전체적으로는 무리하게 끌어올리기보다, 저용량부터 반응을 보며 안정적으로 채워가는 관리가 잘 맞는 유형으로 판단됩니다.",
    ]),
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
    comment: buildComment([
      "이번 상담에서는 기억력·집중 저하 자체보다, 4~5시간 수준의 절대적인 수면 부족이 전반 컨디션을 가장 크게 깎고 있는 원인으로 정리되었습니다.",
      "리포트상 체지방, 피부, 지질 관리 이슈도 보였지만, 실제 체감 피로와 멍함은 장거리 통근과 늦은 귀가로 인한 회복시간 부족의 영향이 더 커 보였습니다.",
      "생활습관 자체는 비교적 안정적인 편이라, 문제를 습관이 나빠서라기보다 회복 시간이 부족해서로 해석하는 것이 더 정확합니다.",
      "이번 구성은 눈 피로 보완과 전신 순환 지원을 기본으로 두고, 별도로 수면의 질과 뇌 피로를 받쳐주는 방향에 초점을 맞췄습니다.",
      "햇빛 노출이 적은 생활은 비타민 D 저하와 연결되기 쉬워, 짧더라도 낮 시간 실외 노출을 확보하는 것이 중요합니다.",
      "이번 달은 무리한 운동 추가보다 수면 확보와 생활 리듬 재정렬이 우선이며, 검진 주기도 다시 챙겨 객관적인 건강 지표를 함께 확인해보시길 권장드립니다.",
    ]),
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
    comment: buildComment([
      "이번 상담에서는 최근 몇 년 사이 대사 지표와 전반 컨디션이 서서히 떨어지기 시작한 초기 변화 구간으로 현재 상태를 해석했습니다.",
      "리포트에서도 위, 눈, 수면·피로 영역이 우선 관리 항목으로 확인되어, 실제 체감 불편과 데이터가 비교적 일치하는 편이었습니다.",
      "특히 수면이 중간에 끊기면서 머리가 맑지 않은 느낌과 소화 불편이 함께 심해지는 구조가 보여, 단순 피로보다 회복 리듬의 문제로 보는 것이 적절합니다.",
      "기존의 안과적 관리 이슈가 있는 만큼 눈 건강은 일반 관리 수준보다 조금 더 체계적인 보완이 필요한 축으로 판단했습니다.",
      "이번 구성은 눈, 위장, 수면 세 축을 우선 정리하고, 집에서 중복으로 챙기던 보조제는 한 번 단순화해 몸의 반응을 보는 방향으로 맞췄습니다.",
      "향후에는 혈압·공복혈당·지질 수치를 다시 확인해 현재 추세를 객관적으로 파악하면, 다음 조정이 훨씬 정밀해질 수 있습니다.",
    ]),
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
    comment: buildComment([
      "이번 리포트에서는 면역, 수면·피로, 회복력 관리가 우선 영역으로 확인되었습니다.",
      "특히 생활 패턴상 수면 시간이 부족하고 낮 시간 졸림과 쉽게 지치는 느낌이 함께 잡혀, 회복보다 소모가 앞서는 흐름으로 보입니다.",
      "간식·식사 균형의 영향도 함께 보여, 이번 달은 단순 보충보다 식사 구성과 생활 리듬을 먼저 정돈하는 것이 더 중요합니다.",
      "면역 쪽은 잦은 피로와 컨디션 기복이 연결되어 있어, 수면 안정화와 가벼운 야외 활동을 같이 가져갈 때 개선 체감이 더 좋을 수 있습니다.",
      "집중력 저하나 멍한 느낌이 있더라도 독립적인 문제라기보다 수면 질과 회복 부족의 2차 반응으로 보는 편이 자연스럽습니다.",
      "이번 달은 수면 확보-식사 균형-면역 회복 세 축을 우선 관리하면서, 과도한 소모를 줄이는 방향으로 컨디션 기반을 다져보시길 권장드립니다.",
    ]),
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
    comment: buildComment([
      "이번 상담에서는 스트레스와 기억력 저하를 별개 문제로 보기보다, 초기 적응기에 따른 과긴장과 절대적인 수면 부족의 결과로 해석했습니다.",
      "리포트상 스트레스, 체지방, 인지 기능 영역이 우선 관리 항목으로 확인되었고, 실제로도 피로 누적이 일상 수행감과 집중도에 직접 영향을 주는 흐름이 보였습니다.",
      "수면 부족은 식욕 조절과 체중 관리에도 영향을 주기 때문에, 체지방 관리 역시 먼저 수면 리듬을 안정시키는 것이 선행 과제로 보입니다.",
      "허리와 발목을 중심으로 한 체형 불균형이 남아 있어, 강한 운동보다 코어 안정화와 자세 교정 중심 접근이 더 적합합니다.",
      "이번 구성은 긴장 완화, 회복 기반 보완, 근골격 부담 관리라는 세 축으로 정리했으며, 몸을 더 쓰게 하는 방식보다 덜 무너지게 하는 방식에 초점을 두었습니다.",
      "이번 달은 늦은 시간 각성 자극을 줄이고, 짧더라도 규칙적인 수면·걷기·코어 루틴을 만드는 것이 가장 효율적인 출발점이 될 수 있습니다.",
    ]),
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

function buildPharmacistSummary(comment: string) {
  const sentences = comment
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.slice(0, 2).join(" ").trim() || comment;
}

async function findEmployeeBySeedName(name: string) {
  const employees = await db.b2bEmployee.findMany({
    include: {
      reports: {
        where: { periodKey: TARGET_PERIOD_KEY },
        orderBy: { updatedAt: "desc" },
      },
      pharmacistNotes: {
        where: { periodKey: TARGET_PERIOD_KEY },
        orderBy: { updatedAt: "desc" },
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

async function ensureEmployeeBySeedName(name: string, seed: EmployeeSeed) {
  const existing = await findEmployeeBySeedName(name);
  if (existing) return existing;

  if (!seed.createIfMissing) return null;

  const identity = resolveIdentity({
    name,
    birthDate: seed.createIfMissing.birthDate,
    phone: seed.createIfMissing.phone,
  });

  const created = await db.b2bEmployee.create({
    data: {
      appUserId: null,
      name: identity.name,
      birthDate: identity.birthDate,
      phoneNormalized: identity.phoneNormalized,
      identityHash: identity.identityHash,
      linkedProvider: seed.createIfMissing.linkedProvider,
      lastSyncedAt: null,
      lastViewedAt: null,
    },
  });

  return db.b2bEmployee.findUnique({
    where: { id: created.id },
    include: {
      reports: {
        where: { periodKey: TARGET_PERIOD_KEY },
        orderBy: { updatedAt: "desc" },
      },
      pharmacistNotes: {
        where: { periodKey: TARGET_PERIOD_KEY },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

async function resolveTemplateReport(name: string) {
  const templateEmployee = await findEmployeeBySeedName(name);
  if (!templateEmployee || templateEmployee.reports.length < 1) return null;
  return templateEmployee.reports[0];
}

function buildUpdatedPayload(input: {
  sourcePayload: Record<string, unknown> | null | undefined;
  employeeId: string;
  employeeName: string;
  birthDate: string;
  phoneNormalized: string;
  variantIndex: number;
  comment: string;
  products: B2bReportPackagedProduct[];
  hasReportSourceData?: boolean;
}) {
  const nowIso = new Date().toISOString();
  const nextPayload = structuredClone(input.sourcePayload ?? {}) as Record<string, any>;
  const nextMeta = { ...(nextPayload.meta ?? {}) };
  const nextPharmacist = { ...(nextPayload.pharmacist ?? {}) };

  const packagedProducts = input.products.map(({ intakeSummary: _intakeSummary, ...product }) => ({
    ...product,
  }));

  nextMeta.employeeId = input.employeeId;
  nextMeta.employeeName = input.employeeName;
  nextMeta.birthDateMasked = maskBirthDateValue(input.birthDate);
  nextMeta.phoneMasked = maskPhoneValue(input.phoneNormalized);
  nextMeta.periodKey = TARGET_PERIOD_KEY;
  nextMeta.generatedAt = nowIso;
  nextMeta.variantIndex = input.variantIndex;

  nextPharmacist.note = input.comment;
  nextPharmacist.summary = buildPharmacistSummary(input.comment);
  nextPharmacist.recommendations = input.products.map((row) => row.name).join(", ");
  nextPharmacist.dosingGuide = null;
  nextPharmacist.updatedAt = nowIso;

  nextPayload.meta = nextMeta;
  nextPayload.pharmacist = nextPharmacist;
  nextPayload.reportAddendum = {
    consultationSummary: input.comment,
    packagedProducts,
  };

  if (input.hasReportSourceData === false) {
    nextMeta.sourceMode = null;
    nextMeta.isMockData = false;

    nextPayload.health = {
      fetchedAt: null,
      metrics: [],
      coreMetrics: [],
      riskFlags: [],
      abnormalFlags: [],
      medications: [],
      fetchStatus: {},
      medicationStatus: {
        type: "unknown",
        message: "건강검진 데이터가 없습니다.",
        failedTargets: [],
      },
    };

    nextPayload.survey = {
      templateVersion: null,
      selectedSections: [],
      sectionScores: [],
      overallScore: null,
      topIssues: [],
      answers: [],
      updatedAt: null,
    };

    nextPayload.analysis = {
      version: null,
      periodKey: TARGET_PERIOD_KEY,
      reportCycle: nextPayload.meta?.reportCycle ?? null,
      payload: null,
      summary: {
        overallScore: null,
        surveyScore: null,
        healthScore: null,
        medicationScore: null,
        riskLevel: "unknown",
        topIssues: [],
      },
      scoreDetails: {},
      scoreEngineVersion: null,
      riskFlags: [],
      recommendations: [],
      trend: { months: [] },
      externalCards: [],
      aiEvaluation: null,
      wellness: null,
      updatedAt: null,
    };
  }

  return nextPayload;
}

async function createClonedReportForEmployee(input: {
  employeeId: string;
  employeeName: string;
  birthDate: string;
  phoneNormalized: string;
  seed: EmployeeSeed;
}) {
  const templateReport =
    (await resolveTemplateReport(input.seed.cloneFromEmployeeName ?? DEFAULT_TEMPLATE_EMPLOYEE_NAME)) ??
    null;

  if (!templateReport) {
    throw new Error("형경진 템플릿으로 복제할 기준 레포트를 찾지 못했습니다.");
  }

  const maxVariant = await db.b2bReport.aggregate({
    where: { employeeId: input.employeeId },
    _max: { variantIndex: true },
  });
  const variantIndex = (maxVariant._max.variantIndex ?? 0) + 1;
  const reportPayload = buildUpdatedPayload({
    sourcePayload: templateReport.reportPayload as Record<string, unknown> | null | undefined,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    birthDate: input.birthDate,
    phoneNormalized: input.phoneNormalized,
    variantIndex,
    comment: input.seed.comment,
    products: input.seed.products,
    hasReportSourceData: input.seed.hasReportSourceData,
  });

  return db.b2bReport.create({
    data: {
      employeeId: input.employeeId,
      variantIndex,
      status: templateReport.status,
      pageSize: templateReport.pageSize,
      stylePreset: templateReport.stylePreset,
      reportPayload,
      periodKey: TARGET_PERIOD_KEY,
      reportCycle: templateReport.reportCycle,
    },
  });
}

async function syncEmployeeNotes(input: {
  employeeId: string;
  comment: string;
  products: B2bReportPackagedProduct[];
}) {
  const recommendations = input.products.map((row) => row.name).join(", ");
  const existingNotes = await db.b2bPharmacistNote.findMany({
    where: { employeeId: input.employeeId, periodKey: TARGET_PERIOD_KEY },
    orderBy: { updatedAt: "desc" },
  });

  if (existingNotes.length < 1) {
    await db.b2bPharmacistNote.create({
      data: {
        employeeId: input.employeeId,
        note: input.comment,
        recommendations,
        cautions: null,
        createdByAdminTag: CREATED_BY_ADMIN_TAG,
        periodKey: TARGET_PERIOD_KEY,
        reportCycle: null,
      },
    });
    return;
  }

  await db.b2bPharmacistNote.updateMany({
    where: { employeeId: input.employeeId, periodKey: TARGET_PERIOD_KEY },
    data: {
      note: input.comment,
      recommendations,
      cautions: null,
      createdByAdminTag: CREATED_BY_ADMIN_TAG,
    },
  });
}

async function syncEmployeeReports(input: {
  employeeId: string;
  employeeName: string;
  birthDate: string;
  phoneNormalized: string;
  seed: EmployeeSeed;
}) {
  const reports = await db.b2bReport.findMany({
    where: { employeeId: input.employeeId, periodKey: TARGET_PERIOD_KEY },
    orderBy: { updatedAt: "desc" },
  });

  if (reports.length < 1) {
    await createClonedReportForEmployee(input);
    return;
  }

  for (const report of reports) {
    const reportPayload = buildUpdatedPayload({
      sourcePayload: report.reportPayload as Record<string, unknown> | null | undefined,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      birthDate: input.birthDate,
      phoneNormalized: input.phoneNormalized,
      variantIndex: report.variantIndex,
      comment: input.seed.comment,
      products: input.seed.products,
      hasReportSourceData: input.seed.hasReportSourceData,
    });

    await db.b2bReport.update({
      where: { id: report.id },
      data: {
        reportPayload,
      },
    });
  }
}

async function applyEmployeeSeed(name: string, seed: EmployeeSeed) {
  const employee = await ensureEmployeeBySeedName(name, seed);
  if (!employee) {
    console.warn(`[skip] ${name}: 임직원 레코드를 찾지 못했습니다.`);
    return;
  }

  await syncEmployeeNotes({
    employeeId: employee.id,
    comment: seed.comment,
    products: seed.products,
  });

  await syncEmployeeReports({
    employeeId: employee.id,
    employeeName: employee.name,
    birthDate: employee.birthDate,
    phoneNormalized: employee.phoneNormalized,
    seed,
  });

  console.log(`[ok] ${name}: employee=${employee.id}`);
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
      },
      pharmacistNotes: {
        where: { periodKey: TARGET_PERIOD_KEY },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  console.log(
    JSON.stringify(
      check.map((employee) => {
        const latestReport = employee.reports[0];
        const latestPayload = latestReport?.reportPayload as
          | {
              reportAddendum?: {
                consultationSummary?: string | null;
                packagedProducts?: unknown[];
              };
              pharmacist?: {
                note?: string | null;
                summary?: string | null;
              };
            }
          | null
          | undefined;

        return {
          name: employee.name,
          birthDate: employee.birthDate,
          phoneNormalized: employee.phoneNormalized,
          latestReportId: latestReport?.id ?? null,
          reportCountForPeriod: employee.reports.length,
          noteCountForPeriod: employee.pharmacistNotes.length,
          hasConsultationSummary: Boolean(
            latestPayload?.reportAddendum?.consultationSummary
          ),
          packagedProductCount:
            latestPayload?.reportAddendum?.packagedProducts?.length ?? 0,
          hasPharmacistNote: Boolean(latestPayload?.pharmacist?.note),
          pharmacistSummary: latestPayload?.pharmacist?.summary ?? null,
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
