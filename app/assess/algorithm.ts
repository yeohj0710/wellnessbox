import {
  CATEGORY_LABELS,
  CategoryKey,
  allCategories,
} from './categories';
import { RULES, Answers } from './rules';

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
  const w_interest_eff = (w_interest * 5) / Math.max(5, S_sel || 1);
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
