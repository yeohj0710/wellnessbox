export type NaturalLanguageRoutingSurface = "home" | "explore";

export type NaturalLanguageRoutingCategory = {
  id: number;
  name: string;
};

export type NaturalLanguageRouteAction = {
  label: string;
  href: string;
};

export type NaturalLanguageRouteModel = {
  intentLabel: string;
  headline: string;
  description: string;
  reasonLines: string[];
  matchedLabels: string[];
  primaryAction: NaturalLanguageRouteAction;
  secondaryAction: NaturalLanguageRouteAction | null;
};

type ConcernGroup = {
  label: string;
  aliases: string[];
  categoryHints: string[];
};

const ORDER_REGEX =
  /(주문|배송|결제 실패|환불|취소|비밀번호|주문 조회|내 주문|언제 와|어디쯤)/i;
const MY_DATA_REGEX =
  /(마이데이터|my data|내 기록|검사 기록|이전 검사|이전 상담|복용 기록|내 데이터)/i;
const HEALTH_LINK_REGEX =
  /(건강링크|건강검진|검진 결과|nhis|건보|건강검진 결과|검진 데이터 연결)/i;
const SAFETY_REGEX =
  /(같이 먹어|병원약|복용약|약이랑|상호작용|부작용|임신|수유|알레르기|주의해야)/i;
const SHARED_CARE_REGEX =
  /(가족|엄마|아빠|부모님|아내|남편|와이프|신랑|여친|남친|연인|커플|아이|아기|자녀|보호자|대신 물어|대신 묻|대신 확인|선물)/i;
const PRODUCT_EXPLICIT_REGEX =
  /(영양제|상품|제품|성분|추천|구성|조합|오메가|루테인|마그네슘|비타민|유산균|철분|아연|콜라겐|코엔자임|코큐텐|가르시니아)/i;
const DEEP_ASSESS_REGEX =
  /(정밀|전체|종합|복합|자세하게|한번에|왜 그런지|전체적으로|복합적으로)/i;
const TRIAL_REGEX = /(처음|입문|가볍게|부담 없이|7일|조금만|테스트)/i;

