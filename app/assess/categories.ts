export type CategoryKey =
  | 'vitaminC'
  | 'omega3'
  | 'calcium'
  | 'lutein'
  | 'vitaminD'
  | 'milkThistle'
  | 'probiotics'
  | 'vitaminB'
  | 'magnesium'
  | 'garcinia'
  | 'multivitamin'
  | 'zinc'
  | 'psyllium'
  | 'minerals'
  | 'vitaminA'
  | 'iron'
  | 'phosphatidylserine'
  | 'folicAcid'
  | 'arginine'
  | 'chondroitin'
  | 'coenzymeQ10'
  | 'collagen';

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  vitaminC: '비타민C',
  omega3: '오메가3',
  calcium: '칼슘',
  lutein: '루테인',
  vitaminD: '비타민D',
  milkThistle: '밀크씨슬(실리마린)',
  probiotics: '프로바이오틱스/유산균',
  vitaminB: '비타민B군',
  magnesium: '마그네슘',
  garcinia: '가르시니아',
  multivitamin: '멀티비타민',
  zinc: '아연',
  psyllium: '차전자피(식이섬유)',
  minerals: '미네랄',
  vitaminA: '비타민A',
  iron: '철분',
  phosphatidylserine: '포스파티딜세린',
  folicAcid: '엽산',
  arginine: '아르기닌',
  chondroitin: '콘드로이틴',
  coenzymeQ10: '코엔자임Q10',
  collagen: '콜라겐',
};

export const CATEGORY_DESCRIPTIONS: Record<CategoryKey, string> = {
  vitaminC: '면역과 피로 회복을 돕는 대표적인 항산화 비타민이에요.',
  omega3: 'EPA/DHA로 혈중 지질과 눈·두뇌 건강을 함께 돌봐줘요.',
  calcium: '뼈와 치아를 튼튼하게 하는 핵심 미네랄이에요.',
  lutein: '장시간 화면 사용으로 지친 눈을 편안하게 도와줘요.',
  vitaminD: '칼슘 흡수를 도와 뼈 건강과 면역에 보탬이 돼요.',
  milkThistle: '간 건강과 피로 회복에 도움을 줄 수 있어요.',
  probiotics: '장내 미생물 균형을 맞춰 배변 활동을 편안하게 해줘요.',
  vitaminB: '에너지 대사에 꼭 필요해 피로·스트레스 완화에 좋아요.',
  magnesium: '긴장을 풀어주고 수면·근육 이완을 도와줘요.',
  garcinia: '식욕·탄수화물 관리로 체중 관리를 보조해줘요.',
  multivitamin: '일상에서 부족하기 쉬운 다양한 영양소를 고르게 채워줘요.',
  zinc: '면역과 피부·모발·손톱 건강 유지에 중요한 미네랄이에요.',
  psyllium: '식이섬유가 포만감과 규칙적인 배변 리듬에 도움을 줘요.',
  minerals: '여러 미네랄을 균형 있게 보충해 전반적인 컨디션을 돕어요.',
  vitaminA: '어두운 곳에서의 시각 적응과 피부·점막 유지에 좋아요.',
  iron: '헤모글로빈 생성을 도와 산소 운반에 꼭 필요해요.',
  phosphatidylserine: '집중력·기억력 등 인지 기능 유지에 도움을 줄 수 있어요.',
  folicAcid: '임신 준비·초기에 특히 중요하고 혈액 생성에도 관여해요.',
  arginine: '혈류 개선과 운동 퍼포먼스 보조에 도움이 돼요.',
  chondroitin: '관절 윤활과 연골 구성 성분 보충에 도움이 돼요.',
  coenzymeQ10: '세포 에너지와 항산화 작용으로 활력을 보탬해줘요.',
  collagen: '피부 탄력과 관절·건 조직 건강에 보탬이 되는 단백질이에요.',
};

export const allCategories: CategoryKey[] = Object.keys(
  CATEGORY_LABELS
) as CategoryKey[];
