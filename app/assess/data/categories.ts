export type CategoryKey =
  | "vitaminC"
  | "omega3"
  | "calcium"
  | "lutein"
  | "vitaminD"
  | "milkThistle"
  | "probiotics"
  | "vitaminB"
  | "magnesium"
  | "garcinia"
  | "multivitamin"
  | "zinc"
  | "psyllium"
  | "minerals"
  | "vitaminA"
  | "iron"
  | "phosphatidylserine"
  | "folicAcid"
  | "arginine"
  | "chondroitin"
  | "coenzymeQ10"
  | "collagen";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  vitaminC: "비타민C",
  omega3: "오메가3",
  calcium: "칼슘",
  lutein: "루테인",
  vitaminD: "비타민D",
  milkThistle: "밀크씨슬(실리마린)",
  probiotics: "프로바이오틱스(유산균)",
  vitaminB: "비타민B",
  magnesium: "마그네슘",
  garcinia: "가르시니아",
  multivitamin: "종합비타민",
  zinc: "아연",
  psyllium: "차전자피 식이섬유",
  minerals: "미네랄",
  vitaminA: "비타민A",
  iron: "철분",
  phosphatidylserine: "포스파티딜세린",
  folicAcid: "엽산",
  arginine: "아르기닌",
  chondroitin: "콘드로이친",
  coenzymeQ10: "코엔자임Q10",
  collagen: "콜라겐",
};

export const CATEGORY_DESCRIPTIONS: Record<CategoryKey, string> = {
  vitaminC:
    "면역을 지켜주고 피로 회복에 도움을 주며, 항산화 작용으로 세포 손상을 줄여줘요.",
  omega3:
    "심혈관 건강을 지켜주고, 눈의 건조와 피부 밸런스를 완화하는 데 도움을 줘요.",
  calcium:
    "뼈와 치아를 튼튼하게 유지해주고, 성장기나 골다공증 예방에도 필요해요.",
  lutein:
    "눈의 피로와 건조를 개선하고, 장시간 스마트폰이나 PC 사용 시에도 도움을 줘요.",
  vitaminD:
    "칼슘 흡수를 도와 뼈 건강을 지켜주고, 면역 균형과 기분에도 긍정적인 영향을 줘요.",
  milkThistle:
    "간 해독을 도와 피로를 줄여주고, 과음이나 불규칙한 생활을 하는 분께도 좋아요.",
  probiotics:
    "장내 환경을 개선해 배변 활동을 원활하게 하고, 면역과 피부에도 도움을 줘요.",
  vitaminB:
    "에너지 대사를 원활하게 해 피로와 스트레스를 줄여주고, 활력을 불어넣어 줘요.",
  magnesium:
    "근육 이완과 신경 안정에 도움을 주며, 숙면과 스트레스 완화에도 좋아요.",
  garcinia:
    "탄수화물이 지방으로 합성되는 걸 억제해 체중 관리와 식습관 개선에 도움을 줘요.",
  multivitamin:
    "일상에서 부족하기 쉬운 비타민과 미네랄을 균형 있게 보충해줘요.",
  zinc: "면역력을 지켜주고 피부와 모발, 손톱 건강을 튼튼하게 유지하는 데 도움을 줘요.",
  psyllium:
    "풍부한 식이섬유로 장 건강을 돕고, 포만감을 유지해 식습관 관리에도 좋아요.",
  minerals:
    "필수 무기질을 고르게 채워주어 몸의 밸런스와 컨디션 유지에 도움을 줘요.",
  vitaminA: "야맹증 예방에 좋고, 눈과 피부, 점막 건강을 지켜주는 데 필요해요.",
  iron: "혈액 속 산소 운반을 도와 피로를 줄이고, 집중력 유지에도 도움을 줘요.",
  phosphatidylserine:
    "기억력과 집중력을 높여주고, 스트레스 완화와 기분 개선에도 도움을 줘요.",
  folicAcid:
    "임신 준비와 초기 태아 발달에 꼭 필요하며, 혈액 생성에도 관여해요.",
  arginine: "혈류 개선을 도와 운동 퍼포먼스와 피로 회복에 효과적이에요.",
  chondroitin:
    "연골과 관절을 지켜주고, 운동 후 뻣뻣함이나 불편함을 완화해줘요.",
  coenzymeQ10:
    "강력한 항산화 작용으로 세포 에너지를 만들어주고 노화 방지에도 도움을 줘요.",
  collagen: "피부 탄력과 보습을 지켜주고, 관절·뼈 등 결합조직 건강에도 좋아요.",
};

export const allCategories: CategoryKey[] = Object.keys(
  CATEGORY_LABELS
) as CategoryKey[];