const CONCERN_GROUPS: ConcernGroup[] = [
  {
    label: "수면·스트레스",
    aliases: ["수면", "잠", "불면", "자주 깨", "스트레스", "긴장"],
    categoryHints: ["수면", "스트레스", "마그네슘"],
  },
  {
    label: "피로·에너지",
    aliases: ["피로", "무기력", "기운", "에너지", "체력", "지침"],
    categoryHints: ["피로", "에너지", "비타민b", "코엔자임", "코큐텐"],
  },
  {
    label: "눈 건강",
    aliases: ["눈", "시야", "건조", "침침", "눈이 피곤"],
    categoryHints: ["눈", "루테인", "비타민a"],
  },
  {
    label: "장·소화",
    aliases: ["장", "소화", "배변", "변비", "더부룩", "가스"],
    categoryHints: ["장", "소화", "유산균", "식이섬유"],
  },
  {
    label: "면역·감기",
    aliases: ["면역", "감기", "자꾸 아파", "컨디션 저하"],
    categoryHints: ["면역", "비타민c", "아연"],
  },
  {
    label: "혈당·식사",
    aliases: ["혈당", "식후 졸림", "공복혈당", "당 관리", "탄수화물"],
    categoryHints: ["혈당", "가르시니아", "식사"],
  },
  {
    label: "관절",
    aliases: ["관절", "무릎", "허리", "움직임 불편"],
    categoryHints: ["관절", "콘드로이친", "콜라겐"],
  },
  {
    label: "피부·모발",
    aliases: ["피부", "머리", "모발", "손톱", "탄력"],
    categoryHints: ["피부", "콜라겐", "비타민c", "아연"],
  },
  {
    label: "집중·기억",
    aliases: ["집중", "기억", "멍함", "공부", "업무 효율"],
    categoryHints: ["집중", "기억", "테아닌", "철분"],
  },
  {
    label: "여성 건강",
    aliases: ["생리", "갱년기", "호르몬", "여성", "임신 준비"],
    categoryHints: ["여성", "엽산", "철분"],
  },
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function buildChatHref(surface: NaturalLanguageRoutingSurface, draft: string) {
  const query = new URLSearchParams();
  query.set("from", surface === "explore" ? "/explore" : "/");
  query.set("draft", draft);
  return `/chat?${query.toString()}`;
}

function buildExploreHref(categoryIds: number[], query: string) {
  const params = new URLSearchParams();
  if (categoryIds.length > 0) {
    params.set("categories", categoryIds.join(","));
  }
  if (TRIAL_REGEX.test(query)) {
    params.set("package", "7");
  }
  const text = params.toString();
  return text ? `/explore?${text}#home-products` : "/explore#home-products";
}

function findMatchedConcernGroups(query: string) {
  const normalized = normalizeText(query);
  return CONCERN_GROUPS.filter((group) =>
    group.aliases.some((alias) => normalized.includes(normalizeText(alias)))
  );
}

function findMatchedCategoryIds(
  categories: NaturalLanguageRoutingCategory[],
  groups: ConcernGroup[]
) {
  if (groups.length === 0) return [];

  const matched = new Set<number>();

  for (const category of categories) {
    const normalizedName = normalizeText(category.name || "");
    if (!normalizedName) continue;

    for (const group of groups) {
      if (
        group.categoryHints.some((hint) => {
          const normalizedHint = normalizeText(hint);
          return (
            normalizedName.includes(normalizedHint) ||
            normalizedHint.includes(normalizedName)
          );
        })
      ) {
        matched.add(category.id);
        break;
      }
    }
  }

  return Array.from(matched).slice(0, 4);
}

export function resolveNaturalLanguageRoute(input: {
  query: string;
  categories: NaturalLanguageRoutingCategory[];
  surface: NaturalLanguageRoutingSurface;
}): NaturalLanguageRouteModel | null {
  const query = input.query.trim();
  if (query.length < 2) return null;

  const matchedGroups = findMatchedConcernGroups(query);
  const matchedCategoryIds = findMatchedCategoryIds(input.categories, matchedGroups);
  const matchedLabels = matchedGroups.map((group) => group.label).slice(0, 3);
  const exploreHref = buildExploreHref(matchedCategoryIds, query);

  if (HEALTH_LINK_REGEX.test(query)) {
    return {
      intentLabel: "건강검진 연결",
      headline: "건강검진 데이터를 먼저 연결하면 이후 탐색과 상담이 훨씬 덜 헤맵니다.",
      description:
        "검진 결과를 붙이면 추천 근거와 위험 신호를 같이 볼 수 있어서, 그다음 행동을 더 안정적으로 고를 수 있어요.",
      reasonLines: [
        "건강링크를 연결하면 추천 이유와 주의 신호를 함께 볼 수 있어요.",
        "마이데이터와 상담에서 같은 맥락으로 이어져 다시 설명할 필요가 줄어듭니다.",
      ],
      matchedLabels,
      primaryAction: {
        label: "건강링크 연결하기",
        href: "/health-link",
      },
      secondaryAction: {
        label: "마이데이터 먼저 보기",
        href: "/my-data",
      },
    };
  }

  if (ORDER_REGEX.test(query)) {
    return {
      intentLabel: "주문 확인",
      headline: "주문·배송 고민은 주문조회로 바로 들어가는 것이 가장 빠릅니다.",
      description:
        "상품 탐색보다 현재 주문 상태와 연락처·알림 문제를 먼저 확인하는 편이 훨씬 덜 돌아갑니다.",
      reasonLines: [
        "배송 일정, 결제 실패, 주문 비밀번호 문제는 /my-orders에서 가장 빨리 풀립니다.",
        "필요하면 그 안에서 다시 문의나 알림 설정으로 이어질 수 있어요.",
      ],
      matchedLabels,
      primaryAction: {
        label: "주문조회로 가기",
        href: "/my-orders",
      },
      secondaryAction: {
        label: "상담으로 이어가기",
        href: buildChatHref(
          input.surface,
          "주문이나 배송 관련해서 지금 무엇을 먼저 확인해야 하는지 짧게 정리해 주세요."
        ),
      },
    };
  }

  if (MY_DATA_REGEX.test(query)) {
    return {
      intentLabel: "내 기록 확인",
      headline: "기록을 다시 보려는 상황이라면 마이데이터로 가는 편이 가장 정확합니다.",
      description:
        "이전 검사, 주문, 상담 흐름을 한 번에 보면 지금 무엇을 해야 하는지도 같이 보이기 시작해요.",
      reasonLines: [
        "검사 결과, 주문, 상담 기록이 한 곳에 모여 있어요.",
        "이후 필요하면 탐색이나 상담으로 자연스럽게 이어질 수 있어요.",
      ],
      matchedLabels,
      primaryAction: {
        label: "마이데이터로 가기",
        href: "/my-data",
      },
      secondaryAction: {
        label: "상담으로 정리하기",
        href: buildChatHref(
          input.surface,
          "지금까지의 검사, 주문, 상담 기록을 기준으로 지금 무엇을 먼저 보면 좋은지 정리해 주세요."
        ),
      },
    };
  }

  if (SAFETY_REGEX.test(query)) {
    return {
      intentLabel: "복용 안전 확인",
      headline: "병용·주의가 걸리는 질문은 상품보다 상담으로 먼저 보내는 편이 더 안전합니다.",
      description:
        "같이 먹어도 되는지, 병원약과 겹치지 않는지 같은 질문은 약사 확인이 붙는 흐름으로 보내는 것이 맞아요.",
      reasonLines: [
        "복용약, 주의 신호, 병용 여부는 상담에서 더 안전하게 풀립니다.",
        "필요하면 상담 뒤에 탐색이나 검사로 다시 이어갈 수 있어요.",
      ],
      matchedLabels,
      primaryAction: {
        label: "상담으로 바로 가기",
        href: buildChatHref(input.surface, query),
      },
      secondaryAction: {
        label: "내 기록 먼저 보기",
        href: "/my-data",
      },
    };
  }

  if (SHARED_CARE_REGEX.test(query)) {
    return {
      intentLabel: "가족·커플·보호자 맥락",
      headline: "가족이나 연인, 부모님을 대신 볼 때는 바로 상품보다 상담이나 가벼운 입문 흐름이 더 자연스럽습니다.",
      description:
        "누구를 대신 묻는지, 같이 시작하는지, 선물처럼 부담 낮게 보려는지에 따라 경로가 달라져야 덜 헷갈립니다.",
      reasonLines: [
        "대신 묻는 상황은 병용·주의 확인이 먼저인 경우가 많아요.",
        "함께 시작하는 상황은 서로 겹치지 않게 7일치처럼 가벼운 흐름이 잘 맞아요.",
      ],
      matchedLabels,
      primaryAction: {
        label: "가족용 상담 열기",
        href: buildChatHref(
          input.surface,
          "가족이나 연인을 대신 보고 있어요. 지금 상황에서 먼저 확인할 점과 가볍게 시작하기 좋은 흐름을 정리해 주세요."
        ),
      },
      secondaryAction: {
        label: "가볍게 함께 보기",
        href: matchedCategoryIds.length > 0
          ? `/explore?categories=${matchedCategoryIds.join(",")}&package=7#home-products`
          : "/explore?package=7#home-products",
      },
    };
  }

  if (
    matchedGroups.length >= 2 ||
    DEEP_ASSESS_REGEX.test(query) ||
    normalizeText(query).length >= 20
  ) {
    return {
      intentLabel: "정밀하게 좁히기",
      headline: "고민 축이 여러 개라면 먼저 검사를 거쳐 기준을 잡는 편이 훨씬 덜 헤맵니다.",
      description:
        "바로 상품을 고르기보다 현재 상태를 좁힌 뒤 탐색과 상담으로 이어가면 결과가 더 선명해져요.",
      reasonLines: [
        "여러 고민이 섞이면 바로 탐색으로 가는 순간 비교 피로가 커집니다.",
        "검사 후에는 맞는 축만 남겨 상품이나 상담으로 다시 이어갈 수 있어요.",
      ],
      matchedLabels,
      primaryAction: {
        label: "정밀검사로 가기",
        href: "/assess",
      },
      secondaryAction: matchedCategoryIds.length > 0
        ? {
            label: "관련 상품부터 보기",
            href: exploreHref,
          }
        : {
            label: "빠른검사 먼저 보기",
            href: "/check-ai",
          },
    };
  }

  if (matchedCategoryIds.length > 0 || PRODUCT_EXPLICIT_REGEX.test(query)) {
    return {
      intentLabel: "상품 탐색",
      headline: "지금 표현이라면 상품 탐색으로 바로 들어가도 자연스럽습니다.",
      description:
        matchedLabels.length > 0
          ? `${matchedLabels.join(", ")} 축과 맞는 상품부터 좁혀서 보는 편이 훨씬 편합니다.`
          : "성분이나 상품 쪽으로 보고 싶다면 관련 카테고리부터 좁혀서 보는 편이 훨씬 편합니다.",
      reasonLines: [
        "카테고리를 먼저 좁히면 상품명이나 성분명을 몰라도 바로 비교를 시작할 수 있어요.",
        "처음이라면 7일치부터 가볍게 볼 수 있게 연결해둘 수 있어요.",
      ],
      matchedLabels,
      primaryAction: {
        label:
          matchedCategoryIds.length > 0 && TRIAL_REGEX.test(query)
            ? "맞는 상품 7일치부터 보기"
            : "맞는 상품부터 보기",
        href: exploreHref,
      },
      secondaryAction: {
        label: "빠른검사 먼저 하기",
        href: "/check-ai",
      },
    };
  }

  return {
    intentLabel: "빠른 기준 만들기",
    headline: "아직 경로가 애매하다면 먼저 빠른검사로 기준을 만드는 편이 가장 덜 헤맵니다.",
    description:
      "막연한 탐색보다 최소한의 기준을 먼저 만들면 이후 상품, 상담, 정밀검사 어느 쪽으로 가도 훨씬 쉬워집니다.",
    reasonLines: [
      "처음에는 무엇을 사는지보다 어떤 축부터 봐야 하는지 아는 것이 더 중요해요.",
      "빠른검사 후에는 결과를 기반으로 탐색이나 상담으로 자연스럽게 이어질 수 있어요.",
    ],
    matchedLabels,
    primaryAction: {
      label: "빠른검사 시작하기",
      href: "/check-ai",
    },
    secondaryAction: {
      label: "상담으로 먼저 묻기",
      href: buildChatHref(
        input.surface,
        "지금 상황에서 무엇부터 보면 좋을지 너무 복잡하지 않게 정리해 주세요."
      ),
    },
  };
}
