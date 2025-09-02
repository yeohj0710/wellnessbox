import { CategoryKey } from "@/lib/categories";

export type Answers = Record<string, any>;

export type Rule = {
  question: string;
  eval: (a: Answers) => boolean;
  weights: Partial<Record<CategoryKey, number>>;
};

export const RULES: Rule[] = [
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

