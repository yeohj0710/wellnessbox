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

export type Answers = Record<string, any>;

const allCategories: CategoryKey[] = Object.keys(
  CATEGORY_LABELS
) as CategoryKey[];

type Rule = {
  question: string;
  eval: (a: Answers) => boolean;
  weights: Partial<Record<CategoryKey, number>>;
};

// triage rules from sections A & B
const RULES: Rule[] = [
  {
    question: 'A2',
    eval: (a) => (a.A2 ?? 0) >= 50,
    weights: { calcium: 1, vitaminD: 1, coenzymeQ10: 1 },
  },
  {
    question: 'A4_over',
    eval: (a) => {
      const bmi = (a.A4 ?? 0) / (((a.A3 ?? 0) / 100) ** 2 || 1);
      return bmi >= 27;
    },
    weights: { garcinia: 1 },
  },
  {
    question: 'A4_under',
    eval: (a) => {
      const bmi = (a.A4 ?? 0) / (((a.A3 ?? 0) / 100) ** 2 || 1);
      return bmi <= 18.5 && bmi > 0;
    },
    weights: { multivitamin: 1, minerals: 1 },
  },
  {
    question: 'A11',
    eval: (a) => (a.A11 ?? 0) === 0,
    weights: { omega3: 2 },
  },
  {
    question: 'A11_1',
    eval: (a) => (a.A11 ?? 0) === 1,
    weights: { omega3: 1 },
  },
  {
    question: 'A12',
    eval: (a) => a.A12 === true,
    weights: { vitaminD: 2 },
  },
  {
    question: 'A13_le2',
    eval: (a) => a.A13 === 'le2',
    weights: { calcium: 2, vitaminD: 1 },
  },
  {
    question: 'A13_3to5',
    eval: (a) => a.A13 === '3-5',
    weights: { calcium: 1 },
  },
  {
    question: 'A14_mid',
    eval: (a) => a.A14 === '4-5',
    weights: { lutein: 1 },
  },
  {
    question: 'A14_high',
    eval: (a) => a.A14 === '6+',
    weights: { lutein: 2, omega3: 1 },
  },
  {
    question: 'A15_const',
    eval: (a) => a.A15 === 'const',
    weights: { psyllium: 2, probiotics: 1 },
  },
  {
    question: 'A15_loose',
    eval: (a) => a.A15 === 'loose',
    weights: { probiotics: 2, psyllium: 1 },
  },
  {
    question: 'B16',
    eval: (a) => (a.B16 ?? 0) >= 2,
    weights: { vitaminB: 2, coenzymeQ10: 1, magnesium: 1 },
  },
  {
    question: 'B17',
    eval: (a) => a.B17 === true,
    weights: { magnesium: 2 },
  },
  {
    question: 'B18_some',
    eval: (a) => a.B18 === 'some',
    weights: { chondroitin: 1 },
  },
  {
    question: 'B18_often',
    eval: (a) => a.B18 === 'often',
    weights: { chondroitin: 2, collagen: 1, omega3: 1 },
  },
  {
    question: 'B19_elastic',
    eval: (a) => a.B19?.includes('elastic') || a.B19?.includes('dry'),
    weights: { collagen: 2, vitaminC: 1 },
  },
  {
    question: 'B19_acne',
    eval: (a) => a.B19?.includes('acne') || a.B19?.includes('slow'),
    weights: { zinc: 2, vitaminC: 1 },
  },
  {
    question: 'B19_nail',
    eval: (a) => a.B19?.includes('nail') || a.B19?.includes('hair'),
    weights: { collagen: 1, zinc: 1, vitaminB: 1 },
  },
  {
    question: 'B20',
    eval: (a) => a.B20 === true,
    weights: { garcinia: 2, psyllium: 1 },
  },
  {
    question: 'B21',
    eval: (a) => a.B21 === '3+',
    weights: { milkThistle: 2, folicAcid: 1 },
  },
  {
    question: 'B22',
    eval: (a) => a.B22 === true,
    weights: { iron: 2, folicAcid: 1, vitaminC: 1 },
  },
  {
    question: 'B23',
    eval: (a) => a.B23 === true,
    weights: { omega3: 2, coenzymeQ10: 1 },
  },
  {
    question: 'B24',
    eval: (a) => a.B24 === true,
    weights: { phosphatidylserine: 2, vitaminB: 1 },
  },
  {
    question: 'B25',
    eval: (a) => a.B25 === true,
    weights: { probiotics: 2, psyllium: 1 },
  },
  {
    question: 'B26',
    eval: (a) => a.B26 === true,
    weights: { vitaminC: 2, zinc: 1, vitaminD: 1 },
  },
  {
    question: 'B27',
    eval: (a) => a.B27 === true,
    weights: { arginine: 2, coenzymeQ10: 1, vitaminB: 1 },
  },
  {
    question: 'B28',
    eval: (a) => a.B28 === true,
    weights: { arginine: 2, coenzymeQ10: 1 },
  },
  {
    question: 'B29',
    eval: (a) => a.B29 === true,
    weights: { multivitamin: 2, vitaminB: 1, minerals: 1 },
  },
  {
    question: 'B30',
    eval: (a) => a.B30 === true,
    weights: { minerals: 2, magnesium: 1 },
  },
  {
    question: 'B31',
    eval: (a) => a.B31 === true,
    weights: { lutein: 2, vitaminA: 1 },
  },
];

