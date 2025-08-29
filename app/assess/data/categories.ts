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
  milkThistle: '밀크시슬(실리마린)',
  probiotics: '프로바이오틱스/유산균',
  vitaminB: '비타민B군',
  magnesium: '마그네슘',
  garcinia: '가르시니아',
  multivitamin: '종합비타민',
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
  vitaminC: '면역 유지와 항산화에 도움을 주는 비타민입니다.',
  omega3: 'EPA/DHA로 심혈관·눈·피부 건조 완화에 도움을 줍니다.',
  calcium: '뼈와 치아 건강 유지에 필요한 필수 미네랄입니다.',
  lutein: '눈의 피로·건조 개선에 도움을 줄 수 있습니다.',
  vitaminD: '칼슘 흡수와 면역·골대사 균형에 중요한 비타민입니다.',
  milkThistle: '간 건강과 해독·피로 회복에 도움을 줄 수 있습니다.',
  probiotics: '장내 환경 개선과 배변활동·면역에 도움을 줍니다.',
  vitaminB: '에너지 대사와 피로감 개선에 관여하는 비타민군입니다.',
  magnesium: '근육 이완·수면·신경 안정에 도움을 줄 수 있습니다.',
  garcinia: '체지방 합성 억제 및 체중 관리에 도움을 줄 수 있습니다.',
  multivitamin: '일상에서 부족해지기 쉬운 영양소를 폭넓게 보완합니다.',
  zinc: '면역·피부·모발·손톱 건강에 중요한 미네랄입니다.',
  psyllium: '식이섬유 보충으로 배변 리듬과 포만감에 도움을 줍니다.',
  minerals: '필수 무기질 전반을 보완해 컨디션 균형에 도움을 줍니다.',
  vitaminA: '야맹증·건조감 등 눈·피부 점막 건강에 관여합니다.',
  iron: '산소 운반과 에너지 생성에 필요한 핵심 미네랄입니다.',
  phosphatidylserine: '집중·기억·스트레스 대응에 도움을 줄 수 있습니다.',
  folicAcid: '임신 준비 및 초기 태아 발달에 중요한 영양소입니다.',
  arginine: '혈류 개선과 운동 퍼포먼스·피로 회복에 도움을 줍니다.',
  chondroitin: '관절 유연성 유지와 운동 후 불편감 완화에 도움.',
  coenzymeQ10: '항산화·에너지 생성(미토콘드리아)에 관여합니다.',
  collagen: '피부 탄력·보습 및 결합조직에 도움을 줄 수 있습니다.',
};

export const allCategories: CategoryKey[] = Object.keys(
  CATEGORY_LABELS
) as CategoryKey[];
