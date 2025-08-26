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
  probiotics: '프로바이오틱스(유산균)',
  vitaminB: '비타민B',
  magnesium: '마그네슘',
  garcinia: '가르시니아',
  multivitamin: '멀티비타민',
  zinc: '아연',
  psyllium: '차전자피 식이섬유',
  minerals: '미네랄',
  vitaminA: '비타민A',
  iron: '철분',
  phosphatidylserine: '포스파티딜세린',
  folicAcid: '엽산',
  arginine: '아르기닌',
  chondroitin: '콘드로이친',
  coenzymeQ10: '코엔자임Q10',
  collagen: '콜라겐',
};

export const allCategories: CategoryKey[] = Object.keys(
  CATEGORY_LABELS
) as CategoryKey[];