// safety rules
function applySafety(scores: Record<CategoryKey, number>, a: Answers) {
  if (a.A5 === true) {
    scores.vitaminA = 0;
    scores.garcinia = 0;
    scores.folicAcid = (scores.folicAcid || 0) + 3;
  }
  if (a.A6 === true) {
    scores.omega3 *= 0.6;
  }
  if (a.A7 === true) {
    scores.calcium *= 0.6;
    scores.vitaminC *= 0.7;
  }
  if (a.A8 === true) {
    scores.vitaminA *= 0.6;
    scores.milkThistle = (scores.milkThistle || 0) + 1;
  }
  if (a.A9 === true) {
    scores.iron = 0;
  }
}

// synergy
function applySynergy(scores: Record<CategoryKey, number>) {
  scores.vitaminD += 0.5 * (scores.calcium || 0);
  scores.omega3 += 0.3 * (scores.lutein || 0);
  scores.magnesium += 0.2 * (scores.vitaminB || 0);
}

export function evaluate(answers: Answers) {
  const S_tria_num: Record<CategoryKey, number> = Object.fromEntries(
    allCategories.map((c) => [c, 0])
  ) as Record<CategoryKey, number>;
  const S_tria_den: Record<CategoryKey, number> = Object.fromEntries(
    allCategories.map((c) => [c, 0])
  ) as Record<CategoryKey, number>;

  for (const rule of RULES) {
    for (const c of Object.keys(rule.weights) as CategoryKey[]) {
      S_tria_den[c] += rule.weights[c] ?? 0;
    }
    if (rule.eval(answers)) {
      for (const c of Object.keys(rule.weights) as CategoryKey[]) {
        S_tria_num[c] += rule.weights[c] ?? 0;
      }
    }
  }

  const N_tria: Record<CategoryKey, number> = {} as Record<CategoryKey, number>;
  for (const c of allCategories) {
    const den = S_tria_den[c];
    N_tria[c] = den > 0 ? S_tria_num[c] / den : 0;
  }

  // interest selection
  const selected: CategoryKey[] = (answers.A10 || []) as CategoryKey[];
  const w_interest = 3;
  const S_sel = selected.length;
  const w_interest_eff = w_interest * 5 / Math.max(5, S_sel || 1);
  const S_interest: Record<CategoryKey, number> = Object.fromEntries(
    allCategories.map((c) => [c, 0])
  ) as Record<CategoryKey, number>;
  for (const c of selected) {
    S_interest[c] = w_interest_eff;
  }

  const S0: Record<CategoryKey, number> = {} as Record<CategoryKey, number>;
  for (const c of allCategories) {
    S0[c] = N_tria[c] + S_interest[c];
  }

  applySafety(S0, answers);
  applySynergy(S0);

  const categories = allCategories.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    score: S0[key] || 0,
  }));

  // sort by score
  categories.sort((a, b) => b.score - a.score);

  const S_sel_count = selected.length;
  let top: typeof categories = [];
  if (S_sel_count === 0) {
    top = categories.slice(0, 3);
  } else if (S_sel_count <= 5) {
    const selectedSorted = categories
      .filter((c) => selected.includes(c.key))
      .slice(0, 3);
    top = [...selectedSorted];
    if (top.length < 3) {
      for (const c of categories) {
        if (!selected.includes(c.key) && top.length < 3) top.push(c);
      }
    }
  } else {
    top = categories.slice(0, 3);
  }

  return { categories, top };
}
